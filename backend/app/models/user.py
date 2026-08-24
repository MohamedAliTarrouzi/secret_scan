from datetime import datetime, timezone

from sqlalchemy import Column, Integer, BigInteger, String, DateTime

from app.core.database import Base


class GithubUser(Base):
    __tablename__ = "github_users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(BigInteger, unique=True, nullable=False, index=True)
    login = Column(String, nullable=False)
    name = Column(String, nullable=True)
    # Set once they've installed the GitHub App on their account.
    # None means: authenticated, but hasn't granted repo access yet.
    installation_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OAuthState(Base):
    # Short-lived, one-time-use CSRF token for the OAuth redirect.
    __tablename__ = "oauth_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))