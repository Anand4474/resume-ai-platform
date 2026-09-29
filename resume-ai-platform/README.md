# AI Resume Analyzer & Job Matcher

A professional full-stack starter project for analyzing resumes and matching them against job descriptions.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL (Docker Compose)
- NLP/ML: scikit-learn + PyPDF
- Authentication: JWT-ready structure
- Deployment: Docker + cloud-ready structure

## Quick Start

### 1. Start PostgreSQL
```bash
docker compose up -d db
```

### 2. Backend
Windows PowerShell:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Important
This ZIP is a complete starter implementation. Replace the placeholder database secret and configure `.env` before production deployment.
