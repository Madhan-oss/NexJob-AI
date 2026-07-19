import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Project, Experience } from '../store/useStore';
import { motion } from 'framer-motion';
import { 
  FileEdit, 
  ArrowLeft, 
  Download, 
  Printer, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  FileText, 
  Layers, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

export const ReviewExportStep: React.FC = () => {
  const { 
    tailoredResume, 
    parsedResume,
    suggestedProjects,
    coverLetter,
    updateSummary, 
    updateBulletText, 
    updateSkills,
    updateProject,
    deleteProject,
    setStep 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'resume' | 'coverletter'>('resume');
  const [viewMode, setViewMode] = useState<'split' | 'paper'>('split');
  const [copiedCL, setCopiedCL] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  if (!tailoredResume) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">No tailored resume found. Please generate one first.</p>
        <button onClick={() => setStep(3)} className="mt-4 text-brand-primary font-bold">Go back to step 3</button>
      </div>
    );
  }

  // Trigger celebration on export
  const celebrate = () => {
    canvasConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D97757', '#BF5B3D', '#7A9471', '#FAF9F5']
    });
  };

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: tailoredResume, format: 'docx' }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate DOCX file.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Tailored_Resume.docx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      celebrate();
    } catch (err) {
      console.error(err);
      alert('Error exporting Word document. Please try again.');
    } finally {
      setExportingDocx(false);
    }
  };

  const handlePrintPdf = () => {
    const originalTitle = document.title;
    const name = parsedResume?.contact?.name ? parsedResume.contact.name.trim().replace(/\s+/g, '_') : 'Resume';
    document.title = `${name}_Resume`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
    celebrate();
  };

  const handleCopyCoverLetter = () => {
    if (!coverLetter) return;
    const fullText = [
      coverLetter.subject,
      '',
      coverLetter.salutation,
      '',
      ...coverLetter.paragraphs,
      '',
      coverLetter.signoff
    ].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedCL(true);
    setTimeout(() => setCopiedCL(false), 2000);
  };

  // ATS Compatibility Checks
  const getAtsAudit = () => {
    const checks = [
      { id: 'columns', title: 'Single-column structure', desc: 'Ensures standard screen readers read logically.', status: true },
      { id: 'tables', title: 'No tables or textboxes used', desc: 'Tables and text fields frequently break ATS text flows.', status: true },
      { id: 'images', title: 'No graphics or images embedded', desc: 'Parsers skip graphics entirely, leaving blanks.', status: true },
      { id: 'fonts', title: 'Standard typography', desc: 'Uses clear, machine-readable Inter or Calibri fonts.', status: true },
      { id: 'headers', title: 'Standard Section Headers', desc: 'Uses expected titles (Experience, Education, Skills).', status: true }
    ];
    return checks;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Tab controls */}
      <div className="flex justify-center mb-8 no-print">
        <div className="inline-flex rounded-xl bg-border-warm/40 p-1 dark:bg-border-dark/40">
          <button
            onClick={() => setActiveTab('resume')}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              activeTab === 'resume'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }`}
          >
            <FileText size={14} /> Tailored Resume
          </button>
          <button
            onClick={() => setActiveTab('coverletter')}
            disabled={!coverLetter}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              !coverLetter ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activeTab === 'coverletter'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary-light dark:hover:text-text-primary-dark'
            }`}
          >
            <Sparkles size={14} /> Cover Letter Draft
          </button>
        </div>
      </div>

      {activeTab === 'resume' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Editing/Review Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* View Mode controls */}
            <div className="flex justify-between items-center no-print">
              <h2 className="text-xl font-black text-text-primary-light dark:text-text-primary-dark">
                Review & Edit Tailoring
              </h2>
              
              <div className="flex gap-2 bg-border-warm/20 p-1 rounded-lg dark:bg-border-dark/20 text-xs font-bold text-text-muted">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded ${viewMode === 'split' ? 'bg-surface-warm dark:bg-surface-dark text-brand-primary shadow-sm' : ''}`}
                >
                  Side-by-Side Diff
                </button>
                <button
                  onClick={() => setViewMode('paper')}
                  className={`px-3 py-1.5 rounded ${viewMode === 'paper' ? 'bg-surface-warm dark:bg-surface-dark text-brand-primary shadow-sm' : ''}`}
                >
                  Paper Preview
                </button>
              </div>
            </div>

            {/* Split Diff View */}
            {viewMode === 'split' ? (
              <div className="space-y-8 no-print">
                {/* Summary Row */}
                <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">Professional Summary</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Original</h4>
                      <p className="text-xs text-text-muted bg-bg-warm dark:bg-bg-dark p-3 rounded-lg border border-border-warm/40 dark:border-border-dark/40 min-h-[100px]">
                        {parsedResume?.summary || 'No original summary detected.'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-brand-primary uppercase tracking-wider mb-2">Tailored (Editable)</h4>
                      <textarea
                        value={tailoredResume.summary}
                        onChange={(e) => updateSummary(e.target.value)}
                        className="w-full text-xs text-text-primary-light dark:text-text-primary-dark p-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 outline-none focus:border-brand-primary dark:border-brand-primary/30 min-h-[100px] font-sans resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Experience Row */}
                <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">Professional Experience Bullets</span>
                  
                  <div className="space-y-8 mt-6">
                    {tailoredResume.experience.map((job, jobIdx) => (
                      <div key={jobIdx} className="space-y-4">
                        <div className="border-b border-border-warm/40 dark:border-border-dark/40 pb-2">
                          <h4 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{job.company}</h4>
                          <p className="text-xs text-text-muted font-bold mt-0.5">{job.role} &middot; {job.startDate} - {job.endDate}</p>
                        </div>

                        {job.description.map((bullet, bulletIdx) => (
                          <div key={bulletIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Original bullet */}
                            <div className="p-3 bg-bg-warm dark:bg-bg-dark border border-border-warm/40 dark:border-border-dark/40 rounded-lg text-xs text-text-muted leading-relaxed min-h-[60px]">
                              {bullet.originalText}
                            </div>
                            
                            {/* Tailored bullet (editable) */}
                            <div className="relative group">
                              <textarea
                                value={bullet.tailoredText}
                                onChange={(e) => updateBulletText(jobIdx, bulletIdx, e.target.value)}
                                className={`w-full p-3 pr-8 rounded-lg text-xs leading-relaxed outline-none focus:border-brand-primary font-sans resize-none min-h-[60px] ${
                                  bullet.isModified 
                                    ? 'bg-success-warm/5 border border-success-warm/30 text-text-primary-light dark:text-text-primary-dark' 
                                    : 'bg-surface-warm dark:bg-surface-dark border border-border-warm dark:border-border-dark text-text-primary-light dark:text-text-primary-dark'
                                }`}
                              />
                              
                              {/* Hover AI Explanation Tooltip */}
                              {bullet.explanation && (
                                <div className="absolute right-2.5 top-2.5 text-text-muted hover:text-brand-primary cursor-pointer tooltip-trigger group/tooltip">
                                  <HelpCircle size={14} />
                                  <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-text-primary-light text-white text-[10px] p-2.5 shadow-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 leading-relaxed font-semibold">
                                    <span className="font-bold text-brand-primary block mb-0.5">AI Tailoring Logic:</span>
                                    {bullet.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Skills Row */}
                <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">Technical Skills (Comma-Separated)</span>
                  <textarea
                    value={tailoredResume.skills.join(', ')}
                    onChange={(e) => updateSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full text-xs text-text-primary-light dark:text-text-primary-dark p-3 rounded-lg border border-border-warm bg-bg-warm outline-none focus:border-brand-primary dark:border-border-dark dark:bg-bg-dark mt-4 min-h-[80px] font-sans"
                  />
                </div>

                {/* Education Row */}
                {parsedResume?.education && parsedResume.education.length > 0 && (
                  <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">Education</span>
                    <div className="space-y-3 mt-4">
                      {parsedResume.education.map((edu, idx) => (
                        <div key={idx} className="p-3.5 bg-bg-warm dark:bg-bg-dark border border-border-warm/40 dark:border-border-dark/40 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold text-text-primary-light dark:text-text-primary-dark">
                            <span>{edu.institution}</span>
                            <span className="text-text-muted font-normal text-[11px]">{edu.endDate ? `Graduated: ${edu.endDate}` : ''}</span>
                          </div>
                          <p className="text-text-muted font-medium">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ')}
                            {edu.grade && <span className="text-brand-primary italic"> &middot; Grade/GPA: {edu.grade}</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects Row */}
                <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">Projects (Base & Approved Suggested)</span>
                  
                  <div className="space-y-6 mt-6">
                    {tailoredResume.projects.map((proj, idx) => (
                      <div key={idx} className="border border-border-warm/40 p-4 rounded-xl dark:border-border-dark/40 relative">
                        <button
                          onClick={() => deleteProject(idx)}
                          className="absolute top-4 right-4 text-text-muted hover:text-brand-primary transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-3">
                            <input
                              type="text"
                              value={proj.title}
                              onChange={(e) => updateProject(idx, 'title', e.target.value)}
                              className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark border-b border-dashed border-border-warm focus:border-brand-primary outline-none pb-0.5 w-full bg-transparent"
                              placeholder="Project Title"
                            />
                            <textarea
                              value={proj.description}
                              onChange={(e) => updateProject(idx, 'description', e.target.value)}
                              className="w-full text-xs leading-relaxed text-text-primary-light dark:text-text-primary-dark border border-border-warm rounded-lg p-2 focus:border-brand-primary outline-none h-16 font-sans bg-transparent"
                              placeholder="Project description and key metrics"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold text-text-muted">Tech Stack (comma-separated)</label>
                            <input
                              type="text"
                              value={proj.techStack.join(', ')}
                              onChange={(e) => updateProject(idx, 'techStack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              className="text-xs text-text-primary-light dark:text-text-primary-dark border border-border-warm rounded-lg p-2 focus:border-brand-primary outline-none w-full bg-transparent"
                              placeholder="React, Node, etc."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {tailoredResume.projects.length === 0 && (
                      <p className="text-xs text-text-muted italic text-center py-4">No projects included in this tailored version.</p>
                    )}
                  </div>
                </div>

                {/* Hidden print element so window.print() always prints paper resume even in split view */}
                <div className="hidden print:block">
                  <div className="bg-white p-8 text-black font-sans print-container">
                    <div className="text-center mb-6">
                      <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
                        {parsedResume?.contact.name || 'Your Name'}
                      </h1>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        {[
                          parsedResume?.contact.email,
                          parsedResume?.contact.phone,
                          parsedResume?.contact.location,
                          parsedResume?.contact.website
                        ].filter(Boolean).join('  |  ')}
                      </p>
                    </div>

                    {tailoredResume.summary && (
                      <div className="mb-5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-300 pb-0.5 tracking-wider">
                          Professional Summary
                        </h3>
                        <p className="text-xs text-slate-700 mt-2 leading-relaxed text-justify">
                          {tailoredResume.summary}
                        </p>
                      </div>
                    )}

                    {tailoredResume.experience && tailoredResume.experience.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-300 pb-0.5 tracking-wider">
                          Professional Experience
                        </h3>
                        <div className="space-y-4 mt-3">
                          {tailoredResume.experience.map((job, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs font-bold text-slate-800">
                                  {job.company} <span className="text-[10px] font-normal text-slate-500 italic">— {job.location}</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {job.startDate} - {job.endDate}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-700 italic">
                                {job.role}
                              </div>
                              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1 leading-relaxed">
                                {job.description.map((bullet, i) => (
                                  <li key={i} className="pl-1">
                                    {bullet.tailoredText}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedResume?.education && parsedResume.education.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-300 pb-0.5 tracking-wider">
                          Education
                        </h3>
                        <div className="space-y-2 mt-3">
                          {parsedResume.education.map((edu, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs font-bold text-slate-800">{edu.institution}</span>
                                <span className="text-[10px] font-bold text-slate-500">{edu.endDate ? `Graduated: ${edu.endDate}` : ''}</span>
                              </div>
                              <div className="text-xs text-slate-700">
                                {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ')}
                                {edu.grade && <span className="text-[10px] text-slate-500 italic"> — Grade/GPA: {edu.grade}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tailoredResume.skills && tailoredResume.skills.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-300 pb-0.5 tracking-wider">
                          Technical Skills
                        </h3>
                        <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                          {tailoredResume.skills.join(', ')}
                        </p>
                      </div>
                    )}

                    {tailoredResume.projects && tailoredResume.projects.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-300 pb-0.5 tracking-wider">
                          Projects
                        </h3>
                        <div className="space-y-3 mt-3">
                          {tailoredResume.projects.map((proj, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs font-bold text-slate-800">
                                  {proj.title} 
                                  {proj.techStack.length > 0 && (
                                    <span className="text-[10px] font-normal text-slate-500 italic"> ({proj.techStack.join(', ')})</span>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {proj.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              ) : (
              /* Paper Mockup Preview (Clean printable standard look) */
              <div className="border border-border-warm bg-white p-8 sm:p-12 shadow-md dark:border-border-dark dark:bg-surface-dark text-black dark:text-text-primary-dark rounded-3xl min-h-[842px] max-w-[595pt] mx-auto print-container font-sans">
                {/* Contact details */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wide">
                    {parsedResume?.contact.name || 'Your Name'}
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-text-muted font-semibold mt-1">
                    {[
                      parsedResume?.contact.email,
                      parsedResume?.contact.phone,
                      parsedResume?.contact.location,
                      parsedResume?.contact.website
                    ].filter(Boolean).join('  |  ')}
                  </p>
                </div>

                {/* Summary */}
                {tailoredResume.summary && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-brand-primary uppercase border-b border-slate-200 dark:border-border-dark pb-0.5 tracking-wider">
                      Professional Summary
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed text-justify">
                      {tailoredResume.summary}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {tailoredResume.experience && tailoredResume.experience.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-brand-primary uppercase border-b border-slate-200 dark:border-border-dark pb-0.5 tracking-wider">
                      Professional Experience
                    </h3>
                    <div className="space-y-4 mt-3">
                      {tailoredResume.experience.map((job, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                              {job.company} <span className="text-[10px] font-normal text-slate-500 italic">— {job.location}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {job.startDate} - {job.endDate}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-brand-primary italic">
                            {job.role}
                          </div>
                          <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-1 leading-relaxed">
                            {job.description.map((bullet, i) => (
                              <li key={i} className="pl-1">
                                {bullet.tailoredText}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {parsedResume?.education && parsedResume.education.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-brand-primary uppercase border-b border-slate-200 dark:border-border-dark pb-0.5 tracking-wider">
                      Education
                    </h3>
                    <div className="space-y-2 mt-3">
                      {parsedResume.education.map((edu, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{edu.institution}</span>
                            <span className="text-[10px] font-bold text-slate-500">{edu.endDate ? `Graduated: ${edu.endDate}` : ''}</span>
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ')}
                            {edu.grade && <span className="text-[10px] text-slate-500 italic font-semibold"> — Grade/GPA: {edu.grade}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {tailoredResume.skills && tailoredResume.skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-brand-primary uppercase border-b border-slate-200 dark:border-border-dark pb-0.5 tracking-wider">
                      Technical Skills
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                      {tailoredResume.skills.join(', ')}
                    </p>
                  </div>
                )}

                {/* Projects */}
                {tailoredResume.projects && tailoredResume.projects.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-brand-primary uppercase border-b border-slate-200 dark:border-border-dark pb-0.5 tracking-wider">
                      Projects
                    </h3>
                    <div className="space-y-3 mt-3">
                      {tailoredResume.projects.map((proj, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                              {proj.title} 
                              {proj.techStack.length > 0 && (
                                <span className="text-[10px] font-normal text-slate-500 italic"> ({proj.techStack.join(', ')})</span>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {proj.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Sidebar controls & ATS Checklist */}
          <div className="space-y-6 no-print">
            
            {/* Export options */}
            <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-4">Export Options</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleExportDocx}
                  disabled={exportingDocx}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white py-3 text-xs font-bold transition-all duration-300 active:scale-98 shadow-sm ${
                    exportingDocx ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Download size={14} />
                  {exportingDocx ? 'Building Word File...' : 'Export as MS Word (.docx)'}
                </button>

                <button
                  onClick={handlePrintPdf}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black text-white py-3 text-xs font-bold transition-all duration-300 active:scale-98 cursor-pointer shadow-sm"
                >
                  <Printer size={14} />
                  Save as PDF / Print
                </button>
              </div>
            </div>

            {/* ATS Audit checklist */}
            <div className="border border-border-warm bg-surface-warm p-6 rounded-2xl dark:border-border-dark dark:bg-surface-dark shadow-sm">
              <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5 mb-4">
                <ShieldCheck size={16} className="text-success-warm" /> ATS Compatibility Audit
              </h3>
              
              <div className="space-y-4">
                {getAtsAudit().map((check) => (
                  <div key={check.id} className="flex gap-2">
                    <Check size={14} className="text-success-warm mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark leading-tight">{check.title}</h4>
                      <p className="text-[10px] text-text-muted mt-0.5 leading-normal">{check.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Cover Letter Panel Draft (Stretch Goal) */
        <div className="max-w-2xl mx-auto border border-border-warm bg-white p-8 sm:p-12 shadow-sm rounded-3xl dark:border-border-dark dark:bg-surface-dark text-black dark:text-text-primary-dark font-sans relative">
          
          <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
            <button
              onClick={handleCopyCoverLetter}
              className="flex items-center gap-1 bg-brand-primary hover:bg-brand-hover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
            >
              {copiedCL ? <Check size={12} /> : <Copy size={12} />}
              {copiedCL ? 'Copied' : 'Copy Letter'}
            </button>
          </div>

          <div className="text-xs text-slate-500 mb-6 font-semibold border-b border-slate-100 pb-4">
            <span className="font-bold text-brand-primary uppercase">Subject: </span>
            {coverLetter.subject}
          </div>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="font-bold">{coverLetter.salutation}</p>
            
            {coverLetter.paragraphs.map((pText, i) => (
              <p key={i} className="text-justify">{pText}</p>
            ))}

            <p className="whitespace-pre-line pt-4 font-semibold">{coverLetter.signoff}</p>
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-10 pt-4 border-t border-border-warm dark:border-border-dark no-print">
        <button
          onClick={() => setStep(3)}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl border border-border-warm bg-surface-warm font-bold text-xs text-text-muted hover:border-brand-primary hover:text-brand-primary dark:border-border-dark dark:bg-surface-dark transition-all duration-300"
        >
          <ArrowLeft size={14} /> Back to Tone Select
        </button>
      </div>
    </div>
  );
};
export default ReviewExportStep;
