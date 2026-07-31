import json
import math
import re
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent

def calculate_entropy(text:str) -> float:
    """Calculate l'entropie de Shannon d'une chaîne."""
    if not text:
        return 0.0
    
    entropy = 0.0
    for x in set(text):
        p_x = float(text.count(x)/len(text))
        entropy-=p_x * math.log2(p_x)
        
    return entropy

ACTIVE_PATTERNS_PATH = BASE_DIR/"data"/"regex_patterns.json"
BACKUP_PATTERNS_PATH = BASE_DIR/"data"/"regex_patterns.backup.json"

def load_patterns(path:Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        raw_patterns = json.load(f)
        
    patterns = []
    for item in raw_patterns:
        entry = dict(item)
        entry["regex"] = compile_regex(item)
        patterns.append(entry)
        
    return patterns

def compile_regex(item: dict):
    pattern_text = item.get("regex", "")
    flags = 0
    raw_flags = item.get("flags", "")
    
    if isinstance(raw_flags,str):
        raw_flags = raw_flags.upper()
        if "IGNORECASE" in raw_flags:
            flags |= re.IGNORECASE
    
    return re.compile(pattern_text,flags)
            
def get_patterns()->list[dict]:
    if ACTIVE_PATTERNS_PATH.exists():
        return load_patterns(ACTIVE_PATTERNS_PATH)
    return load_patterns(BACKUP_PATTERNS_PATH)
    
PATTERNS = get_patterns()


def scan_content(content: str, file_path: str = "direct_input") -> list[dict]:
    """
    Analyse le contenu d'un fichier ligne par ligne pour détecter des secrets
    basés sur les motifs regex déclarés et pré-compilés.
    """
    findings = []
    if not content:
        return findings

    # Liste de placeholders communs à exclure pour éviter les faux positifs génériques
    dummy_values = {
        "password", "passwd", "pwd", "secret", "null", "undefined", "true", "false",
        "placeholder", "changeme", "change_me", "xxxxxx", "yyyyyy", "123456", "12345678", "admin", "root"
    }

    lines = content.splitlines()
    for line_idx, line in enumerate(lines, start=1):
        for pattern in PATTERNS:
            matches = re.finditer(pattern["regex"], line)
            for match in matches:
                detected_value = match.group(0)
                
                # Pour les mots de passe génériques, on isole la valeur affectée (groupe 1)
                if pattern["name"] == "Generic Password Assignment" and len(match.groups()) > 0:
                    detected_value = match.group(1)
                    
                    # Ignore les valeurs factices d'exemples/placeholders
                    if detected_value.lower() in dummy_values:
                        continue
                    
                entropy = calculate_entropy(detected_value)
                
                findings.append({
                    "category": pattern["category"],
                    "name": pattern["name"],
                    "file_path": file_path,
                    "line": line_idx,
                    "value": detected_value,
                    "severity": pattern.get("severity","Medium"),
                    "confidence": pattern.get("confidence",0.5),
                    "entropy":round(entropy, 3),
                    "context": line.strip(),
                    "description": pattern.get("description",""),
                    "review_required": str(pattern.get("severity","Medium")).lower() == "ambiguous"
                })
                
    return findings