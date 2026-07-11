import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Helper to clean response text (sometimes Gemini adds markdown codeblocks even if responseMimeType is set)
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
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

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
    const result = await generateContentWithRetry(model, prompt);
    const text = result.response.text();
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in Gemini parseResume:', error);
    throw new Error(`Gemini parsing failed: ${error.message}`);
  }
}

/**
 * Extracts requirements and keywords from a job description.
 */
export async function analyzeJobDescription(jdText) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an ATS (Applicant Tracking System) optimizer and professional recruiter. Analyze the following Job Description (JD) and extract keywords, technologies, skills, and roles.
    
    The JSON structure MUST follow this format:
    {
      "title": "Job Title / Role",
      "company": "Company Name (use 'Unknown' if not mentioned)",
      "requiredSkills": ["Essential Skill 1", "Essential Skill 2", "Essential Technology 1", ...],
      "preferredSkills": ["Nice-to-have Skill 1", "Nice-to-have Technology 1", ...],
      "responsibilities": ["Core responsibility 1", "Core responsibility 2", ...],
      "experienceLevel": "Entry-level, Mid-level, Senior, Lead, or Executive"
    }

    Extract keywords precisely. Make sure to capture technical stacks (languages, frameworks, databases, tools) and methodologies.

    Job Description:
    ${jdText}
  `;

  try {
    const result = await generateContentWithRetry(model, prompt);
    const text = result.response.text();
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in Gemini analyzeJobDescription:', error);
    throw new Error(`Gemini JD analysis failed: ${error.message}`);
  }
}

/**
 * Calculates a match score between a parsed resume and a JD analysis.
 */
export async function calculateMatchScore(parsedResume, jdAnalysis) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an ATS algorithm auditor. Rate the alignment of the user's resume against the Job Description (JD) requirements.
    
    Inputs:
    1. User's Resume (JSON): ${JSON.stringify(parsedResume)}
    2. Job Description Analysis (JSON): ${JSON.stringify(jdAnalysis)}

    Analyze the technical skills, tools, experience bullet points, and responsibilities. Calculate a match score from 0 to 100.
    - 0-40: Poor fit, major gaps in required skills and experience.
    - 41-70: Moderate fit, has some skills but misses core stacks or experience depth.
    - 71-90: Strong fit, matches most required skills and experience.
    - 91-100: Exceptional fit, matches almost all required and preferred items.

    Return a JSON object exactly matching this format:
    {
      "score": 75, // Integer match score
      "matchedKeywords": ["React", "TypeScript", ...], // Skills and tools present in both
      "missingKeywords": ["AWS", "Kubernetes", ...], // Skills and tools mentioned in requiredSkills or preferredSkills but missing from the resume
      "strengths": ["3+ years experience as a React Developer", "Strong experience in frontend testing"], // Bulleted strings explaining strengths
      "gaps": ["Lacks experience with cloud deployments", "No mention of GraphQL which is required"] // Bulleted strings explaining gaps
    }
  `;

  try {
    const result = await generateContentWithRetry(model, prompt);
    const text = result.response.text();
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in Gemini calculateMatchScore:', error);
    throw new Error(`Gemini match score calculation failed: ${error.message}`);
  }
}

/**
 * Tailors a resume to align with a job description.
 * Rewrites summary and experience bullet points to integrate keywords.
 * Suggests 2-3 tailored project ideas.
 */
