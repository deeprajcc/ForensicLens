# forensiclens-backend/services/state.py
# Manages all persistent state as JSON files in data/ directory

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data"
EVIDENCE_DIR = DATA_DIR / "evidence_files"
UPLOADS_DIR = DATA_DIR / "uploads"

# Ensure dirs exist
DATA_DIR.mkdir(exist_ok=True)
EVIDENCE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# File paths
CASE_FILE = DATA_DIR / "case.json"
ALLEGATION_TEXT_FILE = DATA_DIR / "allegation_text.txt"
ALLEGATION_SUMMARY_FILE = DATA_DIR / "allegation_summary.json"
ALLEGATION_POINTS_FILE = DATA_DIR / "allegation_points.json"
EVIDENCE_INDEX_FILE = DATA_DIR / "evidence_index.json"
EVIDENCE_SCAN_FILE = DATA_DIR / "evidence_scan.json"
ISSUE_MATRIX_FILE = DATA_DIR / "issue_matrix.json"
CONCLUSION_FILE = DATA_DIR / "conclusion.json"
AUDIT_LOG_FILE = DATA_DIR / "audit_log.json"
CASE_NOTES_FILE = DATA_DIR / "case_notes.json"
CONFIRMATION_FILE = DATA_DIR / "confirmation.json"
INVESTIGATION_PLAN_FILE = DATA_DIR / "investigation_plan.json"


def _read(path: Path, default: Any = None) -> Any:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def _write(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _read_text(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def _write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


# ── Case ──────────────────────────────────────────────────────────────────────

def get_case():
    return _read(CASE_FILE)


def save_case(data: dict):
    _write(CASE_FILE, data)


# ── Allegation text ───────────────────────────────────────────────────────────

def get_allegation_text() -> str:
    return _read_text(ALLEGATION_TEXT_FILE)


def save_allegation_text(text: str):
    _write_text(ALLEGATION_TEXT_FILE, text)


def get_allegation_summary():
    return _read(ALLEGATION_SUMMARY_FILE)


def save_allegation_summary(data: dict):
    _write(ALLEGATION_SUMMARY_FILE, data)


# ── Allegation points ─────────────────────────────────────────────────────────

def get_allegation_points():
    return _read(ALLEGATION_POINTS_FILE, [])


def save_allegation_points(data: list):
    _write(ALLEGATION_POINTS_FILE, data)


# ── Investigation Plan ────────────────────────────────────────────────────────

def get_investigation_plan():
    return _read(INVESTIGATION_PLAN_FILE)

def save_investigation_plan(data: dict):
    _write(INVESTIGATION_PLAN_FILE, data)

# ── Confirmation ──────────────────────────────────────────────────────────────

def get_confirmation():
    return _read(CONFIRMATION_FILE)


def save_confirmation(data: dict):
    _write(CONFIRMATION_FILE, data)


# ── Evidence ──────────────────────────────────────────────────────────────────

def get_evidence_index():
    return _read(EVIDENCE_INDEX_FILE, [])


def save_evidence_index(data: list):
    _write(EVIDENCE_INDEX_FILE, data)


def get_evidence_text(file_name: str) -> str:
    path = EVIDENCE_DIR / file_name
    return _read_text(path)


def save_evidence_file(file_name: str, content: str):
    path = EVIDENCE_DIR / file_name
    _write_text(path, content)


def list_evidence_files() -> list[str]:
    return [f.name for f in EVIDENCE_DIR.iterdir() if f.is_file()]


# ── Evidence scan ─────────────────────────────────────────────────────────────

def get_evidence_scan():
    return _read(EVIDENCE_SCAN_FILE, {})


def save_evidence_scan(data: dict):
    _write(EVIDENCE_SCAN_FILE, data)


# ── Issue matrix ──────────────────────────────────────────────────────────────

def get_issue_matrix():
    return _read(ISSUE_MATRIX_FILE, [])


def save_issue_matrix(data: list):
    _write(ISSUE_MATRIX_FILE, data)


# ── Conclusion ────────────────────────────────────────────────────────────────

def get_conclusion():
    return _read(CONCLUSION_FILE)


def save_conclusion(data: dict):
    _write(CONCLUSION_FILE, data)


# ── Case notes ────────────────────────────────────────────────────────────────

def get_case_notes():
    return _read(CASE_NOTES_FILE, [])


def append_case_note(note: dict):
    notes = get_case_notes()
    notes.append(note)
    _write(CASE_NOTES_FILE, notes)


# ── Audit log ─────────────────────────────────────────────────────────────────

def get_audit_log():
    return _read(AUDIT_LOG_FILE, [])


def append_audit_log(user: str, action: str, obj: str, details: str = ""):
    log = get_audit_log()
    log.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": user,
            "action": action,
            "object": obj,
            "details": details,
        }
    )
    _write(AUDIT_LOG_FILE, log)


# ── Status flags ──────────────────────────────────────────────────────────────

def get_status_flags() -> dict:
    return {
        "allegation_uploaded": ALLEGATION_TEXT_FILE.exists(),
        "allegation_summary_generated": ALLEGATION_SUMMARY_FILE.exists(),
        "allegation_points_generated": ALLEGATION_POINTS_FILE.exists(),
        "evidence_uploaded": EVIDENCE_INDEX_FILE.exists()
        and len(get_evidence_index()) > 0,
        "evidence_scan_generated": EVIDENCE_SCAN_FILE.exists(),
        "issue_matrix_reviewed": ISSUE_MATRIX_FILE.exists(),  # updated when user edits
        "conclusion_generated": CONCLUSION_FILE.exists(),
        "human_review_completed": ISSUE_MATRIX_FILE.exists(),
    }


def reset_state():
    """Remove all JSON files in data/ and all files in uploads/ and evidence_files/."""
    # Remove all .json files in the main data directory
    for f in DATA_DIR.glob("*.json"):
        f.unlink(missing_ok=True)
    # Remove all files in the evidence_files directory
    for f in EVIDENCE_DIR.iterdir():
        if f.is_file(): f.unlink()
    # Remove all files in the uploads directory
    for f in UPLOADS_DIR.iterdir():
        if f.is_file(): f.unlink()
