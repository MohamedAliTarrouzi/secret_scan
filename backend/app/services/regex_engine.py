import re

PATTERNS = [
    # --- CLOUD CREDENTIALS ---
    {
        "name": "AWS Access Key ID",
        "category": "Cloud credentials",
        "regex": re.compile(r"\b(AKIA|ASCA|AGPA|AIDA)[0-9A-Z]{16}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Clé d'accès AWS (Access Key ID) permettant d'authentifier les requêtes API."
    },
    {
        "name": "AWS Secret Access Key",
        "category": "Cloud credentials",
        "regex": re.compile(r"\b[A-Za-z0-9/+=]{40}\b"),
        "severity": "Moyen",
        "confidence": 0.5,
        "description": "Clé d'accès secrète AWS (Secret Access Key) potentielle."
    },
    {
        "name": "Azure SAS Token",
        "category": "Cloud credentials",
        "regex": re.compile(r"\bsig=[A-Za-z0-9%]{40,}\b", re.IGNORECASE),
        "severity": "Critique",
        "confidence": 0.9,
        "description": "Shared Access Signature (SAS) Token Azure pour l'accès au stockage."
    },
    {
        "name": "GCP API Key",
        "category": "Cloud credentials",
        "regex": re.compile(r"\bAIza[0-9A-Za-z-_]{35}\b"),
        "severity": "Critique",
        "confidence": 0.95,
        "description": "Clé d'API Google Cloud Platform (GCP)."
    },
    
    # --- API TOKENS ---
    {
        "name": "GitHub Personal Access Token (Classic)",
        "category": "API tokens",
        "regex": re.compile(r"\bghp_[a-zA-Z0-9]{36}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Token d'accès personnel GitHub (Classique)."
    },
    {
        "name": "GitHub Personal Access Token (Fine-grained)",
        "category": "API tokens",
        "regex": re.compile(r"\bgithub_pat_[a-zA-Z0-9]{82}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Token d'accès personnel GitHub à granularité fine."
    },
    {
        "name": "GitLab Personal Access Token",
        "category": "API tokens",
        "regex": re.compile(r"\bglpat-[a-zA-Z0-9\-]{20}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Token d'accès personnel GitLab."
    },
    {
        "name": "Stripe API Key",
        "category": "API tokens",
        "regex": re.compile(r"\b(sk|rk)_(test|live)_[0-9a-zA-Z]{24,}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Clé API Stripe (secrète ou restreinte)."
    },
    {
        "name": "Slack Webhook URL",
        "category": "API tokens",
        "regex": re.compile(r"https://hooks\.slack\.com/services/T[A-Z0-9_]{8,11}/B[A-Z0-9_]{8,11}/[A-Za-z0-9_]{24}", re.IGNORECASE),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "URL de Webhook Slack entrante exposée."
    },
    {
        "name": "Discord Bot Token",
        "category": "API tokens",
        "regex": re.compile(r"\b[MN][A-Za-z0-9\-_]{23,25}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27,38}\b"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Token d'authentification de Bot Discord."
    },
    {
        "name": "Heroku API Key",
        "category": "API tokens",
        "regex": re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"),
        "severity": "Moyen",
        "confidence": 0.6,
        "description": "Clé d'API Heroku potentielle."
    },
    
    # --- AUTHENTIFICATION ---
    {
        "name": "Private Key Header",
        "category": "Authentification",
        "regex": re.compile(r"-----BEGIN (?P<type>[A-Z ]+) PRIVATE KEY-----"),
        "severity": "Critique",
        "confidence": 1.0,
        "description": "Début d'un bloc de clé privée SSH, RSA, PGP ou EC."
    },
    {
        "name": "JSON Web Token (JWT)",
        "category": "Authentification",
        "regex": re.compile(r"\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b"),
        "severity": "Moyen",
        "confidence": 0.8,
        "description": "Token de session JSON Web Token (JWT) complet."
    },
    
    # --- GENERIQUE ---
    {
        "name": "Database Connection String",
        "category": "Générique",
        "regex": re.compile(r"\b(mongodb(?:\+srv)?|postgresql|postgres|mysql|redis|sqlite):\/\/[A-Za-z0-9-_]+:[^@\s]+@[A-Za-z0-9.-]+(?::\d+)?\/?[a-zA-Z0-9-_]*\b", re.IGNORECASE),
        "severity": "Critique",
        "confidence": 0.95,
        "description": "Chaîne de connexion de base de données avec identifiants."
    },
    {
        "name": "Generic Password Assignment",
        "category": "Générique",
        "regex": re.compile(r"\b(?:pwd|password|passwd|pass|secret|client_secret|db_password|db_pass)\s*[:=]\s*['\"]([^'\"\s]{5,})['\"]", re.IGNORECASE),
        "severity": "Moyen",
        "confidence": 0.6,
        "description": "Assignation de mot de passe ou clé secrète en dur."
    }
]

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
                
                findings.append({
                    "category": pattern["category"],
                    "name": pattern["name"],
                    "file_path": file_path,
                    "line": line_idx,
                    "value": detected_value,
                    "severity": pattern["severity"],
                    "confidence": pattern["confidence"],
                    "context": line.strip(),
                    "description": pattern["description"]
                })
                
    return findings
