import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests   
import os

from app.core.database import get_db
from app.models.audit import ScanReport, Finding
from app.services.scan_orchestrator import orchestrate_scan
from typing import List
from app.services.archive_scanner import scan_files
from app.services.llm_engine import review_ambiguous_findings
from app.services.github_auth import get_app_installations, create_installation_token, get_installation_repositories
from app.services.github_scanner import download_and_scan_github

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ACTIVE_PATTERNS_PATH = BASE_DIR / "data" / "regex_patterns.json"
BACKUP_PATTERNS_PATH = BASE_DIR / "data" / "regex_patterns.backup.json"

class ScanRequest(BaseModel):
    target: str
    content: str | None = None

class RegexPatternsPayload(BaseModel):
    patterns: list[dict]

class GithubScanRequest(BaseModel):
    installation_id: int
    owner: str
    repo: str
    branch: str = "main"

def _severity_counts(findings: list[dict]) -> dict:
    critical = sum(
        1 for item in findings 
        if str(item.get("severity", "")).lower() in ("critique", "critical")
    )
    medium = sum(
        1 for item in findings 
        if str(item.get("severity", "")).lower() in ("moyen", "medium")
    )
    
    low = sum(
        1 for item in findings 
        if str(item.get("severity", "")).lower() in ("faible", "low")
    )
    ambiguous = sum(
        1 for item in findings 
        if str(item.get("severity", "")).lower() in ("ambiguous", "ambigu", "ambiguë")
    )
    
    return {"critical": critical, "medium": medium, "low": low, "ambiguous": ambiguous}

def _scan_report_to_dict(report: ScanReport)->dict:
    return{
        "id":report.id,
        "status": report.status,
        "target": report.target,
        "findings":[
            {
                "category": f.category,
                "name": f.name,
                "file_path": f.file_path,
                "line": f.line,
                "value": f.value,
                "severity": f.severity,
                "confidence": f.confidence,
                "entropy": f.entropy,
                "context": f.context,
                "description": f.description,
                "review_required": f.review_required,
                "llm_verdict": f.llm_verdict,
                "llm_confidence": f.llm_confidence,
                "llm_reason": f.llm_reason,
                "llm_model": f.llm_model,
                "llm_provider": f.llm_provider,
                "llm_error": f.llm_error,
                "llm_reviewed_at": f.llm_reviewed_at.isoformat() if f.llm_reviewed_at else None,
            }
            for f in report.findings
        ],
        "summary":{
            "total": report.total,
            "critical": report.critical,
            "medium": report.medium,
            "low": report.low,
            "ambiguous": report.ambiguous  
        },
        "pipeline_message": report.pipeline_message,
    }
    
    
    
def _build_scan_response(db: Session,target_name: str, findings:list[dict]) -> dict:    
    counts = _severity_counts(findings)
    
    if counts["critical"] > 0:
        pipeline_message = "BLOCKED: critical findings detected"
    elif counts["medium"] > 0:
        pipeline_message = "WARNING: medium findings detected"
    else:
        pipeline_message = "INFO: no blocking issue detected"
    
    report = ScanReport(
        target=target_name,
        status="success",
        pipeline_message=pipeline_message,
        total=len(findings),
        critical=counts["critical"],
        medium=counts["medium"],
        low=counts["low"],
        ambiguous=counts["ambiguous"],
    )
    report.findings = [
        Finding(
            category=item.get("category"),
            name=item.get("name"),
            file_path=item.get("file_path"),
            line=item.get("line"),
            value=item.get("value"),
            severity=item.get("severity"),
            confidence=item.get("confidence"),
            entropy=item.get("entropy"),
            context=item.get("context"),
            description=item.get("description"),
            review_required=item.get("review_required",False),
            llm_verdict=item.get("llm_verdict"),
            llm_confidence=item.get("llm_confidence"),
            llm_reason=item.get("llm_reason"),
            llm_model=item.get("llm_model"),
            llm_provider=item.get("llm_provider"),
            llm_error=item.get("llm_error"),
            llm_reviewed_at=item.get("llm_reviewed_at"),
        )
        for item in findings
    ]
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return _scan_report_to_dict(report)
    
    
@router.post("/scan")
async def run_scan(payload: ScanRequest, db: Session = Depends(get_db)):
    try:
        if payload.target == "inline":
            if not payload.content:
                raise ValueError("Le contenu inline est vide")
            findings = orchestrate_scan("inline", content=payload.content)
        else:
            findings = orchestrate_scan(payload.target)
            
        return _build_scan_response(db, payload.target, findings)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc    

@router.post("/scan/upload")
async def run_scan_upload(file: UploadFile =  File(...),db: Session = Depends(get_db)):
    try:
        contents = await file.read()
        target_name = file.filename
             
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=Path(target_name).suffix
        ) as temp_file:
            temp_file.write(contents)
            temp_path=temp_file.name
            
        try:
            findings = orchestrate_scan(temp_path)
        finally:
            Path(temp_path).unlink(missing_ok=True)

        return _build_scan_response(db, target_name, findings)
        
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.post("/scan/upload-multiple")
async def run_scan_upload_multiple(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    try:
        entries = []
        for f in files:
            content = await f.read()
            #Le frontend envoie webkitRelativePath comme nom de fichier pour
            #un dossier, ce qui prèserve l'arborescence pour l'allowlist du paths.
            entries.append((f.filename,content))
            
        findings = scan_files(entries)
        findings = review_ambiguous_findings(findings)
        
        target_name = files[0].filename if len(files) == 1 else f"{len(files)} file(s)"
        return _build_scan_response(db,target_name, findings)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    reports = db.query(ScanReport).order_by(ScanReport.created_at.desc()).all()
    return [_scan_report_to_dict(r) for r in reports]

@router.delete("/history/{scan_id}")
def delete_history_item(scan_id: int, db:Session = Depends(get_db)):
    report = db.query(ScanReport).filter(ScanReport.id == scan_id).first()
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Scan history item not found",
        )
    
    db.delete(report)
    db.commit()
    
    return{
        "status":"deleted",
        "id":scan_id,
    }

