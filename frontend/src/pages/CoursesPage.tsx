import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ChevronRight, FolderCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, APP_VERSION } from "../config";
import { UserMenu } from '../components/UserMenu';

interface FileCourse {
    slug: string;
    title: string;
    description: string;
    lesson_count: number;
}

export default function CoursesPage() {
    const [fileCourses, setFileCourses] = useState<FileCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/file-courses/`);
                if (res.ok) {
                    const data = await res.json();
                    setFileCourses(data);
                }
            } catch (err) {
                console.error("Failed to fetch courses", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);



    const hasNoCourses = fileCourses.length === 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Terminal size={20} className="text-white" />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">🪜 BaseLayer App</h1>
                </div>
                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <UserMenu />
                    ) : (
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="hidden sm:flex items-center px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-mono">
                                v{APP_VERSION || 'dev'}
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/signup')}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Get Started
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Available Courses</h2>
                    <p className="text-slate-400">Select a course to start coding.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hasNoCourses ? (
                            <div className="col-span-full text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                                <p>No courses available right now.</p>
                            </div>
                        ) : (
                            <>
                                {fileCourses.map((course) => (
                                    <div
                                        key={`file-${course.slug}`}
                                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer flex flex-col"
                                        onClick={() => navigate(`/file-course/${course.slug}`)}
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
                                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                                    {course.description}
                                                </p>
                                            )}

                                            <div className="mt-auto pt-4 flex items-center justify-between text-sm text-slate-400">
                                                <span>
                                                    {course.lesson_count} Lessons
                                                </span>
                                                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-emerald-400 opacity-0 group-hover:opacity-100 font-medium">
                                                    Start <ChevronRight size={16} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
