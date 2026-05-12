# forensiclens-backend/main.py
# ForensicLens — FastAPI Backend
# Run with: uvicorn main:app --reload --port 8000

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import certifi

# This tells the SSL module exactly where the file is
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
load_dotenv()

from routers import allegation, evidence, issue_matrix, conclusion, audit, case,human_review, report

app = FastAPI(
    title="ForensicLens API",
    description="AI-assisted forensic case assessment backend — Demo build",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the Lovable preview URL and localhost dev server
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(case.router)
app.include_router(allegation.router)
app.include_router(evidence.router)
app.include_router(issue_matrix.router)
app.include_router(conclusion.router)
app.include_router(audit.router)
app.include_router(human_review.router)
app.include_router(report.router)


