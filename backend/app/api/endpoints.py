from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.scan_orchestrator import orchestrate_scan

router = APIRouter()

history_store = []

class ScanRequest(BaseModel):
    target: str
    
@router.post("/scan")
def run_scan(payload: ScanRequest):
    try:
        findings = orchestrate_scan(payload.target)
        
        result = {
            "status": "success",
            "target":payload.target,
            "findings": findings,
            "summary":{
                "total": len(findings),
                "critical":sum(
                    1 for item in findings if item.get("severity") == "Critique"
                ),
                "medium":sum(
                    1 for item in findings if item.get("severity") == "Moyen"
                ),
                "low": sum(
                    1 for item in findings if item.get("severity") == "Faible"
                )
            },
        }
        
        history_store.append(result)
        return result
    
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
@router.get("/history")
def get_history():
    return history_store