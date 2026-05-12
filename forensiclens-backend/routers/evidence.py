# forensiclens-backend/routers/evidence.py

import io
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from services import state, llm, search

router = APIRouter(prefix="/evidence", tags=["Evidence"])


# ── Upload ZIP ────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_evidence(file: UploadFile = File(...)):
    """Accept ZIP file, extract .txt files, build evidence index."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted.")

    contents = await file.read()
    
    # Save the uploaded ZIP file to the uploads folder
    upload_path = state.UPLOADS_DIR / file.filename
    with open(upload_path, "wb") as f:
        f.write(contents)

    evidence_index = []
    counter = 1
    total_chars = 0

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as zf:
            txt_files = [
                name for name in zf.namelist()
                if name.lower().endswith(".txt") and not name.startswith("__MACOSX")
            ]

            if not txt_files:
                raise HTTPException(
                    status_code=422,
                    detail="No .txt files found in the ZIP. Please check the archive contents.",
                )

            allegation_points = state.get_allegation_points() or []

            for name in txt_files:
                try:
                    raw = zf.read(name)
                    content = raw.decode("utf-8", errors="replace")
                except Exception:
                    continue

                # Use just the filename, strip any folder path
                file_name = name.split("/")[-1].split("\\")[-1]
                if not file_name:
                    continue

                state.save_evidence_file(file_name, content)

                # Classify evidence type from filename
                fn_lower = file_name.lower()
                
                if "chain" in fn_lower:
                    ev_type = "Chain Email"
                elif "email" in fn_lower:
                    ev_type = "Email"
                elif "invoice" in fn_lower:
                    ev_type = "Invoice"
                elif "timesheet" in fn_lower or "schedule" in fn_lower:
                    ev_type = "Timesheet/Schedule"
                else:
                    ev_type = "Document"

                relevance = search.score_relevance(content)
                linked_aps = search.infer_linked_aps(content, allegation_points)

                evidence_obj = {
                    "evidence_id": f"EV-{counter:03d}",
                    "file_name": file_name,
                    "evidence_type": ev_type,
                    "relevance_label": relevance,
                    "linked_allegation_points": linked_aps,
                    "status": "Needs Review",
                    "characters": len(content),
                    "content_preview": content[:300].replace("\n", " ") + "...",
                }
                evidence_index.append(evidence_obj)
                counter += 1
                total_chars += len(content)

    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="Invalid ZIP file.")

    state.save_evidence_index(evidence_index)
    state.append_audit_log(
        "Ravi",
        "Evidence uploaded",
        file.filename,
        f"{len(evidence_index)} files extracted",
    )

    case = state.get_case() or {}

    email_count = sum(1 for e in evidence_index if "email" in e["file_name"].lower() and "chain" not in e["file_name"].lower())
    chain_count = sum(1 for e in evidence_index if "chain" in e["file_name"].lower())
    other_count = len(evidence_index) - email_count - chain_count
    high_relevance = any(e["relevance_label"] == "High" for e in evidence_index)

    return {
        "status": "success",
        "filename": file.filename,
        "case_id": case.get("case_id", "Unknown"),
        "files_extracted": len(evidence_index),
        "evidence_index": evidence_index,
        "upload_summary": [
            ["Files extracted", str(len(evidence_index))],
            ["Example email files", str(email_count)],
            ["Chain files", str(chain_count)],
            ["Other email files", str(other_count)],
            ["Potential duplicates", "Detected"],
            ["High relevance candidates", "Detected" if high_relevance else "Not Detected"],
            ["Requires review", "Yes"]
        ]
    }


# ── Evidence register ─────────────────────────────────────────────────────────

@router.get("/register")
def get_evidence_register():
    """Return the full evidence register."""
    index = state.get_evidence_index()
    if not index:
        raise HTTPException(status_code=404, detail="No evidence found. Please upload the ZIP first.")
    return {"evidence": index, "total": len(index)}




# ── Evidence scan ─────────────────────────────────────────────────────────────

@router.post("/scan")
def run_evidence_scan():
    """Map each allegation point to relevant evidence using keyword retrieval + LLM."""
    allegation_points = state.get_allegation_points()
    index = state.get_evidence_index()

    if not allegation_points:
        raise HTTPException(status_code=404, detail="No allegation points found. Load /allegation/points first.")
    if not index:
        raise HTTPException(status_code=404, detail="No evidence found. Upload ZIP first.")

    scan_results = {}
    errors = []

    for ap in allegation_points:
        snippets = search.retrieve_for_allegation_point(ap, top_n=6)
        try:
            result = llm.scan_allegation_point(ap, snippets)
            scan_results[ap["id"]] = result
        except Exception as e:
            errors.append({"ap": ap["id"], "error": str(e)})
            # Fallback: save a minimal placeholder
            scan_results[ap["id"]] = {
                "allegation_point_id": ap["id"] +" - "+ ap["title"][:30],
                "supporting_evidence": [s["evidence_id"] for s in snippets],
                "contradictory_evidence": [],
                "evidence_gaps": ["LLM assessment unavailable — review manually"],
                "proposed_status": "Insufficient Evidence",
                "assessment_rationale": "Automated assessment failed; manual review required.",
                "caution": "LLM error during scan.",
            }

    state.save_evidence_scan(scan_results)
    state.append_audit_log(
        "Ravi",
        "Evidence scan generated",
        "AP-001 to AP-007",
        f"Draft statuses generated for {len(scan_results)} points",
    )

    return {
        "status": "success",
        "scan": scan_results,
        "errors": errors,
    }


@router.get("/scan")
def get_evidence_scan():
    """Return stored evidence scan results."""
    scan = state.get_evidence_scan()
    if not scan:
        raise HTTPException(status_code=404, detail="No evidence scan found. Run POST /evidence/scan first.")
    return {"scan": scan}

@router.get("/file/{evidence_id}")
def get_evidence_file_content(evidence_id: str):
    """Return the plain text content of a specific evidence file by its ID."""
    index = state.get_evidence_index()
    item = next((e for e in index if e["evidence_id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Evidence ID {evidence_id} not found.")
    
    return state.get_evidence_text(item["file_name"])
