import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  ChevronRight,
  FolderCode,
  CheckCircle2,
  Upload,
  Share2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { UserMenu } from '../components/UserMenu';
import { WelcomeGate } from '../components/auth/WelcomeGate';
import { SituationalProfileBuilder, PROFILE_CONFIGURED_KEY } from '../components/auth/SituationalProfileBuilder';
import CourseBuilder from '../components/CourseBuilder';
import { LearningProfileModal } from '../components/LearningProfileModal';
import { ShareModal } from '../components/ShareModal';
import { ImportModal } from '../components/ImportModal';
import { fetchMyProgress, getLocalHeaders, type CourseProgressSummary } from '../services/profileService';

interface FileCourse {
  slug: string;
  title: string;
  description: string;
  lesson_count: number;
  skills?: string[];
  modalities?: string[];
  is_generated?: boolean;
  is_project?: boolean;
}

interface UnifiedCourse {
  id: string;
  slug: string;
  type: 'file';
  title: string;
  description: string;
  lesson_count: number;
  navigatePath: string;
  skills?: string[];
  modalities?: string[];
  is_generated?: boolean;
  is_project?: boolean;
  progress?: CourseProgressSummary | null;
}


const PROTECTED_COURSE_SLUGS = new Set([
  'tinytorch',
  'data-modeling',
  'pytorch',
  'llms-from-scratch',
]);

// The startup diagnostic prompt must never hide the catalog on every launch:
// once the user explicitly dismisses it, remember that choice locally. The
// modal stays one click away via the "Learning Style" header button.
const DIAGNOSTIC_COMPLETED_KEY = 'baselayer_diagnostic_completed';
const DIAGNOSTIC_DISMISSED_KEY = 'baselayer_diagnostic_dismissed';

