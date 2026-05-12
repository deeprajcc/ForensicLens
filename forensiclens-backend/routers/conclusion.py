# forensiclens-backend/routers/conclusion.py

from fastapi import APIRouter, HTTPException
from services import state, llm

router = APIRouter(prefix="/conclusion", tags=["Conclusion"])


@router.post("/generate")
def generate_conclusion():
    """Generate cautious pre-investigation conclusion from issue matrix using Gemini."""
    matrix = state.get_issue_matrix()
    if not matrix:
        raise HTTPException(
            status_code=404,
            detail="No issue matrix found. Build the issue matrix first.",
        )

    try:
        conclusion_data = llm.generate_conclusion(matrix)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    conclusion = {
        "conclusion_version": "v0.1",
        "status": "Draft",
        "generated_by": "AI (Gemini) — Requires investigator review",
        "requires_review": True,
        "disclaimer": (
            "This is an AI-assisted preliminary assessment only. "
            "It does not constitute a finding of fraud, misconduct, or any legal conclusion. "
            "All assessments require investigator review and approval before use."
        ),
        **conclusion_data,
    }

    state.save_conclusion(conclusion)
    state.append_audit_log(
        "Ravi",
        "Conclusion generated",
        "Pre-Investigation Conclusion",
        "Draft generated from issue matrix",
    )

    return {"status": "success", "conclusion": conclusion}


@router.get("/")
def get_conclusion():
    """Return stored conclusion."""
    conclusion = state.get_conclusion()
    if not conclusion:
        raise HTTPException(
            status_code=404,
            detail="No conclusion found. Run POST /conclusion/generate first.",
        )
    return {"conclusion": conclusion}


