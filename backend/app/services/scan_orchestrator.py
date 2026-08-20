import os
from app.services.regex_engine import scan_content
from app.services.archive_scanner import scan_zip, scan_tar, scan_files
from app.services.github_scanner import download_and_scan_github
from app.services.llm_engine import review_ambiguous_findings

def orchestrate_scan(target:str, content: str | None = None):
    findings = _run_regex_scan(target,content)
    return review_ambiguous_findings(findings)

def scan_directory(dir_path: str):
    entries = []
    for root, _, files in os.walk(dir_path):
        for name in files:
            full_path = os.path.join(root,name)
            rel_path = os.path.relpath(full_path,dir_path)
            try:
                with open(full_path,"rb") as f:
                    entries.append((rel_path,f.read()))
            except Exception as e:
                print(f"Erreur lors de la lecture de {full_path}:{e}")
    return scan_files(entries)
                

def _run_regex_scan(target: str, content: str | None = None):
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
            # Pour un dossier complet local
            return scan_directory(target)
        elif target.endswith(".zip"):
            return scan_zip(target)
        elif target.endswith((".tar", ".tar.gz", ".tgz")):
            return scan_tar(target)
        else:
            # Fichier texte standard unique
            with open(target, "r", encoding="utf-8", errors="ignore") as f:
                return scan_content(f.read(), file_path=target)
                
    raise FileNotFoundError(f"La cible '{target}' n'est ni un fichier local valide, ni une URL.")
