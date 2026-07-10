import { create } from 'zustand';

export interface Contact {
  name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
}

export interface ExperienceBullet {
  originalText: string;
  tailoredText: string;
  explanation: string;
  isModified: boolean;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  description: ExperienceBullet[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade: string;
}

export interface Project {
  title: string;
  description: string;
  techStack: string[];
  url?: string;
  isSuggested?: boolean;
}

export interface SuggestedProject {
  title: string;
  description: string;
  techStack: string[];
  relevanceReason: string;
  added?: boolean;
}

export interface ParsedResume {
  contact: Contact;
  summary: string;
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string[]; // Original is raw string array
  }[];
  education: Education[];
  skills: string[];
  projects: Project[];
}

export interface TailoredResume {
  summary: string;
  experience: Experience[];
  skills: string[];
  projects: Project[];
  matchScoreAfter: number;
}

export interface MatchScoreDetails {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
}

export interface CoverLetter {
  subject: string;
  salutation: string;
  paragraphs: string[];
  signoff: string;
}

export interface JobDescriptionAnalysis {
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  experienceLevel: string;
}

interface NexJobState {
  step: number;
  theme: 'light' | 'dark';
  privacyMode: boolean;
  tone: 'balanced' | 'concise' | 'detailed' | 'executive';
  
  // Data State
  originalFileName: string | null;
  rawResumeText: string | null;
  parsedResume: ParsedResume | null;
  resumeId: string | null;
  
  jdText: string;
  jdAnalysis: JobDescriptionAnalysis | null;
  jdId: string | null;
  
  matchScoreBefore: MatchScoreDetails | null;
  tailoredResume: TailoredResume | null;
  tailoredId: string | null;
  suggestedProjects: SuggestedProject[] | null;
  coverLetter: CoverLetter | null;

  // Actions
  setStep: (step: number) => void;
  toggleTheme: () => void;
  setPrivacyMode: (privacyMode: boolean) => void;
  setTone: (tone: 'balanced' | 'concise' | 'detailed' | 'executive') => void;
  
  setResumeUpload: (fileName: string, rawText: string, parsedJson: ParsedResume, resumeId?: string | null) => void;
  setJdText: (text: string) => void;
  setJdAnalysis: (analysis: JobDescriptionAnalysis, jdId?: string | null) => void;
  setMatchScoreBefore: (score: MatchScoreDetails) => void;
  setTailoredResume: (resume: Omit<TailoredResume, 'projects'>, tailoredId?: string | null) => void;
  setSuggestedProjects: (projects: SuggestedProject[]) => void;
  setCoverLetter: (coverLetter: CoverLetter | null) => void;
  
  // Inline Edits & Customizations
  updateContact: (key: keyof Contact, value: string) => void;
  updateSummary: (summary: string) => void;
  updateBulletText: (jobIndex: number, bulletIndex: number, text: string) => void;
  updateSkills: (skills: string[]) => void;
  
  // Project controls
  addSuggestedProject: (index: number) => void;
  removeSuggestedProject: (index: number) => void;
  updateProject: (index: number, key: keyof Project, value: any) => void;
  deleteProject: (index: number) => void;
  
  reset: () => void;
}

