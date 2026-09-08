import { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  FileText,
  BookOpen,
  Loader,
  CheckCircle2,
  Layers,
  User,
  Wrench,
  GraduationCap,
  ArrowRight,
  MessageSquareText,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  planLearningCourse,
  approveLearningCourse,
  getAiStatus,
  type CoursePlanPreviewResult,
  type LessonPreview,
} from '../services/aiService';
import { getLearningProfile } from '../services/profileService';
import ChatCourseImport from './ChatCourseImport';
import CourseStyleMiniForm, { type CourseStylePreferences } from './CourseStyleMiniForm';

interface CourseBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onBuilt: (slug: string) => void;
}

type BuilderTab = 'agentic' | 'chat';

const AGENT_WORKFLOW_STEPS = [
  {
    tool_name: 'get_learning_intent',
    label: '1. Intent & Concepts',
    desc: 'Extracting core concepts and searching platform course anchors',
    icon: Layers,
  },
  {
    tool_name: 'get_context_learning',
    label: '2. Learner Profile',
    desc: 'Retrieving personal preferences, level, and modalities',
    icon: User,
  },
  {
    tool_name: 'get_platform_content_tools',
    label: '3. Platform Tools',
    desc: 'Querying Code Sandbox, Google Sheets, and Hand Drawing',
    icon: Wrench,
  },
  {
    tool_name: 'curate_solveit_course',
    label: '4. Solveit Curation',
    desc: 'Applying micro-steps (1-3 lines), toy data, and narrative arc',
    icon: GraduationCap,
  },
];

