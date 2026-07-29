import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.services.scan_orchestrator import orchestrate_scan

router = APIRouter()

history_store = []

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ACTIVE_PATTERNS_PATH = BASE_DIR / "data" / "regex_patterns.json"
BACKUP_PATTERNS_PATH = BASE_DIR / "data" / "regex_patterns.backup.json"

class ScanRequest(BaseModel):
    target: str
    content: str | None = None

class RegexPatternsPayload(BaseModel):
    patterns: list[dict]

@router.post("/scan")
async def run_scan(payload: ScanRequest | None = None, file: UploadFile | None = None ):
    try:
        if file is not None:
            contents = await file.read()
            temp_path = f"/tmp/{file.filename}"
            with open(temp_path,"wb") as f:
                f.write(contents)
            findings = orchestrate_scan(temp_path)
            target_name = file.filename
        else:
            if payload is None:
                raise ValueError("Aucune donnée fournie.")
            
            if payload.target == "inline":
                if not payload.content:
                    raise ValueError("Le contenue inline est vide")
                findings = orchestrate_scan(payload.target, content=payload.content)
            else:
                findings = orchestrate_scan(payload.target)
            
            target_name = payload.target
        
        critical = sum(1 for item in findings if str(item.get("severity","")).lower() == "critical" )
        medium = sum(1 for item in findings if str(item.get("severity","")).lower() == "medium" )
        low = sum(1 for item in findings if str(item.get("severity","")).lower() == "low" )
        ambiguous = sum(1 for item in findings if str(item.get("severity","")).lower() == "ambiguous")
        
        if critical > 0:
            pipeline_message = "BLOCKED: critical findings detected"
        elif medium > 0:
             pipeline_message = "WARNING: medium findings detected"
        else:
             pipeline_message = "INFO: no blocking issue detected"
        
        result = {
            "status": "success",
            "target":target_name,
            "findings": findings,
            "summary":{
                "total": len(findings),
                "critical": critical,
                "medium": medium,
                "low": low,
                "ambiguous": ambiguous,
            },
            "pipeline_message":pipeline_message,
        }
        
        history_store.append(result)
        return result
    
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
@router.get("/history")
def get_history():
    return history_store

@router.get("/regex-patterns")
def get_regex_patterns():
    with open(ACTIVE_PATTERNS_PATH,"r",encoding="utf-8") as f:
        return {"patterns": json.load(f)}

@router.post("/regex-patterns")
def save_regex_patterns(payload: RegexPatternsPayload):
    with open(ACTIVE_PATTERNS_PATH,"w",encoding="utf-8") as f:
        json.dump(payload.patterns, f, indent=2, ensure_ascii=False)
        
    return {"status":"saved"}

@router.post("/regex-patterns/rewrite-backup")
def rewrite_backup():
    with open(ACTIVE_PATTERNS_PATH,"r",encoding="utf-8") as f:
        active_patterns = json.load(f)
    
    with open(BACKUP_PATTERNS_PATH,"w",encoding="utf-8") as f:
        json.dump(active_patterns, f, indent=2, ensure_ascii=False)
    
    return {"status":"backup_rewritten"}