@router.delete("/history")
def delete_all_history(db: Session = Depends(get_db)):
    reports = db.query(ScanReport).all()
    
    for report in reports:
        db.delete(report)
       
    db.commit()
    return{
        "status":"deleted",
        "messages":"Scan history cleared",
    }

@router.get("/regex-patterns")
def get_regex_patterns():
    with open(ACTIVE_PATTERNS_PATH,"r",encoding="utf-8") as f:
        return {"patterns": json.load(f)}

@router.post("/regex-patterns")
def save_regex_patterns(payload: RegexPatternsPayload):
    with open(ACTIVE_PATTERNS_PATH,"w",encoding="utf-8") as f:
        json.dump(payload.patterns, f, indent=2, ensure_ascii=False)
        
    return {"status":"saved"}

@router.post("/regex-patterns/restore-backup")
def restore_backup():
    if not BACKUP_PATTERNS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Le fichier de sauvegarde est introuvable."
        )
    
    try:
        with open(BACKUP_PATTERNS_PATH,"r",encoding="utf-8") as backup_file:
            backup_patterns = json.load(backup_file)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Le fichier de sauvegarde contient un JSON invalide.",
        ) from exc
        
    with open(ACTIVE_PATTERNS_PATH,"w",encoding="utf-8") as active_file:
        json.dump(backup_patterns, active_file, indent=2, ensure_ascii=False)
    
    return{
        "status":"restored",
        "patterns": backup_patterns,
    }
  
@router.get("/github/connect")
def connect_github():
    install_url = os.getenv("GITHUB_APP_INSTALL_URL")

    if not install_url:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_APP_INSTALL_URL is not configured.",
        )

    return RedirectResponse(url=install_url)  

@router.get("/github/setup")
def github_setup(installation_id: int):
    try:
        installations = get_app_installations()

        installation = next(
            (
                item
                for item in installations
                if item["id"] == installation_id
            ),
            None,
        )

        if installation is None:
            raise HTTPException(
                status_code=403,
                detail="Invalid GitHub App installation.",
            )

        frontend_url = os.getenv(
            "FRONTEND_URL",
            "http://localhost:5173",
        )

        return RedirectResponse(
            url=f"{frontend_url}?github_connected=true"
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
          
@router.get("/github/installations")
def list_github_installations():
    try:
        installations = get_app_installations()
    
    except Exception as exc:
        raise HTTPException(status_code=502,detail=str(exc)) from exc
    
    return[{"installation_id":item["id"],"account":item["account"]["login"]} for item in installations]

@router.get("/github/repositories")
def list_github_repositories(installation_id: int):
    try:
        repos = get_installation_repositories(installation_id)
    
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    
    return[
        {
            "full_name":r["full_name"],
            "owner":r["owner"]["login"],
            "name":r["name"],
            "private":r["private"],
            "default_branch":r.get("default_branch","main")
            }
        for r in repos
        ] 
    
@router.post("/github/scan")
def scan_github_repository(payload: GithubScanRequest, db: Session = Depends(get_db)):
    try:
         # ---------------------------------------------------------
        # 1. Verify that the requested repository belongs to the
        #    selected GitHub App installation.
        # ---------------------------------------------------------
        repos = get_installation_repositories(payload.installation_id)
        requested_full_name = (f"{payload.owner}/{payload.repo}")
        repository = next(
            (
                repo
                for repo in repos
                if repo["full_name"].lower() == requested_full_name.lower()
            ),
            None
        )
        
        if repository is None:
            raise HTTPException(status_code=403,detail=("This repository is non accessible through the selected Github installation."))
        
        # ---------------------------------------------------------
        # 2. Create the installation token server-side.
        #    The token is NEVER returned to the frontend.
        # ---------------------------------------------------------
        token = create_installation_token(payload.installation_id)
        
        # ---------------------------------------------------------
        # 3. Build the repository URL.
        # ---------------------------------------------------------
        repo_url = (f"https://github.com/{payload.owner}/{payload.repo}")
        
         # ---------------------------------------------------------
        # 4. Download and scan the repository.
        # ---------------------------------------------------------
        findings = download_and_scan_github(repo_url,branch=payload.branch,token=token)
        
        # ---------------------------------------------------------
        # 5. Review ambiguous findings using the existing logic.
        # ---------------------------------------------------------
        findings = review_ambiguous_findings(findings)
        
        # ---------------------------------------------------------
        # 6. Save the scan using the existing persistence path.
        # ---------------------------------------------------------
        target_name=(f"{payload.owner}/{payload.repo}")
        
        return _build_scan_response(db,target_name,findings)
        
    except HTTPException:
        # Preserve HTTP errors we explicitly created above.
        raise
    
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"GitHub API request failed : {exc}") from exc
    
    except ValueError as exc:
        raise HTTPException(status_code=400, detail = str(exc)) from exc
    
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"GitHub scan failed: {exc}") from exc
    