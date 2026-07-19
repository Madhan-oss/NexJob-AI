import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Universal LLM router with 3-tier cascade:
 * 1. llama-3.1-8b-instant (Groq) - 500k TPD, very fast
 * 2. llama-3.3-70b-versatile (Groq) - 100k TPD, more powerful
 * 3. gemini-2.0-flash - last resort fallback
 */
async function callGroq(model, messages, responseMimeType, maxTokens = 4096) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('No GROQ_API_KEY set');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      response_format: responseMimeType === 'application/json' ? { type: 'json_object' } : undefined,
      temperature: 0.1,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callLLM(prompt, responseMimeType = 'application/json', forceGemini = false, systemPrompt = null) {
  const groqApiKey = process.env.GROQ_API_KEY;

  // Build messages array with optional system prompt
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  if (groqApiKey && !forceGemini) {
    // Tier 1: llama-3.1-8b-instant (500,000 TPD — much higher quota)
    try {
      console.log('Routing request to Groq [llama-3.1-8b-instant]...');
      return await callGroq('llama-3.1-8b-instant', messages, responseMimeType, 4096);
    } catch (err8b) {
      console.warn('llama-3.1-8b-instant failed, trying llama-3.3-70b-versatile...', err8b.message);
    }

    // Tier 2: llama-3.3-70b-versatile (100,000 TPD — more powerful)
    try {
      console.log('Routing request to Groq [llama-3.3-70b-versatile]...');
      return await callGroq('llama-3.3-70b-versatile', messages, responseMimeType, 4096);
    } catch (err70b) {
      console.warn('llama-3.3-70b-versatile failed, falling back to Gemini...', err70b.message);
    }
  }

  // Tier 3: Gemini 2.0 Flash (last resort)
  console.log('Routing request to Gemini LLM Engine...');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: responseMimeType === 'application/json' ? {
      responseMimeType: 'application/json',
    } : undefined,
    systemInstruction: systemPrompt || undefined
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
  const systemPrompt = 'You are a strict resume parsing utility. Your job is to extract data from the raw resume text provided in the user message and output it as a valid JSON object matching the requested schema. You must be extremely concise, extract details verbatim, and NEVER invent, hallucinate, or add any mock/placeholder data. Keep all experience descriptions and project descriptions to a MAXIMUM of 1 sentence. Do NOT wrap the response in markdown code blocks. Respond ONLY with the valid JSON.';
  
  const prompt = `Here is the raw resume text:
<resume_text>
${rawText}
</resume_text>

Task: Extract data from the raw resume text above and output it as a valid JSON object matching the requested schema.
Do NOT continue, autocomplete, or extend the raw resume text. Respond ONLY with the valid JSON.

JSON Schema format to follow:
{
  "contact": {
    "name": "Full Name",
    "email": "Email address",
    "phone": "Phone number or empty string",
    "location": "City, State, Country or empty string",
    "website": "LinkedIn/GitHub link or empty string"
  },
  "summary": "Brief summary statement",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "startDate": "Start date",
      "endDate": "End date",
      "location": "Location",
      "description": [
        "verbatim bullet point 1",
        "verbatim bullet point 2"
      ]
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "degree": "Degree",
      "fieldOfStudy": "Field of study",
      "startDate": "Start date",
      "endDate": "End date",
      "grade": "GPA/Grade"
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "projects": [
    {
      "title": "Project Title",
      "description": "Short description of what was built and achieved",
      "techStack": ["React", "Node.js"],
      "url": "Project URL or empty string"
    }
  ]
}`;

  try {
    const text = await callLLM(prompt, 'application/json', false, systemPrompt);
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
  const systemPrompt = 'You are an ATS scoring AI. Analyze the job description and score the resume match. Respond ONLY with valid JSON matching the requested schema.';

  // Compact resume representation to minimize token usage
  const compactResume = {
    skills: parsedResume.skills || [],
    experience: (parsedResume.experience || []).map(e => ({
      role: e.role, company: e.company, description: e.description?.slice(0, 3) || []
    })),
    education: (parsedResume.education || []).map(e => ({ degree: e.degree, institution: e.institution })),
    projects: (parsedResume.projects || []).map(p => ({ title: p.title, techStack: p.techStack }))
  };

  const prompt = `Job Description:\n${jdText}\n\nCandidate Resume Summary:\n${JSON.stringify(compactResume)}\n\nTask: Analyze the JD and score the resume match. Return this exact JSON:\n{"jdAnalysis":{"title":"","company":"","requiredSkills":[],"preferredSkills":[],"responsibilities":[],"experienceLevel":""},"matchScore":{"score":0,"matchedKeywords":[],"missingKeywords":[],"strengths":[],"gaps":[]}}`;

  try {
    const text = await callLLM(prompt, 'application/json', false, systemPrompt);
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
  const systemPrompt = `You are an elite career coach and ATS optimization expert. Tailor the resume and draft a cover letter. CRITICAL: Do NOT fabricate experience, employers, schools, degrees, titles, or dates. Only rephrase existing bullet points using JD keywords. Tone: ${tone}. Respond ONLY with valid JSON.`;

  const prompt = `Resume: ${JSON.stringify(parsedResume)}\n\nJD Analysis: ${JSON.stringify(jdAnalysis)}\n\nReturn this exact JSON schema:\n{"tailoredResume":{"summary":"","summaryExplanation":"","experience":[{"company":"","role":"","startDate":"","endDate":"","location":"","description":[{"originalText":"","tailoredText":"","explanation":"","isModified":true}]}],"skills":[],"suggestedProjects":[{"title":"","description":"","techStack":[],"relevanceReason":""}],"matchScoreAfter":0},"coverLetter":{"subject":"","salutation":"","paragraphs":["","","",""],"signoff":""}}`;

  try {
    const text = await callLLM(prompt, 'application/json', false, systemPrompt);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in tailorResumeAndCoverLetter:', error);
    throw new Error(`Resume tailoring & cover letter generation failed: ${error.message}`);
  }
}


/**
 * Generates a single AI-suggested portfolio project tailored to a specific job.
 * Returns one project with title, description, techStack, and relevanceReason.
 */
export async function generateProject(jdAnalysis, existingProjectTitles = []) {
  const systemPrompt = 'You are a senior software engineer and career coach. Generate one realistic, buildable portfolio project for a fresher/junior developer that directly demonstrates skills required by the target job. The project must be practical and completable within 2-4 weeks. Respond ONLY with valid JSON.';

  const avoidList = existingProjectTitles.length > 0
    ? `\nAvoid creating projects with these titles (already exist): ${existingProjectTitles.join(', ')}`
    : '';

  const prompt = `Job Role: ${jdAnalysis.title || 'Software Developer'}
Company: ${jdAnalysis.company || 'Unknown'}
Required Skills: ${(jdAnalysis.requiredSkills || []).join(', ')}
Preferred Skills: ${(jdAnalysis.preferredSkills || []).join(', ')}
Experience Level: ${jdAnalysis.experienceLevel || 'Entry-level'}
${avoidList}

Generate ONE unique portfolio project for this job. Return this exact JSON:
{"title":"","description":"","techStack":[],"relevanceReason":""}

Rules:
- title: Short, specific project name (e.g. "AI Resume Screener API")
- description: 2-3 sentences describing what it does, key features, and any metrics/achievements
- techStack: Array of 3-6 specific technologies from the required/preferred skills
- relevanceReason: One sentence explaining exactly why this project proves fit for the role`;

  try {
    const text = await callLLM(prompt, 'application/json', false, systemPrompt);
    return cleanJsonResponse(text);
  } catch (error) {
    console.error('Error in generateProject:', error);
    throw new Error(`Project generation failed: ${error.message}`);
  }
}
