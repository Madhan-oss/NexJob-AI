# NexJob — AI-Powered Resume Tailoring Tool

NexJob is a production-quality, privacy-first web application designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS). By analyzing a target job description and a user's current resume, NexJob factually rewrites bullet points, highlights matching and missing keywords, recommends relevant project additions, and outputs formatted documents (DOCX and PDF).

---

## Key Features

1. **Intelligent Parsing**: Automatically extracts text and parses sections from PDF and DOCX uploads using `pdf-parse` and `mammoth`.
2. **ATS Match Analysis**: Visualizes keyword matching with circular progress gauges and lists candidate strengths and experience gaps.
3. **Factual Rewriting**: Rewrites bullet points to prioritize keywords and active verbs based *strictly* on original claims (zero hallucinated roles or employers).
4. **AI-Suggested Projects**: Recommends 2-3 custom project additions that close technology gaps.
5. **Interactive Review**: Side-by-side split screen comparing original and tailored bullets with inline editing and hover tooltips explaining AI adjustments.
6. **Polished Exporting**: Downloads tailored JSON structures as fully formatted Word files (`.docx`) or prints clean layouts to PDF.
7. **Cover Letter Generator (Stretch Goal)**: Drafts customized cover letters leveraging candidate credentials.
8. **Session Sandbox Toggle**: Privacy-focused session mode ensures no data is written to databases.

---

## Directory Structure

```
nexjob/
├── backend/
│   ├── src/
│   │   ├── parser.js     # Text extraction from PDF & DOCX
│   │   ├── gemini.js     # Google Gemini API orchestration
│   │   └── exporter.js   # Word document generator (.docx)
│   ├── server.js         # Express endpoints
│   ├── .env.example      # Environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Wizard step components
│   │   ├── store/        # Zustand state store
│   │   ├── index.css     # Tailwind CSS v4 variables & print stylesheets
│   │   ├── App.tsx       # Main dashboard layout
│   │   └── main.tsx
│   ├── index.html        # Title and SEO meta tags
│   ├── vite.config.ts    # Tailwind v4 plugin & dev API proxies
│   └── package.json
├── schema.sql            # PostgreSQL schema details for persistence
├── package.json          # Root scripts to run concurrently
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Node.js version **18.x** or higher (v24.x recommended).
- A Google Gemini API key.

### Setup Steps

1. **Clone/Create Project Directory**:
   Ensure you are in the project folder `C:\Users\madha\.gemini\antigravity-ide\scratch\nexjob`.

2. **Set up Environment Variables**:
   In `backend/`, copy `.env.example` to `.env` and fill in your Google Gemini API Key:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Install Dependencies**:
   From the root project directory, run:
   ```bash
   npm run install:all
   ```
   *This installs dependencies for the root orchestrator, backend, and frontend folders.*

4. **Start Development Servers**:
   Run both frontend and backend concurrently in development mode:
   ```bash
   npm run dev
   ```
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## API Endpoints

- `POST /api/parse-resume`: Accepts file upload (field `resume`), returns parsed resume JSON.
- `POST /api/analyze-jd`: Accepts raw text (`jdText`), extracts requirements.
- `POST /api/match-score`: Computes keyword compatibility between resume and JD.
- `POST /api/generate-resume`: Rewrites resume bullets based on tone and JD.
- `POST /api/cover-letter`: Drafts a tailored cover letter.
- `POST /api/export`: Accepts tailored JSON structure, generates download stream (`.docx`).

---

## Future Database Scaling

If you decide to enable user persistence (accounts, historical resume comparisons, dashboards), run the scripts inside `schema.sql` on a PostgreSQL database and configure standard pg-clients (e.g. Prisma or pg-pool) inside the Express backend routes. Set `privacyMode` to `false` in the frontend store to toggle saving records.
