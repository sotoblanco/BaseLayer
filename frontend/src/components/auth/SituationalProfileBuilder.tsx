import { useState, useMemo } from 'react';
import {
  User,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Table,
  PenTool,
  Layers,
  X,
  Compass,
  Zap,
  Check,
  AlertCircle,
  HelpCircle,
  Terminal,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitLearnerQuestionnaire, type LearnerQuestionnaire } from '../../services/profileService';

export const PROFILE_CONFIGURED_KEY = 'baselayer_profile_configured';
export const LEARNER_NAME_KEY = 'baselayer_learner_name';
export const DIAGNOSTIC_COMPLETED_KEY = 'baselayer_diagnostic_completed';

interface SituationalProfileBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileBuilt?: (username: string) => void;
  allowDismiss?: boolean;
}

type StuckStrategy = 'micro_steps' | 'socratic' | 'direct' | 'guided_completion';
type ToneChoice = 'pragmatic' | 'concise' | 'thorough';
type ToolFocusChoice = 'all' | 'code' | 'spreadsheet' | 'drawing';

interface CognitiveOption {
  id: string;
  title: string;
  tag: string;
  description: string;
  unblockKey: 'visual_numbers' | 'breakdown_code' | 'hand_written' | 'analogy_story';
  icon: typeof Activity;
}

const COGNITIVE_OPTIONS: CognitiveOption[] = [
  {
    id: 'concrete_numbers',
    title: 'Trace concrete values step-by-step',
    tag: 'Empirical & Concrete',
    description: 'Ground the concept with live numerical values and arithmetic progression before touching abstract math.',
    unblockKey: 'visual_numbers',
    icon: Activity,
  },
  {
    id: 'first_principles',
    title: 'Deconstruct first principles & invariants',
    tag: 'Structural Invariants',
    description: 'Focus on system boundaries, state transitions, constraints, and foundational operational rules.',
    unblockKey: 'breakdown_code',
    icon: Code2,
  },
  {
    id: 'experimental_tinkering',
    title: 'Rapid trial-and-error experimentation',
    tag: 'Interactive Verification',
    description: 'Form hypotheses, modify inputs, and verify behavior with immediate automated feedback.',
    unblockKey: 'breakdown_code',
    icon: Zap,
  },
  {
    id: 'conceptual_analogies',
    title: 'Connect to physical analogies & mental models',
    tag: 'Conceptual Narrative',
    description: 'Relate abstract mechanics to real-world physical systems and intuitive analogies.',
    unblockKey: 'analogy_story',
    icon: Compass,
  },
];

interface StuckOption {
  id: StuckStrategy;
  title: string;
  tag: string;
  description: string;
  inferredStyle: 'solveit' | 'socratic' | 'direct';
}

const STUCK_OPTIONS: StuckOption[] = [
  {
    id: 'micro_steps',
    title: 'Break it into bite-sized micro-steps',
    tag: 'Solveit Pedagogy',
    description: 'Split the challenge into isolated sub-goals that provide immediate validation at every tiny step.',
    inferredStyle: 'solveit',
  },
  {
    id: 'socratic',
    title: 'Ask guiding Socratic questions',
    tag: 'Socratic Guide',
    description: 'Prompt me with focused questions to question assumptions and discover the bug on my own.',
    inferredStyle: 'socratic',
  },
  {
    id: 'direct',
    title: 'Give direct technical rules & boundary conditions',
    tag: 'Direct Technical',
    description: 'Explain the root cause and constraints straightforwardly without guessing games.',
    inferredStyle: 'direct',
  },
  {
    id: 'guided_completion',
    title: 'Provide scaffolded templates to fill in',
    tag: 'Guided Scaffolding',
    description: 'Offer a clean code skeleton with designated TODO regions to fill in the crucial pieces.',
    inferredStyle: 'solveit',
  },
];

interface ToneOption {
  id: ToneChoice;
  title: string;
  tag: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'pragmatic',
    title: 'Pragmatic developer peer',
    tag: 'Realistic & Practical',
    description: 'Dry, realistic engineering tone focused on trade-offs, real constraints, and production reality.',
  },
  {
    id: 'concise',
    title: 'Ultra-concise and high density',
    tag: 'High Signal',
    description: 'Minimal words, bullet points, zero preamble, jumping straight to the solution.',
  },
  {
    id: 'thorough',
    title: 'Thorough first-principles depth',
    tag: 'Deep Context',
    description: 'Comprehensive explanations that connect to mathematical foundations and systems architecture.',
  },
];

interface ToolFocusOption {
  id: ToolFocusChoice;
  title: string;
  tag: string;
  description: string;
  modalities: string[];
  icon: typeof Layers;
}

