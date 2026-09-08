import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { API_BASE_URL } from '../config';
import { executeCode, preloadPyodide } from '../services/codeRunner';
import { emitLearnerEvent, fetchMyProgress } from '../services/profileService';
import { findLessonPosition, useLessonUrlSync } from '../lessonUrl';
import { groupLessonsIntoChapters, flattenLessons } from '../ux-light/courseLoader';
import { fetchSolutionCode } from '../solutionApi';
import { testsToRun } from '../testsToRun';
import { useAuth } from '../context/AuthContext';
import { isLocalHost } from '../isLocalHost';
import { cellsToTsv } from '../components/SheetTemplatePreview';
import type {
  FileCourse,
  FileLesson,
  UXLightChapter,
  ConsoleTab,
  EditorTab,
  OutputMessage,
  GradingResult,
  DrawingFeedback,
  DrawingRubricCheck,
  SpreadsheetVerification,
} from '../ux-light/types';
import type { SharePayload } from '../ux-light/shareCard';

export interface UseLessonPlayerReturn {
  // Course & Navigation
  slug: string | undefined;
  lessonSlug: string | undefined;
  course: FileCourse | null;
  chapters: UXLightChapter[];
  currentChapterIndex: number;
  setCurrentChapterIndex: (idx: number) => void;
  currentLessonIndex: number;
  setCurrentLessonIndex: (idx: number) => void;
  currentChapter: UXLightChapter | undefined;
  lesson: FileLesson | undefined;
  allLessons: { chapterIndex: number; lessonIndex: number; lesson: FileLesson }[];
  currentGlobalIndex: number;
  courseError: string | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  selectLesson: (chapterIndex: number, lessonIndex: number) => void;
  handleNext: () => void;
  handlePrevious: () => void;

  // Code & Drafts
  code: string;
  setCode: (code: string) => void;
  handleCodeChange: (newCode?: string) => void;
  handleResetCode: () => void;

  // Editor Tabs & Solutions
  activeEditorTab: EditorTab;
  setActiveEditorTab: (tab: EditorTab) => void;
  isShowingSolution: boolean;
  setIsShowingSolution: (show: boolean) => void;
  showSolution: boolean;
  setShowSolution: (show: boolean) => void;
  loadedSolution: string;
  toggleSolution: () => Promise<void>;

  // Execution & Console
  isRunning: boolean;
  isSubmitting: boolean;
  output: string;
  setOutput: (s: string) => void;
  outputs: OutputMessage[];
  pushOutput: (msg: Omit<OutputMessage, 'id' | 'timestamp'>) => void;
  clearOutputs: () => void;
  gradingResult: GradingResult | null;
  activeConsoleTab: ConsoleTab;
  setActiveConsoleTab: (tab: ConsoleTab) => void;
  handleRunCode: (customCommand?: string, isSubmit?: boolean) => Promise<void>;
  handleRun: (isSubmit?: boolean) => Promise<void>;

  // Drawing
  isDrawingLesson: boolean;
  isSubmittingDrawing: boolean;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  drawingFeedback: DrawingFeedback | null;
  drawingOutput: string;
  drawingChecks: DrawingRubricCheck[];
  showDrawingSolution: boolean;
  setShowDrawingSolution: (show: boolean) => void;
  handleDrawingSubmit: () => Promise<void>;

  // Spreadsheet
  isSpreadsheetLesson: boolean;
  userSheetUrl: string;
  setUserSheetUrl: (url: string) => void;
  isCopyingSheet: boolean;
  handleMakeSheetCopy: () => Promise<void>;
  isVerifyingSheet: boolean;
  sheetVerification: SpreadsheetVerification | null;
  sheetVerifyError: string | null;
  handleVerifySheet: () => Promise<void>;
  handleManualSheetPass: () => void;
  displaySheetId: string | null | undefined;
  isUsingPersonalCopy: boolean;
  hasSheetChecks: boolean;
  hasSheetCopyLink: boolean;
  sheetPassed: boolean;
  iframeUrl: string;

  // Progress & Gamification
  completedIds: Set<string>;
  completedSlugs: Set<string>;
  totalXp: number;
  xpPenalty: number;
  setXpPenalty: React.Dispatch<React.SetStateAction<number>>;
  sharePayload: SharePayload | null;
  setSharePayload: (payload: SharePayload | null) => void;
  openShare: (kind: 'course' | 'lesson') => void;
  isShareBundleOpen: boolean;
  setIsShareBundleOpen: (open: boolean) => void;

