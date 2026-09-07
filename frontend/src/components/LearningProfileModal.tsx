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
  const [unblockStrategies, setUnblockStrategies] = useState<string[]>([
    'breakdown_code',
    'visual_numbers',
  ]);
  const [explanationLength, setExplanationLength] = useState<'short' | 'thorough'>('short');
  const [exerciseFormat, setExerciseFormat] = useState<
    'micro_steps' | 'macro_challenges' | 'guided_completion'
  >('micro_steps');
  const [hintPref, setHintPref] = useState<'toy_example' | 'guiding_question' | 'direct_explanation'>('toy_example');
  const [tone, setTone] = useState<'direct' | 'pragmatic' | 'concise'>('pragmatic');
  const [pace, setPace] = useState<'unhurried' | 'sprint' | 'mixed'>('unhurried');
  const [understandingLevel, setUnderstandingLevel] = useState<
    'beginner' | 'intermediate' | 'advanced'
  >('intermediate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [goal, setGoal] = useState('Understand foundational AI and systems from first principles');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingQuestionnaire, setSubmittingQuestionnaire] = useState(false);

  const getInferredModalities = (strats: string[]): string[] => {
    const mods: string[] = [];
    if (strats.includes('breakdown_code')) mods.push('code');
    if (strats.includes('visual_numbers')) mods.push('spreadsheet');
    if (strats.includes('hand_written')) mods.push('drawing');
    if (strats.includes('analogy_story')) mods.push('text');
    return mods.length > 0 ? mods : ['code'];
  };

  const toggleUnblockStrategy = (id: string) => {
    setUnblockStrategies((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  };

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
      if (parsed.frontmatter.tone) {
        setTone(parsed.frontmatter.tone);
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
      if (parsed.frontmatter.preferred_modalities && parsed.frontmatter.preferred_modalities.length > 0) {
        const mods = parsed.frontmatter.preferred_modalities;
        const strats: string[] = [];
        if (mods.includes('code')) strats.push('breakdown_code');
        if (mods.includes('spreadsheet')) strats.push('visual_numbers');
        if (mods.includes('drawing')) strats.push('hand_written');
        if (mods.includes('text')) strats.push('analogy_story');
        if (strats.length > 0) {
          setUnblockStrategies(strats);
        }
      }
    }
  }, [parsed]);

  const handleQuestionnaireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuestionnaire(true);
    setError('');
    const inferredMods = getInferredModalities(unblockStrategies);
    const legacyIntake = unblockStrategies.includes('hand_written')
      ? 'diagram'
      : unblockStrategies.includes('visual_numbers')
      ? 'table'
      : unblockStrategies.includes('analogy_story')
      ? 'story'
      : 'hands_on';

    try {
      const response = await submitLearnerQuestionnaire({
        unblock_strategies: unblockStrategies as (
          | 'breakdown_code'
          | 'visual_numbers'
          | 'hand_written'
          | 'analogy_story'
        )[],
        preferred_modalities: inferredMods,
        intake_preference: legacyIntake,
        explanation_length: explanationLength,
        exercise_format: exerciseFormat,
        hint_preference: hintPref,
        tone,
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
              {/* Question 1: Realistic Problem Solving: How You Unblock */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                      1. How You Unblock (Realistic Scenarios)
                    </label>
                    <span className="text-[10px] text-blue-400 font-medium">Multi-select enabled</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Think about the last time you didn&apos;t understand a complex topic. What helped you unblock? (Pick all that help — you aren&apos;t locked into a single style)
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'breakdown_code',
                      title: 'Break down code in steps',
                      desc: 'Isolate a minimal 1-3 line snippet, run it in isolation, and inspect the return value or failure.',
                      modality: 'Code',
                    },
                    {
                      id: 'visual_numbers',
                      title: 'Calculate & visualize numbers',
                      desc: 'Lay out concrete numbers in a sheet/table, evaluate cells step-by-step, and observe patterns.',
                      modality: 'Spreadsheet',
                    },
                    {
                      id: 'hand_written',
                      title: 'Hand-written sketches & diagrams',
                      desc: 'Grab pen & paper or a whiteboard to sketch tensor shapes, architecture nodes, or flow paths.',
                      modality: 'Hand-written / Drawing',
                    },
                    {
                      id: 'analogy_story',
                      title: 'Analogies & conceptual walk-throughs',
                      desc: 'Connect the abstract logic to concrete real-world systems and plain-English mental models.',
                      modality: 'Conceptual',
                    },
                  ].map((item) => {
                    const active = unblockStrategies.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleUnblockStrategy(item.id)}
                        className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-blue-500/80 bg-blue-950/25 shadow-sm'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            active ? 'border-blue-500 bg-blue-500 text-slate-950' : 'border-slate-600'
                          }`}
                        >
                          {active && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`block text-xs font-semibold ${
                                active ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {item.modality}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                            {item.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Inferred Learning Blend Indicator */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400 text-[11px]">Inferred learning style:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {getInferredModalities(unblockStrategies).map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 border border-blue-500/30 text-blue-300 capitalize"
                      >
                        {m === 'drawing' ? 'Hand-written / Drawing' : m}
                      </span>
                    ))}
                  </div>
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
                      title: 'Micro-Steps (Solveit)',
                      desc: 'Work through 1-3 lines with clear inspection prompts to reveal the pattern.',
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

              {/* Question 6: Explanation Voice & Tone */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    6. Explanation Voice & Tone
                  </label>
                  <p className="text-xs text-slate-400">
                    How should concepts and software edge cases be explained?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'pragmatic',
                      title: 'Pragmatic & Realistic',
                      desc: 'Dry developer realism about bugs, edge cases, and computer literalism. No forced humor.',
                    },
                    {
                      id: 'direct',
                      title: 'Direct & Technical',
                      desc: 'Neutral, technical manual documentation style without conversational filler.',
                    },
                    {
                      id: 'concise',
                      title: 'Ultra-Concise',
                      desc: 'Minimal text — code-first, jump straight into runnable tasks with zero preamble.',
                    },
                  ].map((item) => {
                    const active = tone === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTone(item.id as 'direct' | 'pragmatic' | 'concise')}
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
                  <span className="text-slate-200 font-medium capitalize">{tone} tone</span>
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
                      Voice & Tone
                    </span>
                    <p className="font-bold text-amber-400 capitalize">
                      {parsed.frontmatter.tone || 'pragmatic'}
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
