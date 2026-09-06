import { useState, useEffect } from 'react';
import {
  BookOpen,

  X,
  Edit,
  Eye,
  Check,
  RotateCcw,
  Loader,
  AlertCircle,
  Activity,
  Download,
  Sliders,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
import {
  getLearningProfile,
  updateLearningProfile,
  submitLearnerQuestionnaire,
  type LearningProfileData,
} from '../services/profileService';

interface LearningProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LearningProfileModal({ isOpen, onClose }: LearningProfileModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [initialMarkdown, setInitialMarkdown] = useState('');
  const [parsed, setParsed] = useState<LearningProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'customize'>('preview');

  // Questionnaire state
  const [goal, setGoal] = useState(
    'Understand foundational AI and systems from first principles'
  );
  const [modalities, setModalities] = useState<string[]>([
    'code',
    'spreadsheet',
    'drawing',
  ]);
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [tutorStyle, setTutorStyle] = useState<'solveit' | 'socratic' | 'direct' | 'blooms'>('solveit');
  const [pace, setPace] = useState<'unhurried' | 'sprint' | 'mixed'>('unhurried');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingQuestionnaire, setSubmittingQuestionnaire] = useState(false);


  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  useEffect(() => {
    if (parsed) {
      if (parsed.frontmatter.understanding_level) {
        setLevel(parsed.frontmatter.understanding_level);
      }
      if (parsed.frontmatter.tutor_style) {
        setTutorStyle(parsed.frontmatter.tutor_style);
      }
      if (parsed.frontmatter.pace) {
        setPace(parsed.frontmatter.pace);
      }
      if (parsed.frontmatter.preferred_modalities?.length) {
        setModalities(parsed.frontmatter.preferred_modalities);
      }
    }
  }, [parsed]);

  const toggleModality = (mod: string) => {
    setModalities((prev) =>
      prev.includes(mod)
        ? prev.length > 1
          ? prev.filter((m) => m !== mod)
          : prev
        : [...prev, mod]
    );
  };

  const handleQuestionnaireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuestionnaire(true);
    setError('');
    try {
      const response = await submitLearnerQuestionnaire({
        goal,
        preferred_modalities: modalities,
        understanding_level: level,
        tutor_style: tutorStyle,
        pace,
        preferred_ui: parsed?.frontmatter.preferred_ui || 'light',
        custom_notes: customNotes,
      });
      setMarkdown(response.markdown);
      setInitialMarkdown(response.markdown);
      setParsed(response.parsed);
      setSaveSuccess(true);
      setViewMode('preview');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calibrate profile');
    } finally {
      setSubmittingQuestionnaire(false);
    }
  };

  const loadProfile = async () => {

    setLoading(true);
    setError('');
    try {
      const data = await getLearningProfile();
      setMarkdown(data.markdown);
      setInitialMarkdown(data.markdown);
      setParsed(data.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      const data = await updateLearningProfile(markdown);
      setMarkdown(data.markdown);
      setInitialMarkdown(data.markdown);
      setParsed(data.parsed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LEARNING.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Living Learner Profile</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  LEARNING.md
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personal learning style, recorded signals, and active preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === 'preview'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={13} />
                <span>Rendered</span>
              </button>
              <button
                onClick={() => setViewMode('customize')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === 'customize'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders size={13} />
                <span>Diagnostic</span>
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === 'edit'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit size={13} />
                <span>Markdown</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs">Loading LEARNING.md...</span>
            </div>
          ) : viewMode === 'customize' ? (
            <form onSubmit={handleQuestionnaireSubmit} className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Sparkles size={15} />
                  <span>Interactive Learning Diagnostic</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Calibrate your unique learning style and modalities. Responses generate a
                  private <code>data/learners/[username]/LEARNING.md</code> profile that dynamically
                  steers AI tutoring and curriculum generation.
                </p>
              </div>

              {/* Question 1: Goal */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  1. What is your primary learning goal?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Understand foundational AI and systems from first principles',
                    'Hands-on implementation and shipping clean code',
                    'Visual and spatial understanding through interactive diagrams',
                    'Master tensor operations, broadcasting, and memory layout',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGoal(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                        goal === preset
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Describe your learning goal in your own words..."
                />
              </div>

              {/* Question 2: Modalities */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  2. Preferred learning modalities
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      id: 'code',
                      title: 'Hands-on Code',
                      desc: 'Interactive Python & Rust programming with automated unit test assertions.',
                    },
                    {
                      id: 'spreadsheet',
                      title: 'Spreadsheets & Cells',
                      desc: 'Cell formula modeling and intuitive mental models before syntax.',
                    },
                    {
                      id: 'drawing',
                      title: 'Visual Drawing & Sketches',
                      desc: 'Whiteboard diagramming, visual tracing, and architecture blueprints.',
                    },
                    {
                      id: 'text',
                      title: 'Guided Explanations',
                      desc: 'Structured conceptual walkthroughs and Socratic inquiries.',
                    },
                  ].map((mod) => {
                    const active = modalities.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModality(mod.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold ${
                              active ? 'text-emerald-300' : 'text-slate-200'
                            }`}
                          >
                            {mod.title}
                          </span>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                              active
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'border border-slate-700'
                            }`}
                          >
                            {active ? '✓' : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{mod.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: Understanding Level */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  3. Baseline depth / current understanding
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {[
                    { id: 'beginner', title: 'Beginner', desc: 'Starting fresh from toy examples' },
                    {
                      id: 'intermediate',
                      title: 'Intermediate',
                      desc: 'Connecting math intuition to code',
                    },
                    {
                      id: 'advanced',
                      title: 'Advanced',
                      desc: 'Deep systems engineering & optimization',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setLevel(item.id as 'beginner' | 'intermediate' | 'advanced')
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        level === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4: AI Tutor Guidance Style */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  4. Preferred AI tutor guidance style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    { id: 'solveit', title: 'Solveit', desc: 'Toy data & micro-steps' },
                    { id: 'socratic', title: 'Socratic', desc: 'Guided questions first' },
                    { id: 'direct', title: 'Direct', desc: 'Concise theory first' },
                    { id: 'blooms', title: 'Blooms', desc: 'Multi-tiered cognitive' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        setTutorStyle(style.id as 'solveit' | 'socratic' | 'direct' | 'blooms')
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        tutorStyle === style.id
                          ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`block font-semibold ${
                          tutorStyle === style.id ? 'text-emerald-300' : 'text-white'
                        }`}
                      >
                        {style.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 5: Learning Pace */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  5. Desired learning cadence
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {[
                    {
                      id: 'unhurried',
                      title: 'Unhurried',
                      desc: 'Deliberate, step-by-step deep dive',
                    },
                    { id: 'sprint', title: 'Sprint', desc: 'Rapid milestones & quick execution' },
                    { id: 'mixed', title: 'Mixed', desc: 'Balanced exploration & execution' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPace(p.id as 'unhurried' | 'sprint' | 'mixed')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        pace === p.id
                          ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`block font-semibold ${
                          pace === p.id ? 'text-emerald-300' : 'text-white'
                        }`}
                      >
                        {p.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 6: Custom Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  6. Specific topics or focus areas (optional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Attention mechanisms, backprop from scratch, GPU kernels..."
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingQuestionnaire}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/10"
                >
                  {submittingQuestionnaire ? (
                    <Loader size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>Calibrate &amp; Update LEARNING.md</span>
                </button>
              </div>
            </form>
          ) : viewMode === 'edit' ? (
            <div className="h-[420px] rounded-xl overflow-hidden border border-slate-800">
              <Editor
                height="100%"
                language="markdown"
                value={markdown}
                onChange={(val) => setMarkdown(val || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  padding: { top: 12 },
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Profile Meta Cards */}
              {parsed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Tutor Style
                    </span>
                    <p className="font-bold text-white capitalize">
                      {parsed.frontmatter.tutor_style}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Level
                    </span>
                    <p className="font-bold text-emerald-400 capitalize">
                      {parsed.frontmatter.understanding_level}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Preferred Pacing
                    </span>
                    <p className="font-bold text-white capitalize">{parsed.frontmatter.pace}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Modalities
                    </span>
                    <p className="font-bold text-blue-400 capitalize truncate">
                      {parsed.frontmatter.preferred_modalities.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Signals & Struggles Activity */}
              {parsed && parsed.signals.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Activity size={14} className="text-emerald-400" />
                    <span>Recorded Learning Signals & Struggles</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {parsed.signals.map((sig, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{sig.replace(/^- /, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rendered Markdown Body */}
              <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-6 prose prose-invert max-w-none text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {saveSuccess && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> Saved to LEARNING.md
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              title="Download local LEARNING.md file"
            >
              <Download size={13} />
              <span>Download .md</span>
            </button>

            {viewMode === 'edit' && (
              <button
                onClick={() => setMarkdown(initialMarkdown)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white"
                title="Revert edits"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {viewMode === 'edit' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save LEARNING.md</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
