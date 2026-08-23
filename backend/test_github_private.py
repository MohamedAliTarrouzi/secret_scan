from app.services.github_auth import (
    get_app_installations,
    create_installation_token,
)

from app.services.github_scanner import (
    download_and_scan_github,
)


installations = get_app_installations()

if not installations:
    raise RuntimeError(
        "No GitHub App installation found."
    )

installation_id = installations[0]["id"]

print(
    f"Installation ID: {installation_id}"
)

token = create_installation_token(
    installation_id
)

print("Installation token created.")

github_url = (
    "https://github.com/MohamedAliTarrouzi/"
    "benchmark-repo"
)

result = download_and_scan_github(
    github_url=github_url,
    branch="main",
    token=token,
)

print("\nScan completed!")
print(result)