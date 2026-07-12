import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Universal router that calls Groq (using LLaMA-3.3-70b-specdec) if a Groq key is set,
 * or falls back to Gemini 2.0 Flash. This solves Free Tier rate limits.
 */
async function callLLM(prompt, responseMimeType = 'application/json', forceGemini = false) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (groqApiKey && !forceGemini) {
    console.log('Routing request to Groq LLM Engine...');
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: responseMimeType === 'application/json' ? { type: 'json_object' } : undefined,
          temperature: 0.1,
          max_tokens: 4096,
          max_completion_tokens: 4096
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.warn('Groq LLM Engine failed, falling back to Gemini...', err);
    }
  }

  console.log('Routing request to Gemini LLM Engine...');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: responseMimeType === 'application/json' ? {
      responseMimeType: 'application/json',
    } : undefined,
  });

  const result = await generateContentWithRetry(model, prompt);
  return result.response.text();
}

// Helper to clean response text (sometimes LLMs add markdown codeblocks even if responseMimeType is set)
function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Helper to call model.generateContent with exponential backoff retry on 429 errors.
 */
async function generateContentWithRetry(model, prompt, retries = 3, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      const isRateLimit = error.message && (
        error.message.includes('429') || 
        error.message.toLowerCase().includes('quota') || 
        error.message.toLowerCase().includes('rate limit') || 
        error.message.toLowerCase().includes('too many requests')
      );
      if (isRateLimit && i < retries - 1) {
        const waitTime = delayMs * Math.pow(2, i); // 3s, 6s, 12s...
        console.warn(`Gemini 429 Rate Limit hit. Retrying in ${waitTime}ms (Attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Parses raw resume text into structured JSON.
 */
export async function parseResume(rawText) {
  const prompt = `
    You are an expert resume parsing AI. Parse the following raw resume text into a structured JSON object.
    
    The JSON structure MUST follow this format:
    {
      "contact": {
        "name": "Full Name",
        "email": "Email address",
        "phone": "Phone number or empty string",
        "location": "City, State, Country or empty string",
        "website": "LinkedIn/GitHub link or empty string"
      },
      "summary": "Brief summary or objective statement (extract or summarize if none exists)",
      "experience": [
        {
          "company": "Company Name",
          "role": "Job Title",
          "startDate": "Start date (e.g. Month Year or Year)",
          "endDate": "End date (e.g. Month Year, Year, or Present)",
          "location": "City, State or empty string",
          "description": [
            "Bullet point detailing responsibility or achievement",
            "Another bullet point..."
          ]
        }
      ],
      "education": [
        {
          "institution": "University/School Name",
          "degree": "Degree (e.g. Bachelor of Science)",
          "fieldOfStudy": "Field of study (e.g. Computer Science)",
          "startDate": "Start date or empty string",
          "endDate": "End date or Graduation date",
          "grade": "GPA or Grade if available, else empty string"
        }
      ],
      "skills": ["Skill 1", "Skill 2", ...],
      "projects": [
        {
          "title": "Project Title",
          "description": "Short description of what was built and achieved",
          "techStack": ["React", "Node.js", ...],
          "url": "Project URL or empty string"
        }
      ]
    }

    Extract all information accurately. If a section is missing, return an empty array. Do not invent details.
    
    Raw Resume Text:
    ${rawText}
  `;

  try {
    const text = await callLLM(prompt);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in parseResume:', error);
    throw new Error(`Parsing failed: ${error.message}`);
  }
}

/**
 * 1. Combined JD Analysis & Match Scoring
 * Extracts JD requirements and calculates current match score in one API call.
 */
export async function analyzeAndScore(parsedResume, jdText) {
  const prompt = `
    You are an expert recruitment AI and ATS auditor. You have two tasks:
    1. Analyze the Job Description (JD) to extract keywords, skills, responsibilities, and job details.
    2. Rate the alignment of the candidate's parsed resume against these requirements.

    Inputs:
    - Candidate's Resume (JSON): ${JSON.stringify(parsedResume)}
    - Job Description Text: ${jdText}

    Analyze the technical skills, tools, experience bullet points, and responsibilities. Calculate a match score from 0 to 100.
    - 0-40: Poor fit, major gaps in required skills and experience.
    - 41-70: Moderate fit, has some skills but misses core stacks or experience depth.
    - 71-90: Strong fit, matches most required skills and experience.
    - 91-100: Exceptional fit, matches almost all required and preferred items.

    Return a single JSON object conforming exactly to this structure:
    {
      "jdAnalysis": {
        "title": "Job Title / Role",
        "company": "Company Name (use 'Unknown' if not mentioned)",
        "requiredSkills": ["Essential Skill 1", "Essential Skill 2", "Essential Technology 1", ...],
        "preferredSkills": ["Nice-to-have Skill 1", "Nice-to-have Technology 1", ...],
        "responsibilities": ["Core responsibility 1", "Core responsibility 2", ...],
        "experienceLevel": "Entry-level, Mid-level, Senior, Lead, or Executive"
      },
      "matchScore": {
        "score": 75, // Integer match score
        "matchedKeywords": ["React", "TypeScript", ...], // Skills and tools present in both
        "missingKeywords": ["AWS", "Kubernetes", ...], // Skills and tools mentioned in requiredSkills or preferredSkills but missing from the resume
        "strengths": ["3+ years experience as a React Developer", "Strong experience in frontend testing"], // Bulleted strings explaining strengths
        "gaps": ["Lacks experience with cloud deployments", "No mention of GraphQL which is required"] // Bulleted strings explaining gaps
      }
    }
  `;

  try {
    const text = await callLLM(prompt);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in analyzeAndScore:', error);
    throw new Error(`Analysis & scoring failed: ${error.message}`);
  }
}

/**
 * 2. Combined Resume Tailoring & Cover Letter Generation
 * Rewrites resume summary/bullet points, suggests projects, and drafts cover letter in one API call.
 */
export async function tailorResumeAndCoverLetter(parsedResume, jdAnalysis, tone = 'balanced') {
  const prompt = `
    You are an elite career coach and ATS optimization expert. Your task is to tailor a candidate's resume and draft a matching cover letter for a target job description.

    CRITICAL CONSTRAINT: Do NOT fabricate or invent any experience, employers, schools, degrees, titles, or dates. Only rephrase, reword, and reorder existing bullet points to align with the keywords and responsibilities in the job description. Any claims in the tailored bullets must be based *strictly* on facts in the original resume. If a skill isn't mentioned in the original resume, do NOT claim proficiency, but you may truthfully rephrase experiences that used similar tools or concepts.

    Tone requirement: ${tone} (Options: 'concise', 'detailed', 'executive', 'balanced')
    - Concise: punchy, action-oriented, brief.
    - Detailed: metrics-focused, context-rich.
    - Executive: strategic, leadership-oriented, business-impact focused.
    - Balanced: standard professional style.

    Inputs:
    1. Parsed Resume: ${JSON.stringify(parsedResume)}
    2. Job Description Analysis: ${JSON.stringify(jdAnalysis)}

    Return a single JSON object conforming exactly to this structure:
    {
      "tailoredResume": {
        "summary": "Tailored summary statement (3-4 lines)",
        "summaryExplanation": "Explanation of changes made in the summary",
        "experience": [
          {
            "company": "Company Name",
            "role": "Role Name",
            "startDate": "Start Date",
            "endDate": "End Date",
            "location": "Location",
            "description": [
              {
                "originalText": "Original bullet text",
                "tailoredText": "Tailored bullet text incorporating relevant JD keywords and active verbs",
                "explanation": "Why this tailored version matches the JD",
                "isModified": true
              }
            ]
          }
        ],
        "skills": ["Reordered", "Skill", "List"],
        "suggestedProjects": [
          {
            "title": "Suggested Project 1",
            "description": "Details of what the project does, key achievements, and features. Use bullet style or action sentences.",
            "techStack": ["React", "Node.js", ...],
            "relevanceReason": "Why this specific project helps demonstrate competency for the job"
          }
        ],
        "matchScoreAfter": 88
      },
      "coverLetter": {
        "subject": "Application for [Job Title] - [Candidate Name]",
        "salutation": "Dear Hiring Team at [Company Name],",
        "paragraphs": [
          "Opening paragraph expressing enthusiasm for the [Job Title] role and explaining how the candidate's background matches.",
          "Second paragraph highlighting key matching experiences and skills (e.g. experience with specific stacks or responsibilities).",
          "Third paragraph connecting candidate strengths to the specific company's goals and demonstrating domain understanding.",
          "Closing paragraph stating availability for interview, contact details, and thank you."
        ],
        "signoff": "Sincerely,\\n\\n[Candidate Name]"
      }
    }
  `;

  try {
    const text = await callLLM(prompt);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in tailorResumeAndCoverLetter:', error);
    throw new Error(`Resume tailoring & cover letter generation failed: ${error.message}`);
  }
}



