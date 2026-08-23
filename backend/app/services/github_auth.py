import os
import time
from pathlib import Path

import jwt
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_API_URL = "https://api.github.com"

GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_PRIVATE_KEY_PATH = os.getenv("GITHUB_PRIVATE_KEY_PATH")


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