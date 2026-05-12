# forensiclens-backend/routers/report.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services import state, llm
import os, json

router = APIRouter(prefix="/report", tags=["Report Builder"])

REPORT_PATH = os.path.join(os.path.dirname(__file__), "../data/report.json")


class GenerateReportPayload(BaseModel):
    template: str = "Preliminary Allegation Assessment Memo"
    include_human_approved_only: bool = True
    include_unresolved: bool = True
    include_evidence_gaps: bool = True
    include_source_references: bool = True
    include_audit_trail: bool = True


def _load_report() -> dict | None:
    if os.path.exists(REPORT_PATH):
        with open(REPORT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_report(data: dict):
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _build_report_from_data(
    payload: GenerateReportPayload,
    case: dict,
    matrix: list,
    conclusion: dict,
    evidence_index: list,
    audit_log: list,
) -> dict:
    """Assemble a structured report dict from stored data — no LLM needed."""

    now = datetime.now(timezone.utc)
    investigator = case.get("investigator", "Investigator")

    # Filter matrix rows based on controls
    rows = matrix
    if payload.include_human_approved_only:
        approved_statuses = {"Accepted", "Edited and Approved", "Final — Ready for Report"}
        rows = [r for r in matrix if r.get("review_status") in approved_statuses] or matrix

    if not payload.include_unresolved:
        rows = [r for r in rows if r.get("investigator_assessment") != "Unresolved"]

    # ── Section builders ──────────────────────────────────────────────────────

    executive_summary = conclusion.get("executive_summary", "") if conclusion else (
        "Indicators consistent with potential vendor invoice manipulation involving Oddity have been "
        "identified. Direct evidence of kickback has not been identified to date. This is a preliminary "
        "assessment only and requires further investigation."
    )

    background = (
        f"This assessment was prepared by {investigator} in relation to Case {case.get('case_id', 'FI-2026-001')}. "
        f"The matter concerns {case.get('case_name', 'Oddity Vendor Invoice Manipulation Allegation')}. "
        f"Client: {case.get('client', 'Demo Client')}. Jurisdiction: {case.get('jurisdiction', 'United Kingdom / Demo')}. "
        f"Scope: {case.get('scope_notes', 'Preliminary review of alleged contractor invoice manipulation.')} "
        f"Confidentiality: {case.get('confidentiality_level', 'Confidential')}."
    )

    allegation_received = (
        f"An allegation was received on {case.get('allegation_date', '09 June 2025')} via "
        f"{case.get('allegation_source', 'internal escalation / whistleblower interview')}. "
        + (conclusion.get("allegation_overview", "") if conclusion else
           "The allegation raises concerns regarding potential invoice manipulation by Oddity, "
           "including inflated billing, misrepresentation of personnel on-site, and potential "
           "weaknesses in internal approval controls exercised by William Taylor.")
    )

    scope_and_limitations = (
        "This assessment is based on a review of the allegation document and the evidence corpus "
        "provided. It represents a preliminary, AI-assisted assessment only. It does not constitute "
        "a finding of fraud or misconduct. Significant evidence gaps remain, and further investigation "
        "is required before any conclusions can be drawn. All AI-generated outputs have been subject "
        "to investigator review."
    )

    allegation_points_section = []
    for r in rows:
        ap_entry = {
            "id": r.get("id"),
            "issue": r.get("issue"),
            "category": r.get("category"),
            "party": r.get("party"),
            "status": r.get("investigator_assessment"),
            "review_status": r.get("review_status", "Pending Review"),
        }
        if payload.include_source_references:
            ap_entry["evidence_reviewed"] = r.get("evidence_reviewed", [])
        allegation_points_section.append(ap_entry)

    evidence_reviewed_section = {
        "total_files": len(evidence_index),
        "high_relevance": sum(1 for e in evidence_index if e.get("relevance_label") == "High"),
        "medium_relevance": sum(1 for e in evidence_index if e.get("relevance_label") == "Medium"),
        "low_relevance": sum(1 for e in evidence_index if e.get("relevance_label") == "Low"),
        "summary": conclusion.get("evidence_reviewed", "") if conclusion else
            f"{len(evidence_index)} evidence files were extracted and reviewed. "
            "Files included email chains, correspondence, and documentary evidence.",
    }

    evidence_assessment = []
    for r in rows:
        finding = r.get("revised_finding") or r.get("assessment_rationale", "")
        if payload.include_human_approved_only and not finding:
            finding = r.get("assessment_rationale", "No assessment available.")
        entry = {
            "id": r.get("id"),
            "issue": r.get("issue"),
            "finding": finding,
            "proposed_status": r.get("investigator_assessment"),
            "support": r.get("support", ""),
            "contradiction": r.get("contradiction", ""),
        }
        if payload.include_evidence_gaps:
            entry["gap"] = r.get("gap", "")
        evidence_assessment.append(entry)

    preliminary_findings = conclusion.get("preliminary_findings", []) if conclusion else [
        {"allegation_point": r.get("id"), "finding": r.get("assessment_rationale", ""), "status": r.get("investigator_assessment")}
        for r in rows
    ]

    unresolved = []
    if payload.include_unresolved:
        unresolved = [
            {"id": r.get("id"), "issue": r.get("issue"), "gap": r.get("gap", "")}
            for r in matrix if r.get("investigator_assessment") in {"Unresolved", "Insufficient Evidence"}
        ]

    evidence_gaps = conclusion.get("evidence_gaps", []) if conclusion else [
        r.get("gap") for r in rows if r.get("gap")
    ]

    recommended_next_steps = conclusion.get("recommended_next_steps", []) if conclusion else [
        "Obtain and reconcile all Oddity invoices against agreed timesheets and cost schedules.",
        "Review William Taylor's invoice approval history and authorisation chain.",
        "Review relevant communications (email, messaging) involving Oddity.",
        "Consider interviews with relevant parties.",
        "Assess notification obligations to management and legal.",
    ]

    appendix_evidence = []
    if payload.include_source_references:
        appendix_evidence = [
            {
                "evidence_id": e.get("evidence_id"),
                "file_name": e.get("file_name"),
                "evidence_type": e.get("evidence_type"),
                "relevance": e.get("relevance_label"),
                "linked_aps": e.get("linked_allegation_points", []),
                "status": e.get("status"),
            }
            for e in evidence_index
        ]

    appendix_audit = []
    if payload.include_audit_trail:
        appendix_audit = audit_log[-30:]  # last 30 entries

    disclaimer = (
        conclusion.get("disclaimer", "") if conclusion else
        "This is an AI-assisted preliminary assessment only. It does not constitute a finding of fraud, "
        "misconduct, or any legal conclusion. All assessments require investigator review and approval before use."
    )

    return {
        "meta": {
            "report_title": f"{payload.template} — {case.get('case_id', 'FI-2026-001')}",
            "template": payload.template,
            "case_id": case.get("case_id"),
            "case_name": case.get("case_name"),
            "client": case.get("client"),
            "investigator": investigator,
            "generated_at": now.isoformat(),
            "version": "v0.1 Draft",
            "status": "Draft — Requires Investigator Review",
            "controls_applied": {
                "human_approved_only": payload.include_human_approved_only,
                "include_unresolved": payload.include_unresolved,
                "include_evidence_gaps": payload.include_evidence_gaps,
                "include_source_references": payload.include_source_references,
                "include_audit_trail": payload.include_audit_trail,
            },
        },
        "sections": {
            "1_executive_summary": executive_summary,
            "2_background": background,
            "3_allegation_received": allegation_received,
            "4_scope_and_limitations": scope_and_limitations,
            "5_allegation_points": allegation_points_section,
            "6_evidence_reviewed": evidence_reviewed_section,
            "7_evidence_assessment": evidence_assessment,
            "8_preliminary_observations": preliminary_findings,
            "9_unresolved_matters": unresolved,
            "10_recommended_next_steps": recommended_next_steps,
        },
        "appendices": {
            "A_evidence_register": appendix_evidence,
            "B_audit_trail": appendix_audit,
        },
        "disclaimer": disclaimer,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_report(payload: GenerateReportPayload = None):
    """Build a structured report from stored case data """
    if payload is None:
        payload = GenerateReportPayload()

    case = state.get_case()
    matrix = state.get_issue_matrix()
    conclusion = state.get_conclusion()
    evidence_index = state.get_evidence_index()
    audit_log = state.get_audit_log()

    if not case:
        raise HTTPException(status_code=404, detail="No case found. Create a case first.")
    if not matrix:
        raise HTTPException(status_code=404, detail="No issue matrix found. Run evidence scan first.")

    report = _build_report_from_data(payload, case, matrix, conclusion or {}, evidence_index, audit_log)
    _save_report(report)

    state.append_audit_log(
        case.get("investigator", "Investigator"),
        "Report generated",
        report["meta"]["report_title"],
        f"Template: {payload.template}",
    )

    return {"status": "success", "report": report}


@router.get("/")
def get_report():
    """Return stored report."""
    report = _load_report()
    if not report:
        raise HTTPException(status_code=404, detail="No report found. Run POST /report/generate first.")
    return {"report": report}


@router.get("/preview")
def get_report_preview():
    """Return a lightweight preview (meta + executive summary only)."""
    report = _load_report()
    if not report:
        raise HTTPException(status_code=404, detail="No report found. Run POST /report/generate first.")
    return {
        "meta": report["meta"],
        "executive_summary": report["sections"]["1_executive_summary"],
        "section_count": len(report["sections"]),
        "allegation_points_count": len(report["sections"].get("5_allegation_points", [])),
        "evidence_count": len(report["appendices"].get("A_evidence_register", [])),
    }
