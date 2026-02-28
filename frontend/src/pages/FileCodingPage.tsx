import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import { CodeEditor } from '../components/CodeEditor';
import AIChatPanel from '../components/AIChatPanel';
import { Play, RotateCw, ChevronLeft, ChevronRight, FolderCode, LogOut, Lightbulb } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { API_BASE_URL } from "../config";
import { Panel, Group, Separator } from "react-resizable-panels";

interface Lesson {
    slug: string;
    title: string;
    description: string;
    initial_code: string;
    test_code: string;
    solution_code: string;
    order: number;
    language: string;
}

interface FileCourse {
    slug: string;
    title: string;
    description: string;
    lessons: Lesson[];
}

export default function FileCodingPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<FileCourse | null>(null);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [editorTab, setEditorTab] = useState<'main' | 'tests' | 'solution'>('main');
    const [showSolution, setShowSolution] = useState(false);

    const [code, setCode] = useState<string>("");
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const { token, logout, isAuthenticated } = useAuth();

    // Fetch Course Data
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/file-courses/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setCourse(data);

                    // Initialize code if lessons exist
                    if (data.lessons && data.lessons.length > 0) {
                        setCode(data.lessons[0].initial_code);
                    }
                } else {
                    console.error("Course not found");
                }
            } catch (err) {
                console.error(err);
            }
        }
        fetchCourse();
    }, [slug]);

    // Handle Lesson Change
    const lesson = course?.lessons[currentLessonIndex];

    useEffect(() => {
        if (lesson) {
            setCode(lesson.initial_code);
            setOutput("");
            setEditorTab('main');
            setShowSolution(false); // hide solution on lesson change
        }
    }, [lesson]);

    const handleRun = async (isSubmit: boolean = false) => {
        if (!lesson) return;

        setIsRunning(true);
        setOutput(isSubmit ? "Running all tests..." : "Running preliminary tests...");

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let testCalls = "";
            if (lesson.language === "python" || !lesson.language) {
                const testFuncRegex = /^def\s+(test_[a-zA-Z0-9_]+)\s*\(/gm;
                const matches = [...lesson.test_code.matchAll(testFuncRegex)];
                const testFuncs = matches.map(match => match[1]);

                if (testFuncs.length > 0) {
                    const numToRun = isSubmit ? testFuncs.length : Math.max(1, Math.ceil(testFuncs.length * 0.2));
                    const funcsToRun = testFuncs.slice(0, numToRun);
                    testCalls = "\n\n" + funcsToRun.map(fn => `${fn}()`).join("\n");
                }
            }

            const response = await fetch(`${API_BASE_URL}/run`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    code: code + "\n\n" + lesson.test_code + testCalls,
                    language: lesson.language || "python"
                })
            });

            const data = await response.json();

            if (data.exit_code === 0) {
                setOutput(data.stdout || "Success!");
                if (isSubmit) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            } else {
                const errorMsg = data.stderr ? `Error:\n${data.stderr}` : "";
                const outputMsg = data.stdout ? `\nOutput:\n${data.stdout}` : "";
                setOutput(`${errorMsg}${outputMsg}`.trim() || `Process exited with code ${data.exit_code}`);
            }
        } catch (e) {
            setOutput("Failed to connect to execution server.");
        } finally {
            setIsRunning(false);
        }
    };

    if (!course) {
        return (
            <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-slate-400">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p>Loading course...</p>
                </div>
            </div>
        );
    }

    if (course.lessons.length === 0) {
        return (
            <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-slate-400">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                    <p>No lessons added yet.</p>
                </div>
            </div>
        );
    }

    const currentLang = lesson?.language || "python";
    const mainFilename = currentLang === "rust" ? "main.rs" : "main.py";
    const testsFilename = currentLang === "rust" ? "tests.rs" : "tests.py";

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4">
                <div
                    className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20 cursor-pointer hover:bg-emerald-500 transition-colors"
                    onClick={() => navigate('/')}
                    title="Back to Courses"
                >
                    <FolderCode size={24} className="text-white" />
                </div>

                {/* Navigation Dots */}
                <div className="flex flex-col gap-2 mt-4">
                    {course.lessons.map((les, idx) => (
                        <div
                            key={les.slug}
                            onClick={() => setCurrentLessonIndex(idx)}
                            className={`
                        w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors font-bold text-sm
                        ${currentLessonIndex === idx ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400'}
                    `}
                        >
                            {idx + 1}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <h1 className="font-semibold text-lg tracking-tight text-white">{lesson?.title}</h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {currentLang === 'rust' ? 'Rust' : 'Python'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            File Course
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                            disabled={currentLessonIndex === 0}
                            className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-slate-400">
                            {currentLessonIndex + 1} / {course.lessons.length}
                        </span>
                        <button
                            onClick={() => setCurrentLessonIndex(Math.min(course.lessons.length - 1, currentLessonIndex + 1))}
                            disabled={currentLessonIndex === course.lessons.length - 1}
                            className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="w-px h-6 bg-slate-800 mx-2" />
                        {isAuthenticated ? (
                            <button
                                onClick={logout}
                                className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={20} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors"
                                >
                                    Join
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Split View */}
                <div className="flex-1 flex overflow-hidden">
                    <Group orientation="horizontal" id="main-group" style={{ height: '100%', width: '100%' }}>
                        {/* Left: Instructions & AI */}
                        <Panel defaultSize={40} minSize={20} id="left-panel" className="flex flex-col bg-slate-950/50">
                            <Group orientation="vertical" id="left-group" style={{ height: '100%' }}>
                                {/* Instructions */}
                                <Panel defaultSize={60} minSize={20} id="instructions-panel" className="flex flex-col border-r border-slate-800 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {lesson && <MarkdownViewer content={lesson.description} />}
                                    </div>
                                </Panel>

                                <Separator className="h-1.5 bg-slate-900 border-t border-slate-800 hover:bg-emerald-500 transition-colors cursor-row-resize flex items-center justify-center z-10" />

                                {/* AI Assistant */}
                                <Panel defaultSize={40} minSize={20} id="ai-panel" className="flex flex-col border-r border-slate-800">
                                    <AIChatPanel
                                        context={`Current Lesson: ${lesson?.title}\nDescription: ${lesson?.description}\nCurrent Code:\n${code}`}
                                    />
                                </Panel>
                            </Group>
                        </Panel>

                        <Separator className="w-1.5 bg-slate-900 border-l border-slate-800 hover:bg-emerald-500 transition-colors cursor-col-resize flex items-center justify-center z-10" />

                        {/* Right: Code & Output */}
                        <Panel defaultSize={50} minSize={20} id="code-output-panel" className="flex flex-col bg-[#1e1e1e]">
                            <Group orientation="vertical" id="editor-group" style={{ height: '100%', width: '100%' }}>
                                {/* Editor */}
                                <Panel defaultSize={70} minSize={20} id="editor-panel" className="flex flex-col">
                                    {/* Editor Toolbar */}
                                    <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <button
                                                onClick={() => setEditorTab('main')}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors ${editorTab === 'main'
                                                    ? 'bg-[#1e1e1e] text-slate-200 border-[#333]'
                                                    : 'border-transparent hover:bg-[#2d2d2d]'
                                                    }`}
                                            >
                                                📄 {mainFilename}
                                            </button>
                                            <button
                                                onClick={() => setEditorTab('tests')}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors ${editorTab === 'tests'
                                                    ? 'bg-[#1e1e1e] text-slate-200 border-[#333]'
                                                    : 'border-transparent hover:bg-[#2d2d2d]'
                                                    }`}
                                            >
                                                🧪 {testsFilename}
                                            </button>
                                            {lesson?.solution_code && (
                                                <button
                                                    onClick={() => {
                                                        setShowSolution(true);
                                                        setEditorTab('solution');
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors ${editorTab === 'solution'
                                                        ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50'
                                                        : 'border-transparent text-yellow-500/70 hover:bg-yellow-900/20 hover:text-yellow-400'
                                                        }`}
                                                >
                                                    <Lightbulb size={13} /> Solution
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Editor Area */}
                                    <div className="flex-1 min-h-0 relative">
                                        <div className="absolute inset-0" style={{ display: editorTab === 'main' ? 'block' : 'none' }}>
                                            <CodeEditor
                                                key="editor-main"
                                                code={code}
                                                onChange={(val) => setCode(val || "")}
                                                language={currentLang}
                                                filename={mainFilename}
                                            />
                                        </div>
                                        <div className="absolute inset-0" style={{ display: editorTab === 'tests' ? 'block' : 'none' }}>
                                            <CodeEditor
                                                key="editor-tests"
                                                code={lesson?.test_code || ""}
                                                onChange={() => { }}
                                                readOnly={true}
                                                language={currentLang}
                                                filename={testsFilename}
                                            />
                                        </div>
                                        {showSolution && (
                                            <div className="absolute inset-0" style={{ display: editorTab === 'solution' ? 'block' : 'none' }}>
                                                <CodeEditor
                                                    key="editor-solution"
                                                    code={lesson?.solution_code || ""}
                                                    onChange={() => { }}
                                                    readOnly={true}
                                                    language={currentLang}
                                                    filename={lesson?.language === 'rust' ? 'solution.rs' : 'solution.py'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Panel>

                                <Separator className="h-1.5 bg-[#252526] border-t border-[#333] hover:bg-emerald-500 transition-colors cursor-row-resize flex items-center justify-center z-10" />

                                {/* Output / Console Panel */}
                                <Panel defaultSize={30} minSize={10} id="console-panel" className="flex flex-col bg-[#1e1e1e]">
                                    <div className="h-10 flex items-center justify-between px-4 border-b border-[#333] bg-[#252526]">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Console Output</span>

                                        <div className="flex gap-2">
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors">
                                                <RotateCw size={14} /> Reset
                                            </button>
                                            <button
                                                onClick={() => handleRun(false)}
                                                disabled={isRunning}
                                                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow shadow-emerald-900/20 transition-all disabled:opacity-50"
                                            >
                                                <Play size={14} fill="currentColor" /> {isRunning ? 'Running...' : 'Run Code'}
                                            </button>
                                            <button
                                                onClick={() => handleRun(true)}
                                                disabled={isRunning}
                                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow shadow-blue-900/20 transition-all disabled:opacity-50"
                                            >
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 font-mono text-sm overflow-auto custom-scrollbar">
                                        {output ? (
                                            <pre className="text-slate-300 whitespace-pre-wrap">{output}</pre>
                                        ) : (
                                            <span className="text-slate-600 italic">Run your code to see output...</span>
                                        )}
                                    </div>
                                </Panel>
                            </Group>
                        </Panel>

                    </Group>
                </div>
            </div>
        </div>
    );
}