  // Overrides & Helpers
  lessonOverrideMd: Record<string, string>;
  setLessonOverrideMd: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentLang: string;
  isAuthenticated: boolean;
  token: string | null;
  user: any;
  logout: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

export function useLessonPlayer(): UseLessonPlayerReturn {
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug?: string }>();
  const navigate = useNavigate();
  const { token, isAuthenticated, logout, user } = useAuth();

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
  const [loadedSolution, setLoadedSolution] = useState('');

  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTab>('shell');
  const [outputs, setOutputs] = useState<OutputMessage[]>([]);
  const [output, setOutput] = useState('');
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [xpPenalty, setXpPenalty] = useState(0);

  const [isShareBundleOpen, setIsShareBundleOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  const [userSheetUrl, setUserSheetUrl] = useState('');
  const [drawingFeedback, setDrawingFeedback] = useState<DrawingFeedback | null>(null);
  const [drawingOutput, setDrawingOutput] = useState('');
  const [drawingChecks, setDrawingChecks] = useState<DrawingRubricCheck[]>([]);
  const [isSubmittingDrawing, setIsSubmittingDrawing] = useState(false);
  const [showDrawingSolution, setShowDrawingSolution] = useState(false);
  const [sheetVerification, setSheetVerification] = useState<SpreadsheetVerification | null>(null);
  const [sheetVerifyError, setSheetVerifyError] = useState<string | null>(null);
  const [isVerifyingSheet, setIsVerifyingSheet] = useState(false);
  const [isCopyingSheet, setIsCopyingSheet] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    preloadPyodide();
  }, []);

  // Fetch course and learner progress
  useEffect(() => {
    const fetchCourse = async () => {
      setCourseError(null);
      try {
        const [res, progress] = await Promise.all([
          fetch(`${API_BASE_URL}/file-courses/${slug}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetchMyProgress(),
        ]);
        if (res.status === 401) {
          if (!isLocalHost()) {
            logout();
            setIsAuthModalOpen(true);
            setCourseError('Your session has expired. Please sign in again.');
            return;
          }
        }
        if (res.ok) {
          const data: FileCourse = await res.json();
          const grouped = groupLessonsIntoChapters(data.lessons);
          setCourse(data);
          setChapters(grouped);

          const courseProgress = progress.find((p) => p.course_slug === slug);
          const knownSlugs = new Set(grouped.flatMap((ch) => ch.lessons.map((l) => l.slug)));
          setCompletedIds(
            new Set((courseProgress?.completed_lessons ?? []).filter((s) => knownSlugs.has(s)))
          );
          setTotalXp(courseProgress?.xp ?? 0);

          // Prefer the lesson named in the URL, else resume lesson, else lesson 1
          const target =
            findLessonPosition(grouped, lessonSlug) ??
            findLessonPosition(grouped, courseProgress?.resume_lesson ?? null);
          if (target) {
            setCurrentChapterIndex(target.chapterIndex);
            setCurrentLessonIndex(target.lessonIndex);
          }
        } else {
          setCourseError(res.status === 404 ? 'Course not found.' : 'Unable to load this course.');
        }
      } catch (err) {
        console.error(err);
        setCourseError('Unable to connect to the course service.');
      }
    };

    if (!isAuthenticated && !isLocalHost()) {
      setIsAuthModalOpen(true);
      return;
    }
    fetchCourse();
  }, [slug, lessonSlug, isAuthenticated, token, logout]);

  const currentChapter = chapters[currentChapterIndex];
  const lesson: FileLesson | undefined = currentChapter?.lessons[currentLessonIndex];
  const allLessons = useMemo(() => flattenLessons(chapters), [chapters]);
  const currentGlobalIndex = useMemo(() => {
    const idx = allLessons.findIndex(
      (item) => item.chapterIndex === currentChapterIndex && item.lessonIndex === currentLessonIndex
    );
    return idx >= 0 ? idx : 0;
  }, [allLessons, currentChapterIndex, currentLessonIndex]);

  // Load drafts and reset state on lesson switch
  useEffect(() => {
    if (!lesson || !slug) return;
    const draftKey = `code_draft_${slug}_${lesson.slug}`;
    const uxKey = `uxlight_code_${slug}_${lesson.slug}`;
    const saved = localStorage.getItem(draftKey) ?? localStorage.getItem(uxKey);
    setCode(saved !== null ? saved : lesson.initial_code || '');
    setActiveEditorTab('script');
    setIsShowingSolution(false);
    setLoadedSolution('');
    setShowDrawingSolution(false);
    setXpPenalty(0);
    setGradingResult(null);
    setOutputs([]);
    setOutput('');
    setDrawingOutput('');
    setDrawingChecks([]);
    setDrawingFeedback(null);
    setSheetVerification(null);
    setSheetVerifyError(null);
    setActiveConsoleTab('shell');
    const savedUrl = localStorage.getItem(`spreadsheet_copy_${slug}_${lesson.slug}`);
    setUserSheetUrl(savedUrl || '');

    emitLearnerEvent('lesson_opened', {
      course_slug: slug,
      lesson_slug: lesson.slug,
    });
  }, [lesson, slug]);

  // Persist spreadsheet URL
  useEffect(() => {
    if (!lesson || !slug) return;
    if (userSheetUrl) {
      localStorage.setItem(`spreadsheet_copy_${slug}_${lesson.slug}`, userSheetUrl);
    } else {
      localStorage.removeItem(`spreadsheet_copy_${slug}_${lesson.slug}`);
    }
  }, [userSheetUrl, lesson, slug]);

  const handleCodeChange = useCallback((newCode?: string) => {
    const val = newCode || '';
    setCode(val);
    if (lesson && slug) {
      localStorage.setItem(`code_draft_${slug}_${lesson.slug}`, val);
      localStorage.setItem(`uxlight_code_${slug}_${lesson.slug}`, val);
    }
  }, [lesson, slug]);

  const handleResetCode = useCallback(() => {
    if (!lesson || !slug) return;
    if (window.confirm('Are you sure you want to reset your code to the starter code? Current edits will be lost.')) {
      const initial = lesson.initial_code || '';
      setCode(initial);
      localStorage.setItem(`code_draft_${slug}_${lesson.slug}`, initial);
      localStorage.setItem(`uxlight_code_${slug}_${lesson.slug}`, initial);
      setOutput('');
      setOutputs([]);
      emitLearnerEvent('reset', {
        course_slug: slug,
        lesson_slug: lesson.slug,
      });
    }
  }, [lesson, slug]);

  const selectLesson = useCallback((chapterIndex: number, lessonIndex: number) => {
    setCurrentChapterIndex(chapterIndex);
    setCurrentLessonIndex(lessonIndex);
  }, []);

  useLessonUrlSync({
    courseSlug: slug,
    chapters,
    currentChapterIndex,
    currentLessonIndex,
    onSelectLesson: selectLesson,
  });

  const handlePrevious = useCallback(() => {
    if (currentGlobalIndex > 0) {
      const prev = allLessons[currentGlobalIndex - 1];
      selectLesson(prev.chapterIndex, prev.lessonIndex);
    }
  }, [currentGlobalIndex, allLessons, selectLesson]);

  const handleNext = useCallback(() => {
    if (currentGlobalIndex < allLessons.length - 1) {
      const next = allLessons[currentGlobalIndex + 1];
      selectLesson(next.chapterIndex, next.lessonIndex);
    }
  }, [currentGlobalIndex, allLessons, selectLesson]);

  const pushOutput = useCallback((msg: Omit<OutputMessage, 'id' | 'timestamp'>) => {
    setOutputs((prev) => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() },
    ]);
  }, []);

  const clearOutputs = useCallback(() => {
    setOutputs([]);
    setOutput('');
  }, []);

  const recordLessonPass = useCallback((modality: 'code' | 'spreadsheet' | 'drawing') => {
    if (!lesson || !slug) return;
    if (completedIds.has(lesson.slug)) return;
    const earned = Math.max(5, 35 - xpPenalty);
    emitLearnerEvent('lesson_passed', {
      course_slug: slug,
      lesson_slug: lesson.slug,
      modality,
      xp: earned,
    });
  }, [lesson, slug, completedIds, xpPenalty]);

  const triggerSuccess = useCallback((message: string) => {
    if (!lesson || !course) return;
    const earned = Math.max(5, 35 - xpPenalty);
    const firstTime = !completedIds.has(lesson.slug);
    const nextCompleted = firstTime ? new Set([...completedIds, lesson.slug]) : completedIds;
    if (firstTime) {
      setCompletedIds(nextCompleted);
      setTotalXp((prev) => prev + earned);
    }
    setGradingResult({ passed: true, xpEarned: earned, message });
    setActiveConsoleTab('feedback');
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#03ef62', '#05192d', '#ffb800'],
    });
    if (firstTime) {
      const courseDone = nextCompleted.size >= allLessons.length && allLessons.length > 0;
      setSharePayload({
        kind: courseDone ? 'course' : 'lesson',
        courseTitle: course.title,
        lessonTitle: lesson.title,
        skills: courseDone
          ? course.skills || []
          : lesson.skills?.length
          ? lesson.skills
          : course.skills || [],
      });
    }
  }, [lesson, course, xpPenalty, completedIds, allLessons.length]);

  const openShare = useCallback((kind: 'course' | 'lesson') => {
    if (!course || !lesson) return;
    const lessonSkills = lesson.skills || [];
    const courseSkills = course.skills || [];
    setSharePayload({
      kind,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      skills: kind === 'course' ? courseSkills : lessonSkills.length ? lessonSkills : courseSkills,
    });
  }, [course, lesson]);

  const triggerFailure = useCallback((errorDetail: string) => {
    setGradingResult({
      passed: false,
      xpEarned: 0,
      message: 'Submission did not pass all checks.',
      errorDetail,
    });
    setActiveConsoleTab('feedback');
  }, []);

  const handleRunCode = useCallback(
    async (customCommand?: string, isSubmit = false) => {
      if (!lesson) return;
      const codeToRun = customCommand || code;
      if (!codeToRun.trim() && !isSubmit) return;

      if (isSubmit) setIsSubmitting(true);
      else setIsRunning(true);
      setActiveConsoleTab('shell');
      setOutput(isSubmit ? 'Running all tests...' : 'Running preliminary tests...');

      pushOutput({
        type: 'prompt',
        text:
          customCommand ||
          (isSubmit ? 'submit answer' : `run ${lesson.language === 'rust' ? 'main.rs' : 'script.py'}`),
      });

      try {
        const language = lesson.language || 'python';
        const testCode = customCommand
          ? ''
          : testsToRun(lesson.test_code || '', language, isSubmit);

        const runCode = customCommand || code;

        const data = await executeCode({
          code: runCode,
          test_code: testCode,
          language,
          token,
          onStatusUpdate: (msg) => {
            pushOutput({ type: 'stdout', text: msg });
            setOutput(msg);
          },
          isSubmit,
          courseSlug: slug,
          lessonSlug: lesson.slug,
        });

        if (data.stdout) {
          pushOutput({ type: 'stdout', text: data.stdout });
          setOutput(data.stdout);
        }
        if (data.stderr) {
          pushOutput({ type: 'stderr', text: data.stderr });
          const errorMsg = `Error:\n${data.stderr}`;
          const outputMsg = data.stdout ? `\nOutput:\n${data.stdout}` : '';
          setOutput(`${errorMsg}${outputMsg}`.trim());
        }
        if (!data.stdout && !data.stderr) {
          pushOutput({ type: 'stdout', text: 'Process finished with return code 0.' });
          setOutput('Process finished with return code 0.');
        }

        if (data.exit_code === 0) {
          if (isSubmit) {
            recordLessonPass('code');
            triggerSuccess(data.stdout || 'All tests passed.');
          }
        } else {
          if (isSubmit) {
            triggerFailure(data.stderr || data.stdout || `Exited with code ${data.exit_code}`);
          }
        }
      } catch (err: any) {
        if (err?.message === 'AUTH_401') {
          logout();
          setIsAuthModalOpen(true);
          setOutput('Session expired. Please sign in again.');
        } else {
          const errText = err?.message || 'Failed to execute code.';
          pushOutput({ type: 'error', text: errText });
          setOutput('Failed to execute code: ' + errText);
          if (isSubmit) triggerFailure(errText);
        }
      } finally {
        setIsRunning(false);
        setIsSubmitting(false);
      }
    },
    [lesson, code, token, slug, logout, recordLessonPass, triggerSuccess, triggerFailure, pushOutput]
  );

  const handleRun = useCallback(
    async (isSubmit = false) => {
      await handleRunCode(undefined, isSubmit);
    },
    [handleRunCode]
  );

  const toggleSolution = useCallback(async () => {
    if (!lesson) return;
    if (isShowingSolution) {
      setIsShowingSolution(false);
      return;
    }
    if (loadedSolution) {
      setIsShowingSolution(true);
      return;
    }
    try {
      const sol = await fetchSolutionCode(slug || '', lesson.slug, token || '');
      setLoadedSolution(sol);
      setIsShowingSolution(true);
    } catch {
      alert('Solution is not available for this exercise.');
    }
  }, [lesson, slug, isShowingSolution, loadedSolution, token]);

  const handleDrawingSubmit = useCallback(async () => {
    if (!lesson || !drawingCanvasRef.current || !slug) return;
    setIsSubmittingDrawing(true);
    setDrawingFeedback(null);
    setDrawingOutput('Evaluating your drawing...');
    setDrawingChecks([]);
    try {
      const imageData = drawingCanvasRef.current.toDataURL('image/png');
      const response = await fetch(
        `${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/submit-drawing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            image_data: imageData,
            xp: Math.max(5, 35 - xpPenalty),
          }),
        }
      );
      if (response.status === 401) {
        logout();
        setIsAuthModalOpen(true);
        const errMsg = 'Your session has expired. Please sign in again.';
        setDrawingFeedback({ passed: false, message: errMsg });
        setDrawingOutput(errMsg);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = data.detail || 'Drawing evaluation failed. Please try again.';
        setDrawingFeedback({ passed: false, message: errMsg });
        setDrawingOutput(errMsg);
        return;
      }
      const feedback: DrawingFeedback = {
        passed: !!data.passed,
        score: data.score,
        message: data.message || (data.passed ? 'Your drawing passed.' : 'Your drawing needs work.'),
        checks: Array.isArray(data.checks) ? data.checks : undefined,
      };
      setDrawingFeedback(feedback);
      setDrawingOutput(feedback.message);
      setDrawingChecks(feedback.checks || []);
      if (feedback.passed) {
        recordLessonPass('drawing');
        triggerSuccess(feedback.message);
      }
    } catch {
      const errMsg = 'Failed to submit drawing.';
      setDrawingFeedback({ passed: false, message: errMsg });
      setDrawingOutput(errMsg);
    } finally {
      setIsSubmittingDrawing(false);
    }
  }, [lesson, slug, token, xpPenalty, logout, recordLessonPass, triggerSuccess]);

  const handleMakeSheetCopy = useCallback(async () => {
    if (!lesson || !slug) return;
    setIsCopyingSheet(true);
    setSheetVerifyError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/copy-sheet`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (response.status === 401) {
        logout();
        setIsAuthModalOpen(true);
        setSheetVerifyError('Your session has expired. Please sign in again.');
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (lesson.sheet_cells && Object.keys(lesson.sheet_cells).length > 0) {
          try {
            const tsv = cellsToTsv(lesson.sheet_cells);
            await navigator.clipboard.writeText(tsv);
            window.open('https://sheets.new', '_blank');
            setSheetVerifyError(
              'Copied template to clipboard! Paste it into cell A1 in your new sheet (Cmd+V/Ctrl+V), then paste your sheet link above.'
            );
            return;
          } catch {
            // fallthrough
          }
        }
        setSheetVerifyError(data.detail || 'Could not create a private copy of this sheet.');
        return;
      }
      if (data.url) {
        setUserSheetUrl(data.url);
        window.open(data.url, '_blank');
      }
    } catch {
      if (lesson.sheet_cells && Object.keys(lesson.sheet_cells).length > 0) {
        try {
          const tsv = cellsToTsv(lesson.sheet_cells);
          await navigator.clipboard.writeText(tsv);
          window.open('https://sheets.new', '_blank');
          setSheetVerifyError(
            'Copied template to clipboard! Paste it into cell A1 in your new sheet (Cmd+V/Ctrl+V), then paste your sheet link above.'
          );
          return;
        } catch {
          // fallthrough
        }
      }
      setSheetVerifyError('Failed to request a sheet copy.');
    } finally {
      setIsCopyingSheet(false);
    }
  }, [lesson, slug, token, logout]);

  const extractSheetId = useCallback((url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }, []);

  const handleVerifySheet = useCallback(async () => {
    if (!lesson || !slug) return;
    const sheetUrl = userSheetUrl.trim();
    if (!sheetUrl) {
      setSheetVerifyError('Please paste your Google Sheet link above before verifying.');
      return;
    }
    setIsVerifyingSheet(true);
    setSheetVerifyError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/verify-sheet`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            sheet_id: sheetUrl,
            xp: Math.max(5, 35 - xpPenalty),
          }),
        }
      );
      if (response.status === 401) {
        logout();
        setIsAuthModalOpen(true);
        setSheetVerifyError('Your session has expired. Please sign in again.');
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSheetVerifyError(data.detail || 'Could not verify your sheet. Please try again.');
        return;
      }
      const verification = data as SpreadsheetVerification;
      setSheetVerification(verification);
      if (verification.passed) {
        recordLessonPass('spreadsheet');
        triggerSuccess(verification.message);
      }
    } catch {
      setSheetVerifyError('Failed to reach the verification service.');
    } finally {
      setIsVerifyingSheet(false);
    }
  }, [lesson, slug, userSheetUrl, token, xpPenalty, logout, recordLessonPass, triggerSuccess]);

  const handleManualSheetPass = useCallback(() => {
    if (!course || !lesson) return;
    recordLessonPass('spreadsheet');
    triggerSuccess('Spreadsheet exercise marked complete.');
    setSheetVerification({
      passed: true,
      message: 'Spreadsheet exercise marked complete.',
      checks: [],
      verification: 'manual',
    });
    setSheetVerifyError(null);
  }, [course, lesson, recordLessonPass, triggerSuccess]);

  const displaySheetId = userSheetUrl ? extractSheetId(userSheetUrl) : lesson?.google_sheet_id;
  const isUsingPersonalCopy = !!(userSheetUrl && extractSheetId(userSheetUrl));
  const hasSheetChecks = (lesson?.success_cells ?? []).length > 0;
  const hasSheetCopyLink = !!userSheetUrl.trim();
  const sheetPassed = sheetVerification?.passed ?? false;
  const iframeUrl = displaySheetId
    ? `https://docs.google.com/spreadsheets/d/${displaySheetId}/edit?usp=sharing`
    : '';

  const isDrawingLesson = lesson?.exercise_type === 'drawing' || (lesson as any)?.modality === 'drawing';
  const isSpreadsheetLesson = lesson?.exercise_type === 'spreadsheet' || (lesson as any)?.modality === 'spreadsheet' || (lesson as any)?.modality === 'sheet';

  return {
    slug,
    lessonSlug,
    course,
    chapters,
    currentChapterIndex,
    setCurrentChapterIndex,
    currentLessonIndex,
    setCurrentLessonIndex,
    currentChapter,
    lesson,
    allLessons,
    currentGlobalIndex,
    courseError,
    isAuthModalOpen,
    setIsAuthModalOpen,
    selectLesson,
    handleNext,
    handlePrevious,

    code,
    setCode,
    handleCodeChange,
    handleResetCode,

    activeEditorTab,
    setActiveEditorTab,
    isShowingSolution,
    setIsShowingSolution,
    showSolution: isShowingSolution,
    setShowSolution: setIsShowingSolution,
    loadedSolution,
    toggleSolution,

    isRunning,
    isSubmitting,
    output,
    setOutput,
    outputs,
    pushOutput,
    clearOutputs,
    gradingResult,
    activeConsoleTab,
    setActiveConsoleTab,
    handleRunCode,
    handleRun,

    isDrawingLesson,
    isSubmittingDrawing,
    drawingCanvasRef,
    drawingFeedback,
    drawingOutput,
    drawingChecks,
    showDrawingSolution,
    setShowDrawingSolution,
    handleDrawingSubmit,

    isSpreadsheetLesson,
    userSheetUrl,
    setUserSheetUrl,
    isCopyingSheet,
    handleMakeSheetCopy,
    isVerifyingSheet,
    sheetVerification,
    sheetVerifyError,
    handleVerifySheet,
    handleManualSheetPass,
    displaySheetId,
    isUsingPersonalCopy,
    hasSheetChecks,
    hasSheetCopyLink,
    sheetPassed,
    iframeUrl,

    completedIds,
    completedSlugs: completedIds,
    totalXp,
    xpPenalty,
    setXpPenalty,
    sharePayload,
    setSharePayload,
    openShare,
    isShareBundleOpen,
    setIsShareBundleOpen,

    lessonOverrideMd,
    setLessonOverrideMd,
    currentLang: lesson?.language || 'python',
    isAuthenticated,
    token,
    user,
    logout,
    navigate,
  };
}
