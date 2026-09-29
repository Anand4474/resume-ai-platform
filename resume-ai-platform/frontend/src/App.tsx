import React, { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

interface ATSBreakdown {
  skills: number;
  sections: number;
  contact: number;
  content: number;
}

interface ContactInformation {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
}

interface Analysis {
  score: number;
  skills: string[];
  skill_count: number;
  text_length: number;
  word_count: number;
  sections: string[];
  contact_information: ContactInformation;
  keyword_gaps: string[];
  suggestions: string[];
  ats_breakdown: ATSBreakdown;
  resume_text?: string;
}

interface ResumeUploadResponse {
  filename: string;
  analysis: Analysis;
}

interface MatchResult {
  match_percentage: number;
  similarity_score: number;
  skill_match_percentage: number;
  resume_skills: string[];
  job_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  keyword_gaps: string[];
  recommendations: string[];
  analysis_method: {
    text_similarity?: string;
    skill_matching?: string;
    final_score?: string;
  };
}

function formatText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Improvement";
}

function ScoreCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  const score = clampScore(value);

  return (
    <div className="score-card">
      <div className="score-card-title">{title}</div>

      <div className="score-circle">
        <span>{score}%</span>
      </div>

      <div className="score-label">{getScoreLabel(score)}</div>

      {subtitle && <div className="score-subtitle">{subtitle}</div>}
    </div>
  );
}

