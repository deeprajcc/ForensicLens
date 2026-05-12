# forensiclens-backend/routers/issue_matrix.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import state

router = APIRouter(prefix="/issue-matrix", tags=["Issue Matrix"])


def _build_matrix_from_scan(allegation_points: list, scan: dict) -> list:
    """Combine static allegation points with evidence scan results into issue matrix rows."""
    matrix = []
    for ap in allegation_points:
        ap_id = ap["id"]
        scan_result = scan.get(ap_id, {})
        row = {
            "id": ap_id,
            "issue": ap["title"],
            "category": ap["category"],
            "party": ap["party"],
            "period": ap["period"],
            "evidence_reviewed": scan_result.get("supporting_evidence", []),
            "support": (
                ", ".join(scan_result.get("supporting_evidence", []))
                if scan_result.get("supporting_evidence")
                else "None identified"
            ),
            "contradiction": (
                ", ".join(scan_result.get("contradictory_evidence", []))
                if scan_result.get("contradictory_evidence")
                else "None identified"
            ),
            "gap": (
                "; ".join(scan_result.get("evidence_gaps", []))
                if scan_result.get("evidence_gaps")
                else "; ".join(ap.get("evidence_needed", []))
            ),
            "investigator_assessment": scan_result.get("proposed_status", "Unresolved"),
            "assessment_rationale": scan_result.get("assessment_rationale", ""),
            "caution": scan_result.get("caution", ""),
            "review_status": "Pending Review",
            "investigator_comments": "",
            "ai_draft_accepted": False,
        }
        matrix.append(row)
    return matrix


@router.get("/")
def get_issue_matrix():
    """Return issue matrix — build from scan if not yet saved."""
    saved = state.get_issue_matrix()
    if saved:
        return {"matrix": saved, "total": len(saved)}

    # Try to build from scan + allegation points
    scan = state.get_evidence_scan()
    allegation_points = state.get_allegation_points()
    if not scan or not allegation_points:
        raise HTTPException(
            status_code=404,
            detail="Issue matrix not available. Run evidence scan first (/evidence/scan).",
        )

    matrix = _build_matrix_from_scan(allegation_points, scan)
    state.save_issue_matrix(matrix)
    return {"matrix": matrix, "total": len(matrix)}


@router.post("/rebuild")
def rebuild_issue_matrix():
    """Force rebuild of issue matrix from latest evidence scan."""
    scan = state.get_evidence_scan()
    allegation_points = state.get_allegation_points()
    if not scan or not allegation_points:
        raise HTTPException(status_code=404, detail="Evidence scan or allegation points not found.")

    matrix = _build_matrix_from_scan(allegation_points, scan)
    state.save_issue_matrix(matrix)
    state.append_audit_log("Ravi", "Issue matrix rebuilt", "Issue Matrix", "")
    return {"status": "rebuilt", "matrix": matrix}