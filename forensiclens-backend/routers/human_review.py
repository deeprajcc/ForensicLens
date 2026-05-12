# forensiclens-backend/routers/human_review.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services import state

router = APIRouter(prefix="/human-review", tags=["Human Review"])


class ReviewPayload(BaseModel):
    action: str                        # "accept" | "edit_approve" | "reject" | "escalate" | "request_evidence" | "mark_final"
    revised_finding: Optional[str] = None
    reject_reason: Optional[str] = None
    comments: Optional[str] = None


@router.get("/")
def get_review_items():
    """Return all issue matrix rows formatted for human review."""
    matrix = state.get_issue_matrix()
    if not matrix:
        raise HTTPException(
            status_code=404,
            detail="No issue matrix found. Run evidence scan first.",
        )
    return {"items": matrix, "total": len(matrix)}


@router.get("/{ap_id}")
def get_review_item(ap_id: str):
    """Return a single AP row for review."""
    matrix = state.get_issue_matrix()
    row = next((r for r in matrix if r["id"] == ap_id), None)
    if not row:
        raise HTTPException(status_code=404, detail=f"{ap_id} not found in issue matrix.")
    return {"item": row}


@router.post("/{ap_id}")
def submit_review(ap_id: str, payload: ReviewPayload):
    """Submit investigator review action for an allegation point."""
    matrix = state.get_issue_matrix()
    row = next((r for r in matrix if r["id"] == ap_id), None)
    if not row:
        raise HTTPException(status_code=404, detail=f"{ap_id} not found.")

    now = datetime.now(timezone.utc).isoformat()
    investigator = state.get_case().get("investigator", "Investigator") if state.get_case() else "Investigator"

    action = payload.action.lower()

    if action == "accept":
        row["ai_draft_accepted"] = True
        row["review_status"] = "Accepted"
        row["investigator_comments"] = payload.comments or ""
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Accepted AI Draft"

    elif action == "edit_approve":
        if not payload.revised_finding:
            raise HTTPException(status_code=400, detail="revised_finding is required for edit_approve.")
        row["ai_draft_accepted"] = False
        row["revised_finding"] = payload.revised_finding
        row["review_status"] = "Edited and Approved"
        row["investigator_comments"] = payload.comments or ""
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Edited by Investigator"

    elif action == "reject":
        row["ai_draft_accepted"] = False
        row["review_status"] = "Rejected"
        row["investigator_comments"] = payload.reject_reason or payload.comments or ""
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Rejected AI Draft"

    elif action == "escalate":
        row["review_status"] = "Manager Review"
        row["investigator_comments"] = payload.comments or ""
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Escalated to Manager"

    elif action == "request_evidence":
        row["review_status"] = "Evidence Requested"
        row["investigator_comments"] = payload.comments or ""
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Additional Evidence Requested"

    elif action == "mark_final":
        if not row.get("revised_finding") and not row.get("ai_draft_accepted"):
            raise HTTPException(
                status_code=400,
                detail="Cannot mark as final — accept or edit the AI draft first.",
            )
        row["review_status"] = "Final — Ready for Report"
        row["reviewed_by"] = investigator
        row["reviewed_at"] = now
        row["review_action"] = "Marked Final for Report"

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{action}'. Use: accept | edit_approve | reject | escalate | request_evidence | mark_final")

    state.save_issue_matrix(matrix)
    state.append_audit_log(
        investigator,
        f"Human review: {row['review_action']}",
        ap_id,
        payload.comments or payload.reject_reason or "",
    )

    return {"status": "success", "item": row}
