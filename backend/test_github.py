from app.services.github_auth import (create_app_jwt,get_app_installations)

print("Creating GitHub App JWT...")

token = create_app_jwt()

print("JWT created successfully.")
print(f"JWT length: {len(token)}")

print("\nGetting Github App installations...")

installations = get_app_installations()

print(f"Found {len(installations)} installation(s).")

for installation in installations:
    print(f"ID: {installation['id']} | account {installation['account']['login']}")
    
    