function ListSection({
  title,
  items,
  emptyMessage,
  type = "normal",
}: {
  title: string;
  items: string[];
  emptyMessage: string;
  type?: "normal" | "success" | "warning" | "danger";
}) {
  return (
    <div className={`list-section ${type}`}>
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p className="empty-message">{emptyMessage}</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [error, setError] = useState("");

  const [jobDescription, setJobDescription] = useState("");

  const [matching, setMatching] = useState(false);

  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const [matchError, setMatchError] = useState("");

  const [showReport, setShowReport] = useState(false);

  /*
   * ============================================================
   * RESUME UPLOAD
   * ============================================================
   */

  const handleResumeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setMatchError("");
    setMatchResult(null);

    /*
     * Validate file type
     */
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setAnalysis(null);
      setError("Please upload a PDF resume only.");
      return;
    }

    /*
     * Validate file size
     */
    const maxSize = 5 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setFile(null);
      setAnalysis(null);
      setError("Resume size must be less than 5 MB.");
      return;
    }

    setFile(selectedFile);
    setAnalysis(null);
    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      console.log("Uploading resume:", selectedFile.name);

      /*
       * AbortController prevents the UI from staying
       * on Processing forever.
       */
      const controller = new AbortController();

      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 60000);

      let response: Response;

      try {
        response = await fetch(
          `${API_BASE_URL}/api/resumes/upload`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal,
          }
        );
      } finally {
        window.clearTimeout(timeoutId);
      }

      console.log("Upload response status:", response.status);

      let data: ResumeUploadResponse | { detail?: string };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}`
        );
      }

      console.log("Upload response:", data);

      if (!response.ok) {
        const detail =
          "detail" in data && data.detail
            ? data.detail
            : `Upload failed with HTTP ${response.status}`;

        throw new Error(detail);
      }

      const uploadData = data as ResumeUploadResponse;

      if (!uploadData.analysis) {
        throw new Error(
          "Resume analysis data was not returned by the server."
        );
      }

      /*
       * Make sure resume_text is available for Job Matching.
       */
      if (!uploadData.analysis.resume_text) {
        uploadData.analysis.resume_text = "";
      }

      setAnalysis(uploadData.analysis);

      console.log("Resume analysis completed successfully.");
    } catch (err: unknown) {
      console.error("Resume upload error:", err);

      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Resume processing timed out after 60 seconds. Please check that the backend is running and try again."
        );
      } else if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure FastAPI is running at http://127.0.0.1:8000."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to process the resume. Please try again."
        );
      }

      setAnalysis(null);
    } finally {
      /*
       * VERY IMPORTANT:
       * This guarantees Processing... disappears.
       */
      setUploading(false);
    }
  };

  /*
   * ============================================================
   * JOB MATCHING
   * ============================================================
   */

  const handleJobMatch = async () => {
    setMatchError("");
    setMatchResult(null);

    if (!analysis) {
      setMatchError("Please upload and analyze your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setMatchError("Please paste a job description.");
      return;
    }

    const resumeText =
      analysis.resume_text ||
      analysis.skills.join(" ");

    if (!resumeText.trim()) {
      setMatchError(
        "Resume text is not available for job matching."
      );
      return;
    }

    setMatching(true);

    try {
      console.log("Starting job matching...");

      const controller = new AbortController();

      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 60000);

      let response: Response;

      try {
        response = await fetch(
          `${API_BASE_URL}/api/jobs/match`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              resume_text: resumeText,
              job_description: jobDescription,
            }),
            signal: controller.signal,
          }
        );
      } finally {
        window.clearTimeout(timeoutId);
      }

      console.log(
        "Job matching response status:",
        response.status
      );

      let data: MatchResult | { detail?: string };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}`
        );
      }

      console.log("Job matching response:", data);

      if (!response.ok) {
        const detail =
          "detail" in data && data.detail
            ? data.detail
            : `Job matching failed with HTTP ${response.status}`;

        throw new Error(detail);
      }

      const result = data as MatchResult;

      setMatchResult(result);

      console.log("Job matching completed successfully.");
    } catch (err: unknown) {
      console.error("Job matching error:", err);

      if (err instanceof DOMException && err.name === "AbortError") {
        setMatchError(
          "Job matching timed out. Please try again."
        );
      } else if (err instanceof TypeError) {
        setMatchError(
          "Cannot connect to the backend. Please check FastAPI."
        );
      } else if (err instanceof Error) {
        setMatchError(err.message);
      } else {
        setMatchError(
          "Unable to match the resume with this job."
        );
      }
    } finally {
      setMatching(false);
    }
  };

  /*
   * ============================================================
   * RESET
   * ============================================================
   */

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setError("");
    setJobDescription("");
    setMatchResult(null);
    setMatchError("");
    setShowReport(false);
  };

  /*
   * ============================================================
   * PRINT REPORT
   * ============================================================
   */

  const handlePrintReport = () => {
    setShowReport(true);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #f8fafc 0%,
              #eef2ff 50%,
              #f8fafc 100%
            );
        }

        .container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
          padding: 32px 0 60px;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          width: 58px;
          height: 58px;
          margin: 0 auto 14px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #4f46e5;
          color: white;
          font-size: 28px;
          font-weight: 800;
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
        }

        .header h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
          color: #111827;
        }

        .header p {
          margin: 10px 0 0;
          color: #667085;
          font-size: 16px;
        }

        .card {
          background: white;
          border-radius: 18px;
          padding: 26px;
          margin-bottom: 22px;
          border: 1px solid #e6eaf0;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .upload-area {
          min-height: 280px;
          border: 2px dashed #cbd5e1;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 35px;
          transition: 0.2s;
          background: #fbfcff;
        }

        .upload-area:hover {
          border-color: #6366f1;
          background: #f8f8ff;
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .upload-area h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .upload-area p {
          margin: 6px 0;
          color: #667085;
        }

        .file-button {
          display: inline-block;
          margin-top: 18px;
          padding: 12px 22px;
          border-radius: 10px;
          background: #4f46e5;
          color: white;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .file-button:hover {
          background: #4338ca;
        }

        .file-input {
          display: none;
        }

        .processing {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 220px;
        }

        .spinner {
          width: 42px;
          height: 42px;
          border: 4px solid #e5e7eb;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 18px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .processing h2 {
          margin: 0 0 8px;
        }

        .processing p {
          margin: 0;
          color: #667085;
        }

        .error {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #fef2f2;
          color: #b42318;
          border: 1px solid #fecaca;
          font-weight: 600;
        }

        .success {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #ecfdf3;
          color: #027a48;
          border: 1px solid #abefc6;
          font-weight: 600;
        }

        .file-name {
          margin-top: 15px;
          padding: 10px 14px;
          background: #f1f5f9;
          border-radius: 8px;
          display: inline-block;
          color: #344054;
          font-weight: 600;
        }

        .section-title {
          margin: 0 0 18px;
          font-size: 22px;
          color: #111827;
        }

        .section-description {
          color: #667085;
          margin-top: -10px;
          margin-bottom: 20px;
        }

        .score-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .score-card {
          text-align: center;
          padding: 22px 14px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .score-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #667085;
          margin-bottom: 12px;
        }

        .score-circle {
          width: 105px;
          height: 105px;
          border-radius: 50%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              white 58%,
              transparent 59%
            ),
            conic-gradient(
              #4f46e5 0deg,
              #4f46e5 calc(var(--score, 70) * 3.6deg),
              #e5e7eb calc(var(--score, 70) * 3.6deg)
            );
        }

        .score-circle span {
          font-size: 23px;
          font-weight: 800;
          color: #111827;
        }

        .score-label {
          margin-top: 12px;
          font-weight: 800;
          color: #4f46e5;
        }

        .score-subtitle {
          margin-top: 6px;
          color: #667085;
          font-size: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .stat {
          padding: 18px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .stat-value {
          font-size: 27px;
          font-weight: 800;
          color: #111827;
        }

        .stat-label {
          margin-top: 4px;
          color: #667085;
          font-size: 13px;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .tag {
          padding: 8px 12px;
          border-radius: 999px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          font-size: 13px;
          font-weight: 700;
        }

        .tag.success-tag {
          background: #ecfdf3;
          color: #027a48;
          border-color: #abefc6;
        }

        .tag.warning-tag {
          background: #fffaeb;
          color: #b54708;
          border-color: #fedf89;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .list-section {
          padding: 20px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .list-section h3 {
          margin: 0 0 14px;
          color: #111827;
        }

        .list-section ul {
          padding-left: 20px;
          margin: 0;
        }

        .list-section li {
          margin-bottom: 9px;
          line-height: 1.5;
        }

        .list-section.success li::marker {
          color: #12b76a;
        }

        .list-section.warning li::marker {
          color: #f79009;
        }

        .list-section.danger li::marker {
          color: #f04438;
        }

        .empty-message {
          color: #667085;
          margin: 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .contact-item {
          padding: 14px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .contact-label {
          color: #667085;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .contact-value {
          color: #111827;
          word-break: break-word;
          font-weight: 600;
        }

        .job-textarea {
          width: 100%;
          min-height: 220px;
          resize: vertical;
          padding: 15px;
          border: 1px solid #d0d5dd;
          border-radius: 12px;
          outline: none;
          color: #172033;
          line-height: 1.55;
        }

        .job-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        .primary-button {
          margin-top: 16px;
          border: none;
          border-radius: 10px;
          padding: 13px 20px;
          background: #4f46e5;
          color: white;
          font-weight: 800;
          transition: 0.2s;
        }

        .primary-button:hover:not(:disabled) {
          background: #4338ca;
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary-button {
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          padding: 11px 18px;
          background: white;
          color: #344054;
          font-weight: 700;
        }

        .secondary-button:hover {
          background: #f8fafc;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .match-score {
          text-align: center;
          padding: 30px;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            #eef2ff,
            #f5f3ff
          );
          border: 1px solid #c7d2fe;
        }

        .match-score-number {
          font-size: 62px;
          font-weight: 900;
          color: #4338ca;
          line-height: 1;
        }

        .match-score-label {
          margin-top: 10px;
          color: #667085;
          font-weight: 700;
        }

        .method-box {
          margin-top: 18px;
          padding: 16px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
        }

        .method-box p {
          margin: 7px 0;
          color: #475467;
        }

        .method-box strong {
          color: #111827;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .report-header h2 {
          margin: 0;
        }

        .footer {
          text-align: center;
          color: #667085;
          padding: 20px 0;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .score-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .container {
            width: min(100% - 20px, 1200px);
            padding-top: 20px;
          }

          .header h1 {
            font-size: 27px;
          }

          .card {
            padding: 18px;
          }

          .score-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .contact-grid {
            grid-template-columns: 1fr;
          }

          .upload-area {
            min-height: 240px;
            padding: 20px;
          }
        }

        @media print {
          body {
            background: white;
          }

          .no-print,
          .upload-section,
          .job-match-input {
            display: none !important;
          }

          .card {
            box-shadow: none;
            border: 1px solid #ddd;
            break-inside: avoid;
          }

          .container {
            width: 100%;
            padding: 0;
          }
        }
      `}</style>

      <main className="container">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="header">
          <div className="logo">R</div>

          <h1>ResumeAI</h1>

          <p>
            AI Resume Analyzer & Job Matcher
          </p>
        </header>

        {/* ======================================================
            UPLOAD
        ====================================================== */}

        <section className="card upload-section">
          <div className="upload-area">
            {uploading ? (
              <div className="processing">
                <div className="spinner"></div>

                <h2>Analyzing your resume...</h2>

                <p>
                  Extracting resume information and calculating ATS score.
                </p>

                <p>
                  Please wait...
                </p>
              </div>
            ) : (
              <div>
                <div className="upload-icon">📄</div>

                <h2>
                  Upload your resume
                </h2>

                <p>
                  PDF only · Maximum 5 MB
                </p>

                <label className="file-button">
                  Choose Resume
                  <input
                    className="file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                  />
                </label>

                {file && (
                  <div className="file-name">
                    Selected: {file.name}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="error">
              ⚠️ {error}
            </div>
          )}

          {!uploading && analysis && !error && (
            <div className="success">
              ✓ Resume analyzed successfully.
            </div>
          )}
        </section>

        {/* ======================================================
            ATS SCORE
        ====================================================== */}

        {analysis && (
          <>
            <section className="card">
              <h2 className="section-title">
                ATS Resume Analysis
              </h2>

              <p className="section-description">
                Resume quality analysis based on skills,
                sections, contact information and content.
              </p>

              <div className="score-grid">
                <ScoreCard
                  title="Overall ATS Score"
                  value={analysis.score}
                  subtitle="Resume quality"
                />

                <ScoreCard
                  title="Skills"
                  value={analysis.ats_breakdown.skills}
                  subtitle="Technical skills"
                />

                <ScoreCard
                  title="Sections"
                  value={analysis.ats_breakdown.sections}
                  subtitle="Resume structure"
                />

                <ScoreCard
                  title="Content"
                  value={analysis.ats_breakdown.content}
                  subtitle="Content quality"
                />
              </div>
            </section>

            {/* ==================================================
                RESUME STATISTICS
            ================================================== */}

            <section className="card">
              <h2 className="section-title">
                Resume Statistics
              </h2>

              <div className="stats-grid">
                <div className="stat">
                  <div className="stat-value">
                    {analysis.word_count}
                  </div>

                  <div className="stat-label">
                    Words
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-value">
                    {analysis.text_length}
                  </div>

                  <div className="stat-label">
                    Characters
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-value">
                    {analysis.skill_count}
                  </div>

                  <div className="stat-label">
                    Skills Detected
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-value">
                    {analysis.sections.length}
                  </div>

                  <div className="stat-label">
                    Sections
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                SKILLS
            ================================================== */}

            <section className="card">
              <h2 className="section-title">
                Detected Technical Skills
              </h2>

              {analysis.skills.length > 0 ? (
                <div className="tags">
                  {analysis.skills.map((skill, index) => (
                    <span
                      className="tag"
                      key={`${skill}-${index}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-message">
                  No technical skills were detected.
                </p>
              )}
            </section>

            {/* ==================================================
                SECTIONS + CONTACT
            ================================================== */}

            <section className="card">
              <div className="grid-2">
                <div>
                  <h2 className="section-title">
                    Resume Sections
                  </h2>

                  {analysis.sections.length > 0 ? (
                    <div className="tags">
                      {analysis.sections.map(
                        (section, index) => (
                          <span
                            className="tag success-tag"
                            key={`${section}-${index}`}
                          >
                            {section}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="empty-message">
                      No standard resume sections detected.
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="section-title">
                    Contact Information
                  </h2>

                  <div className="contact-grid">
                    <div className="contact-item">
                      <div className="contact-label">
                        Email
                      </div>

                      <div className="contact-value">
                        {formatText(
                          analysis.contact_information.email
                        ) || "Not detected"}
                      </div>
                    </div>

                    <div className="contact-item">
                      <div className="contact-label">
                        Phone
                      </div>

                      <div className="contact-value">
                        {formatText(
                          analysis.contact_information.phone
                        ) || "Not detected"}
                      </div>
                    </div>

                    <div className="contact-item">
                      <div className="contact-label">
                        LinkedIn
                      </div>

                      <div className="contact-value">
                        {formatText(
                          analysis.contact_information.linkedin
                        ) || "Not detected"}
                      </div>
                    </div>

                    <div className="contact-item">
                      <div className="contact-label">
                        GitHub
                      </div>

                      <div className="contact-value">
                        {formatText(
                          analysis.contact_information.github
                        ) || "Not detected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================================================
                SUGGESTIONS
            ================================================== */}

            <section className="card">
              <h2 className="section-title">
                Resume Improvement Suggestions
              </h2>

              <ListSection
                title="Recommended Improvements"
                items={analysis.suggestions}
                emptyMessage="No additional suggestions."
                type="warning"
              />
            </section>

            {/* ==================================================
                KEYWORD GAPS
            ================================================== */}

            <section className="card">
              <h2 className="section-title">
                Resume Keyword Analysis
              </h2>

              <ListSection
                title="Potential Keyword Gaps"
                items={analysis.keyword_gaps}
                emptyMessage="No major keyword gaps detected."
                type="danger"
              />
            </section>

            {/* ==================================================
                JOB MATCHING
            ================================================== */}

            <section className="card job-match-input">
              <h2 className="section-title">
                Job Description Matcher
              </h2>

              <p className="section-description">
                Paste a job description below to compare it
                against your complete resume.
              </p>

              <textarea
                className="job-textarea"
                placeholder="Paste the complete job description here..."
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(event.target.value)
                }
              />

              {matchError && (
                <div className="error">
                  ⚠️ {matchError}
                </div>
              )}

              <button
                className="primary-button"
                onClick={handleJobMatch}
                disabled={
                  matching ||
                  !jobDescription.trim()
                }
              >
                {matching
                  ? "Matching Resume..."
                  : "Match Resume With Job"}
              </button>
            </section>

            {/* ==================================================
                MATCH RESULT
            ================================================== */}

            {matchResult && (
              <section className="card">
                <h2 className="section-title">
                  Job Match Results
                </h2>

                <div className="match-score">
                  <div className="match-score-number">
                    {clampScore(
                      matchResult.match_percentage
                    )}
                    %
                  </div>

                  <div className="match-score-label">
                    Overall Job Match
                  </div>
                </div>

                <div
                  className="score-grid"
                  style={{ marginTop: "20px" }}
                >
                  <ScoreCard
                    title="Overall Match"
                    value={
                      matchResult.match_percentage
                    }
                  />

                  <ScoreCard
                    title="NLP Similarity"
                    value={
                      matchResult.similarity_score
                    }
                  />

                  <ScoreCard
                    title="Skill Match"
                    value={
                      matchResult.skill_match_percentage
                    }
                  />

                  <ScoreCard
                    title="Resume ATS"
                    value={analysis.score}
                  />
                </div>

                <div
                  className="grid-2"
                  style={{ marginTop: "20px" }}
                >
                  <ListSection
                    title="Matched Skills"
                    items={
                      matchResult.matched_skills
                    }
                    emptyMessage="No matching technical skills found."
                    type="success"
                  />

                  <ListSection
                    title="Missing Skills"
                    items={
                      matchResult.missing_skills
                    }
                    emptyMessage="No missing skills detected."
                    type="danger"
                  />
                </div>

                <div
                  className="grid-2"
                  style={{ marginTop: "20px" }}
                >
                  <ListSection
                    title="Job Keyword Gaps"
                    items={
                      matchResult.keyword_gaps
                    }
                    emptyMessage="No major keyword gaps detected."
                    type="warning"
                  />

                  <ListSection
                    title="Recommendations"
                    items={
                      matchResult.recommendations
                    }
                    emptyMessage="No additional recommendations."
                    type="normal"
                  />
                </div>

                <div className="method-box">
                  <h3>
                    Analysis Method
                  </h3>

                  <p>
                    <strong>
                      Text Similarity:
                    </strong>{" "}
                    {matchResult.analysis_method
                      ?.text_similarity ||
                      "TF-IDF + Cosine Similarity"}
                  </p>

                  <p>
                    <strong>
                      Skill Matching:
                    </strong>{" "}
                    {matchResult.analysis_method
                      ?.skill_matching ||
                      "Technical Skill Extraction"}
                  </p>

                  <p>
                    <strong>
                      Final Score:
                    </strong>{" "}
                    {matchResult.analysis_method
                      ?.final_score ||
                      "60% Skill Match + 40% Text Similarity"}
                  </p>
                </div>
              </section>
            )}

            {/* ==================================================
                REPORT ACTIONS
            ================================================== */}

            <section className="card no-print">
              <div className="report-header">
                <div>
                  <h2>
                    Resume Report
                  </h2>

                  <p className="section-description">
                    Generate a printable report containing
                    your resume analysis and job match.
                  </p>
                </div>
              </div>

              <div className="button-row">
                <button
                  className="primary-button"
                  onClick={handlePrintReport}
                >
                  🖨️ Print / Save Report
                </button>

                <button
                  className="secondary-button"
                  onClick={handleReset}
                >
                  Upload Another Resume
                </button>
              </div>
            </section>

            {/* ==================================================
                PRINT REPORT
            ================================================== */}

            {showReport && (
              <section className="card">
                <div className="report-header">
                  <div>
                    <h2>
                      ResumeAI Analysis Report
                    </h2>

                    <p>
                      File:{" "}
                      {file?.name || "Resume"}
                    </p>
                  </div>
                </div>

                <div className="score-grid">
                  <ScoreCard
                    title="ATS Score"
                    value={analysis.score}
                  />

                  <ScoreCard
                    title="Skills"
                    value={
                      analysis.ats_breakdown.skills
                    }
                  />

                  <ScoreCard
                    title="Sections"
                    value={
                      analysis.ats_breakdown.sections
                    }
                  />

                  <ScoreCard
                    title="Content"
                    value={
                      analysis.ats_breakdown.content
                    }
                  />
                </div>

                {matchResult && (
                  <div
                    className="match-score"
                    style={{ marginTop: "20px" }}
                  >
                    <div className="match-score-number">
                      {clampScore(
                        matchResult.match_percentage
                      )}
                      %
                    </div>

                    <div className="match-score-label">
                      Job Match Score
                    </div>
                  </div>
                )}

                <div
                  className="grid-2"
                  style={{ marginTop: "20px" }}
                >
                  <ListSection
                    title="Skills"
                    items={analysis.skills}
                    emptyMessage="No skills detected."
                  />

                  <ListSection
                    title="Suggestions"
                    items={analysis.suggestions}
                    emptyMessage="No suggestions."
                    type="warning"
                  />
                </div>

                {matchResult && (
                  <div
                    className="grid-2"
                    style={{ marginTop: "20px" }}
                  >
                    <ListSection
                      title="Matched Skills"
                      items={
                        matchResult.matched_skills
                      }
                      emptyMessage="None."
                      type="success"
                    />

                    <ListSection
                      title="Missing Skills"
                      items={
                        matchResult.missing_skills
                      }
                      emptyMessage="None."
                      type="danger"
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <footer className="footer">
          ResumeAI · AI Resume Analyzer & Job Matcher
        </footer>
      </main>
    </div>
  );
}

export default App;