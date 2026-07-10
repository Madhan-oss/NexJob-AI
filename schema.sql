-- Database Schema for NexJob (PostgreSQL)
-- Use this if persistence/history features are enabled in the future.

-- users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,          -- null if OAuth-only
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- original resumes, parsed into structured form
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT,
  raw_text TEXT NOT NULL,
  parsed_json JSONB NOT NULL,   -- structured: contact, summary, experience[], education[], skills[]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- job descriptions the user has analyzed
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  company TEXT,
  raw_text TEXT NOT NULL,
  extracted_keywords JSONB,     -- {required: [...], preferred: [...], tools: [...]}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- each generation run, linking a resume + JD to its tailored output
CREATE TABLE IF NOT EXISTS tailored_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id),
  job_description_id UUID REFERENCES job_descriptions(id),
  tailored_json JSONB NOT NULL,   -- final rewritten resume structure
  suggested_projects JSONB,       -- array of {title, description, tech_stack, relevance_reason}
  match_score_before NUMERIC,
  match_score_after NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance & quick queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_user_id ON tailored_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_resume_id ON tailored_resumes(resume_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_jd_id ON tailored_resumes(job_description_id);
CREATE INDEX IF NOT EXISTS idx_jd_extracted_keywords ON job_descriptions USING gin (extracted_keywords);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_json ON tailored_resumes USING gin (tailored_json);
