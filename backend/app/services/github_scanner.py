import io
import requests
from app.services.archive_scanner import scan_zip

def download_and_scan_github(github_url: str, branch: str = "main"):
    # Exemple d'URL : https://github.com/user/project
    # Nettoyage rapide de l'URL
    url_parts = github_url.strip("/").split("/")
    if len(url_parts) < 5:
        raise ValueError("URL GitHub invalide. Format attendu : https://github.com/owner/repo")
        
    owner = url_parts[-2]
    repo = url_parts[-1]
    
    # URL de téléchargement du ZIP par GitHub
    zip_download_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
    
    print(f"Téléchargement du dépôt {owner}/{repo} (branche: {branch})...")
    response = requests.get(zip_download_url)
    
    if response.status_code == 404 and branch == "main":
        # Essayer avec la branche historique "master" si "main" échoue (404)
        zip_download_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/master.zip"
        response = requests.get(zip_download_url)
        
    if response.status_code != 200:
        raise Exception(f"Impossible de télécharger le dépôt. Code HTTP : {response.status_code}")
        
    # Charger le contenu binaire en mémoire et le scanner directement
    zip_bytes = io.BytesIO(response.content)
    return scan_zip(zip_bytes)
