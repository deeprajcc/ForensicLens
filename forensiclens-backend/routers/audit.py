# forensiclens-backend/routers/audit.py

from fastapi import APIRouter
from services import state

router = APIRouter(prefix="/audit-log", tags=["Audit"])


@router.get("/")
def get_audit_log():
    """Return full audit log."""
    log = state.get_audit_log()
    return {"log": log, "total": len(log)}
