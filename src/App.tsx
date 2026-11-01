/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  Bookmark,
  Trash2,
  MessageSquare,
  Search,
  Star,
  UserCheck,
  Plus,
  RefreshCw,
  Send,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  Award,
  Layers,
  SlidersHorizontal,
  Lightbulb,
  ExternalLink
} from 'lucide-react';

interface JobDescription {
  title: string;
  department: string;
  employmentType: string;
  aboutCompany: string;
  hook: string;
  responsibilities: string[];
  hardSkills: string[];
  softSkills: string[];
  requirements: string[];
  benefits: string[];
  callToAction: string;
}

interface InterviewQuestion {
  id: number;
  question: string;
  competency: string;
  targetSkillType: 'hard' | 'soft';
  starGuideline: string;
  nominalIndicators: string[];
  redFlags: string[];
  followUpProbe: string;
}

interface ScorecardCriterion {
  name: string;
  description: string;
  weight: string;
  maxScore: number;
}

interface RecruitmentPackage {
  id: string;
  createdAt: string;
  roleTitle: string;
  department: string;
  seniority: string;
  notes: string;
  jobDescription: JobDescription;
  interviewGuide: InterviewQuestion[];
  evaluationScorecard: { criteria: ScorecardCriterion[] };
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const SAMPLE_PRESETS = [
  {
    roleTitle: "Senior Full-Stack Engineer (React & Node)",
    department: "Engineering",
    seniority: "Senior",
    notes: "We need someone with 5+ years building scalable web apps using React, TypeScript, and Node.js. Must have experience with cloud infrastructure (AWS/GCP), CI/CD pipelines, and mentoring junior engineers. Collaborative culture, startup pace, remote-first."
  },
  {
    roleTitle: "Head of Product Growth",
    department: "Product",
    seniority: "Director/VP",
    notes: "Looking for an analytical product leader to drive PLG (product-led growth), funnel optimization, and user retention. Needs strong SQL skills, A/B testing expertise, and cross-functional leadership partnering with marketing and engineering. Fast-growing fintech."
  },
  {
    roleTitle: "Lead UX/UI Designer",
    department: "Design",
    seniority: "Lead",
    notes: "Seeking a senior designer who excels at complex enterprise workflows, design systems, and user research. Proficiency in Figma required. Must be able to present to executives and bridge engineering constraints with delightful user experiences."
  },
  {
    roleTitle: "Enterprise Account Executive",
    department: "Sales",
    seniority: "Senior",
    notes: "B2B SaaS quota-carrying sales role closing $100k+ ARR deals. Requires 4+ years closing complex enterprise software contracts, consultative selling, and managing CRM pipelines. High energy, resilient, and relationship-driven."
  }
];

export default function App() {
  // Active view tab: 'sandbox' | 'saved' | 'copilot'
  const [activeTab, setActiveTab] = useState<'sandbox' | 'saved' | 'copilot'>('sandbox');

  // Input form state
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [seniority, setSeniority] = useState('Senior');
  const [tone, setTone] = useState('Professional & Engaging');
  const [notes, setNotes] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Current active package
  const [currentPackage, setCurrentPackage] = useState<RecruitmentPackage | null>(null);

  // Sub-view in results: 'jd' | 'guide' | 'scorecard'
  const [resultSubTab, setResultSubTab] = useState<'jd' | 'guide' | 'scorecard'>('jd');

  // Saved roles in localStorage
  const [savedPackages, setSavedPackages] = useState<RecruitmentPackage[]>([]);

  // UI feedback states
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Scorecard live grading state: { [criteriaIndex]: scoreNumber }
  const [candidateScores, setCandidateScores] = useState<{ [key: number]: number }>({});
  const [candidateName, setCandidateName] = useState('Alex Morgan');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'Hello! I am your Recruitment Co-Pilot. Generate a job description first, or ask me to draft outreach messages, interview rubrics, or compensation benchmarks.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Load saved packages on mount
  useEffect(() => {
    const stored = localStorage.getItem('talentforge_saved_packages');
    if (stored) {
      try {
        setSavedPackages(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved packages', e);
      }
    }
  }, []);

  const handleSaveToLocalStorage = () => {
    if (!currentPackage) return;
    const exists = savedPackages.some(p => p.id === currentPackage.id);
    let updated: RecruitmentPackage[];
    if (exists) {
      updated = savedPackages.map(p => p.id === currentPackage.id ? currentPackage : p);
    } else {
      updated = [currentPackage, ...savedPackages];
    }
    setSavedPackages(updated);
    localStorage.setItem('talentforge_saved_packages', JSON.stringify(updated));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPackages.filter(p => p.id !== id);
    setSavedPackages(updated);
    localStorage.setItem('talentforge_saved_packages', JSON.stringify(updated));
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setRoleTitle(preset.roleTitle);
    setDepartment(preset.department);
    setSeniority(preset.seniority);
    setNotes(preset.notes);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() && !roleTitle.trim()) {
      setGenerationError('Please enter raw notes or a role title to begin generation.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate-recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, roleTitle, department, seniority, tone })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate recruitment package');
      }

      const data = await res.json();

      const newPkg: RecruitmentPackage = {
        id: 'pkg_' + Date.now(),
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        roleTitle: roleTitle || data.jobDescription.title || 'Untitled Role',
        department,
        seniority,
        notes,
        jobDescription: data.jobDescription,
        interviewGuide: data.interviewGuide || [],
        evaluationScorecard: data.evaluationScorecard || { criteria: [] }
      };

      setCurrentPackage(newPkg);
      setResultSubTab('jd');
      setActiveTab('sandbox');
      // Reset scorecard grades
      setCandidateScores({});
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'An error occurred during AI generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const exportAsMarkdown = () => {
    if (!currentPackage) return;
    const jd = currentPackage.jobDescription;
    const guide = currentPackage.interviewGuide;

    const md = `# ${jd.title}
**Department:** ${jd.department} | **Type:** ${jd.employmentType} | **Seniority:** ${currentPackage.seniority}

## About Us & The Role
${jd.hook}

${jd.aboutCompany}

## Key Responsibilities
${jd.responsibilities.map(r => `- ${r}`).join('\n')}

## Core Requirements & Skills
### Hard Skills
${jd.hardSkills.map(s => `- ${s}`).join('\n')}

### Soft Skills & Cultural Fit
${jd.softSkills.map(s => `- ${s}`).join('\n')}

### Qualifications
${jd.requirements.map(req => `- ${req}`).join('\n')}

## What We Offer
${jd.benefits.map(b => `- ${b}`).join('\n')}

---

# Behavioral Interview Guide (10 Questions)
${guide.map(q => `
### Question ${q.id}: ${q.question}
- **Competency:** ${q.competency} (${q.targetSkillType.toUpperCase()})
- **STAR Guideline:** ${q.starGuideline}
- **Nominal Indicators (Green Flags):** ${q.nominalIndicators.join(', ')}
- **Red Flags:** ${q.redFlags.join(', ')}
- **Follow-up Probe:** ${q.followUpProbe}
`).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPackage.roleTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recruitment_package.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          roleContext: currentPackage ? {
            title: currentPackage.roleTitle,
            department: currentPackage.department,
            seniority: currentPackage.seniority,
            summary: currentPackage.jobDescription.hook
          } : { note: 'No active role generated yet.' }
        })
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();
      setChatMessages([...updatedMessages, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...updatedMessages, { role: 'model', content: 'Sorry, I encountered an error answering your request. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Calculate total scorecard score
  const totalScorePossible = currentPackage?.evaluationScorecard.criteria.reduce((acc, c) => acc + (c.maxScore || 5), 0) || 20;
  const totalScoreAchieved = Object.values(candidateScores).reduce((acc, val) => acc + val, 0);
  const scorePercentage = Math.round((totalScoreAchieved / totalScorePossible) * 100) || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('sandbox')}>
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-950 block leading-none">
              Recruitment Sandbox
            </span>
            <span className="text-[11px] text-slate-500 font-medium">AI Talent & JD Architect</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'sandbox' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Role Studio & Generator
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'saved' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved Roles ({savedPackages.length})
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'copilot' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Co-Pilot Chat
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentPackage && (
            <button
              onClick={handleSaveToLocalStorage}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border ${
                isSaved ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved to Library' : 'Save Package'}
            </button>
          )}
          <button
            onClick={() => {
              setCurrentPackage(null);
              setActiveTab('sandbox');
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Role
          </button>
        </div>
      </header>

      {/* Mobile Subnav bar */}
      <div className="md:hidden flex border-b border-slate-200 bg-white px-4 py-2 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'sandbox' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          Generator
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'saved' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          Saved Roles ({savedPackages.length})
        </button>
        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'copilot' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          AI Co-Pilot
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        {/* TAB 1: SAVED ROLES LIBRARY */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved Recruitment Packages</h1>
              <p className="text-sm text-slate-500 mt-1">Access, review, or export previously generated job descriptions and interview guides.</p>
            </div>

            {savedPackages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">No saved roles yet</h3>
                  <p className="text-sm text-slate-500 max-w-md mt-1">Generate a recruitment package in the sandbox and click "Save Package" to store it here.</p>
                </div>
                <button
                  onClick={() => setActiveTab('sandbox')}
                  className="mt-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Create Your First Role
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setCurrentPackage(pkg);
                      setActiveTab('sandbox');
                    }}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                          {pkg.department}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">{pkg.createdAt}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {pkg.roleTitle}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {pkg.jobDescription.hook}
                      </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        {pkg.interviewGuide.length} Interview Questions
                      </span>
                      <button
                        onClick={(e) => handleDeleteSaved(pkg.id, e)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI CO-PILOT CHAT */}
        {activeTab === 'copilot' && (
          <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">TalentForge Recruitment Co-Pilot</h2>
                  <p className="text-xs text-slate-500">Ask for interview probes, LinkedIn InMail templates, or compensation insights.</p>
                </div>
              </div>
              {currentPackage && (
                <div className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  Context: {currentPackage.roleTitle}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  }`}>
                    {msg.role === 'user' ? 'U' : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-3 max-w-xs">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 text-slate-500 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Co-Pilot is thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about candidate evaluation, write an InMail outreach message..."
                className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="px-5 py-3 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ROLE STUDIO & GENERATOR (SANDBOX) */}
        {activeTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column / Form Input */}
            <div className={`lg:col-span-5 space-y-6 ${currentPackage ? 'hidden lg:block' : 'lg:col-span-12 max-w-3xl mx-auto w-full'}`}>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Role Input Sandbox</h2>
                  <p className="text-xs text-slate-500 mt-1">Provide raw notes or pick a sample preset to generate a LinkedIn job description and 10 behavioral interview questions.</p>
                </div>

                {/* Sample presets */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-medium text-slate-700 flex flex-col gap-1 truncate"
                      >
                        <span className="font-semibold text-slate-900 truncate">{preset.roleTitle}</span>
                        <span className="text-[11px] text-slate-400">{preset.department} · {preset.seniority}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Role Title</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="e.g., Staff Backend Engineer"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Design">Design</option>
                        <option value="Sales">Sales & GTM</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Operations">Operations</option>
                        <option value="Executive">Executive</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Seniority</label>
                      <select
                        value={seniority}
                        onChange={(e) => setSeniority(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      >
                        <option value="Junior">Junior</option>
                        <option value="Mid-Level">Mid-Level</option>
                        <option value="Senior">Senior</option>
                        <option value="Staff/Principal">Staff / Principal</option>
                        <option value="Director/VP">Director / VP</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Raw Notes & Requirements</label>
                    <textarea
                      rows={6}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Paste meeting notes, bullet points, tech stack requirements, compensation details, team culture highlights..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y"
                    />
                  </div>

                  {generationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      {generationError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Synthesizing JD & Interview Guide...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Recruitment Package</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column / Results Workspace */}
            <div className={`lg:col-span-7 space-y-6 ${!currentPackage ? 'hidden lg:block' : ''}`}>
              {!currentPackage ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Ready to build your recruitment assets</h3>
                    <p className="text-xs text-slate-500">
                      Enter raw notes on the left or select a sample preset. The AI will instantly generate a polished LinkedIn job description and a 10-question behavioral interview guide.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Results Header Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
                          <span>{currentPackage.department}</span>
                          <span>·</span>
                          <span>{currentPackage.seniority}</span>
                          <span>·</span>
                          <span>{currentPackage.jobDescription.employmentType || 'Full-time'}</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">{currentPackage.jobDescription.title}</h1>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportAsMarkdown}
                          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export Markdown
                        </button>
                        <button
                          onClick={() => setCurrentPackage(null)}
                          className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1"
                          title="Edit input notes"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Edit Notes
                        </button>
                      </div>
                    </div>

                    {/* Sub-Tabs Selector */}
                    <div className="flex border-b border-slate-100 gap-6 pt-2">
                      <button
                        onClick={() => setResultSubTab('jd')}
                        className={`pb-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
                          resultSubTab === 'jd' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        LinkedIn Job Description
                      </button>
                      <button
                        onClick={() => setResultSubTab('guide')}
                        className={`pb-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
                          resultSubTab === 'guide' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        Behavioral Interview Guide ({currentPackage.interviewGuide.length})
                      </button>
                      <button
                        onClick={() => setResultSubTab('scorecard')}
                        className={`pb-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
                          resultSubTab === 'scorecard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        Evaluation Scorecard
                      </button>
                    </div>
                  </div>

                  {/* TAB CONTENT: 1. JOB DESCRIPTION */}
                  {resultSubTab === 'jd' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-8 shadow-xs">
                      {/* LinkedIn Hook */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">LinkedIn Hook & Overview</h3>
                          <button
                            onClick={() => copyToClipboard(currentPackage.jobDescription.hook, 'hook')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            {copiedSection === 'hook' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedSection === 'hook' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {currentPackage.jobDescription.hook}
                        </p>
                      </div>

                      {/* About Company */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About Us</h3>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {currentPackage.jobDescription.aboutCompany}
                        </p>
                      </div>

                      {/* Key Responsibilities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Responsibilities</h3>
                          <button
                            onClick={() => copyToClipboard(currentPackage.jobDescription.responsibilities.join('\n'), 'resp')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            {copiedSection === 'resp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedSection === 'resp' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {currentPackage.jobDescription.responsibilities.map((resp, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                              <span className="leading-relaxed">{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Hard & Soft Skills */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hard Skills & Tech Stack</h3>
                          <div className="flex flex-wrap gap-2">
                            {currentPackage.jobDescription.hardSkills.map((skill, i) => (
                              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-lg">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Soft Skills & Competencies</h3>
                          <div className="flex flex-wrap gap-2">
                            {currentPackage.jobDescription.softSkills.map((skill, i) => (
                              <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Qualifications & Requirements</h3>
                        <ul className="space-y-2">
                          {currentPackage.jobDescription.requirements.map((req, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                              <span className="leading-relaxed">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Benefits & Perks */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">What We Offer</h3>
                        <ul className="space-y-2">
                          {currentPackage.jobDescription.benefits.map((ben, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                              <span className="leading-relaxed">{ben}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Call to action */}
                      <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Call to Action</span>
                        <p className="text-sm text-slate-800 font-medium">{currentPackage.jobDescription.callToAction}</p>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: 2. INTERVIEW GUIDE (10 BEHAVIORAL QUESTIONS) */}
                  {resultSubTab === 'guide' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">10 Behavioral Interview Questions</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Targeting hard & soft skills extracted from the job description, complete with STAR grading rubrics.</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(currentPackage.interviewGuide, null, 2), 'questions')}
                          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          {copiedSection === 'questions' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy JSON
                        </button>
                      </div>

                      <div className="space-y-4">
                        {currentPackage.interviewGuide.map((q) => (
                          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                                  {q.id}
                                </span>
                                <span className="text-xs font-semibold text-slate-900">{q.competency}</span>
                              </div>
                              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                                q.targetSkillType === 'hard' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {q.targetSkillType.toUpperCase()} SKILL
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-slate-900 leading-snug">
                              "{q.question}"
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              {/* STAR Guideline */}
                              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">STAR Expected Response</span>
                                <p className="text-xs text-slate-700 leading-relaxed">{q.starGuideline}</p>
                              </div>

                              {/* Follow up probe */}
                              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/60 space-y-1.5">
                                <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">Follow-up Probe</span>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">{q.followUpProbe}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              {/* Nominal indicators */}
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Green Flags (Nominal Indicators)
                                </span>
                                <ul className="space-y-1">
                                  {q.nominalIndicators.map((ind, i) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                      <span className="text-emerald-500 font-bold">·</span>
                                      <span>{ind}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Red flags */}
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block flex items-center gap-1">
                                  <ShieldAlert className="w-3.5 h-3.5" /> Red Flags to Watch
                                </span>
                                <ul className="space-y-1">
                                  {q.redFlags.map((rf, i) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                      <span className="text-red-500 font-bold">·</span>
                                      <span>{rf}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: 3. CANDIDATE EVALUATION SCORECARD */}
                  {resultSubTab === 'scorecard' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-slate-100">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Candidate Evaluation Scorecard</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Grade interview responses against the role's core criteria.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Total Score</span>
                            <span className="text-lg font-bold text-indigo-600 tabular-nums">
                              {totalScoreAchieved} / {totalScorePossible} ({scorePercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Candidate Name Input */}
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="text-xs font-semibold text-slate-700 shrink-0">Candidate Name:</label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Criteria List */}
                      <div className="space-y-6">
                        {currentPackage.evaluationScorecard.criteria.map((crit, idx) => {
                          const currentVal = candidateScores[idx] || 0;
                          const maxS = crit.maxScore || 5;
                          return (
                            <div key={idx} className="p-5 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{crit.name}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">{crit.description}</p>
                                </div>
                                <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
                                  Weight: {crit.weight}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-2">
                                <span className="text-xs text-slate-500 font-medium">Score (0 - {maxS}):</span>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: maxS + 1 }).map((_, scoreNum) => (
                                    <button
                                      key={scoreNum}
                                      type="button"
                                      onClick={() => setCandidateScores({ ...candidateScores, [idx]: scoreNum })}
                                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                                        currentVal === scoreNum
                                          ? 'bg-slate-900 text-white shadow-xs'
                                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {scoreNum}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary Recommendation Action */}
                      <div className="pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                        <div className="text-xs text-slate-500">
                          Recommendation: <span className="font-bold text-slate-900">
                            {scorePercentage >= 80 ? 'Strong Hire (Proceed to Final)' : scorePercentage >= 65 ? 'Hire / Moderate Fit' : 'Pass / Below Bar'}
                          </span>
                        </div>
                        <button
                          onClick={() => alert(`Scorecard saved for ${candidateName} with score ${totalScoreAchieved}/${totalScorePossible} (${scorePercentage}%)`)}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-all shadow-sm"
                        >
                          Finalize Evaluation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
