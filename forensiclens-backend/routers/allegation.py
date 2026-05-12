# forensiclens-backend/routers/allegation.py

import io
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

import pdfplumber
from services import state, llm

router = APIRouter(prefix="/allegation", tags=["Allegation"])


# ── Upload + extract PDF ──────────────────────────────────────────────────────

@router.post("/upload")
async def upload_allegation(file: UploadFile = File(...)):
    """Accept allegation PDF, extract text, save to disk."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()

    # Save the PDF to uploads folder
    upload_path = state.UPLOADS_DIR / file.filename
    with open(upload_path, "wb") as f:
        f.write(contents)

    try:
        text_pages = []
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(page_text)
        extracted_text = "\n\n".join(text_pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract PDF text: {e}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in the PDF. Ensure it is not scanned-only.",
        )

    state.save_allegation_text(extracted_text)
    state.append_audit_log(
        "Ravi",
        "Allegation uploaded",
        file.filename,
        f"Extracted {len(extracted_text)} characters from {len(text_pages)} pages",
    )

    return {
        "status": "success",
        "filename": file.filename,
        "pages": len(text_pages),
        "characters": len(extracted_text),
        "preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
    }


@router.get("/file")
def get_allegation_file():
    """Return the uploaded allegation PDF and its page count."""
    pdf_files = list(state.UPLOADS_DIR.glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=404, detail="No allegation file found.")
    
    # Assume there's only one uploaded for the demo
    pdf_path = pdf_files[0]
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
    except Exception:
        page_count = 0
        
    try:
        with open(pdf_path, "rb") as f:
            file_data = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read file content.")
        
    return {
        "filename": pdf_path.name,
        "page_count": page_count,
        "content_type": "application/pdf",
        "file_base64": file_data
    }


# ── LLM summarisation ─────────────────────────────────────────────────────────

@router.post("/analyze")
def analyze_allegation():
    """Send extracted allegation text to Gemini and return structured summary."""
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found. Please upload the PDF first.")

    try:
        summary = llm.summarise_allegation(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    state.save_allegation_summary(summary)
    state.append_audit_log("Ravi", "Allegation analyzed", "allegation_summary.json", "LLM extraction complete")

    return {"status": "success", "summary": summary}


@router.get("/summary")
def get_allegation_summary():
    """Return stored allegation summary."""
    summary = state.get_allegation_summary()
    if not summary:
        raise HTTPException(status_code=404, detail="No allegation summary found. Run /allegation/analyze first.")
    return {"summary": summary}


# ── Allegation Q&A ────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    save_to_notes: bool = False


@router.post("/ask")
def ask_allegation(body: AskRequest):
    """Answer a question about the allegation document using Gemini."""
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found. Please upload the PDF first.")

    try:
        answer = llm.ask_allegation(body.question, text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    state.append_audit_log("Ravi", "LLM question asked", "Allegation Q&A", body.question[:80])

    if body.save_to_notes:
        state.append_case_note(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "allegation_qa",
                "question": body.question,
                "answer": answer,
            }
        )

    return {"question": body.question, "answer": answer}

@router.get("/asknotes")
def get_notes():
    """Return all saved case notes."""
    notes = state.get_case_notes()
    return {"notes": notes, "total": len(notes)}

# ── Allegation narrative (Storyteller) ───────────────────────────────────────

@router.post("/narrative")
def generate_narrative():
    """Generate a forensic narrative from the allegation document."""
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found.")

    try:
        narrative = llm.generate_narrative(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    return {"status": "success", "narrative": narrative}


# ── Allegation points ─────────────────────────────────────────────────────────

@router.get("/points")
def get_allegation_points():
    """Return generated allegation points, or generate them if they don't exist."""
    saved = state.get_allegation_points()
    if saved:
        return {"points": saved}
        
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found. Please upload the PDF first.")

    try:
        points = llm.generate_allegation_points(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    state.save_allegation_points(points)
    state.append_audit_log("Ravi", "Allegation points generated", "Allegation Points", f"Generated {len(points)} points via LLM")
    return {"points": points}


# ── Investigation Plan ────────────────────────────────────────────────────────

@router.get("/investigation-plan")
def get_investigation_plan():
    """Return generated investigation plan, or generate it if it doesn't exist."""
    saved = state.get_investigation_plan()
    if saved:
        return {"plan": saved}
        
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found. Please upload the PDF first.")

    try:
        plan = llm.generate_investigation_plan(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    state.save_investigation_plan(plan)
    state.append_audit_log("Ravi", "Investigation plan generated", "Investigation Plan", "Generated via LLM")
    return {"plan": plan}


# ── Raw allegation text ───────────────────────────────────────────────────────

@router.get("/text")
def get_allegation_text():
    """Return raw extracted allegation text."""
    text = state.get_allegation_text()
    if not text:
        raise HTTPException(status_code=404, detail="No allegation text found.")
    return {"text": text, "characters": len(text)}
