import io
import os
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader

from app.services.resume_analyzer import analyze_resume


router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"]
)


MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    print("\n========== RESUME UPLOAD ==========")

    # 1. Filename
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    print("Filename:", file.filename)

    # 2. PDF validation
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    print("PDF validation OK")

    # 3. Read file
    content = await file.read()

    print("File bytes:", len(content))

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5 MB."
        )

    # 4. Extract PDF text
    print("Creating PDF reader...")

    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as e:
        print("PDF reader error:", e)

        raise HTTPException(
            status_code=400,
            detail=f"Invalid PDF: {str(e)}"
        )

    print("PDF pages:", len(reader.pages))

    text_parts = []

    for index, page in enumerate(reader.pages):

        print(
            f"Reading page {index + 1}/{len(reader.pages)}"
        )

        try:
            page_text = page.extract_text()
        except Exception as e:
            print(
                f"Page {index + 1} extraction error:",
                e
            )
            page_text = ""

        if page_text:
            text_parts.append(page_text)

    text = "\n".join(text_parts).strip()

    print("Extracted characters:", len(text))

    if not text:
        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text found in this PDF. "
                "Please upload a text-based PDF resume."
            )
        )

    # 5. Analyze resume
    print("Starting resume analyzer...")

    try:
        analysis = analyze_resume(text)
    except Exception as e:
        print("Analyzer error:", e)

        raise HTTPException(
            status_code=500,
            detail=f"Resume analysis failed: {str(e)}"
        )

    print("Resume analyzer completed")

    # 6. Add full resume text
    analysis["resume_text"] = text

    # 7. Save uploaded file
    try:

        os.makedirs("uploads", exist_ok=True)

        filename = (
            f"{uuid.uuid4()}_{file.filename}"
        )

        filepath = os.path.join(
            "uploads",
            filename
        )

        with open(filepath, "wb") as f:
            f.write(content)

        print("Saved:", filepath)

    except Exception as e:
        print("File save warning:", e)

    print("Returning response")
    print("========== UPLOAD COMPLETE ==========\n")

    return {
        "filename": file.filename,
        "analysis": analysis
    }