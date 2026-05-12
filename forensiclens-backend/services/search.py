# forensiclens-backend/services/search.py
# Keyword-based evidence retrieval — no embeddings needed for weekend demo

from services.state import get_evidence_index, get_evidence_text

GLOBAL_KEYWORDS = [
    "Oddity", "William", "Taylor", "invoice", "invoices", "approved",
    "approval", "Sarah", "Robin", "Isabelle", "Chen", "rates", "hours",
    "timesheet", "cost schedule", "overcharge", "kickback", "collusion",
]


def _score(text: str, keywords: list[str]) -> int:
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw.lower() in text_lower)


def score_relevance(content: str) -> str:
    score = _score(content, GLOBAL_KEYWORDS)
    # Check for high-relevance combos
    has_invoice = any(k in content.lower() for k in ["invoice", "overcharge", "billing"])
    has_person = any(k in content for k in ["Oddity", "William", "Sarah", "Isabelle"])
    if score >= 4 or (has_invoice and has_person):
        return "High"
    elif score >= 2:
        return "Medium"
    return "Low"


def retrieve_for_allegation_point(ap: dict, top_n: int = 6) -> list[dict]:
    """Return top-N evidence items matching an allegation point's keywords."""
    evidence_index = get_evidence_index()
    keywords = ap.get("keywords", []) + GLOBAL_KEYWORDS
    scored = []
    for ev in evidence_index:
        content = get_evidence_text(ev["file_name"])
        score = _score(content, keywords)
        if score > 0:
            scored.append((score, ev, content))
    scored.sort(key=lambda x: x[0], reverse=True)
    result = []
    for score, ev, content in scored[:top_n]:
        result.append({
            "evidence_id": ev["evidence_id"],
            "file_name": ev["file_name"],
            "content": content,
            "score": score,
        })
    return result


def retrieve_for_question(question: str, top_n: int = 5) -> list[dict]:
    """Return top-N evidence items relevant to a free-text question."""
    # Extract keywords from question (simple word split, filter short words)
    q_words = [w.strip("?.,!") for w in question.split() if len(w) > 3]
    keywords = q_words + GLOBAL_KEYWORDS
    evidence_index = get_evidence_index()
    scored = []
    for ev in evidence_index:
        content = get_evidence_text(ev["file_name"])
        score = _score(content, keywords)
        if score > 0:
            scored.append((score, ev, content))
    scored.sort(key=lambda x: x[0], reverse=True)
    result = []
    for score, ev, content in scored[:top_n]:
        result.append({
            "evidence_id": ev["evidence_id"],
            "file_name": ev["file_name"],
            "content": content,
            "score": score,
        })
    return result


def infer_linked_aps(content: str, allegation_points: list[dict]) -> list[str]:
    """Infer which allegation points an evidence file is most relevant to."""
    linked = []
    for ap in allegation_points:
        score = _score(content, ap.get("keywords", []))
        if score >= 2:
            linked.append(ap["id"])
    return linked
