import os
import time
from pathlib import Path
import secrets
from urllib.parse import urlencode
import jwt
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_API_URL = "https://api.github.com"

GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_PRIVATE_KEY_PATH = os.getenv("GITHUB_PRIVATE_KEY_PATH")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_CALLBACK_URL = os.getenv("GITHUB_CALLBACK_URL","http://localhost:8000/api/github/callback")

def _get_private_key() -> str:
    if not GITHUB_PRIVATE_KEY_PATH:
        raise RuntimeError(
            "GITHUB_PRIVATE_KEY_PATH is not configured"
        )

    path = Path(GITHUB_PRIVATE_KEY_PATH)

    if not path.is_absolute():
        path = Path.cwd() / path

    if not path.exists():
        raise RuntimeError(
            f"GitHub private key not found: {path}"
        )

    return path.read_text(encoding="utf-8")


def create_app_jwt() -> str:
    if not GITHUB_CLIENT_ID:
        raise RuntimeError(
            "GITHUB_CLIENT_ID is not configured"
        )

    private_key = _get_private_key()

    now = int(time.time())

    payload = {
        "iat": now - 60,
        "exp": now + (10 * 60),
        "iss": GITHUB_CLIENT_ID,
    }

    return jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
    )


def _github_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
    }


def get_app_installations() -> list[dict]:
    app_jwt = create_app_jwt()

    response = requests.get(
        f"{GITHUB_API_URL}/app/installations",
        headers=_github_headers(app_jwt),
        timeout=15,
    )

    if response.status_code != 200:
        raise RuntimeError(
            "GitHub API error while getting installations: "
            f"{response.status_code} {response.text}"
        )

    return response.json()


def create_installation_token(
    installation_id: int,
) -> str:
    app_jwt = create_app_jwt()

    response = requests.post(
        f"{GITHUB_API_URL}/app/installations/"
        f"{installation_id}/access_tokens",
        headers=_github_headers(app_jwt),
        timeout=15,
    )

    if response.status_code != 201:
        raise RuntimeError(
            "GitHub API error while creating installation token: "
            f"{response.status_code} {response.text}"
        )

    return response.json()["token"]


def get_installation_repositories(
    installation_id: int,
) -> list[dict]:
    token = create_installation_token(installation_id)

    response = requests.get(
        f"{GITHUB_API_URL}/installation/repositories",
        headers=_github_headers(token),
        timeout=15,
    )

    if response.status_code != 200:
        raise RuntimeError(
            "GitHub API error while listing repositories: "
            f"{response.status_code} {response.text}"
        )

    return response.json().get("repositories", [])

def get_github_authorization_url(state: str) -> str:
    if not GITHUB_CLIENT_ID:
        raise RuntimeError("GITHUB_CLIENT_ID is not configured")

    params = {"client_id": GITHUB_CLIENT_ID, "redirect_uri": GITHUB_CALLBACK_URL, "state": state}

    return "https://github.com/login/oauth/authorize?" + urlencode(params)

def exchange_code_for_token(code: str) -> dict:
    if not GITHUB_CLIENT_ID:
        raise RuntimeError("GITHUB_CLIENT_ID is not configured")

    if not GITHUB_CLIENT_SECRET:
        raise RuntimeError("GITHUB_CLIENT_SECRET is not configured")

    response = requests.post("https://github.com/login/oauth/access_token",data={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET,"code": code},
        headers={"Accept": "application/json"},timeout=15)

    if response.status_code != 200:
        raise RuntimeError(f"GitHub OAuth token exchange failed: {response.status_code} {response.text}")
    
    data = response.json()

    if "error" in data:
        raise RuntimeError(
            f"GitHub OAuth error: {data.get('error_description', data['error'])}"
        )

    return data

def get_github_user(access_token: str) -> dict:
    response = requests.get("https://api.github.com/user",headers={"Authorization": f"Bearer {access_token}","Accept": "application/vnd.github+json","X-GitHub-Api-Version": "2026-03-10"},
        timeout=15)

    if response.status_code != 200:
        raise RuntimeError(
            f"GitHub user request failed: "
            f"{response.status_code} {response.text}"
        )

    return response.json()

def get_user_installations(access_token: str) ->list[dict]:
    response = requests.get(f"{GITHUB_API_URL}/user/installations",headers=_github_headers(access_token),timeout=15)
    if response.status_code != 200:
        raise RuntimeError(f"GitHub API error while listing user installations: {response.status_code}{response.text}")
    
    return response.json().get("installations",[])