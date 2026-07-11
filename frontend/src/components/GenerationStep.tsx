import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Check, 
  BrainCircuit, 
  Loader2, 
  TrendingUp, 
  FileText 
} from 'lucide-react';

const toneOptions = [
  { id: 'balanced', title: 'Balanced', desc: 'Standard professional style, blending context and brevity.' },
  { id: 'concise', title: 'Concise', desc: 'Punchy, highly action-oriented, brief bullet entries.' },
  { id: 'detailed', title: 'Detailed', desc: 'Context-rich, metrics-focused, and achievement-heavy.' },
  { id: 'executive', title: 'Executive', desc: 'Strategic, leadership-oriented, high-level impact.' },
] as const;

export const GenerationStep: React.FC = () => {
  const { 
    parsedResume, 
    jdAnalysis, 
    tone, 
    setTone, 
    tailoredResume, 
    setTailoredResume, 
    suggestedProjects, 
    setSuggestedProjects,
    addSuggestedProject,
    removeSuggestedProject,
    setStep,
    setCoverLetter,
    resumeId,
    jdId,
    matchScoreBefore
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const simulateLoading = () => {
    const statuses = [
      'Extracting target keywords...',
      'Aligning resume bullet points factually...',
      'Optimizing for ATS screen scanners...',
      'Drafting tailored project suggestions...',
      'Calculating match score gains...'
    ];
    
    let currentIdx = 0;
    setLoadingText(statuses[0]);
    setLoadingProgress(10);
    
    const interval = setInterval(() => {
      currentIdx += 1;
      if (currentIdx < statuses.length) {
        setLoadingText(statuses[currentIdx]);
        setLoadingProgress((prev) => Math.min(prev + 20, 90));
      } else {
        clearInterval(interval);
      }
    }, 2000);
    
    return interval;
  };

  const handleGenerate = async () => {
    if (!parsedResume || !jdAnalysis) {
      setError('Please upload a resume and paste a job description first.');
      return;
    }

    setLoading(true);
    setError(null);
    const loadingTimer = simulateLoading();

    try {
      // Combined call to tailor resume & draft cover letter
      const response = await fetch('/api/tailor-resume-and-cl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parsedResume, 
          jdAnalysis, 
          tone,
          resumeId,
          jdId,
          scoreBefore: matchScoreBefore?.score || null
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to tailor resume & generate cover letter.');
      }

      const data = await response.json();
      
      // Save results
      setTailoredResume(data.tailoredResume, data.tailoredResume.tailoredId);
      if (data.tailoredResume.suggestedProjects) {
        setSuggestedProjects(data.tailoredResume.suggestedProjects);
      }
      if (data.coverLetter) {
        setCoverLetter(data.coverLetter);
      }

      setLoadingProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error tailoring resume. Please verify your connection & try again.');
    } finally {
      clearInterval(loadingTimer);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Step Info */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-text-primary-light dark:text-text-primary-dark">
          Select Tone Profile & Tailor
        </h2>
        <p className="text-sm text-text-muted mt-2 font-medium">
          Choose a writing profile that fits the role's seniority and company culture.
        </p>
      </div>

      {/* Tone Grid Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {toneOptions.map((opt) => {
          const isSelected = tone === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => setTone(opt.id)}
              disabled={loading}
              className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                  : 'border-border-warm bg-surface-warm hover:border-brand-primary/40 dark:border-border-dark dark:bg-surface-dark'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`text-sm font-bold ${isSelected ? 'text-brand-primary' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                {opt.title}
              </span>
              <span className="text-xs text-text-muted mt-2 font-semibold">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading & Skeletons */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border-warm bg-surface-warm p-8 rounded-3xl dark:border-border-dark dark:bg-surface-dark shadow-sm text-center space-y-6 my-6"
          >
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-brand-primary animate-spin mb-3" />
              <h3 className="text-md font-bold text-text-primary-light dark:text-text-primary-dark">
                NexJob Tailoring Engine Active
              </h3>
              <p className="text-xs text-text-muted font-medium mt-1">{loadingText}</p>
            </div>
            
            {/* Progress bar loader */}
            <div className="w-full max-w-md mx-auto bg-border-warm dark:bg-border-dark rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-brand-primary h-full transition-all duration-500" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            {/* Skeletons simulating the tailored content */}
            <div className="space-y-4 max-w-md mx-auto pt-4 opacity-50">
              <div className="h-4 bg-border-warm dark:bg-border-dark rounded w-3/4 mx-auto animate-pulse" />
              <div className="h-3 bg-border-warm dark:bg-border-dark rounded w-5/6 mx-auto animate-pulse" />
              <div className="h-3 bg-border-warm dark:bg-border-dark rounded w-2/3 mx-auto animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-xs font-semibold text-brand-primary my-4">
          {error}
        </div>
      )}

      {/* Main trigger button */}
      {!tailoredResume && !loading && (
        <div className="flex justify-center my-8">
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-hover active:scale-[0.98] transition-all duration-300 cursor-pointer"
          >
            <BrainCircuit size={18} />
            Tailor Bullet Points Factually
          </button>
        </div>
      )}

      {/* Suggested Projects Section - only shows once generated */}
      {tailoredResume && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 mt-8"
        >
          {/* Success Match Score Improvements Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between border border-success-warm/20 bg-success-warm/5 p-6 rounded-2xl dark:border-success-warm/30 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-warm/10 text-success-warm">
                <TrendingUp size={24} />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-sm font-bold text-success-warm">Tailoring Generated Successfully!</h3>
                <p className="text-xs text-text-muted font-semibold mt-1">
                  ATS Score predicted increase to <span className="text-success-warm font-bold">{tailoredResume.matchScoreAfter}%</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1.5 rounded-lg bg-success-warm px-4 py-2 text-xs font-bold text-white hover:bg-success-warm/90 active:scale-95 transition-all shadow"
            >
              <FileText size={14} /> Go to Review & Export
            </button>
          </div>

          <div className="border border-border-warm bg-surface-warm p-6 rounded-3xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5">
                  <Sparkles size={16} className="text-brand-primary" /> AI-Suggested Project Additions
                </h3>
                <p className="text-xs text-text-muted mt-1 font-semibold">
                  Closing gap with target stack. These projects fit the JD requirements. Check what fits your background, then inject to resume.
                </p>
              </div>
            </div>

            {/* List of projects */}
            <div className="space-y-4 mt-6">
              {suggestedProjects && suggestedProjects.map((proj, idx) => (
                <div 
                  key={`suggested-proj-${idx}`}
                  className={`border border-dashed rounded-2xl p-5 transition-all duration-300 relative ${
                    proj.added 
                      ? 'border-success-warm/40 bg-success-warm/5 dark:bg-success-warm/10'
                      : 'border-brand-primary/40 bg-surface-warm dark:bg-surface-dark hover:border-brand-primary/80'
                  }`}
                >
                  <span className="absolute top-4 right-4 text-[9px] uppercase font-black px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                    AI Suggested
                  </span>
                  
                  <h4 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
                    {proj.title}
                  </h4>
                  
                  <p className="text-xs text-text-muted font-medium mt-1">
                    Relevance: <span className="italic text-text-primary-light dark:text-text-primary-dark">{proj.relevanceReason}</span>
                  </p>
                  
                  <p className="text-xs text-text-primary-light dark:text-text-primary-dark font-medium mt-3 leading-relaxed">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {proj.techStack.map((tech, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-border-warm dark:bg-border-dark text-text-muted">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-end mt-4 pt-3 border-t border-border-warm/40 dark:border-border-dark/40">
                    <button
                      onClick={() => proj.added ? removeSuggestedProject(idx) : addSuggestedProject(idx)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer ${
                        proj.added
                          ? 'bg-success-warm/20 text-success-warm hover:bg-success-warm/30'
                          : 'bg-brand-primary text-white hover:bg-brand-hover shadow-sm'
                      }`}
                    >
                      {proj.added ? (
                        <>
                          <Check size={12} />
                          Added to CV
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          Add Project
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-10 pt-4 border-t border-border-warm dark:border-border-dark">
        <button
          onClick={() => setStep(2)}
          disabled={loading}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl border border-border-warm bg-surface-warm font-bold text-xs text-text-muted hover:border-brand-primary hover:text-brand-primary dark:border-border-dark dark:bg-surface-dark transition-all duration-300 disabled:opacity-50"
        >
          <ArrowLeft size={14} /> Back to Analysis
        </button>

        {tailoredResume && !loading && (
          <button
            onClick={() => setStep(4)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-8 py-3 font-bold text-xs text-white hover:bg-brand-hover active:scale-[0.98] transition-all duration-300 shadow-md cursor-pointer"
          >
            Review & Export Resume
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
export default GenerationStep;
