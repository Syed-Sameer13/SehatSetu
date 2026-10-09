from fastapi import APIRouter, Query
from typing import List
from app.schemas.audit import AuditLogResponse
from app.services.storage import store

router = APIRouter()


@router.get("/logs", response_model=List[AuditLogResponse], tags=["Audit History"])
async def get_audit_logs(limit: int = Query(50, ge=1, le=200)):
    """
    Retrieve immutable audit log of status updates, patient calls, and triage overrides.
    """
    return store.get_audit_logs(limit=limit)
