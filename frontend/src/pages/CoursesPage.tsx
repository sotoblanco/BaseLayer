import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ChevronRight, FolderCode, Compass, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, APP_VERSION } from '../config';
import { UserMenu } from '../components/UserMenu';
import { WelcomeGate } from '../components/auth/WelcomeGate';
import CourseBuilder from '../components/CourseBuilder';
import { LearningProfileModal } from '../components/LearningProfileModal';
import { getLearningProfile } from '../services/profileService';
import { isLocalHost } from '../isLocalHost';

interface FileCourse {
  slug: string;
  title: string;
  description: string;
  lesson_count: number;
}

export default function CoursesPage() {
  const [fileCourses, setFileCourses] = useState<FileCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLearningGuideOpen, setIsLearningGuideOpen] = useState(false);
  const [isCourseBuilderOpen, setIsCourseBuilderOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileInitialMode, setProfileInitialMode] = useState<'preview' | 'edit' | 'customize'>('customize');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && isLocalHost()) {
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const hasCompleted = localStorage.getItem('baselayer_diagnostic_completed');
      if (hasCompleted !== 'true') {
        getLearningProfile()
          .then((data) => {
            const isDefault =
              data.parsed.signals.length <= 1 &&
              !data.markdown.includes('intake_preference') &&
              !data.markdown.includes('explanation_length: thorough') &&
              !data.markdown.includes('exercise_format: macro_challenges');
            if (isDefault) {
              setProfileInitialMode('customize');
              setIsProfileModalOpen(true);
            } else {
              localStorage.setItem('baselayer_diagnostic_completed', 'true');
            }
          })
          .catch(() => {
            // Silently ignore if offline
          });
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/file-courses/`);
        if (res.ok) {
          const data = await res.json();
          setFileCourses(data);
        }
      } catch (err) {
        console.error('Failed to fetch courses', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const hasNoCourses = fileCourses.length === 0;

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
          {isAuthenticated && (
            <button
              onClick={() => {
                setProfileInitialMode('customize');
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              title="Calibrate your personal learning style"
            >
              <Sliders size={14} className="text-blue-400" />
              <span>Learning Style</span>
            </button>
          )}
          <button
            onClick={() => setIsLearningGuideOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            title="Learning Guide & AI Setup"
          >
            <Compass size={14} className="text-emerald-400" />
            <span>Learning Guide</span>
          </button>
          {isAuthenticated ? (
            <UserMenu
              onOpenProfile={() => {
                setProfileInitialMode('preview');
                setIsProfileModalOpen(true);
              }}
            />
          ) : (
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="hidden sm:flex items-center px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-mono">
                v{APP_VERSION || 'dev'}
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                Get Started
              </button>
            </div>
          )}
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
            <button
              onClick={() => isAuthenticated ? setIsCourseBuilderOpen(true) : setIsAuthModalOpen(true)}
              className="shrink-0 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              Build a course
            </button>
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold">Available Courses</h3>
              <p className="text-slate-400">Select a course to start coding.</p>
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
              </div>
            ) : (
              fileCourses.map((course) => (
                <div
                  key={`file-${course.slug}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer flex flex-col"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate(`/file-course/${course.slug}`);
                    } else {
                      setIsAuthModalOpen(true);
                    }
                  }}
                >
                  <div className="h-2 bg-gradient-to-r from-emerald-600 to-teal-600" />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-slate-800 rounded-lg group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                        <FolderCode size={24} />
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        File
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                      {course.title}
                    </h3>

                    {course.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-slate-400">
                      <span>{course.lesson_count} Lessons</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-emerald-400 opacity-0 group-hover:opacity-100 font-medium">
                        Start <ChevronRight size={16} />
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
        isOpen={isAuthModalOpen || isLearningGuideOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setIsLearningGuideOpen(false);
        }}
        initialTab={isLearningGuideOpen ? 'modalities' : undefined}
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
        onClose={() => setIsProfileModalOpen(false)}
        initialMode={profileInitialMode}
      />
    </div>
  );
}
