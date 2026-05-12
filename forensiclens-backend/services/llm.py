# forensiclens-backend/services/llm.py

import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
import certifi
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
load_dotenv()

# Accept either GEMINI_API_KEY or GOOGLE_API_KEY in .env
api_key = "AIz4" if "GOOGLE_API_KEY" in os.environ else os.getenv("API_KEY")
#print(api_key)
if not api_key:
    raise RuntimeError(
        "No Gemini API key found. Add GEMINI_API_KEY=your_key to your .env file."
    )
os.environ["GOOGLE_API_KEY"] = api_key

_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)


def _generate(prompt: str) -> str:
    return _llm.invoke(prompt).content.strip()


def _extract_json(text: str) -> dict | list:
    """Strip markdown fences and parse JSON from LLM response."""
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


# ── 1. Allegation summarisation ───────────────────────────────────────────────

def summarise_allegation(allegation_text: str) -> dict:
    prompt = f"""
You are a forensic investigator's assistant. Extract structured facts from the allegation document below.

Return ONLY a valid JSON object with EXACTLY these keys. Do not use markdown formatting like ```json.
{{
  "interview_date": "",
  "main_vendor": "",
  "internal_subject": "",
  "key_parties": [
    {{
      "Name": "",
      "Role": "",
      "Relevance": "Keep this short and precise"
    }}
  ],
  "estimated_overcharge": "",
  "already_paid": "",
  "specific_invoice": "",
  "immediate_action_discussed": "",
  "allegation_themes": [],
  "warnings": []
}}

Allegation document:
{allegation_text}
"""
    return _extract_json(_generate(prompt))


# ── 2. Allegation Q&A ─────────────────────────────────────────────────────────

def ask_allegation(question: str, allegation_text: str) -> str:
    prompt = f"""
You are assisting a forensic investigator. Answer the question using ONLY the allegation document provided.

Do not make findings of fraud. Use cautious forensic language. Do not state conclusions as proven.
Provide a correct, precise, and short answer in 2-3 lines. Do not use JSON formatting or markdown.

Question: {question}

Allegation document:
{allegation_text}
"""
    return _generate(prompt)





# ── 4. Evidence scan (per allegation point) ───────────────────────────────────

def scan_allegation_point(ap: dict, snippets: list) -> dict:
    snippets_text = "\n\n".join(
        f"[{s['evidence_id']} — {s['file_name']}]\n{s['content'][:1500]}"
        for s in snippets
    )
    prompt = f"""
You are assisting a forensic investigator.

Assess the allegation point against the evidence snippets provided.

Do NOT conclude fraud. Use cautious wording.
Classify status as exactly one of: Supported | Partially Supported | Unresolved | Contradicted | Insufficient Evidence
Each item in 'evidence_gaps' must be short and precise. Provide only 2-3 key main gaps.

Return ONLY a valid JSON object with EXACTLY these keys. Do not use markdown formatting like ```json.
{{
  "allegation_point_id": "{ap['id']} — {ap['title']}",
  "supporting_evidence": [],
  "contradictory_evidence": [],
  "evidence_gaps": [],
  "proposed_status": "",
  "assessment_rationale": "",
  "caution": ""
}}

Allegation point: {ap['id']} — {ap['title']}
Category: {ap['category']}
Period: {ap['period']}

Evidence snippets:
{snippets_text if snippets_text.strip() else "No matching evidence snippets found for this allegation point."}
"""
    return _extract_json(_generate(prompt))


# ── 5. Conclusion generation ──────────────────────────────────────────────────

