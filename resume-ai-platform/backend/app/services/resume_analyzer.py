import re


SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "fastapi",
    "django",
    "react",
    "node.js",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "git",
    "linux",
    "postgresql",
    "mongodb",
    "mysql",
    "rest api",
    "html",
    "css",
    "bootstrap",
    "tailwind",
    "scikit-learn",
    "mlflow",
    "airflow",
]


SECTION_KEYWORDS = {
    "contact": [
        "email",
        "phone",
        "linkedin",
        "github",
    ],
    "summary": [
        "summary",
        "professional summary",
        "profile",
        "objective",
    ],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment",
    ],
    "education": [
        "education",
        "academic",
        "degree",
        "b.tech",
        "bachelor",
        "master",
        "university",
        "college",
    ],
    "skills": [
        "skills",
        "technical skills",
        "technologies",
        "technical expertise",
    ],
    "projects": [
        "projects",
        "project experience",
        "personal projects",
    ],
    "certifications": [
        "certifications",
        "certificates",
        "certification",
    ],
}


def extract_skills(text: str):
    lower = text.lower()

    found = []

    for skill in SKILLS:
        pattern = r"(?<!\w)" + re.escape(skill.lower()) + r"(?!\w)"

        if re.search(pattern, lower):
            found.append(skill)

    return sorted(set(found))


def detect_sections(text: str):
    lower = text.lower()

    detected = []
    missing = []

    for section, keywords in SECTION_KEYWORDS.items():
        found = any(keyword in lower for keyword in keywords)

        if found:
            detected.append(section)
        else:
            missing.append(section)

    return {
        "detected": detected,
        "missing": missing,
    }


def detect_contact_information(text: str):
    lower = text.lower()

    email_found = bool(
        re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text,
        )
    )

    phone_found = bool(
        re.search(
            r"(?:\+91[\s-]?)?[6-9]\d{9}",
            re.sub(r"[\(\)]", "", text),
        )
    )

    linkedin_found = "linkedin.com" in lower
    github_found = "github.com" in lower

    return {
        "email": email_found,
        "phone": phone_found,
        "linkedin": linkedin_found,
        "github": github_found,
    }


def keyword_recommendations(text: str):
    lower = text.lower()

    important_keywords = [
        "achievement",
        "results",
        "responsible",
        "developed",
        "implemented",
        "designed",
        "optimized",
        "improved",
        "deployed",
        "automated",
    ]

    missing = []

    for keyword in important_keywords:
        if keyword not in lower:
            missing.append(keyword)

    return missing[:6]


def calculate_ats_score(
    text: str,
    skills,
    sections,
    contact,
):
    score = 0

    # Skills: maximum 30
    skill_score = min(30, len(skills) * 3)

    # Sections: maximum 25
    section_score = min(25, len(sections["detected"]) * 4)

    # Contact: maximum 20
    contact_score = 0

    if contact["email"]:
        contact_score += 5

    if contact["phone"]:
        contact_score += 5

    if contact["linkedin"]:
        contact_score += 5

    if contact["github"]:
        contact_score += 5

    # Resume length / content: maximum 15
    words = len(text.split())

    if words >= 500:
        content_score = 15
    elif words >= 300:
        content_score = 12
    elif words >= 150:
        content_score = 8
    else:
        content_score = 4

    # Professional keywords: maximum 10
    keyword_score = min(
        10,
        len(keyword_recommendations(text)) * 0 + 10
    )

    total = (
        skill_score
        + section_score
        + contact_score
        + content_score
        + keyword_score
    )

    return min(100, total)


def build_suggestions(
    text: str,
    skills,
    sections,
    contact,
):
    suggestions = []

    if len(skills) < 5:
        suggestions.append(
            "Add more relevant technical skills and tools."
        )

    if "experience" not in sections["detected"]:
        suggestions.append(
            "Add a clear Work Experience section."
        )

    if "projects" not in sections["detected"]:
        suggestions.append(
            "Add relevant projects with technologies and outcomes."
        )

    if "education" not in sections["detected"]:
        suggestions.append(
            "Add an Education section with your degree and institution."
        )

    if not contact["linkedin"]:
        suggestions.append(
            "Add your LinkedIn profile URL."
        )

    if not contact["github"]:
        suggestions.append(
            "Add your GitHub profile when applying for technical roles."
        )

    if not contact["email"]:
        suggestions.append(
            "Add a professional email address."
        )

    if not contact["phone"]:
        suggestions.append(
            "Add a valid phone number."
        )

    if len(text.split()) < 300:
        suggestions.append(
            "Add more relevant detail to experience and project descriptions."
        )

    if not suggestions:
        suggestions.append(
            "Your resume contains the major sections and contact details."
        )

    return suggestions[:8]


def analyze_resume(text: str):
    skills = extract_skills(text)

    sections = detect_sections(text)

    contact = detect_contact_information(text)

    ats_score = calculate_ats_score(
        text,
        skills,
        sections,
        contact,
    )

    suggestions = build_suggestions(
        text,
        skills,
        sections,
        contact,
    )

    keyword_gaps = keyword_recommendations(text)

    return {
        "score": ats_score,

        "skills": skills,

        "skill_count": len(skills),

        "text_length": len(text),

        "word_count": len(text.split()),

        "sections": sections,

        "contact_information": contact,

        "keyword_gaps": keyword_gaps,

        "suggestions": suggestions,

        "ats_breakdown": {
            "skills": min(30, len(skills) * 3),
            "sections": min(
                25,
                len(sections["detected"]) * 4
            ),
            "contact": sum(
                [
                    5 if contact["email"] else 0,
                    5 if contact["phone"] else 0,
                    5 if contact["linkedin"] else 0,
                    5 if contact["github"] else 0,
                ]
            ),
            "content": (
                15
                if len(text.split()) >= 500
                else 12
                if len(text.split()) >= 300
                else 8
                if len(text.split()) >= 150
                else 4
            ),
        },
    }