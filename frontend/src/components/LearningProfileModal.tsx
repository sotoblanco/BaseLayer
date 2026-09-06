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

  // Simplified Diagnostic state
  const [intakePref, setIntakePref] = useState<'diagram' | 'table' | 'hands_on' | 'story'>('diagram');
  const [explanationLength, setExplanationLength] = useState<'short' | 'thorough'>('short');
  const [exerciseFormat, setExerciseFormat] = useState<'micro_steps' | 'macro_challenges'>('micro_steps');
  const [hintPref, setHintPref] = useState<'toy_example' | 'guiding_question' | 'direct_explanation'>('toy_example');
  const [pace, setPace] = useState<'unhurried' | 'sprint' | 'mixed'>('unhurried');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [goal, setGoal] = useState('Understand foundational AI and systems from first principles');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingQuestionnaire, setSubmittingQuestionnaire] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  useEffect(() => {
    if (parsed?.frontmatter) {
      if (parsed.frontmatter.pace) {
        setPace(parsed.frontmatter.pace);
      }
      if (parsed.frontmatter.explanation_length) {
        setExplanationLength(parsed.frontmatter.explanation_length);
      }
      if (parsed.frontmatter.exercise_format) {
        setExerciseFormat(parsed.frontmatter.exercise_format);
      }
      if (parsed.frontmatter.tutor_style) {
        if (parsed.frontmatter.tutor_style === 'socratic') {
          setHintPref('guiding_question');
        } else if (parsed.frontmatter.tutor_style === 'direct') {
          setHintPref('direct_explanation');
        } else {
          setHintPref('toy_example');
        }
      }
      if (parsed.frontmatter.preferred_modalities?.includes('drawing')) {
        setIntakePref('diagram');
      } else if (parsed.frontmatter.preferred_modalities?.includes('spreadsheet')) {
        setIntakePref('table');
      } else if (parsed.frontmatter.preferred_modalities?.includes('text')) {
        setIntakePref('story');
      } else if (parsed.frontmatter.preferred_modalities?.includes('code')) {
        setIntakePref('hands_on');
      }
    }
  }, [parsed]);

  const handleQuestionnaireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuestionnaire(true);
    setError('');
    try {
      const response = await submitLearnerQuestionnaire({
        intake_preference: intakePref,
        explanation_length: explanationLength,
        exercise_format: exerciseFormat,
        hint_preference: hintPref,
        pace,
        goal,
        custom_notes: customNotes,
        preferred_ui: parsed?.frontmatter.preferred_ui || 'light',
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
                  Five simple questions to adapt your explanation length, practice structure,
                  tools, and tutor support. Responses are saved privately in your unique{' '}
                  <code>data/learners/[username]/LEARNING.md</code>.
                </p>
              </div>

              {/* Inferred Pedagogical Calibration Preview */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Sparkles size={14} />
                  <span>How BaseLayer will customize for you</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">Explanation:</strong>{' '}
                      {explanationLength === 'short'
                        ? 'Concise essentials (under 3 sentences)'
                        : 'Comprehensive with intuitions & analogies'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">Practice:</strong>{' '}
                      {exerciseFormat === 'micro_steps'
                        ? '4-6 small verified micro-steps'
                        : '1-2 end-to-end open challenges'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">Primary tools:</strong>{' '}
                      {intakePref === 'diagram'
                        ? 'Drawings & sketches + code'
                        : intakePref === 'table'
                        ? 'Spreadsheet cell models + code'
                        : intakePref === 'story'
                        ? 'Conceptual walkthroughs + code'
                        : 'Hands-on code editor'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong className="text-white">AI Tutor:</strong>{' '}
                      {hintPref === 'guiding_question'
                        ? 'Socratic (guiding inquiries)'
                        : hintPref === 'direct_explanation'
                        ? 'Direct (theory & root-cause)'
                        : 'Solveit (2x2 toy examples & micro-steps)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Question 1: What makes a new concept click? */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  1. What makes a new concept click for you first?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      id: 'diagram',
                      title: 'Visual Diagram & Flowchart',
                      desc: 'Seeing boxes, arrows, and visual connections between moving parts.',
                    },
                    {
                      id: 'table',
                      title: 'Numbers in a Spreadsheet Table',
                      desc: 'Looking at concrete input numbers, cell formulas, and row outputs.',
                    },
                    {
                      id: 'hands_on',
                      title: 'Hands-on Code',
                      desc: 'A tiny snippet of runnable code I can edit and break right away.',
                    },
                    {
                      id: 'story',
                      title: 'Real-World Story or Analogy',
                      desc: 'An intuitive conceptual analogy explaining the core idea in plain English.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setIntakePref(item.id as 'diagram' | 'table' | 'hands_on' | 'story')
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        intakePref === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Explanation Length */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  2. How detailed should theoretical explanations be before you practice?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      id: 'short',
                      title: 'Short & to the point',
                      desc: 'Give me 2-3 key sentences with the core rule, then let me try immediately.',
                    },
                    {
                      id: 'thorough',
                      title: 'Thorough & comprehensive',
                      desc: 'Walk me through the background, why it matters, and detailed intuitions first.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExplanationLength(item.id as 'short' | 'thorough')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        explanationLength === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Practice Structure */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  3. How do you prefer practice challenges to be structured?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      id: 'micro_steps',
                      title: 'Bite-sized micro-steps',
                      desc: '4 to 6 small verified checkpoints where each line is confirmed before moving forward.',
                    },
                    {
                      id: 'macro_challenges',
                      title: 'Fewer bigger challenges',
                      desc: '1 to 2 larger end-to-end problems where I solve the puzzle with minimal handholding.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setExerciseFormat(item.id as 'micro_steps' | 'macro_challenges')
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        exerciseFormat === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4: Getting Unstuck */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  4. When you get stuck on a problem, what helps you most?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    {
                      id: 'toy_example',
                      title: 'Tiny Toy Example',
                      desc: 'Show me a 2x2 toy case with simple numbers to build intuition (Solveit).',
                    },
                    {
                      id: 'guiding_question',
                      title: 'Guiding Question',
                      desc: 'Ask me a thoughtful question that nudges me to spot the missing piece (Socratic).',
                    },
                    {
                      id: 'direct_explanation',
                      title: 'Direct Explanation',
                      desc: 'Directly explain what broke and give me the exact rule I need.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setHintPref(
                          item.id as 'toy_example' | 'guiding_question' | 'direct_explanation'
                        )
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        hintPref === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 5: Cadence */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  5. What is your preferred study rhythm?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      id: 'unhurried',
                      title: 'Take my time (unhurried)',
                      desc: 'Deliberate, step-by-step deep dive to understand every edge case.',
                    },
                    {
                      id: 'sprint',
                      title: 'Fast & focused (sprint)',
                      desc: 'High-velocity iteration with quick milestones and rapid execution.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPace(item.id as 'unhurried' | 'sprint' | 'mixed')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        pace === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold shadow-sm shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Advanced Settings Toggle */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5"
                >
                  <Sliders size={13} />
                  <span>
                    {showAdvanced
                      ? 'Hide advanced goals & notes'
                      : 'Add custom goal or focus area (optional)'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 block">Personal goal</label>
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g. Master tensor operations and GPU memory layout"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 block">Special focus or notes</label>
                      <input
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="e.g. Attention weights, CUDA kernels, or specific project interests"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
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
                      Explanations
                    </span>
                    <p className="font-bold text-emerald-400 capitalize">
                      {parsed.frontmatter.explanation_length === 'thorough'
                        ? 'Thorough'
                        : 'Short essentials'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Practice Grain
                    </span>
                    <p className="font-bold text-cyan-400 capitalize">
                      {parsed.frontmatter.exercise_format === 'macro_challenges'
                        ? 'Macro puzzles'
                        : 'Micro-steps'}
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
                      Baseline Depth
                    </span>
                    <p className="font-bold text-emerald-400 capitalize">
                      {parsed.frontmatter.understanding_level}
                    </p>
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
