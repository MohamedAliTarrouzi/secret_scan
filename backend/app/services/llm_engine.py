import json
import os
import re
from datetime import datetime,timezone

import litellm
from dotenv import load_dotenv

load_dotenv()

DEFAULT_GATEWAY_URL = "http://localhost:4000"
DEFAULT_MODEL = "llm-secretscan-groq"
DEFAULT_TIMEOUT = 30

VALID_VERDICTS = {"secret","false_positive","uncertain"}
VALID_SEVERITIES = {"Critical","Medium","Low"}

SYSTEM_PROMPT = """You are a security reviewer for a secret-scanning tool.
A Regex engine already flagged this finding as ambiguous. Decide if the detected
value is a real secret, a false positive, or genuinely uncertain.

Return ONLY valid JSON with exactly these fields:
{
  "verdict": "secret" | "false_positive" | "uncertain",
  "severity": "Critical" | "Medium" | "Low",
  "confidence": 0.0,
  "reason": "short explanation"
}

"severity" is only meaningful when verdict is "secret" — pick how dangerous the
leak would be if real (Critical = production credential/high-privilege key,
Medium = limited-scope or internal token, Low = low-risk/dev-only).
Never repeat or reveal the detected value itself in "reason".

GUIDANCE:
- "entropy" is a weak supplementary signal, not a verdict on its own. A
  low-entropy hex/hash-like string is NOT automatically a false positive —
  check whether the variable name or surrounding code explicitly indicates a
  credential (e.g. *_secret, *_key, password=, token=).
- The repository or file name containing words like "test", "demo", "example",
  or "benchmark" is NOT sufficient evidence of a false positive. Test/benchmark
  repositories are frequently built specifically to contain realistic-looking
  credentials in order to test scanners like this one. Judge the value and its
  immediate code context, not the repo name.

EXAMPLES:

Finding: {"name": "Generic Password Assignment", "value": "changeme123", "context": "STAGING_PASSWORD = 'changeme123'"}
-> {"verdict": "secret", "severity": "Low", "confidence": 0.7, "reason": "Even conventional-looking placeholder-style passwords should be flagged for rotation if committed to a real config file; don't assume a 'placeholder-sounding' value is automatically safe to ignore."}

Finding: {"name": "AWS Secret Access Key", "value": "74e7e1837a98c7e0e4cd7fcf8b955894465964ec", "context": "GITHUB_OAUTH_SECRET = '74e7e1837a98c7e0e4cd7fcf8b955894465964ec'", "entropy": 3.632}
-> {"verdict": "secret", "severity": "Critical", "confidence": 0.85, "reason": "Variable name explicitly identifies this as an OAuth secret paired with a client ID. Low entropy alone does not rule out a real hex-encoded credential."}

Finding: {"name": "Generic Password Assignment", "value": "Tr0ub4dor&3_prod_2026", "file_path": "SecretsTest-main/config.py", "context": "PROD_DB_PASSWORD = 'Tr0ub4dor&3_prod_2026'"}
-> {"verdict": "secret", "severity": "Critical", "confidence": 0.8, "reason": "High-entropy value in a variable explicitly named for a production database password. The repository name alone does not confirm this is fake data."}
"""

def _empty_llm_result(model: str, error: str | None = None)->dict:
    return{
        "llm_verdict":None,
        "llm_confidence":None,
        "llm_reason":None,
        "llm_model":model,
        "llm_provider":"litellm-gateway",
        "llm_error":error,
        "llm_reviewed_at": None,
    }
    
def review_finding(finding: dict)-> dict:
    """Appel Grok via LiteLLM et retourne le verdict brut(non appliqué)."""
    model = os.getenv("LITELLM_MODEL",DEFAULT_MODEL)
    gateway_url = os.getenv("LITELLM_GATEWAY_URL",DEFAULT_GATEWAY_URL)
    gateway_key = os.getenv("LITELLM_MASTER_KEY")
    timeout = int(os.getenv("LLM_TIMEOUT_SECONDS",DEFAULT_TIMEOUT))
    
    if not gateway_key:
        return _empty_llm_result(model,"LITELLM_MASTER_KEY is not configured")
    
    prompt_data = {
        k:finding.get(k)
        for k in{
            "category","name", "file_path", "line", "value", "severity",
            "confidence", "entropy", "context", "description",
        }
    }
    
    try:
        response = litellm.completion(
            model=model,
            api_base=gateway_url,
            api_key=gateway_key,
            timeout=timeout,
            temperature=0,
            messages=[
                {"role":"system","content":SYSTEM_PROMPT},
                {"role":"user","content":json.dumps(prompt_data,ensure_ascii=False)},
            ]
        )
        content = response.choices[0].message.content
        #Nettoie les balises Markdown ```json ... ``` renvoyées par le LLM
        cleaned_content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.MULTILINE)
        result = json.loads(cleaned_content)
        
        verdict = result.get("verdict","uncertain")
        if verdict not in VALID_VERDICTS:
            verdict = "uncertain"
            
        severity = result.get("severity")
        if severity not in VALID_SEVERITIES:
            severity = None
        
        confidence = max(0.0,min(1.0, float(result.get("confidence",0))))
        
        return {
            "llm_verdict": verdict,
            "llm_confidence": confidence,
            "llm_reason": result.get("reason",""),
            "llm_model": model,
            "llm_provider":"litellm-gateway",
            "llm_error":None,
            "llm_reviewed_at": datetime.now(timezone.utc),
            "_llm_severity": severity,
        }
    except Exception as exc:
        return _empty_llm_result(model,str(exc))
    
def _apply_verdict(finding:dict, llm_result: dict) -> None:
    """Applique la règle de remapping severity/review_required. Mute `finding` en place"""
    finding.update({k: v for k, v in llm_result.items() if k != "_llm_severity"})
    
    if llm_result.get("llm_error"):
        #Echec LLM(timeout:401, JSON invalide...) -> On ne touche PAS à 
        #severity/review_required: le finding reste "Ambiguous" / à revoir manuellement.
        return 
    
    verdict = llm_result.get("llm_verdict")
    if verdict == "secret":
        finding["severity"] = llm_result.get("_llm_severity") or "Medium"
        finding["review_required"] = False
    elif verdict == "false_positive":
        finding["severity"] = "Low"
        finding["review_required"] = False
    else: #uncertain
        finding["severity"] = "Low"
        finding["review_required"] = True
    
    
def review_ambiguous_findings(findings: list[dict]) -> list[dict]:
    """Point d'entrée : ne traite que les findings Ambiguous/review_required."""
    for finding in findings:
        is_ambiguous = (
            finding.get("review_required") is True
            or str(finding.get("severity","")).lower() in {"ambiguous","ambigu","ambiguë"}
        )
        if not is_ambiguous:
            continue
        
        llm_result = review_finding(finding)
        _apply_verdict(finding, llm_result)
    
    return findings
