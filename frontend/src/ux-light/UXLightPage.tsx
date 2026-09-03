import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { BookOpen, Code2, Terminal } from 'lucide-react';
import { Header } from './components/Header';
import { InstructionsPane } from './components/InstructionsPane';
import { CodeEditorPane } from './components/CodeEditorPane';
import { ConsolePane } from './components/ConsolePane';
import { ChapterBar } from './components/ChapterBar';
import { HorizontalSplit, VerticalSplit } from './components/SplitPane';
import { AuthorStudioView } from './components/AuthorStudioView';
import { EmbedModal } from './components/EmbedModal';
import { FlagReportModal } from './components/FlagReportModal';
import { DrawingPane } from './components/DrawingPane';
import { SpreadsheetPane } from './components/SpreadsheetPane';
import { groupLessonsIntoChapters, flattenLessons } from './courseLoader';
import type {
  FileCourse,
  FileLesson,
  UXLightChapter,
  ConsoleTab,
  MobileTab,
  EditorTab,
  OutputMessage,
  GradingResult,
} from './types';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';

export default function UXLightPage({ onSwitchUi }: { onSwitchUi?: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token, isAuthenticated, logout } = useAuth();

  const [course, setCourse] = useState<FileCourse | null>(null);
  const [chapters, setChapters] = useState<UXLightChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [lessonOverrideMd, setLessonOverrideMd] = useState<Record<string, string>>({});
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('script');
  const [isShowingSolution, setIsShowingSolution] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'dark' | 'light'>('dark');

  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTab>('shell');
  const [outputs, setOutputs] = useState<OutputMessage[]>([]);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [xpPenalty, setXpPenalty] = useState(0);

  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [isFlagOpen, setIsFlagOpen] = useState(false);

  const [userSheetUrl, setUserSheetUrl] = useState('');
  const [drawingOutput, setDrawingOutput] = useState('');
  const [isSubmittingDrawing, setIsSubmittingDrawing] = useState(false);
  const [showDrawingSolution, setShowDrawingSolution] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('instructions');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      setCourseError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/file-courses/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401) {
          logout();
          setIsAuthModalOpen(true);
          setCourseError('Your session has expired. Please sign in again.');
          return;
        }
        if (res.ok) {
          const data: FileCourse = await res.json();
          setCourse(data);
          setChapters(groupLessonsIntoChapters(data.lessons));
        } else {
          setCourseError(res.status === 404 ? 'Course not found.' : 'Unable to load this course.');
        }
      } catch (err) {
        console.error(err);
        setCourseError('Unable to connect to the course service.');
      }
    };

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    fetchCourse();
  }, [slug, isAuthenticated, token, logout]);

  const currentChapter = chapters[currentChapterIndex];
  const lesson: FileLesson | undefined = currentChapter?.lessons[currentLessonIndex];

  const allLessons = useMemo(() => flattenLessons(chapters), [chapters]);
  const currentGlobalIndex = useMemo(() => {
    const idx = allLessons.findIndex(
      (item) => item.chapterIndex === currentChapterIndex && item.lessonIndex === currentLessonIndex
    );
    return idx >= 0 ? idx : 0;
  }, [allLessons, currentChapterIndex, currentLessonIndex]);

  useEffect(() => {
    if (!lesson || !slug) return;
    const storageKey = `uxlight_code_${slug}_${lesson.slug}`;
    const saved = localStorage.getItem(storageKey);
    setCode(saved !== null ? saved : lesson.initial_code || '');
    setActiveEditorTab('script');
    setIsShowingSolution(false);
    setShowDrawingSolution(false);
    setXpPenalty(0);
    setGradingResult(null);
    setOutputs([]);
    setDrawingOutput('');
    setActiveConsoleTab('shell');
    setMobileTab('instructions');
    const savedUrl = localStorage.getItem(`spreadsheet_copy_${slug}_${lesson.slug}`);
    setUserSheetUrl(savedUrl || '');
  }, [lesson?.slug, slug]);

  useEffect(() => {
    if (!lesson || !slug) return;
    if (userSheetUrl) localStorage.setItem(`spreadsheet_copy_${slug}_${lesson.slug}`, userSheetUrl);
    else localStorage.removeItem(`spreadsheet_copy_${slug}_${lesson.slug}`);
  }, [userSheetUrl, lesson, slug]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (lesson && slug) localStorage.setItem(`uxlight_code_${slug}_${lesson.slug}`, newCode);
  };

  const handleSelectLesson = (chapterIndex: number, lessonIndex: number) => {
    setCurrentChapterIndex(chapterIndex);
    setCurrentLessonIndex(lessonIndex);
  };

  const handlePrevious = () => {
    if (currentGlobalIndex > 0) {
      const prev = allLessons[currentGlobalIndex - 1];
      handleSelectLesson(prev.chapterIndex, prev.lessonIndex);
    }
  };

  const handleNext = () => {
    if (currentGlobalIndex < allLessons.length - 1) {
      const next = allLessons[currentGlobalIndex + 1];
      handleSelectLesson(next.chapterIndex, next.lessonIndex);
    }
  };

  const handleResetCode = () => {
    if (!lesson) return;
    setCode(lesson.initial_code || '');
    if (slug) localStorage.setItem(`uxlight_code_${slug}_${lesson.slug}`, lesson.initial_code || '');
  };

  const pushOutput = (msg: Omit<OutputMessage, 'id' | 'timestamp'>) => {
    setOutputs((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() }]);
  };

  const handleRunCode = async (customCommand?: string, isSubmit = false) => {
    if (!lesson) return;
    const codeToRun = customCommand || code;
    if (!codeToRun.trim() && !isSubmit) return;

    if (isSubmit) setIsSubmitting(true);
    else setIsRunning(true);
    setActiveConsoleTab('shell');
    if (isMobile) setMobileTab('console');

    pushOutput({
      type: 'prompt',
      text: customCommand || (isSubmit ? 'submit answer' : `run ${lesson.language === 'rust' ? 'main.rs' : 'script.py'}`),
    });

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      let payload = customCommand || codeToRun;
      if (!customCommand) {
        let testCalls = '';
        if ((lesson.language === 'python' || !lesson.language) && lesson.test_code) {
          const matches = [...lesson.test_code.matchAll(/^def\s+(test_[a-zA-Z0-9_]+)\s*\(/gm)];
          const testFuncs = matches.map((m) => m[1]);
          if (testFuncs.length > 0) {
            const numToRun = isSubmit ? testFuncs.length : Math.max(1, Math.ceil(testFuncs.length * 0.2));
            testCalls = '\n\n' + testFuncs.slice(0, numToRun).map((fn) => `${fn}()`).join('\n');
          }
        }
        payload = code + '\n\n' + (lesson.test_code || '') + testCalls;
      }

      const res = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: payload, language: lesson.language || 'python' }),
      });
      const data = await res.json();

      if (data.stdout) pushOutput({ type: 'stdout', text: data.stdout });
      if (data.stderr) pushOutput({ type: 'stderr', text: data.stderr });
      if (!data.stdout && !data.stderr) {
        pushOutput({ type: 'stdout', text: 'Process finished with return code 0.' });
      }

      if (isSubmit) {
        if (data.exit_code === 0) triggerSuccess(data.stdout || 'All tests passed.');
        else triggerFailure(data.stderr || data.stdout || `Exited with code ${data.exit_code}`);
      }
    } catch {
      pushOutput({ type: 'error', text: 'Failed to connect to execution server.' });
      if (isSubmit) triggerFailure('Failed to connect to execution server.');
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  const triggerSuccess = (message: string) => {
    if (!lesson) return;
    const earned = Math.max(5, 35 - xpPenalty);
    if (!completedIds.has(lesson.slug)) {
      setCompletedIds((prev) => new Set([...prev, lesson.slug]));
      setTotalXp((prev) => prev + earned);
    }
    setGradingResult({ passed: true, xpEarned: earned, message });
    setActiveConsoleTab('feedback');
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#03ef62', '#05192d', '#ffb800'] });
  };

  const triggerFailure = (errorDetail: string) => {
    setGradingResult({
      passed: false,
      xpEarned: 0,
      message: 'Submission did not pass all checks.',
      errorDetail,
    });
    setActiveConsoleTab('feedback');
  };

  const handleDrawingSubmit = async () => {
    if (!lesson || !drawingCanvasRef.current || !slug) return;
    setIsSubmittingDrawing(true);
    setDrawingOutput('Evaluating your drawing...');
    try {
      const imageData = drawingCanvasRef.current.toDataURL('image/png');
      const response = await fetch(`${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/submit-drawing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image_data: imageData }),
      });
      if (response.status === 401) {
        logout();
        setIsAuthModalOpen(true);
        setDrawingOutput('Your session has expired. Please sign in again.');
        return;
      }
      const data = await response.json();
      setDrawingOutput(data.message);
      if (data.passed) triggerSuccess(data.message);
    } catch {
      setDrawingOutput('Failed to submit drawing.');
    } finally {
      setIsSubmittingDrawing(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode(undefined, true);
      } else if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    },
    [code, lesson, token]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isAuthenticated || !course || chapters.length === 0 || !lesson) {
    return (
      <div className="flex h-screen w-full bg-[#f4f6f8] items-center justify-center text-[#5b6b7b]">
        <div className="text-center">
          {courseError ? <p className="text-red-500">{courseError}</p> : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03ef62] mx-auto mb-4" />
              <p>Loading course...</p>
            </>
          )}
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => navigate('/')} />
      </div>
    );
  }

  const displayLesson: FileLesson = lessonOverrideMd[lesson.slug]
    ? { ...lesson, description: lessonOverrideMd[lesson.slug] }
    : lesson;

  const currentLang = lesson.language || 'python';
  const filename = currentLang === 'rust' ? 'main.rs' : 'script.py';
  const exerciseType = lesson.exercise_type || 'code';

  const instructions = (
    <InstructionsPane
      lesson={displayLesson}
      lessonNumber={currentLessonIndex + 1}
      totalInChapter={currentChapter.lessons.length}
      isShowingSolution={isShowingSolution}
      onToggleSolution={() => {
        const next = !isShowingSolution;
        setIsShowingSolution(next);
        if (next) {
          if (exerciseType === 'drawing') setShowDrawingSolution(true);
          else setActiveEditorTab('solution');
        } else {
          setShowDrawingSolution(false);
          setActiveEditorTab('script');
        }
      }}
      xpPenalty={xpPenalty}
      onTakeHint={() => setXpPenalty((p) => Math.min(p + 10, 25))}
      code={code}
    />
  );

  const workspace =
    exerciseType === 'drawing' ? (
      <DrawingPane
        courseSlug={slug || ''}
        lesson={lesson}
        showSolution={showDrawingSolution}
        onToggleSolution={() => setShowDrawingSolution(!showDrawingSolution)}
        onCanvasRef={(ref) => {
          drawingCanvasRef.current = ref;
        }}
        onSubmit={handleDrawingSubmit}
        isSubmitting={isSubmittingDrawing}
        feedback={drawingOutput}
      />
    ) : exerciseType === 'spreadsheet' && lesson.google_sheet_id ? (
      <SpreadsheetPane lesson={lesson} userSheetUrl={userSheetUrl} onChangeUrl={setUserSheetUrl} />
    ) : (
      <CodeEditorPane
        code={code}
        onChange={handleCodeChange}
        testCode={lesson.test_code || ''}
        solutionCode={lesson.solution_code || ''}
        activeTab={activeEditorTab}
        onSelectTab={setActiveEditorTab}
        isShowingSolution={isShowingSolution}
        theme={editorTheme}
        onToggleTheme={() => setEditorTheme(editorTheme === 'dark' ? 'light' : 'dark')}
        language={currentLang}
        filename={filename}
        onReset={handleResetCode}
        onRunCode={() => handleRunCode()}
        onSubmitAnswer={() => handleRunCode(undefined, true)}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
      />
    );

  const consolePane = (
    <ConsolePane
      activeTab={activeConsoleTab}
      onSelectTab={setActiveConsoleTab}
      outputs={outputs}
      plots={[]}
      gradingResult={gradingResult}
      onClearConsole={() => setOutputs([])}
      onExecuteReplCommand={(cmd) => handleRunCode(cmd)}
      onNextLesson={handleNext}
      isNextDisabled={currentGlobalIndex === allLessons.length - 1}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f4f6f8] text-[#1a2733] font-sans overflow-hidden">
      <Header
        course={course}
        chapters={chapters}
        currentLesson={displayLesson}
        currentChapterIndex={currentChapterIndex}
        currentLessonIndex={currentLessonIndex}
        totalLessons={allLessons.length}
        currentGlobalIndex={currentGlobalIndex}
        completedIds={completedIds}
        totalXp={totalXp}
        onSelectLesson={handleSelectLesson}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onOpenEmbed={() => setIsEmbedOpen(true)}
        onOpenStudio={() => setIsStudioOpen(true)}
        onOpenFlag={() => setIsFlagOpen(true)}
        onSwitchUi={onSwitchUi}
      />

      <main className="flex-1 overflow-hidden min-h-0">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div className="h-10 min-h-[40px] bg-white border-b border-[#e2e8ee] flex">
              {([
                ['instructions', BookOpen, 'Instructions'],
                ['workspace', Code2, exerciseType === 'drawing' ? 'Canvas' : exerciseType === 'spreadsheet' ? 'Sheet' : 'Editor'],
                ['console', Terminal, 'Console'],
              ] as const).map(([id, Icon, label]) => (
                <button
                  key={id}
                  onClick={() => setMobileTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold ${
                    mobileTab === id
                      ? 'text-[#05192d] border-b-2 border-[#03ef62]'
                      : 'text-[#5b6b7b]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {mobileTab === 'instructions' && instructions}
              {mobileTab === 'workspace' && workspace}
              {mobileTab === 'console' && consolePane}
            </div>
          </div>
        ) : (
          <HorizontalSplit
            leftDefaultSize="42%"
            left={instructions}
            right={
              exerciseType === 'code' ? (
                <VerticalSplit topDefaultSize="56%" top={workspace} bottom={consolePane} />
              ) : (
                workspace
              )
            }
          />
        )}
      </main>

      <ChapterBar
        chapters={chapters}
        currentChapterIndex={currentChapterIndex}
        completedIds={completedIds}
        onSelectChapter={(cIdx) => handleSelectLesson(cIdx, 0)}
      />

      {isStudioOpen && (
        <AuthorStudioView
          initialMarkdown={displayLesson.description}
          onApply={(md) => setLessonOverrideMd((prev) => ({ ...prev, [lesson.slug]: md }))}
          onClose={() => setIsStudioOpen(false)}
        />
      )}
      {isEmbedOpen && (
        <EmbedModal lesson={lesson} currentCode={code} onClose={() => setIsEmbedOpen(false)} />
      )}
      {isFlagOpen && <FlagReportModal lesson={lesson} onClose={() => setIsFlagOpen(false)} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
