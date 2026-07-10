import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const AnalysisStep: React.FC = () => {
  const { jdAnalysis, matchScoreBefore, setStep } = useStore();
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate the score on mount
  useEffect(() => {
    if (!matchScoreBefore) return;
    const target = matchScoreBefore.score;
    let current = 0;
    const duration = 1200; // ms
    const stepTime = Math.max(Math.floor(duration / target), 10);
    
    const timer = setInterval(() => {
      current += 1;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(timer);
      } else {
        setAnimatedScore(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [matchScoreBefore]);

  if (!jdAnalysis || !matchScoreBefore) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">No analysis data found. Please complete Step 1 first.</p>
        <button onClick={() => setStep(1)} className="mt-4 text-brand-primary font-bold">Go Back</button>
      </div>
    );
  }

  const { score, matchedKeywords, missingKeywords, strengths, gaps } = matchScoreBefore;

  // Determine score color grading
  const getScoreColor = (s: number) => {
    if (s >= 75) return 'text-success-warm';
    if (s >= 50) return 'text-amber-500';
    return 'text-brand-primary';
  };

  // Stagger configurations for keyword chips
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header Info */}
      <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark mb-8 shadow-sm">
        <span className="text-[10px] uppercase font-bold tracking-widest text-brand-primary">Target Role Identified</span>
        <h2 className="text-2xl sm:text-3xl font-black text-text-primary-light dark:text-text-primary-dark mt-1">
          {jdAnalysis.title}
        </h2>
        <p className="text-sm font-semibold text-text-muted mt-1">
          Company: <span className="text-brand-primary">{jdAnalysis.company}</span> &middot; Level: <span className="text-brand-primary">{jdAnalysis.experienceLevel}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Card: Match Score Circle Gauge */}
        <div className="border border-border-warm bg-surface-warm p-8 rounded-3xl dark:border-border-dark dark:bg-surface-dark flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
          <h3 className="text-sm font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark mb-6">
            ATS Match Score
          </h3>
          
          <div className="relative flex items-center justify-center h-44 w-44">
            {/* SVG Circle Gauge */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="72"
                strokeWidth="10"
                className="stroke-border-warm dark:stroke-border-dark fill-transparent"
              />
              <circle
                cx="88"
                cy="88"
                r="72"
                strokeWidth="10"
                strokeDasharray={452}
                strokeDashoffset={452 - (452 * animatedScore) / 100}
                className="stroke-brand-primary fill-transparent transition-all duration-300 ease-out"
                style={{ strokeLinecap: 'round' }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-4xl font-extrabold font-display ${getScoreColor(score)}`}>
                {animatedScore}%
              </span>
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider mt-1">
                Keyword Fit
              </span>
            </div>
          </div>

          <p className="text-xs text-text-muted mt-6 font-medium max-w-[200px]">
            {score >= 75 
              ? 'Excellent compatibility! Minor tailoring will secure your screening.'
              : score >= 50
              ? 'Fair match, but key requirements are missing from your resume.'
              : 'Weak fit. Signficant keywords and achievements need injection.'
            }
          </p>
        </div>

        {/* Right Cards: Keyword Analysis chips */}
        <div className="md:col-span-2 border border-border-warm bg-surface-warm p-8 rounded-3xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
          <h3 className="text-sm font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark mb-4 flex items-center gap-1.5">
            <Sparkles size={16} className="text-brand-primary" /> Keywords Analysis
          </h3>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold text-text-muted mb-6">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-brand-primary" /> Matched
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm border border-brand-primary/60" /> Missing (Need to inject)
            </div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto pr-2"
          >
            {/* Matched Chips */}
            {matchedKeywords.map((kw, i) => (
              <motion.span
                variants={itemVariants}
                key={`matched-${i}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-primary text-white border border-brand-primary shadow-sm hover:scale-105 transition-transform duration-200"
              >
                <CheckCircle2 size={12} />
                {kw}
              </motion.span>
            ))}

            {/* Missing Chips */}
            {missingKeywords.map((kw, i) => (
              <motion.span
                variants={itemVariants}
                key={`missing-${i}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-brand-primary/40 text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors duration-200"
              >
                <AlertTriangle size={12} />
                {kw}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Strengths & Gaps Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Strengths */}
        <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
          <h4 className="text-sm font-bold text-success-warm flex items-center gap-1.5 mb-4">
            <ShieldCheck size={16} /> Key Strengths
          </h4>
          <ul className="space-y-3">
            {strengths.map((str, i) => (
              <li key={`str-${i}`} className="flex items-start gap-2 text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
                <span className="text-success-warm mt-0.5">&bull;</span>
                <span>{str}</span>
              </li>
            ))}
            {strengths.length === 0 && (
              <li className="text-xs text-text-muted italic">No distinct strengths identified yet.</li>
            )}
          </ul>
        </div>

        {/* Gaps */}
        <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
          <h4 className="text-sm font-bold text-brand-primary flex items-center gap-1.5 mb-4">
            <AlertTriangle size={16} /> Found Gaps
          </h4>
          <ul className="space-y-3">
            {gaps.map((gap, i) => (
              <li key={`gap-${i}`} className="flex items-start gap-2 text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
                <span className="text-brand-primary mt-0.5">&bull;</span>
                <span>{gap}</span>
              </li>
            ))}
            {gaps.length === 0 && (
              <li className="text-xs text-text-muted italic">No major gaps identified! Good job.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex justify-between items-center mt-10 pt-4 border-t border-border-warm dark:border-border-dark">
        <button
          onClick={() => setStep(1)}
          className="px-6 py-2.5 rounded-xl border border-border-warm bg-surface-warm font-bold text-xs text-text-muted hover:border-brand-primary hover:text-brand-primary dark:border-border-dark dark:bg-surface-dark transition-all duration-300"
        >
          Re-Upload / Edit Info
        </button>

        <button
          onClick={() => setStep(3)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-8 py-3 font-bold text-xs text-white hover:bg-brand-hover active:scale-[0.98] transition-all duration-300 shadow-md cursor-pointer"
        >
          Tailor Resume Bullet Points
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
export default AnalysisStep;
