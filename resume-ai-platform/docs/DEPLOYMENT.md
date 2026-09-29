# Deployment Guide

1. Push the repository to GitHub.
2. Provision PostgreSQL.
3. Deploy `backend/` using Docker or a Python web service.
4. Set `DATABASE_URL`, `SECRET_KEY`, and `UPLOAD_DIR`.
5. Deploy `frontend/` as a Vite static application.
6. Set the frontend API URL to the deployed backend.
7. Configure CORS for the production frontend domain.
8. Use managed object storage for production resume files.
9. Never commit `.env` or credentials.
