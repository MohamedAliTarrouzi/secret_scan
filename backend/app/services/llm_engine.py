import json
import os
from datetime import datetime,timezone

import litellm
from dotenv import load_dotenv

load_dotenv()

DEFAULT_GATEWAY_URL = "http://localhost:4000"
DEFAULT_MODEL = "grok-secretscan"
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
        result = json.loads(content)
        
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
