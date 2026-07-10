import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border-warm bg-surface-warm/50 py-8 text-center text-xs text-text-muted dark:border-border-dark dark:bg-bg-dark/30 transition-colors duration-300 no-print">
      <div className="mx-auto max-w-6xl px-4">
        <p className="font-medium">
          NexJob — Complete AI Resume Tailoring Tool.
        </p>
        <p className="mt-2 text-text-muted/80">
          Stateless & Privacy-First. Uploaded documents exist only in session memory and are never persisted to a database unless you request save features.
        </p>
        <div className="mt-4 flex justify-center gap-4 text-[11px] font-semibold text-brand-primary">
          <span className="cursor-pointer hover:underline">Privacy Sandbox Policy</span>
          <span>&middot;</span>
          <span className="cursor-pointer hover:underline">ATS Guideline Sheet</span>
          <span>&middot;</span>
          <span className="cursor-pointer hover:underline">Terms of Service</span>
        </div>
        <p className="mt-4 text-[10px] text-text-muted/60">
          Powered by Gemini 2.5 Flash & Pro Models. &copy; {new Date().getFullYear()} NexJob. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
export default Footer;
