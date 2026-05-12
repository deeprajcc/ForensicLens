# ForensicLens — Backend API

AI-assisted forensic case assessment backend for the Oddity demo case.

---

## Quick Start

### 1. Install dependencies

```bash
cd forensiclens-backend
pip install -r requirements.txt
```

### 2. Set up your API key

```bash
cp .env.example .env
# Open .env and paste your Google Gemini API key
```

Get a Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Start the server

```bash
uvicorn main:app --reload --port 8000
```

API is now running at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

## API Endpoints — Quick Reference

| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | `/case/create` | Create/load the demo case |
| GET | `/case/` | Get case data + status flags |
| POST | `/allegation/upload` | Upload allegation PDF (form-data) |
| GET | `/allegation/file` | Get the allegation File |
| POST | `/allegation/analyze` | Run Gemini extraction on uploaded PDF |
| GET | `/allegation/summary` | Get stored allegation summary |
| POST | `/allegation/ask` | Ask a question about the allegation |
| GET | `/allegation/asknotes` | Return all saved case notes |
| GET | `/allegation/points` | Return generated allegation points |
| POST | `/allegation/narrative` | Generate a forensic narrative  |
| GET | `/allegation/investigation-plan` | Return generated investigation plan |
| GET | `/allegation/text` |  Return raw extracted allegation text. |
| POST | `/evidence/upload` | Upload evidence ZIP (form-data) |
| GET | `/evidence/register` | Get full evidence register |
| GET | `/file/{evidence_id}` | GET evidence file |
| POST | `/evidence/scan` | Run evidence scan (maps APs to evidence) |
| GET | `/evidence/scan` | Get stored scan results |
| GET | `/issue-matrix/` | Get issue matrix (auto-builds from scan) |
| POST | `/issue-matrix/rebuild` | Force rebuild issue matrix |
| POST | `/conclusion/generate` | Generate conclusion from issue matrix |
| GET | `/conclusion/` | Get stored conclusion |
| GET | `/audit-log/` | Get full audit log |
| GET | `/human-review/` | Return all issue matrix rows formatted for human review.  |
| GET | `/human-review/{ap_id}` | Return a single AP row for review.  |  
| POST | `/human-review/{ap_id}` | Submit review action for an allegation point. | 
| POST | `/report/generate` | Build a structured report from stored case data. | 
| GET | `/report/` | Return stored report. | 
| GET | `/report/preview` | Return a lightweight preview (meta+executive summary only). | 


## Project Structure

```
forensiclens-backend/
├── main.py                    ← FastAPI app + CORS
├── requirements.txt
├── .env.example               ← Copy to .env, add Gemini key
├── routers/
│   ├── case.py
│   ├── allegation.py          ← PDF upload, LLM Q&A, allegation points
│   ├── evidence.py            ← ZIP upload, register, Q&A, scan
│   ├── issue_matrix.py
│   ├── conclusion.py
│   ├── audit.py
│   
├── services/
│   ├── llm.py                 ← All Gemini prompts
│   ├── state.py               ← JSON file persistence
│   └── search.py              ← Keyword evidence retrieval
└── data/
    ├── static_data.py         ← Demo case + AP-001 to AP-007
    └── evidence_files/        ← Auto-created on evidence upload
```
