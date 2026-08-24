from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.session import read_session, SESSION_COOKIE_NAME
from app.models.user import GithubUser

def get_current_github_user(request: Request, db:Session = Depends(get_db))->GithubUser:
    uid = read_session(request.cookies.get(SESSION_COOKIE_NAME))
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    user = db.query(GithubUser).filter(GithubUser.id == uid).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Session user not found")
    return user