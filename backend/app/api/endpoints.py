from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.services.scan_orchestrator import orchestrate_scan

router = APIRouter()

history_store = []

class ScanRequest(BaseModel):
    target: str
    content: str | None = None
    
@router.post("/scan")
async def run_scan(payload: ScanRequest | None = None, file: UploadFile | None = None ):
    try:
        if file is not None:
            contents = await file.read()
            temp_path = f"/tmp/{file.filename}"
            with open(temp_path,"wb") as f:
                f.write(contents)
            findings = orchestrate_scan(temp_path)
        else:
            if payload is None:
                raise ValueError("Aucoun donnée fournie.")
            findings = orchestrate_scan(payload.target, content=payload.content)
        
        result = {
            "status": "success",
            "target":payload.target if payload else file.filename,
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