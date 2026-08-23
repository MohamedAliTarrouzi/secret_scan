import io
import requests
from app.services.archive_scanner import scan_zip

GITHUP_API_URL = "https://api.github.com"

def download_and_scan_github(github_url: str, branch: str = "main", token: str | None = None):
    """
    Download a GitHub repository as a ZIP archive and scan it.

    Public repository:
        token=None

    Private repository:
        token=<GitHub installation access token>
    """
    
    # Exemple d'URL : https://github.com/user/project
    # Nettoyage rapide de l'URL
    
    github_url = github_url.strip().rstrip("/")
    
    url_parts = github_url.split("/")
    
    if len(url_parts) < 5 or url_parts[2] != "github.com":
        raise ValueError("Invalid GitHub URL. Expected format: https://github.com/owner/repo")
        
    owner = url_parts[-2]
    repo = url_parts[-1]
    
    #GitHub API endpoint.
    # This works for both public and private repositories.
    {}
    zip_download_url = (f"{GITHUP_API_URL}/repos/{owner}/{repo}/zipball/{branch}")
    
    headers = {"Accept":"application/vnd.github+json"}
    
    #Only add authentification for private repositories.
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    print(f"Downloading repository {owner}/{repo} (branche: {branch})...")
    response = requests.get(zip_download_url,headers=headers,timeout=60)
    
    #If "main" doesn't exist, try "master"
    if response.status_code == 404 and branch == "main":
        print("'main'branch was not found. Retrying with 'master' branch... ")
        zip_download_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/master.zip"
        response = requests.get(zip_download_url,headers=headers,timeout=60)
        
    if response.status_code != 200:
        raise Exception(f"Unable to download repository. HTTP Code: {response.status_code}")
    
    print(f"Repository {owner}/{repo} downloaded successfully.")
    # Load ZIP in memory and scan it.
    zip_bytes = io.BytesIO(response.content)
    return scan_zip(zip_bytes)
