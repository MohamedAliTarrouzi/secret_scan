from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import endpoints
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SecretScan API",
    description="API REST de détection de secrets",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "API SecretScan active. Accédez à /docs"}