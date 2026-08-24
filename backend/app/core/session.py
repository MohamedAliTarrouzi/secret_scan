import os
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

SESSION_SECRET = os.getenv("SESSION_SECRET_KEY","dev-insecure-change-me")
SESSION_COOKIE_NAME = "secretscan_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30 # 30 days

_serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="github-session")

def create_session_cookie_value(github_user_id: int) -> str:
    return _serializer.dumps({"uid":github_user_id}) 

def read_session(cookie_value: str | None) -> int | None:
    if not cookie_value:
        return None
    try:
        data = _serializer.loads(cookie_value,max_age=SESSION_MAX_AGE)
        return data.get("uid")
    except(BadSignature, SignatureExpired):
        return None
            