export const useStore = create<NexJobState>((set) => ({
  step: 1,
  theme: 'light',
  privacyMode: true,
  tone: 'balanced',
  
  originalFileName: null,
  rawResumeText: null,
  parsedResume: null,
  resumeId: null,
  
  jdText: '',
  jdAnalysis: null,
  jdId: null,
  
  matchScoreBefore: null,
  tailoredResume: null,
  tailoredId: null,
  suggestedProjects: null,
  coverLetter: null,

  setStep: (step) => set({ step }),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),
  setPrivacyMode: (privacyMode) => set({ privacyMode }),
  setTone: (tone) => set({ tone }),
  
  setResumeUpload: (fileName, rawText, parsedJson, resumeId = null) => set({
    originalFileName: fileName,
    rawResumeText: rawText,
    parsedResume: parsedJson,
    resumeId
  }),
  setJdText: (jdText) => set({ jdText }),
  setJdAnalysis: (jdAnalysis, jdId = null) => set({ jdAnalysis, jdId }),
  setMatchScoreBefore: (matchScoreBefore) => set({ matchScoreBefore }),
  
  setTailoredResume: (tailoredData, tailoredId = null) => set((state) => {
    // Merge the existing resume projects as base projects into the tailored structure
    const baseProjects = state.parsedResume?.projects || [];
    return {
      tailoredResume: {
        ...tailoredData,
        projects: baseProjects.map(p => ({ ...p, isSuggested: false }))
      },
      tailoredId
    };
  }),
  
  setSuggestedProjects: (projects) => set({ 
    suggestedProjects: projects.map(p => ({ ...p, added: false })) 
  }),
  
  setCoverLetter: (coverLetter) => set({ coverLetter }),

  updateContact: (key, value) => set((state) => {
    if (!state.parsedResume) return {};
    const updatedContact = { ...state.parsedResume.contact, [key]: value };
    return {
      parsedResume: {
        ...state.parsedResume,
        contact: updatedContact
      }
    };
  }),

  updateSummary: (summary) => set((state) => {
    if (!state.tailoredResume) return {};
    return {
      tailoredResume: {
        ...state.tailoredResume,
        summary
      }
    };
  }),

  updateBulletText: (jobIndex, bulletIndex, text) => set((state) => {
    if (!state.tailoredResume) return {};
    const updatedExperience = [...state.tailoredResume.experience];
    const job = { ...updatedExperience[jobIndex] };
    const bullets = [...job.description];
    bullets[bulletIndex] = { ...bullets[bulletIndex], tailoredText: text, isModified: true };
    job.description = bullets;
    updatedExperience[jobIndex] = job;
    return {
      tailoredResume: {
        ...state.tailoredResume,
        experience: updatedExperience
      }
    };
  }),

  updateSkills: (skills) => set((state) => {
    if (!state.tailoredResume) return {};
    return {
      tailoredResume: {
        ...state.tailoredResume,
        skills
      }
    };
  }),

  addSuggestedProject: (index) => set((state) => {
    if (!state.suggestedProjects || !state.tailoredResume) return {};
    
    const updatedSuggested = [...state.suggestedProjects];
    const projectToAdd = updatedSuggested[index];
    
    if (projectToAdd.added) return {}; // already added
    
    projectToAdd.added = true;
    
    const newProject: Project = {
      title: projectToAdd.title,
      description: projectToAdd.description,
      techStack: projectToAdd.techStack,
      isSuggested: true
    };
    
    return {
      suggestedProjects: updatedSuggested,
      tailoredResume: {
        ...state.tailoredResume,
        projects: [...state.tailoredResume.projects, newProject]
      }
    };
  }),

  removeSuggestedProject: (index) => set((state) => {
    if (!state.suggestedProjects || !state.tailoredResume) return {};
    
    const updatedSuggested = [...state.suggestedProjects];
    const projectToRemove = updatedSuggested[index];
    
    projectToRemove.added = false;
    
    const updatedProjects = state.tailoredResume.projects.filter(
      p => !(p.title === projectToRemove.title && p.isSuggested)
    );
    
    return {
      suggestedProjects: updatedSuggested,
      tailoredResume: {
        ...state.tailoredResume,
        projects: updatedProjects
      }
    };
  }),

  updateProject: (index, key, value) => set((state) => {
    if (!state.tailoredResume) return {};
    const updatedProjects = [...state.tailoredResume.projects];
    updatedProjects[index] = { ...updatedProjects[index], [key]: value };
    return {
      tailoredResume: {
        ...state.tailoredResume,
        projects: updatedProjects
      }
    };
  }),

  deleteProject: (index) => set((state) => {
    if (!state.tailoredResume) return {};
    const project = state.tailoredResume.projects[index];
    
    // If it was a suggested project, mark it as not added in the suggestion panel
    let updatedSuggested = state.suggestedProjects ? [...state.suggestedProjects] : null;
    if (project.isSuggested && updatedSuggested) {
      const matchIndex = updatedSuggested.findIndex(p => p.title === project.title);
      if (matchIndex !== -1) {
        updatedSuggested[matchIndex].added = false;
      }
    }
    
    const updatedProjects = state.tailoredResume.projects.filter((_, i) => i !== index);
    
    return {
      suggestedProjects: updatedSuggested,
      tailoredResume: {
        ...state.tailoredResume,
        projects: updatedProjects
      }
    };
  }),

  reset: () => set({
    step: 1,
    tone: 'balanced',
    originalFileName: null,
    rawResumeText: null,
    parsedResume: null,
    resumeId: null,
    jdText: '',
    jdAnalysis: null,
    jdId: null,
    matchScoreBefore: null,
    tailoredResume: null,
    tailoredId: null,
    suggestedProjects: null,
    coverLetter: null
  })
}));