export async function tailorResume(parsedResume, jdAnalysis, tone = 'balanced') {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash', // Using flash for resume tailoring
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an elite career coach and ATS optimization expert. Your task is to tailor a user's resume for a specific job description.
    
    CRITICAL CONSTRAINT: Do NOT fabricate or invent any experience, employers, schools, degrees, titles, or dates. Only rephrase, reword, and reorder existing bullet points to align with the keywords and responsibilities in the job description. Any claims in the tailored bullets must be based *strictly* on facts in the original resume. If a skill isn't mentioned in the original resume, do NOT claim proficiency, but you may truthfully rephrase experiences that used similar tools or concepts.
    
    Tone requirement: ${tone} (Options: 'concise', 'detailed', 'executive', 'balanced')
    - Concise: punchy, action-oriented, brief.
    - Detailed: metrics-focused, context-rich.
    - Executive: strategic, leadership-oriented, business-impact focused.
    - Balanced: standard professional style.

    Inputs:
    1. Parsed Resume: ${JSON.stringify(parsedResume)}
    2. Job Description Analysis: ${JSON.stringify(jdAnalysis)}

    Instructions for generation:
    1. **Summary**: Rewrite the resume summary to highlight relevant experience matching the job. Keep it to 3-4 lines. Include a "summaryExplanation" detailing why you rewrote it.
    2. **Experience Bullet Points**: 
       For each experience entry, you must rewrite the bullet points in the "description".
       For each bullet point, return an object:
       {
         "originalText": "The original bullet point",
         "tailoredText": "The rewritten bullet point incorporating relevant JD keywords and active verbs",
         "explanation": "Brief explanation of why this change was made (e.g. 'Highlighted React and Tailwind to match the frontend stack')",
         "isModified": true // Set to true if modified, false if left identical
       }
       If a bullet point does not need changing or cannot be tailored factually, keep it identical and set isModified to false.
    3. **Skills**: Reorder the skills array to prioritize skills and tools required by the JD. Add skills only if they were implied or minor in the original resume, but prioritize truthfulness.
    4. **Suggested Projects**: Create 2 to 3 new "Projects" entries that would be highly relevant to this job description's stack/domain. These will serve as suggestions for the user to implement or adapt based on their side work.
       Each suggested project must look like:
       {
         "title": "Project Title",
         "description": "Details of what the project does, key achievements, and features. Use bullet style or action sentences.",
         "techStack": ["React", "Node.js", ...],
         "relevanceReason": "Why this specific project helps demonstrate competency for the job"
       }
       Mark these clearly as suggestions.
    5. **Match Score After**: Predict the new ATS match score (0-100) if the user adopts these tailored points and suggested projects.

    The response MUST be a JSON object conforming exactly to this structure:
    {
      "summary": "Tailored summary statement",
      "summaryExplanation": "Explanation of changes in summary",
      "experience": [
        {
          "company": "Company Name",
          "role": "Role Name",
          "startDate": "Start Date",
          "endDate": "End Date",
          "location": "Location",
          "description": [
            {
              "originalText": "Original bullet 1",
              "tailoredText": "Tailored bullet 1",
              "explanation": "Explanation 1",
              "isModified": true
            },
            ...
          ]
        },
        ...
      ],
      "skills": ["Tailored", "Skill", "List", ...],
      "suggestedProjects": [
        {
          "title": "Suggested Project 1",
          "description": "Suggested description 1",
          "techStack": ["Tech1", "Tech2"],
          "relevanceReason": "Relevance reason 1"
        },
        ...
      ],
      "matchScoreAfter": 88
    }
  `;

  try {
    const result = await generateContentWithRetry(model, prompt);
    const text = result.response.text();
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in Gemini tailorResume:', error);
    throw new Error(`Gemini resume tailoring failed: ${error.message}`);
  }
}

/**
 * Generates a tailored cover letter draft based on the resume and JD.
 */
export async function generateCoverLetter(parsedResume, jdAnalysis) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
    You are an expert career coach. Write a tailored, professional, and compelling cover letter for the candidate based on their resume and the target job description.
    
    CRITICAL CONSTRAINT: Do NOT fabricate achievements, roles, or skills. Work only with facts from the resume.

    Inputs:
    1. Resume: ${JSON.stringify(parsedResume)}
    2. Job Description: ${JSON.stringify(jdAnalysis)}

    Return a JSON object exactly matching this format:
    {
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
  `;

  try {
    const result = await generateContentWithRetry(model, prompt);
    const text = result.response.text();
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in Gemini generateCoverLetter:', error);
    throw new Error(`Gemini cover letter generation failed: ${error.message}`);
  }
}

