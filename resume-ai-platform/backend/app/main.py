from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, resumes, jobs

app = FastAPI(
    title="ResumeAI API",
    version="1.0.0",
    description="AI Resume Analyzer & Job Matcher API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")

@app.get("/")
def root():
    return {
        "name": "ResumeAI API",
        "status": "running",
        "docs": "/docs"
    }
