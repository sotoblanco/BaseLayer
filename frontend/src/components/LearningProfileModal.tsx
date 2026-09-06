import { useState, useEffect } from 'react';
import {
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
  initialMode?: 'preview' | 'edit' | 'customize';
}

export function LearningProfileModal({
  isOpen,
  onClose,
  initialMode,
}: LearningProfileModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [initialMarkdown, setInitialMarkdown] = useState('');
  const [parsed, setParsed] = useState<LearningProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'customize'>('customize');

  // Simplified Diagnostic state
  const [intakePref, setIntakePref] = useState<'diagram' | 'table' | 'hands_on' | 'story'>('diagram');
  const [explanationLength, setExplanationLength] = useState<'short' | 'thorough'>('short');
  const [exerciseFormat, setExerciseFormat] = useState<
    'micro_steps' | 'macro_challenges' | 'guided_completion'
  >('micro_steps');
  const [hintPref, setHintPref] = useState<'toy_example' | 'guiding_question' | 'direct_explanation'>('toy_example');
  const [pace, setPace] = useState<'unhurried' | 'sprint' | 'mixed'>('unhurried');
  const [understandingLevel, setUnderstandingLevel] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [goal, setGoal] = useState('Understand foundational AI and systems from first principles');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingQuestionnaire, setSubmittingQuestionnaire] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setViewMode(initialMode);
      } else {
        const completed = localStorage.getItem('baselayer_diagnostic_completed') === 'true';
        setViewMode(completed ? 'preview' : 'customize');
      }
      loadProfile();
    }
  }, [isOpen, initialMode]);

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
      if (parsed.frontmatter.understanding_level) {
        setUnderstandingLevel(parsed.frontmatter.understanding_level);
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
        understanding_level: understandingLevel,
      });
      setMarkdown(response.markdown);
      setInitialMarkdown(response.markdown);
      setParsed(response.parsed);
      localStorage.setItem('baselayer_diagnostic_completed', 'true');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Learning Profile</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                  LEARNING.md
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calibrate explanation brevity, exercise format, and tutor guidance style
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('customize')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'customize'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders size={12} />
                <span>Diagnostic</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={12} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit size={12} />
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader size={20} className="animate-spin text-slate-300" />
              <span className="text-xs">Loading profile...</span>
            </div>
          ) : viewMode === 'customize' ? (
            <form onSubmit={handleQuestionnaireSubmit} className="space-y-6">
              {/* Question 1: Intake Modality */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    1. Intake Modality
                  </label>
                  <p className="text-xs text-slate-400">What makes a new concept click for you first?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'diagram',
                      title: 'Diagram & Visual',
                      desc: 'Flowcharts, architecture maps, and visual connections between components.',
                    },
                    {
                      id: 'table',
                      title: 'Table & Spreadsheet',
                      desc: 'Concrete input numbers, cell formulas, and row-by-row calculations.',
                    },
                    {
                      id: 'hands_on',
                      title: 'Hands-on Code',
                      desc: 'A minimal snippet of working code to edit, run, and break immediately.',
                    },
                    {
                      id: 'story',
                      title: 'Concept & Analogy',
                      desc: 'Real-world analogies and clear plain-language conceptual explanations.',
                    },
                  ].map((item) => {
                    const active = intakePref === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setIntakePref(item.id as 'diagram' | 'table' | 'hands_on' | 'story')
                        }
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-xs font-semibold ${
                              active ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Theory Depth */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    2. Explanation Depth
                  </label>
                  <p className="text-xs text-slate-400">
                    How detailed should theoretical explanations be before practice?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'short',
                      title: 'Concise Essentials',
                      desc: '2-3 key sentences with the core rule, then rapid transition directly to practice.',
                    },
                    {
                      id: 'thorough',
                      title: 'Detailed Context',
                      desc: 'Comprehensive background, why it matters, and detailed analogies first.',
                    },
                  ].map((item) => {
                    const active = explanationLength === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExplanationLength(item.id as 'short' | 'thorough')}
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-xs font-semibold ${
                              active ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: Practice Structure */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    3. Practice Structure
                  </label>
                  <p className="text-xs text-slate-400">
                    How do you prefer practice challenges to be structured?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'guided_completion',
                      title: 'Guided Fill-in-the-Blanks',
                      desc: 'Code templates with guided blanks (____) to fill in — minimal syntax anxiety, ideal for beginners.',
                    },
                    {
                      id: 'micro_steps',
                      title: 'Bite-Sized Micro-Steps',
                      desc: '4 to 6 small verified checkpoints where each line is confirmed before advancing.',
                    },
                    {
                      id: 'macro_challenges',
                      title: 'Macro Challenges',
                      desc: '1 to 2 larger end-to-end problems where you solve the puzzle with minimal handholding.',
                    },
                  ].map((item) => {
                    const active = exerciseFormat === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setExerciseFormat(
                            item.id as 'micro_steps' | 'macro_challenges' | 'guided_completion'
                          )
                        }
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-xs font-semibold ${
                              active ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 4: Getting Unstuck */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    4. Hint &amp; Guidance Style
                  </label>
                  <p className="text-xs text-slate-400">
                    When you get stuck on a problem, what helps you most?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'toy_example',
                      title: 'Toy Example (Solveit)',
                      desc: 'Show a 2x2 case with simple numbers to reveal the pattern.',
                    },
                    {
                      id: 'guiding_question',
                      title: 'Guiding Question (Socratic)',
                      desc: 'Ask a thoughtful question that helps me spot the missing piece.',
                    },
                    {
                      id: 'direct_explanation',
                      title: 'Direct Explanation',
                      desc: 'Directly explain what broke and give the exact theoretical rule.',
                    },
                  ].map((item) => {
                    const active = hintPref === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setHintPref(
                            item.id as 'toy_example' | 'guiding_question' | 'direct_explanation'
                          )
                        }
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-xs font-semibold ${
                              active ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 5: Cadence */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    5. Preferred Rhythm
                  </label>
                  <p className="text-xs text-slate-400">What cadence fits your schedule best?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'unhurried',
                      title: 'Unhurried & Deliberate',
                      desc: 'Deep dive without rush, verifying edge cases and fundamental intuition.',
                    },
                    {
                      id: 'sprint',
                      title: 'Fast & Focused Sprint',
                      desc: 'Rapid iterations, high milestone velocity, and immediate feedback.',
                    },
                  ].map((item) => {
                    const active = pace === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPace(item.id as 'unhurried' | 'sprint' | 'mixed')}
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/20'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-xs font-semibold ${
                              active ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Advanced Settings */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sliders size={13} />
                  <span>
                    {showAdvanced
                      ? 'Hide custom goals and notes'
                      : 'Customize goals and notes (optional)'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 block font-medium">
                        Baseline experience level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'beginner', label: 'Beginner' },
                          { id: 'intermediate', label: 'Intermediate' },
                          { id: 'advanced', label: 'Advanced' },
                        ].map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => {
                              const nextLvl = lvl.id as 'beginner' | 'intermediate' | 'advanced';
                              setUnderstandingLevel(nextLvl);
                              if (nextLvl === 'beginner' && exerciseFormat === 'micro_steps') {
                                setExerciseFormat('guided_completion');
                              }
                            }}
                            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                              understandingLevel === lvl.id
                                ? 'border-blue-500 bg-blue-950/40 text-white'
                                : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 block font-medium">Personal goal</label>
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g. Understand neural network training from zero"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 block font-medium">
                        Special focus areas or notes
                      </label>
                      <input
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="e.g. Backprop mathematics, PyTorch tensors, or CUDA"
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Footer & Submit */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Adapts: <span className="text-slate-200 font-medium">{explanationLength === 'short' ? 'Concise theory' : 'Detailed theory'}</span>
                  {' '}&bull;{' '}
                  <span className="text-slate-200 font-medium">
                    {exerciseFormat === 'guided_completion'
                      ? 'Guided completion'
                      : exerciseFormat === 'micro_steps'
                      ? 'Micro-steps'
                      : 'Macro challenges'}
                  </span>
                  {' '}&bull;{' '}
                  <span className="text-slate-200 font-medium">
                    {hintPref === 'guiding_question'
                      ? 'Socratic hints'
                      : hintPref === 'direct_explanation'
                      ? 'Direct explanations'
                      : 'Solveit toy cases'}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submittingQuestionnaire}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shrink-0"
                >
                  {submittingQuestionnaire ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Save Preferences</span>
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
                        : parsed.frontmatter.exercise_format === 'guided_completion'
                        ? 'Guided completion'
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
