import re
from typing import List, Set

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


TECHNICAL_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "fastapi",
    "django",
    "flask",
    "react",
    "node.js",
    "node",
    "angular",
    "rest api",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "machine learning",
    "ml",
    "deep learning",
    "dl",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "scikit-learn",
    "mlflow",
    "airflow",
    "git",
    "github",
    "linux",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "html",
    "css",
    "bootstrap",
    "tailwind",
    "microservices",
    "ci/cd",
    "jenkins",
    "terraform",
    "spark",
    "hadoop",
    "power bi",
    "tableau",
]


def normalize_text(text: str) -> str:
    """Normalize text for NLP comparison."""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_skills(text: str) -> List[str]:
    """Extract known technical skills from text."""
    normalized = normalize_text(text)

    found = []

    for skill in TECHNICAL_SKILLS:
        pattern = re.escape(skill.lower())

        if re.search(r"(?<!\w)" + pattern + r"(?!\w)", normalized):
            found.append(skill)

    return sorted(set(found))


def calculate_text_similarity(
    resume_text: str,
    job_description: str,
) -> float:
    """Calculate TF-IDF cosine similarity between resume and job description."""

    resume_text = normalize_text(resume_text)
    job_description = normalize_text(job_description)

    if not resume_text or not job_description:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
        )

        matrix = vectorizer.fit_transform(
            [resume_text, job_description]
        )

        similarity = cosine_similarity(
            matrix[0:1],
            matrix[1:2],
        )[0][0]

        return round(float(similarity * 100), 2)

    except ValueError:
        return 0.0


def calculate_skill_match(
    resume_skills: List[str],
    job_skills: List[str],
) -> float:
    """Calculate percentage of required job skills found in resume."""

    if not job_skills:
        return 100.0

    resume_set: Set[str] = {
        skill.lower()
        for skill in resume_skills
    }

    job_set: Set[str] = {
        skill.lower()
        for skill in job_skills
    }

    matched = resume_set.intersection(job_set)

    return round(
        (len(matched) / len(job_set)) * 100,
        2,
    )


def find_keyword_gaps(
    resume_text: str,
    job_description: str,
) -> List[str]:
    """Find important job-description terms missing from the resume."""

    resume_normalized = normalize_text(resume_text)
    job_normalized = normalize_text(job_description)

    job_words = re.findall(
        r"\b[a-zA-Z][a-zA-Z0-9+#.-]{2,}\b",
        job_normalized,
    )

    resume_words = set(
        re.findall(
            r"\b[a-zA-Z][a-zA-Z0-9+#.-]{2,}\b",
            resume_normalized,
        )
    )

    stop_words = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "are",
        "you",
        "your",
        "our",
        "will",
        "have",
        "has",
        "been",
        "their",
        "they",
        "about",
        "into",
        "using",
        "used",
        "must",
        "should",
        "can",
        "all",
        "job",
        "role",
        "work",
        "team",
    }

    candidates = []

    for word in job_words:
        word_lower = word.lower()

        if word_lower in stop_words:
            continue

        if word_lower not in resume_words:
            candidates.append(word_lower)

    # Preserve order while removing duplicates.
    unique_keywords = list(dict.fromkeys(candidates))

    return unique_keywords[:15]


def build_recommendations(
    matched_skills: List[str],
    missing_skills: List[str],
    keyword_gaps: List[str],
) -> List[str]:
    """Generate resume/job-match recommendations."""

    recommendations = []

    if missing_skills:
        recommendations.append(
            "Add relevant missing technical skills only if you genuinely have experience with them."
        )

    if keyword_gaps:
        recommendations.append(
            "Consider using relevant keywords from the job description in your resume where they accurately describe your experience."
        )

    if matched_skills:
        recommendations.append(
            "Keep your strongest matched technical skills visible in the Skills and Experience sections."
        )

    if not recommendations:
        recommendations.append(
            "Your resume and job description contain limited comparable information. Add more detailed experience and project information."
        )

    return recommendations


def match_job(
    resume_text: str,
    job_description: str,
) -> dict:
    """
    Match a resume against a job description.

    Final score:
        60% technical skill match
        40% TF-IDF text similarity
    """

    if not resume_text.strip():
        return {
            "match_percentage": 0.0,
            "similarity_score": 0.0,
            "skill_match_percentage": 0.0,
            "resume_skills": [],
            "job_skills": [],
            "matched_skills": [],
            "missing_skills": [],
            "keyword_gaps": [],
            "recommendations": [
                "Resume text is empty."
            ],
            "analysis_method": {
                "text_similarity": "TF-IDF + Cosine Similarity",
                "skill_matching": "Technical Skill Extraction",
                "final_score": "60% Skill Match + 40% Text Similarity",
            },
        }

    if not job_description.strip():
        return {
            "match_percentage": 0.0,
            "similarity_score": 0.0,
            "skill_match_percentage": 0.0,
            "resume_skills": extract_skills(resume_text),
            "job_skills": [],
            "matched_skills": [],
            "missing_skills": [],
            "keyword_gaps": [],
            "recommendations": [
                "Job description is empty."
            ],
            "analysis_method": {
                "text_similarity": "TF-IDF + Cosine Similarity",
                "skill_matching": "Technical Skill Extraction",
                "final_score": "60% Skill Match + 40% Text Similarity",
            },
        }

    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_description)

    resume_skill_set = {
        skill.lower()
        for skill in resume_skills
    }

    job_skill_set = {
        skill.lower()
        for skill in job_skills
    }

    matched_skills = sorted(
        resume_skill_set.intersection(job_skill_set)
    )

    missing_skills = sorted(
        job_skill_set.difference(resume_skill_set)
    )

    similarity_score = calculate_text_similarity(
        resume_text,
        job_description,
    )

    skill_match_percentage = calculate_skill_match(
        resume_skills,
        job_skills,
    )

    keyword_gaps = find_keyword_gaps(
        resume_text,
        job_description,
    )

    final_match = (
        (skill_match_percentage * 0.60)
        + (similarity_score * 0.40)
    )

    final_match = round(
        max(0.0, min(100.0, final_match)),
        2,
    )

    recommendations = build_recommendations(
        matched_skills,
        missing_skills,
        keyword_gaps,
    )

    return {
        "match_percentage": final_match,
        "similarity_score": similarity_score,
        "skill_match_percentage": skill_match_percentage,
        "resume_skills": resume_skills,
        "job_skills": job_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "keyword_gaps": keyword_gaps,
        "recommendations": recommendations,
        "analysis_method": {
            "text_similarity": "TF-IDF + Cosine Similarity",
            "skill_matching": "Technical Skill Extraction",
            "final_score": "60% Skill Match + 40% Text Similarity",
        },
    }