const TOOL_FOCUS_OPTIONS: ToolFocusOption[] = [
  {
    id: 'all',
    title: 'Use all tools together (Recommended)',
    tag: 'Full Multi-Modal',
    description: 'Code editor, interactive spreadsheets, and drawing canvas are all active simultaneously.',
    modalities: ['code', 'spreadsheet', 'drawing'],
    icon: Layers,
  },
  {
    id: 'code',
    title: 'Lead primarily with Code',
    tag: 'Code-First',
    description: 'Focus heavily on code files and test suites, keeping spreadsheets and drawings secondary.',
    modalities: ['code'],
    icon: Code2,
  },
  {
    id: 'spreadsheet',
    title: 'Lead primarily with Interactive Spreadsheets',
    tag: 'Matrix & Grid',
    description: 'Focus heavily on cell calculations, tensor numbers, and formula verification.',
    modalities: ['spreadsheet'],
    icon: Table,
  },
  {
    id: 'drawing',
    title: 'Lead primarily with Visual Canvas',
    tag: 'Canvas & Diagrams',
    description: 'Focus heavily on architectural diagrams, memory layouts, and visual mental models.',
    modalities: ['drawing'],
    icon: PenTool,
  },
];

export function SituationalProfileBuilder({
  isOpen,
  onClose,
  onProfileBuilt,
  allowDismiss = true,
}: SituationalProfileBuilderProps) {
  const { localWelcome, user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [username, setUsername] = useState(
    () => localStorage.getItem(LEARNER_NAME_KEY) || user?.username || ''
  );
  const [goal, setGoal] = useState(
    'Understand foundational AI and systems from first principles'
  );
  const [selectedCognitive, setSelectedCognitive] = useState<string>('concrete_numbers');
  const [stuckChoice, setStuckChoice] = useState<StuckStrategy>('micro_steps');
  const [toneChoice, setToneChoice] = useState<ToneChoice>('pragmatic');
  const [toolFocus, setToolFocus] = useState<ToolFocusChoice>('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Derived inferences
  const inferredTutorStyle = useMemo(() => {
    const found = STUCK_OPTIONS.find((s) => s.id === stuckChoice);
    return found ? found.inferredStyle : 'solveit';
  }, [stuckChoice]);

  const inferredExerciseFormat = useMemo(() => {
    if (stuckChoice === 'guided_completion') return 'guided_completion';
    if (stuckChoice === 'socratic') return 'macro_challenges';
    return 'micro_steps';
  }, [stuckChoice]);

  const inferredModalities = useMemo(() => {
    const found = TOOL_FOCUS_OPTIONS.find((t) => t.id === toolFocus);
    return found ? found.modalities : ['code', 'spreadsheet', 'drawing'];
  }, [toolFocus]);

  const unblockStrategy = useMemo(() => {
    const found = COGNITIVE_OPTIONS.find((c) => c.id === selectedCognitive);
    return found ? found.unblockKey : 'visual_numbers';
  }, [selectedCognitive]);

  const handleBuildProfile = async (forcedToolFocus?: ToolFocusChoice) => {
    const trimmedName = username.trim() || 'Learner';
    setIsSubmitting(true);
    setErrorMessage('');

    const effectiveToolFocus = forcedToolFocus || toolFocus;
    const finalModalities =
      effectiveToolFocus === 'all'
        ? ['code', 'spreadsheet', 'drawing']
        : TOOL_FOCUS_OPTIONS.find((t) => t.id === effectiveToolFocus)?.modalities || [
            'code',
            'spreadsheet',
            'drawing',
          ];

    try {
      // 1. Establish local session with the handle
      await localWelcome(trimmedName);

      // 2. Submit the inferred questionnaire answers to build LEARNING.md
      const payload: LearnerQuestionnaire = {
        unblock_strategies: [unblockStrategy],
        preferred_modalities: finalModalities,
        exercise_format: inferredExerciseFormat,
        hint_preference:
          stuckChoice === 'socratic'
            ? 'guiding_question'
            : stuckChoice === 'direct'
            ? 'direct_explanation'
            : 'toy_example',
        explanation_length: toneChoice === 'thorough' ? 'thorough' : 'short',
        tone: toneChoice === 'thorough' ? 'direct' : toneChoice,
        pace: toneChoice === 'concise' ? 'sprint' : 'unhurried',
        goal: goal.trim() || 'Understand foundational AI and systems from first principles',
        preferred_ui: 'light',
        understanding_level: 'intermediate',
        tutor_style: inferredTutorStyle,
      };

      await submitLearnerQuestionnaire(payload);

      // 3. Persist local machine profile flag so BaseLayer never asks again
      localStorage.setItem(PROFILE_CONFIGURED_KEY, 'true');
      localStorage.setItem(LEARNER_NAME_KEY, trimmedName);
      localStorage.setItem(DIAGNOSTIC_COMPLETED_KEY, 'true');

      setIsSuccess(true);
      if (onProfileBuilt) {
        onProfileBuilt(trimmedName);
      }

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not build profile. Check your connection to the local backend.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Build Your Learning Profile
              </h2>
              <p className="text-xs text-slate-400">
                Situational onboarding to tailor your personal tutor, pacing, and feedback
              </p>
            </div>
          </div>
          {allowDismiss && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Stepper Indicator */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((stepNum) => (
              <button
                key={stepNum}
                onClick={() => {
                  if (stepNum < step) setStep(stepNum as 1 | 2 | 3 | 4);
                }}
                disabled={stepNum > step}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  step === stepNum
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                    : step > stepNum
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {step > stepNum ? <Check size={13} /> : stepNum}
              </button>
            ))}
          </div>
          <span className="text-slate-400 font-medium">
            {step === 1 && '1. Handle & Focus'}
            {step === 2 && '2. Mental Model Approach'}
            {step === 3 && '3. Stuck Resolution'}
            {step === 4 && '4. Tone & Tool Preference'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Identity & Goal */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    Who is coding on this machine?
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    BaseLayer is local-first. Enter your handle so your progress, personal notes,
                    and LEARNING.md stay organized on this machine.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Your Handle or Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. Alex, DevDave, Ada"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Current Learning Focus
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Compass size={16} />
                      </div>
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="What are you mastering?"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
                <Terminal size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Zero external accounts required. Your profile will be saved to{' '}
                  <span className="font-mono text-emerald-300">data/learners/{username.trim() || 'username'}/LEARNING.md</span> and picked up automatically on your machine.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Mental Model Approach */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Situation 1
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5 mb-1">
                  When tackling an unfamiliar, complex concept (e.g. self-attention, backprop, or memory allocators), what helps it click fastest?
                </h3>
                <p className="text-xs text-slate-400">
                  Select the cognitive style that best describes how your intuition forms.
                </p>
              </div>

              <div className="space-y-2.5">
                {COGNITIVE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedCognitive === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedCognitive(opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                            <Icon size={16} />
                          </div>
                          <h4 className="text-sm font-semibold text-white">{opt.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed pl-8">
                          {opt.description}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700'}`}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Guidance When Stuck */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Situation 2
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5 mb-1">
                  You hit a compiler error or failing test while coding. How should the tutor intervene?
                </h3>
                <p className="text-xs text-slate-400">
                  Choose how BaseLayer scaffolds your exercises and delivers automated guidance.
                </p>
              </div>

              <div className="space-y-2.5">
                {STUCK_OPTIONS.map((opt) => {
                  const isSelected = stuckChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStuckChoice(opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{opt.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700'}`}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs flex items-center justify-between text-slate-400">
                <span>Inferred Tutor Style:</span>
                <span className="px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-xs font-semibold border border-blue-500/30 capitalize">
                  {inferredTutorStyle} ({inferredExerciseFormat.replace('_', ' ')})
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Tone & Tool Preference / Skip */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Situation 3
                </span>
                <h3 className="text-base font-semibold text-white mt-0.5 mb-1">
                  How should explanations and code reviews sound?
                </h3>
                <p className="text-xs text-slate-400">
                  Select your preferred tone for hints and feedback.
                </p>
              </div>

              <div className="space-y-2.5">
                {TONE_OPTIONS.map((opt) => {
                  const isSelected = toneChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setToneChoice(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{opt.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-700'}`}>
                          {isSelected && <Check size={11} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tool Focus Optional Section */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Tool Focus (Optional)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Code, spreadsheets, and diagrams are all active by default. You can choose a primary tool or keep all three.
                    </p>
                  </div>
                  {toolFocus !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setToolFocus('all')}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Reset to All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TOOL_FOCUS_OPTIONS.map((tool) => {
                    const isSelected = toolFocus === tool.id;
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setToolFocus(tool.id)}
                        className={`text-left p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{tool.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{tool.tag}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Blueprint Card */}
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={14} />
                    Profile Blueprint
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    data/learners/{username.trim() || 'Learner'}/LEARNING.md
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Handle</span>
                    <span className="font-semibold text-white truncate block">{username.trim() || 'Learner'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Tutor Style</span>
                    <span className="font-semibold text-emerald-300 capitalize block">{inferredTutorStyle}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Modalities</span>
                    <span className="font-semibold text-blue-300 block">{inferredModalities.join(', ')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Format</span>
                    <span className="font-semibold text-slate-200 capitalize block">{inferredExerciseFormat.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {isSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Profile created and saved locally! BaseLayer will remember this configuration.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <HelpCircle size={13} />
                Saved directly to your machine.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !username.trim()) {
                    setUsername('Learner');
                  }
                  setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
                }}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleBuildProfile('all')}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Use all three tools together without setting a primary preference"
                >
                  <span>Skip (Use All Tools)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBuildProfile()}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Building Profile...</span>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Build My Profile</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
