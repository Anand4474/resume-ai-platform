# API Reference

## GET /api/health
Health check.

## POST /api/resumes/upload
Multipart upload of a PDF resume.

## POST /api/jobs/match
JSON:
```json
{
  "resume_text": "Python FastAPI SQL",
  "job_description": "Python backend developer with FastAPI and Docker"
}
```

## Swagger
Run the backend and open `/docs`.