export default function CoursesPage() {
  const [courses, setCourses] = useState<UnifiedCourse[]>([]);
  const [progressBySlug, setProgressBySlug] = useState<Record<string, CourseProgressSummary>>({});
  const [loading, setLoading] = useState(true);
  const [isProfileConfigured, setIsProfileConfigured] = useState<boolean>(() => {
    return localStorage.getItem(PROFILE_CONFIGURED_KEY) === 'true';
  });
  const [isSituationalProfileOpen, setIsSituationalProfileOpen] = useState(false);
  const [isAiFeaturesOpen, setIsAiFeaturesOpen] = useState(false);
  const [isCourseBuilderOpen, setIsCourseBuilderOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileInitialMode, setProfileInitialMode] = useState<'preview' | 'edit' | 'customize'>('customize');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInitialData, setImportInitialData] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    courseSlug: string;
    lessonSlug?: string | null;
    title: string;
  } | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ slug: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [coursesError, setCoursesError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE_URL}/file-courses/${courseToDelete.slug}`, {
        method: 'DELETE',
        headers: getLocalHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove course');
      }
      setCourses((prev) => prev.filter((c) => c.id !== `file-${courseToDelete.slug}`));
      setProgressBySlug((prev) => {
        const copy = { ...prev };
        delete copy[courseToDelete.slug];
        return copy;
      });
      setCourseToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('#import=') || hash.includes('#share='))) {
      setImportInitialData(hash);
      setIsImportModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const hasConfigured = localStorage.getItem(PROFILE_CONFIGURED_KEY) === 'true';
    const hasCompleted = localStorage.getItem(DIAGNOSTIC_COMPLETED_KEY) === 'true';
    const hasDismissed = localStorage.getItem(DIAGNOSTIC_DISMISSED_KEY) === 'true';

    // If profile is already configured or dismissed on this machine, never prompt on startup
    if (hasConfigured || hasCompleted || hasDismissed) {
      return;
    }

    // Auto-prompt situational onboarding on first launch
    setIsSituationalProfileOpen(true);
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fileRes = await fetch(`${API_BASE_URL}/file-courses/`);

        if (!fileRes.ok) {
          setCoursesError(
            'Could not load local courses from the API (GET /file-courses/ failed). Is the backend running? Start it with ./dev.sh (or ./docker-dev.sh) and reload.'
          );
          setCourses([]);
          return;
        }

        const files: FileCourse[] = await fileRes.json();
        const unified: UnifiedCourse[] = files.map((c) => {
          const progress = progressBySlug[c.slug];
          const resume = progress && !progress.completed && progress.resume_lesson;
          return {
            id: `file-${c.slug}`,
            slug: c.slug,
            type: 'file' as const,
            title: c.title,
            description: c.description.replace(/^#\s+[^\n]+\n*/, '').trim() || c.description,
            lesson_count: c.lesson_count,
            navigatePath: resume
              ? `/file-course/${c.slug}/${progress!.resume_lesson}`
              : `/file-course/${c.slug}`,
            skills: c.skills,
            modalities: c.modalities || ['code'],
            is_generated: c.is_generated ?? (c.slug.startsWith('generated-') || c.slug.startsWith('learn-')),
            is_project: Boolean(c.is_project),
            progress: progress ?? null,
          };

        });

        setCourses(unified);
        setCoursesError('');
      } catch (err) {
        console.error('Failed to fetch courses', err);
        setCoursesError(
          'Could not load local courses from the API (GET /file-courses/ failed). Is the backend running? Start it with ./dev.sh (or ./docker-dev.sh) and reload.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [progressBySlug]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setProgressBySlug({});
      return;
    }
    fetchMyProgress().then((list) => {
      if (!active) return;
      const bySlug: Record<string, CourseProgressSummary> = {};
      list.forEach((p) => {
        bySlug[p.course_slug] = p;
      });
      setProgressBySlug(bySlug);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const hasNoCourses = courses.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Terminal size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">BaseLayer App</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAiFeaturesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="Configure AI features and model providers"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>AI Features</span>
          </button>
          {!isProfileConfigured && (
            <button
              onClick={() => setIsSituationalProfileOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Set Up Your Learning Profile"
            >
              <Sparkles size={13} />
              <span>Set Up Profile</span>
            </button>
          )}
          <UserMenu
            onOpenProfile={() => {
              setProfileInitialMode('preview');
              setIsProfileModalOpen(true);
            }}
            onRecalibrate={() => {
              setIsSituationalProfileOpen(true);
            }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8">
        <div className="mb-8">
          <div className="flex flex-col gap-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">Learn by building</p>
              <h2 className="mb-2 text-3xl font-bold">What do you want to learn?</h2>
              <p className="max-w-xl text-slate-400">Ask for a topic and optionally add notes. BaseLayer will create a runnable course using tiny Solveit steps.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                title="Import a shared course or lesson bundle"
              >
                <Upload size={16} className="text-blue-400" />
                <span>Import Course</span>
              </button>
              <button
                onClick={() => setIsCourseBuilderOpen(true)}
                className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                Build a course
              </button>
            </div>
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold">Available Courses</h3>
              <p className="text-slate-400">Select a course to start learning and building.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasNoCourses ? (
              <div className="col-span-full text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                <p>No courses available right now.</p>
                {coursesError && (
                  <p className="mt-3 max-w-xl mx-auto text-xs text-amber-300/90">{coursesError}</p>
                )}
              </div>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id}
                  className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col ${
                    course.type === 'file'
                      ? 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
                      : 'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10'
                  }`}
                  onClick={() => {
                    navigate(course.navigatePath);
                  }}
                >
                  <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-600" />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-slate-800 rounded-lg transition-colors group-hover:bg-emerald-500/10 group-hover:text-emerald-400">
                        <FolderCode size={24} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const cleanSlug = course.slug;
                            setShareModalData({
                              courseSlug: cleanSlug,
                              title: course.title,
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                          title="Share or export this course"
                        >
                          <Share2 size={14} />
                        </button>
                        {!PROTECTED_COURSE_SLUGS.has(course.slug.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseToDelete({
                                slug: course.slug,
                                title: course.title,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
                            title="Remove course from catalog"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {course.is_project && (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                            Project
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                            course.is_generated
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {course.is_generated ? 'Generated' : 'Curated'}
                        </span>

                      </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2 transition-colors group-hover:text-emerald-400">
                      {course.title}
                    </h3>

                    {course.modalities && course.modalities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {course.modalities.map((mod) => (
                          <span
                            key={mod}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize"
                          >
                            {mod === 'drawing' ? 'Hand-drawn' : mod}
                          </span>
                        ))}
                      </div>
                    )}

                    {course.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                    )}

                    {course.skills && course.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {course.skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {course.progress && course.type === 'file' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          {course.progress.completed ? (
                            <span className="flex items-center gap-1 font-semibold text-emerald-400">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : course.progress.resume_order ? (
                            <span className="font-semibold text-emerald-300/90">
                              Continue {course.title} — lesson {course.progress.resume_order}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-400">In progress</span>
                          )}
                          <span className="text-slate-500 font-mono">
                            {course.progress.done_count}/{course.lesson_count} done
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              course.progress.completed ? 'bg-emerald-500' : 'bg-emerald-500/70'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (course.progress.done_count / Math.max(1, course.lesson_count)) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-slate-400">
                      <span>
                        {course.lesson_count} {course.type === 'file' ? 'Lessons' : 'Exercises'}
                      </span>
                      <span
                        className={`flex items-center gap-1 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100 font-medium ${
                          course.type === 'file' ? 'text-emerald-400' : 'text-blue-400'
                        }`}
                      >
                        {course.progress
                          ? course.progress.completed
                            ? 'Review'
                            : 'Continue'
                          : 'Start'}{' '}
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <WelcomeGate
        isOpen={isAiFeaturesOpen}
        onClose={() => setIsAiFeaturesOpen(false)}
        initialTab="ai"
      />
      <SituationalProfileBuilder
        isOpen={isSituationalProfileOpen}
        onClose={() => {
          setIsSituationalProfileOpen(false);
          if (localStorage.getItem(PROFILE_CONFIGURED_KEY) !== 'true') {
            localStorage.setItem(DIAGNOSTIC_DISMISSED_KEY, 'true');
          }
        }}
        onProfileBuilt={() => {
          setIsProfileConfigured(true);
        }}
      />
      <CourseBuilder
        isOpen={isCourseBuilderOpen}
        onClose={() => setIsCourseBuilderOpen(false)}
        onBuilt={(slug) => {
          setIsCourseBuilderOpen(false);
          navigate(`/file-course/${slug}`);
        }}
      />
      <LearningProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          // An explicit close counts as a dismissal: don't cover the catalog
          // with this prompt again on the next startup. Completing the
          // questionnaire separately records completion.
          if (localStorage.getItem(DIAGNOSTIC_COMPLETED_KEY) !== 'true') {
            localStorage.setItem(DIAGNOSTIC_DISMISSED_KEY, 'true');
          }
        }}
        initialMode={profileInitialMode}
      />
      {shareModalData && (
        <ShareModal
          isOpen={true}
          onClose={() => setShareModalData(null)}
          courseSlug={shareModalData.courseSlug}
          lessonSlug={shareModalData.lessonSlug}
          title={shareModalData.title}
        />
      )}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportInitialData(null);
          if (window.location.hash.includes('#import') || window.location.hash.includes('#share')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        initialData={importInitialData}
      />
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Remove Course</h3>
                <p className="text-xs text-slate-400 truncate">{courseToDelete.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">&ldquo;{courseToDelete.title}&rdquo;</strong> from your catalog? This will permanently delete the course files from your disk.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCourseToDelete(null);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'Removing...' : 'Remove Course'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
