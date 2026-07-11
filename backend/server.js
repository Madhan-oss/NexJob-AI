import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { parseResumeText } from './src/parser.js';
import { 
  parseResume, 
  analyzeJobDescription, 
  calculateMatchScore, 
  tailorResume,
  generateCoverLetter 
} from './src/gemini.js';
import { generateDocx } from './src/exporter.js';
import { saveResume, saveJobDescription, saveTailoredResult } from './src/db.js';

dotenv.config();

// Helper to format Gemini API errors into user-friendly messages (especially rate limit 429 warnings)
function formatGeminiError(err) {
  const msg = err.message || '';
  if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
    return 'NexJob AI is currently experiencing high traffic. Please wait 10-15 seconds and click "Analyze Resume & Job" again.';
  }
  return msg || 'An unexpected error occurred while communicating with Gemini AI.';
}


const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend dev server
app.use(cors({
  origin: '*', // In production, restrict to frontend domain
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Set up Multer for in-memory uploads (no persistent storage for privacy)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are supported.'));
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

/**
 * 1. Parse Resume Endpoint
 * Accepts file upload, extracts text, uses Gemini to structure it into JSON.
 */
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    console.log(`Parsing file: ${req.file.originalname} (${req.file.mimetype})`);
    
    // Extract raw text from PDF/DOCX
    const rawText = await parseResumeText(req.file.buffer, req.file.mimetype);
    
    // Structure with Gemini
    const structuredResume = await parseResume(rawText);
    
    // Save to Supabase if configured
    const resumeId = await saveResume(req.file.originalname, rawText, structuredResume);
    
    res.json({
      filename: req.file.originalname,
      rawText: rawText,
      parsedJson: structuredResume,
      resumeId: resumeId
    });
  } catch (error) {
    console.error('Error in /api/parse-resume:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

/**
 * 2. Analyze JD Endpoint
 * Extracts required keywords and metadata from the job description.
 */
app.post('/api/analyze-jd', async (req, res) => {
  const { jdText } = req.body;
  if (!jdText || jdText.trim() === '') {
    return res.status(400).json({ error: 'Job description text is required.' });
  }

  try {
    console.log('Analyzing job description...');
    const analysis = await analyzeJobDescription(jdText);
    
    // Save to Supabase if configured
    const jdId = await saveJobDescription(
      analysis.title,
      analysis.company,
      jdText,
      { required: analysis.requiredSkills, preferred: analysis.preferredSkills }
    );
    
    res.json({
      ...analysis,
      jdId: jdId
    });
  } catch (error) {
    console.error('Error in /api/analyze-jd:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

/**
 * 3. Match Score Endpoint
 * Rates candidate resume match with job description requirements.
 */
app.post('/api/match-score', async (req, res) => {
  const { parsedResume, jdAnalysis } = req.body;
  if (!parsedResume || !jdAnalysis) {
    return res.status(400).json({ error: 'Both parsed resume and job description analysis are required.' });
  }

  try {
    console.log('Calculating match score...');
    const result = await calculateMatchScore(parsedResume, jdAnalysis);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/match-score:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

/**
 * 4. Generate Tailored Resume Endpoint
 * Rewrites resume summary, experiences, and suggests tailored projects.
 */
app.post('/api/generate-resume', async (req, res) => {
  const { parsedResume, jdAnalysis, tone, resumeId, jdId, scoreBefore } = req.body;
  if (!parsedResume || !jdAnalysis) {
    return res.status(400).json({ error: 'Both parsed resume and job description analysis are required.' });
  }

  try {
    console.log(`Tailoring resume with tone: ${tone || 'balanced'}...`);
    const tailoredResult = await tailorResume(parsedResume, jdAnalysis, tone);
    
    // Save to Supabase if configured & IDs are present
    let tailoredId = null;
    if (resumeId && jdId) {
      tailoredId = await saveTailoredResult(
        resumeId,
        jdId,
        tailoredResult,
        tailoredResult.suggestedProjects || [],
        scoreBefore || null,
        tailoredResult.matchScoreAfter
      );
    }
    
    res.json({
      ...tailoredResult,
      tailoredId
    });
  } catch (error) {
    console.error('Error in /api/generate-resume:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

/**
 * 5. Cover Letter Endpoint
 * Generates tailored cover letter based on resume and JD.
 */
app.post('/api/cover-letter', async (req, res) => {
  const { parsedResume, jdAnalysis } = req.body;
  if (!parsedResume || !jdAnalysis) {
    return res.status(400).json({ error: 'Both parsed resume and job description analysis are required.' });
  }

  try {
    console.log('Generating cover letter...');
    const coverLetter = await generateCoverLetter(parsedResume, jdAnalysis);
    res.json(coverLetter);
  } catch (error) {
    console.error('Error in /api/cover-letter:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

/**
 * 6. Export Endpoint
 * Builds and streams download files (supports DOCX).
 */
app.post('/api/export', async (req, res) => {
  const { resumeData, format } = req.body;
  if (!resumeData) {
    return res.status(400).json({ error: 'Resume data is required for export.' });
  }

  try {
    if (format === 'docx') {
      console.log('Generating DOCX file...');
      const buffer = await generateDocx(resumeData);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="Tailored_Resume.docx"');
      res.send(buffer);
    } else {
      res.status(400).json({ error: `Unsupported format: ${format}. Only 'docx' is supported via API export. PDFs are handled in the client.` });
    }
  } catch (error) {
    console.error('Error in /api/export:', error);
    res.status(500).json({ error: error.message || 'Failed to export document.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
});

// Start Server
app.listen(port, () => {
  console.log(`NexJob API backend running on port ${port}`);
});
