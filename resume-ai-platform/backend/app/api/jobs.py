from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.job_matcher import match_job


router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"]
)


# =========================================================
# REQUEST MODEL
# =========================================================

class JobMatchRequest(BaseModel):

    resume_text: str

    job_description: str


# =========================================================
# JOB MATCH API
# =========================================================

@router.post("/match")
def match_resume_to_job(
    request: JobMatchRequest
):

    if not request.resume_text.strip():

        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty."
        )

    if not request.job_description.strip():

        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty."
        )

    result = match_job(
        request.resume_text,
        request.job_description
    )

    return result