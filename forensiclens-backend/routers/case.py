# forensiclens-backend/routers/case.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from data.static_data import DEMO_CASE
from services import state

router = APIRouter(prefix="/case", tags=["Case"])


class CaseCreatePayload(BaseModel):
    case_name: Optional[str] = None
    client: Optional[str] = None
    jurisdiction: Optional[str] = None
    allegation_source: Optional[str] = None
    allegation_date: Optional[str] = None
    confidentiality_level: Optional[str] = None
    legal_privilege_flag: Optional[str] = None
    investigator: Optional[str] = None
    reviewer: Optional[str] = None
    scope_notes: Optional[str] = None


@router.post("/create")
def create_case(payload: CaseCreatePayload = None):
    """Create or overwrite the demo case with form data."""
    state.reset_state()
    
    base = dict(DEMO_CASE)

    # Merge any fields sent from the form — fall back to demo defaults
    if payload:
        if payload.case_name:          base["case_name"] = payload.case_name
        if payload.client:             base["client"] = payload.client
        if payload.jurisdiction:       base["jurisdiction"] = payload.jurisdiction
        if payload.allegation_source:  base["allegation_source"] = payload.allegation_source
        if payload.allegation_date:    base["allegation_date"] = payload.allegation_date
        if payload.confidentiality_level: base["confidentiality_level"] = payload.confidentiality_level
        if payload.legal_privilege_flag:  base["legal_privilege_flag"] = payload.legal_privilege_flag
        if payload.investigator:       base["investigator"] = payload.investigator
        if payload.reviewer:           base["reviewer"] = payload.reviewer
        if payload.scope_notes:        base["scope_notes"] = payload.scope_notes

    base["created_at"] = datetime.now(timezone.utc).isoformat()
    base["status"] = "Intake"
    base["risk_level"] = "Pending"

    state.save_case(base)
    state.append_audit_log(
        base.get("investigator", "Unknown"),
        "Case created",
        base.get("case_name", "Unknown"),
        f"Created by {base.get('investigator', 'Unknown')}",
    )

    return {"status": "created", "case": base}


@router.get("/")
def get_case():
    """Return current case data and status flags."""
    case = state.get_case()
    if not case:
        return {"case": None, "status_flags": state.get_status_flags()}
    return {"case": case, "status_flags": state.get_status_flags()}