export default function CourseBuilder({ isOpen, onClose, onBuilt }: CourseBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>('agentic');
  const [topic, setTopic] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [error, setError] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [plannedCourse, setPlannedCourse] = useState<CoursePlanPreviewResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedLessons, setEditedLessons] = useState<LessonPreview[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [stylePreferences, setStylePreferences] = useState<CourseStylePreferences>({
    modalities: ['code', 'spreadsheet', 'drawing'],
    scaffold: 'micro_steps',
    explanationLength: 'short',
    tutorStyle: 'solveit',
    level: 'intermediate',
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlanning && !plannedCourse) {
      timer = setInterval(() => {
        setActiveStepIndex((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlanning, plannedCourse]);

  // On every open: refresh AI status, load learner profile preferences,
  // and pick the tab that actually works for this learner.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPlannedCourse(null);
    setIsPlanning(false);
    setIsApproving(false);
    setIsEditing(false);
    setActiveStepIndex(0);
    setAiLoading(true);

    getLearningProfile()
      .then((profileData) => {
        const fm = profileData?.parsed?.frontmatter;
        if (fm) {
          setStylePreferences({
            modalities:
              fm.preferred_modalities && fm.preferred_modalities.length > 0
                ? fm.preferred_modalities
                : ['code', 'spreadsheet', 'drawing'],
            scaffold:
              (fm.exercise_format as 'micro_steps' | 'guided_completion' | 'macro_challenges') ||
              'micro_steps',
            explanationLength:
              (fm.explanation_length as 'short' | 'thorough') || 'short',
            tutorStyle:
              (fm.tutor_style as 'solveit' | 'socratic' | 'direct' | 'blooms') || 'solveit',
            level:
              (fm.understanding_level as 'beginner' | 'intermediate' | 'advanced') ||
              'intermediate',
          });
        }
      })
      .catch(() => {});

    getAiStatus()
      .then((status) => {
        setAiConfigured(status.configured);
        setActiveTab(status.configured ? 'agentic' : 'chat');
      })
      .catch(() => {
        // Status unknown: the copy-paste path needs no key, so default to it.
        setAiConfigured(false);
        setActiveTab('chat');
      })
      .finally(() => setAiLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlanCourse = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!topic.trim()) {
      setError('Tell me what you want to learn.');
      return;
    }

    if (aiConfigured === false) {
      setError(
        'No AI provider is configured here, so the agentic builder cannot run. Use the "No API key?" tab instead: paste a short prompt into any free chat and import the result.',
      );
      setActiveTab('chat');
      return;
    }

    setError('');
    setIsPlanning(true);
    setActiveStepIndex(0);
    setPlannedCourse(null);
    setIsEditing(false);

    try {
      const plan = await planLearningCourse(topic, referenceText, {
        preferred_modalities: stylePreferences.modalities,
        exercise_format: stylePreferences.scaffold,
        explanation_length: stylePreferences.explanationLength,
        tutor_style: stylePreferences.tutorStyle,
        understanding_level: stylePreferences.level,
      });
      setPlannedCourse(plan);
      setEditedTitle(plan.title);
      setEditedDescription(plan.narrative_arc || plan.description || '');
      setEditedLessons(plan.lessons);
      setActiveStepIndex(4);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : 'Could not plan the course.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApproveCourse = async () => {
    if (!plannedCourse) return;
    setError('');
    setIsApproving(true);

    try {
      const result = await approveLearningCourse({
        plan_id: plannedCourse.plan_id,
        title: editedTitle.trim() || plannedCourse.title,
        description: editedDescription.trim() || plannedCourse.description,
        lessons: editedLessons.map((lesson, idx) => ({
          order: idx + 1,
          original_order: lesson.original_order ?? lesson.order,
          title: lesson.title,
          objective: lesson.objective,
          toy_data: lesson.toy_data,
          expected_result: lesson.expected_result,
          micro_task: lesson.micro_task,
          inspect_prompt: lesson.inspect_prompt,
          curiosity_prompt: lesson.curiosity_prompt,
        })),
      });

      // Fast-track learner directly to course lesson 1
      onBuilt(result.slug);
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : 'Could not approve and materialize course.',
      );
      setIsApproving(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedLessons((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === editedLessons.length - 1) return;
    setEditedLessons((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleDropLesson = (index: number) => {
    if (editedLessons.length <= 1) return;
    setEditedLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLessonChange = (index: number, field: 'title' | 'objective', value: string) => {
    setEditedLessons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleResetEdits = () => {
    if (!plannedCourse) return;
    setEditedTitle(plannedCourse.title);
    setEditedDescription(plannedCourse.narrative_arc || plannedCourse.description || '');
    setEditedLessons(plannedCourse.lessons);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-6 bg-slate-900/90">
          <div className="flex gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Build a course</h2>
              <p className="mt-1 text-xs text-slate-400">
                {activeTab === 'agentic'
                  ? 'Plan and preview curriculum before anything is written to disk'
                  : 'Copy one prompt into any chat - no API key required'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-slate-800 bg-slate-950/60 px-6 pt-3">
          <button
            onClick={() => setActiveTab('agentic')}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'agentic'
                ? 'border border-b-0 border-slate-700 bg-slate-900 text-emerald-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sparkles size={14} className="text-emerald-400" />
            With an AI key
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase">
              agentic
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'chat'
                ? 'border border-b-0 border-slate-700 bg-slate-900 text-emerald-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MessageSquareText size={14} className="text-blue-400" />
            No API key? Use any chat
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase">
              free
            </span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {aiLoading && activeTab === 'agentic' && aiConfigured === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
              <Loader size={16} className="animate-spin text-emerald-400" /> Checking your AI setup...
            </div>
          ) : activeTab === 'chat' ? (
            <ChatCourseImport
              topic={topic}
              referenceText={referenceText}
              preferences={stylePreferences}
              onPreferencesChange={setStylePreferences}
              onTopicChange={setTopic}
              onReferenceChange={setReferenceText}
              onImported={onBuilt}
            />
          ) : (
            <>
              {aiConfigured === false && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-300">
                        No AI provider is configured here.
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-200/80">
                        The agentic builder needs an API key on this device. The
                        &ldquo;No API key?&rdquo; tab works with any free chat (Gemini, ChatGPT,
                        Claude) and needs nothing installed.
                      </p>
                      <button
                        onClick={() => {
                          setError('');
                          setActiveTab('chat');
                        }}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
                      >
                        Use any chat instead <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View 1: Active Planning Tool Progress */}
              {isPlanning && (
                <div className="py-4 space-y-6">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-bold text-white">Agent is Planning Your Course</h3>
                    <p className="text-xs text-slate-400">
                      Running tool calls to structure curriculum before materializing to disk...
                    </p>
                  </div>

                  <div className="space-y-3">
                    {AGENT_WORKFLOW_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isDone = activeStepIndex > idx;
                      const isCurrent = activeStepIndex === idx;

                      return (
                        <div
                          key={step.tool_name}
                          className={`p-3.5 rounded-xl border flex items-center gap-3.5 transition-all ${
                            isDone
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : isCurrent
                                ? 'border-blue-500/40 bg-blue-500/10 text-white animate-pulse'
                                : 'border-slate-800 bg-slate-950/40 text-slate-500'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isCurrent
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-slate-900 text-slate-600'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : isCurrent ? (
                              <Loader size={16} className="animate-spin text-blue-400" />
                            ) : (
                              <Icon size={16} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{step.label}</span>
                              <span className="text-[10px] font-mono opacity-70 font-semibold">
                                {isDone ? 'COMPLETED' : isCurrent ? 'EXECUTING...' : 'QUEUED'}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-80 mt-0.5 truncate">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-center text-xs text-slate-400">
                    <BookOpen size={14} className="inline mr-1.5 text-emerald-400" />
                    Preview gate: nothing is written to disk until you confirm the planned lessons.
                  </div>
                </div>
              )}

              {/* View 2: Active Approving & Materializing */}
              {isApproving && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="rounded-full bg-emerald-500/10 p-4 text-emerald-400">
                    <Loader size={32} className="animate-spin text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Materializing Your Course</h3>
                    <p className="text-xs text-slate-400">
                      Writing verified lessons to disk and fast-tracking to lesson 1...
                    </p>
                  </div>
                </div>
              )}

              {/* View 3: Course Plan Preview Gate */}
              {!isPlanning && !isApproving && plannedCourse && (
                <div className="space-y-5">
                  {/* Preview Banner */}
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                        <Sparkles size={16} />
                        <span>Planned Course Preview</span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-300/80 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
                        Not yet written to disk
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {isEditing ? (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Course Title
                            </label>
                            <input
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Description & Why
                            </label>
                            <textarea
                              rows={2}
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base font-extrabold text-white">{editedTitle}</h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {editedDescription}
                          </p>
                        </>
                      )}

                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="text-emerald-400 font-semibold">
                          {editedLessons.length} Micro-Lessons
                        </span>
                        <span>•</span>
                        <span>Solveit Verified</span>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-xs">
                          Target: courses/{plannedCourse.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lessons List Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Proposed Lessons ({editedLessons.length})
                      </h4>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          <Edit2 size={13} />
                          <span>Edit plan</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {editedLessons.map((lesson, idx) => (
                        <div
                          key={lesson.original_order ?? idx}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5 transition-all"
                        >
                          {/* Lesson Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                                Lesson {idx + 1}
                              </span>
                              {!isEditing && (
                                <span className="text-xs font-bold text-white truncate">
                                  {lesson.title}
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveUp(idx)}
                                  disabled={idx === 0}
                                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                  title="Move up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDown(idx)}
                                  disabled={idx === editedLessons.length - 1}
                                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                  title="Move down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDropLesson(idx)}
                                  disabled={editedLessons.length <= 1}
                                  className="p-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 disabled:pointer-events-none"
                                  title="Drop lesson"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 uppercase">
                                {lesson.modality}
                              </span>
                            )}
                          </div>

                          {/* Lesson Content / Edit Fields */}
                          {isEditing ? (
                            <div className="space-y-2 pt-1">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  Title
                                </label>
                                <input
                                  value={lesson.title}
                                  onChange={(e) => handleLessonChange(idx, 'title', e.target.value)}
                                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                  Objective
                                </label>
                                <textarea
                                  rows={2}
                                  value={lesson.objective}
                                  onChange={(e) =>
                                    handleLessonChange(idx, 'objective', e.target.value)
                                  }
                                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                <span className="text-slate-500 font-semibold">Objective: </span>
                                {lesson.objective}
                              </p>

                              <div className="rounded-lg bg-slate-900 border border-slate-800/80 p-2 text-[11px] font-mono space-y-1">
                                <div className="text-slate-300">
                                  <span className="text-emerald-400 font-semibold">Toy data: </span>
                                  <span className="text-slate-200">{lesson.toy_data}</span>
                                </div>
                                {lesson.expected_result && (
                                  <div className="text-slate-400">
                                    <span className="text-blue-400 font-semibold">Expected: </span>
                                    <span>{lesson.expected_result}</span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/70">
                                  <span className="text-slate-400 font-semibold block mb-0.5">
                                    Micro-Step
                                  </span>
                                  <span className="text-slate-300">{lesson.micro_task}</span>
                                </div>
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/70">
                                  <span className="text-slate-400 font-semibold block mb-0.5">
                                    Live Inspection
                                  </span>
                                  <span className="text-slate-300">{lesson.inspect_prompt}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                      {error}
                    </p>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetEdits}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          Discard edits
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                        >
                          <Check size={14} />
                          <span>Done editing</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPlannedCourse(null)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          Change topic
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlanCourse()}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <RotateCcw size={13} />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    )}

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={handleApproveCourse}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                      >
                        <CheckCircle2 size={15} />
                        <span>Approve & build</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View 4: Initial Input Form */}
              {!isPlanning && !isApproving && !plannedCourse && (
                <form onSubmit={handlePlanCourse} className="space-y-5">
                  <div>
                    <label
                      htmlFor="course-topic"
                      className="mb-2 block text-sm font-semibold text-slate-200"
                    >
                      What do you want to learn?
                    </label>
                    <input
                      id="course-topic"
                      autoFocus
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      placeholder="e.g. NumPy broadcasting and matrix multiplication"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="course-reference"
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"
                    >
                      <FileText size={15} /> Optional notes, code, or documentation
                    </label>
                    <textarea
                      id="course-reference"
                      value={referenceText}
                      onChange={(event) => setReferenceText(event.target.value)}
                      placeholder="Paste relevant documentation excerpts, formulas, or code snippets to ground your lessons..."
                      rows={4}
                      className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {/* Tailor course mini-form */}
                  <CourseStyleMiniForm
                    preferences={stylePreferences}
                    onChange={setStylePreferences}
                    defaultExpanded={true}
                  />

                  {/* Agentic workflow step preview */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2 font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      <Sparkles size={13} className="text-emerald-400" />
                      <span>Agent Workflow Pipeline (Preview Gate)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-emerald-400 font-bold">1. Learning Intent</span>
                        <p className="text-slate-500 mt-0.5">Extracts concepts & course anchors</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-blue-400 font-bold">2. Learner Profile</span>
                        <p className="text-slate-500 mt-0.5">Personalizes level & preferred modality</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-amber-400 font-bold">3. Platform Tools</span>
                        <p className="text-slate-500 mt-0.5">Code, Sheets, and Hand Drawing</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-purple-400 font-bold">4. Solveit Curation</span>
                        <p className="text-slate-500 mt-0.5">Toy data, 1-3 line tasks, live inspect</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
                    >
                      <Sparkles size={15} />
                      <span>Plan my course</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
