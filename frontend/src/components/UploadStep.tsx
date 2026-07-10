import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, ArrowRight, X, Sparkles, Loader2 } from 'lucide-react';

export const UploadStep: React.FC = () => {
  const { 
    setResumeUpload, 
    jdText, 
    setJdText, 
    setJdAnalysis, 
    setMatchScoreBefore, 
    setStep,
    originalFileName
  } = useStore();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!validMimes.includes(selectedFile.type) && !selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.pdf')) {
      setError('Unsupported file type. Please upload a PDF or DOCX file.');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to parse resume file.');
      }

      const result = await response.json();
      setResumeUpload(result.filename, result.rawText, result.parsedJson, result.resumeId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing resume file. Please try again.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalFileName && !file) {
      setError('Please upload your resume first.');
      return;
    }
    if (jdText.trim() === '') {
      setError('Please paste the target Job Description.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // 1. Analyze Job Description
      const jdResponse = await fetch('/api/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText }),
      });

      if (!jdResponse.ok) {
        const errData = await jdResponse.json();
        throw new Error(errData.error || 'Failed to analyze Job Description.');
      }

      const jdAnalysisData = await jdResponse.json();
      setJdAnalysis(jdAnalysisData, jdAnalysisData.jdId);

      // We need to fetch the current parsedResume from store
      const { parsedResume } = useStore.getState();

      // 2. Calculate initial match score
      const matchResponse = await fetch('/api/match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedResume, jdAnalysis: jdAnalysisData }),
      });

      if (!matchResponse.ok) {
        const errData = await matchResponse.json();
        throw new Error(errData.error || 'Failed to compute resume match score.');
      }

      const matchData = await matchResponse.json();
      setMatchScoreBefore(matchData);

      // Move to analysis dashboard
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error analyzing job details. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary-light dark:text-text-primary-dark"
        >
          Tailor Your Resume to <span className="text-brand-primary">Any Job</span> in Seconds.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-md sm:text-lg text-text-muted max-w-2xl mx-auto font-medium"
        >
          Upload your current CV, paste the job description, and watch AI align your bullet points for ATS compliance, find skill gaps, and write custom achievements.
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: File Dropzone */}
          <div className="flex flex-col space-y-3">
            <label className="text-sm font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
              1. Upload Your Resume
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 min-h-[250px] relative ${
                dragActive 
                  ? 'border-brand-primary bg-brand-primary/5 glow-active' 
                  : file || originalFileName
                  ? 'border-brand-primary/40 bg-surface-warm dark:bg-surface-dark'
                  : 'border-border-warm bg-surface-warm hover:border-brand-primary/60 dark:border-border-dark dark:bg-surface-dark'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileInput}
              />

              {parsing ? (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
                  <p className="text-sm font-semibold text-brand-primary">Parsing resume layout...</p>
                  <p className="text-xs text-text-muted">Structuring experience sections & skills</p>
                </div>
              ) : file || originalFileName ? (
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark truncate max-w-[200px]">
                      {file ? file.name : originalFileName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Uploaded'} &middot; Ready
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover p-1 rounded hover:bg-brand-primary/5 transition-colors"
                  >
                    <X size={14} /> Remove and change
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-warm bg-bg-warm text-brand-primary dark:border-border-dark dark:bg-bg-dark">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
                      Drag & drop your resume file here
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Supports PDF, DOCX, or TXT (Max 5MB)
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-border-warm dark:bg-border-dark px-3 py-1 text-[11px] font-semibold text-text-muted">
                    Browse files
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Job Description */}
          <div className="flex flex-col space-y-3">
            <label className="text-sm font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark flex items-center justify-between">
              <span>2. Paste Job Description</span>
              {jdText.length > 0 && (
                <span className="text-[10px] text-text-muted font-semibold">
                  {jdText.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full job posting here, including description, requirements, skills, and about the company..."
              className="flex-1 w-full border border-border-warm bg-surface-warm p-4 rounded-2xl text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark transition-all duration-300 min-h-[250px] resize-none font-sans"
            />
          </div>
        </div>

        {/* Error Messaging */}
        {error && (
          <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-xs font-semibold text-brand-primary">
            {error}
          </div>
        )}

        {/* Submit Action */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={parsing || analyzing || (!file && !originalFileName) || jdText.trim() === ''}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-hover active:scale-[0.98] transition-all duration-300 ${
              parsing || analyzing || (!file && !originalFileName) || jdText.trim() === ''
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing JD & Match Gaps...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Analyze Resume & Job
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default UploadStep;