def generate_conclusion(issue_matrix: list) -> dict:
    matrix_text = json.dumps(issue_matrix, indent=2)
    prompt = f"""
You are assisting a forensic investigator preparing a preliminary assessment.

Generate a cautious pre-investigation conclusion using ONLY the issue matrix provided.

Rules:
- Do NOT conclude fraud has occurred
- Do NOT state collusion or kickback as proven
- Use cautious language: "potential indicators", "preliminary assessment", "evidence reviewed to date", "requires further investigation", "direct evidence not identified"
- Clearly separate allegation, suspicion, and evidenced elements
- Each item in 'evidence_gaps' must be a 2-4 word line only. and gaps should be less than 10 in count.
- Each item in 'recommended_next_steps' must be a short, single-line precise step.
- evidence_reviewed should the source of evidence (e.g., "Invoice #123, Email from John on 1/2/2025") rather than a long narrative.
Return ONLY a valid JSON object with EXACTLY these keys. Do not use markdown formatting like ```json.
{{
  "executive_summary": "",
  "allegation_overview": "",
  "evidence_reviewed": [],
  "preliminary_findings": [
    {{"allegation_point": "AP-001", "finding": "", "status": ""}}
  ],
  "evidence_gaps": [],
  "recommended_next_steps": [],
  "disclaimer": ""
}}

Issue matrix:
{matrix_text}
"""
    return _extract_json(_generate(prompt))


# ── 6. Allegation narrative (Storyteller) ────────────────────────────────────

def generate_narrative(allegation_text: str) -> dict:
    prompt = f"""
You are assisting a forensic investigator.

Create a cautious forensic allegation narrative from the document below.
- Do not conclude fraud
- Clearly separate allegation, suspicion, and unsupported elements
- Use professional, measured language
- Keep all fields short and precise except for the narrative summary (1-2 lines maximum)

Return ONLY a valid JSON object with EXACTLY these keys. Do not use markdown formatting like ```json.
{{
  "narrative_summary": "A 1-2 paragraph overall summary",
  "background": "Context and background information (1-2 lines)",
  "alleged_conduct": "Summary of the alleged misconduct (1-2 lines)",
  "key_persons": "Key individuals and entities involved (1-2 lines)",
  "financial_exposure": "Potential financial impact or exposure (1-2 lines)",
  "immediate_concern": "Any immediate risks or actions required (1-2 lines)",
  "unproven_elements": "Elements of the allegation lacking direct evidence (1-2 lines)",
  "investigation_need": "Key areas requiring evidence and focus (1-2 lines)"
}}

Allegation document:
{allegation_text}
"""
    return _extract_json(_generate(prompt))


# ── 7. Allegation points generation ──────────────────────────────────────────

def generate_allegation_points(allegation_text: str) -> list:
    prompt = f"""
You are assisting a forensic investigator.

Extract specific allegation points from the allegation document below. Break down the overall allegation into distinct, testable claims (e.g., specific instances of overcharging, specific control failures).

Return ONLY a valid JSON list of objects with EXACTLY these keys. Do not use markdown formatting like ```json.
[
  {{
    "id": "AP-001",
    "title": "Short title of the specific allegation",
    "category": "e.g., Invoice Fraud, Conflict of Interest, Control Failure",
    "party": "The person or entity involved",
    "period": "The timeframe, e.g., Mar-May 2025",
    "evidence_needed": ["List of 2-3 types of documents needed to prove/disprove"],
    "initial_status": "Requires Evidence",
    "keywords": ["list", "of", "5-8", "search", "keywords"]
  }}
]

Ensure IDs increment sequentially (AP-001, AP-002, etc.).

Allegation document:
{allegation_text}
"""
    return _extract_json(_generate(prompt))


# ── 8. Investigation Plan ──────────────────────────────────────────────────

def generate_investigation_plan(allegation_text: str) -> dict:
    prompt = f"""
You are assisting a forensic investigator.

Create a preliminary investigation plan based on the allegation document below.
The response must contain exactly two sections:
keep it short and precise, with no more than 10 recommended steps and 10 evidence requests.
1) Recommended Steps (Priority Order) - A list of actionable investigation steps(not more than 10).
2) Evidence Request List - A list of specific documents and data to request(not more than 10).

Return ONLY a valid JSON object with EXACTLY these keys. Do not use markdown formatting like ```json.
{{
  "recommended_steps": [
    "Step 1...",
    "Step 2..."
  ],
  "evidence_request_list": [
    "Item 1...",
    "Item 2..."
  ]
}}

Allegation document:
{allegation_text}
"""
    return _extract_json(_generate(prompt))
