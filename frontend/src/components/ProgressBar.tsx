import React from 'react';
import { useStore } from '../store/useStore';
import { UploadCloud, BarChart2, Cpu, Download } from 'lucide-react';

const steps = [
  { id: 1, label: 'Upload', icon: UploadCloud },
  { id: 2, label: 'Analyze', icon: BarChart2 },
  { id: 3, label: 'Generate', icon: Cpu },
  { id: 4, label: 'Review & Export', icon: Download },
];

export const ProgressBar: React.FC = () => {
  const { step, setStep, parsedResume, jdText, jdAnalysis, tailoredResume } = useStore();

  const isStepSelectable = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) return !!parsedResume && jdText.trim() !== '';
    if (stepId === 3) return !!parsedResume && !!jdAnalysis;
    if (stepId === 4) return !!tailoredResume;
    return false;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 no-print">
      <div className="relative flex items-center justify-between">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-border-warm dark:bg-border-dark" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-brand-primary transition-all duration-500 ease-out" 
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        />

        {/* Step Nodes */}
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          const selectable = isStepSelectable(s.id);

          return (
            <button
              key={s.id}
              onClick={() => selectable && setStep(s.id)}
              disabled={!selectable}
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                isActive
                  ? 'border-brand-primary bg-surface-warm text-brand-primary dark:bg-surface-dark shadow-md scale-110'
                  : isCompleted
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-border-warm bg-surface-warm text-text-muted dark:border-border-dark dark:bg-surface-dark'
              } ${selectable ? 'cursor-pointer hover:border-brand-primary' : 'cursor-not-allowed opacity-60'}`}
              title={selectable ? `Go to step: ${s.label}` : 'Complete previous steps first'}
            >
              <Icon size={16} />
              
              {/* Step Labels */}
              <span 
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-tight transition-colors duration-300 ${
                  isActive 
                    ? 'text-brand-primary' 
                    : isCompleted 
                    ? 'text-text-primary-light dark:text-text-primary-dark' 
                    : 'text-text-muted'
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default ProgressBar;
