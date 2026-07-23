import os
from app.services.regex_engine import scan_content
from app.services.archive_scanner import scan_zip, scan_tar
from app.services.github_scanner import download_and_scan_github

def orchestrate_scan(target: str, content: str | None = None):
    # Cas 1: Inline (Code)
    if target == "inline":
        if not content:
            raise ValueError("Le contenu inline est vide.")
        return scan_content(content,file_path="inline")
    
    # Cas 2 : C'est une URL GitHub
    if target.startswith("http://") or target.startswith("https://"):
        if "github.com" in target:
            return download_and_scan_github(target)
        else:
            raise ValueError("Seules les URLs GitHub sont supportées pour le moment.")
            
    # Cas 3 : C'est un chemin local
    if os.path.exists(target):
        if os.path.isdir(target):
            # Pour un dossier complet local (étape qui pourra être affinée plus tard)
            raise NotImplementedError("Le scan de dossier local direct n'est pas encore implémenté.")
        elif target.endswith(".zip"):
            return scan_zip(target)
        elif target.endswith((".tar", ".tar.gz", ".tgz")):
            return scan_tar(target)
        else:
            # Fichier texte standard unique
            with open(target, "r", encoding="utf-8", errors="ignore") as f:
                return scan_content(f.read(), file_path=target)
                
    raise FileNotFoundError(f"La cible '{target}' n'est ni un fichier local valide, ni une URL.")
