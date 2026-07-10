import React from 'react';
import { useStore } from '../store/useStore';
import { Sun, Moon, ShieldAlert, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, privacyMode, setPrivacyMode, reset } = useStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-warm bg-bg-warm/80 backdrop-blur-md dark:border-border-dark dark:bg-bg-dark/80 transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button 
          onClick={reset}
          className="flex items-center gap-2 text-2xl font-black tracking-tight text-text-primary-light dark:text-text-primary-dark group"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white transition-transform duration-300 group-hover:scale-105">
            NJ
          </span>
          <span className="font-display">
            Nex<span className="text-brand-primary">Job</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
            <Sparkles size={12} /> AI Tailored
          </span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {/* Privacy Sandbox Status Toggle */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              privacyMode
                ? 'border-success-warm/20 bg-success-warm/5 text-success-warm dark:border-success-warm/30'
                : 'border-border-warm bg-surface-warm text-text-muted hover:border-brand-primary dark:border-border-dark dark:bg-surface-dark'
            }`}
            title="Privacy Sandbox: If enabled, all uploads remain strictly in-memory and are discarded when you close the tab."
          >
            <ShieldAlert size={14} />
            <span className="hidden xs:inline">
              {privacyMode ? 'Session Sandbox Enabled' : 'Local History Enabled'}
            </span>
            <span className="xs:hidden">{privacyMode ? 'Sandbox' : 'Local'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-warm bg-surface-warm text-text-primary-light hover:border-brand-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark transition-all duration-350"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
