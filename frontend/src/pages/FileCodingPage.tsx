import { useState, useEffect, useRef } from 'react';
import MarkdownViewer from '../components/MarkdownViewer';
import { CodeEditor } from '../components/CodeEditor';
import AIChatPanel from '../components/AIChatPanel';
import DrawingCanvas from '../components/DrawingCanvas';
import SheetTemplatePreview from '../components/SheetTemplatePreview';
import {
  Play,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FolderCode,
  Lightbulb,
  Link,
  Trash2,
  ExternalLink,
  Send,
  Sparkles,
  Compass,
  Check,
  Lock,
  FileText,
  FlaskConical,
  Table,
} from 'lucide-react';

import { API_BASE_URL, APP_VERSION } from '../config';
import { buildTutorContext } from '../tutorContext';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { UserMenu } from '../components/UserMenu';
import { WelcomeGate } from '../components/auth/WelcomeGate';
import { ShareAchievement } from '../ux-light/components/ShareAchievement';
import { isAuthorRole, studentTestsPlaceholder } from '../testVisibility';
import { useLessonPlayer } from '../player/useLessonPlayer';

export default function FileCodingPage({ onSwitchUi }: { onSwitchUi?: () => void }) {
    const player = useLessonPlayer();
    const [editorTab, setEditorTab] = useState<'main' | 'tests' | 'solution'>('main');
    const [isLearningGuideOpen, setIsLearningGuideOpen] = useState(false);
    const instructionScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEditorTab('main');
    }, [player.lesson?.slug]);

    const {
        slug,
        course,
        chapters,
        currentChapterIndex,
        currentLessonIndex,
        currentChapter,
        lesson,
        code,
        handleCodeChange,
        handleResetCode,
        showSolution,
        setShowSolution,
        loadedSolution,
        toggleSolution,
        isRunning,
        output,
        handleRun,
        handleRunCode,
        runCount,
        drawingCanvasRef,
        drawingOutput,
        drawingChecks,
        isSubmittingDrawing,
        showDrawingSolution,
        setShowDrawingSolution,
        handleDrawingSubmit,
        userSheetUrl,
        setUserSheetUrl,
        isCopyingSheet,
        handleMakeSheetCopy,
        isVerifyingSheet,
        sheetVerification,
        sheetVerifyError,
        handleVerifySheet,
        handleManualSheetPass,
        isUsingPersonalCopy,
        hasSheetChecks,
        hasSheetCopyLink,
        sheetPassed,
        iframeUrl,
        completedSlugs,
        courseError,
        isAuthModalOpen,
        setIsAuthModalOpen,
        sharePayload,
        setSharePayload,
        currentLang,
        isAuthenticated,
        token,
        user,
        navigate,
        selectLesson,
        handleNext,
        handlePrevious,
    } = player;

    if (!course || chapters.length === 0) {
        return (
            <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-slate-400">
                <div className="text-center">
                    {courseError ? (
                        <>
                            <p className="mb-4 text-rose-400">{courseError}</p>
                            {!isAuthenticated && (
                                <button
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                                >
                                    Sign in
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                            <p>Loading course...</p>
                        </>
                    )}
                </div>
                <WelcomeGate isOpen={isAuthModalOpen} onClose={() => navigate('/')} />
            </div>
        );
    }

    if (!currentChapter || currentChapter.lessons.length === 0) {
        return (
            <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-slate-400">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                    <p>No lessons added yet.</p>
                </div>
            </div>
        );
    }

    const mainFilename = currentLang === "rust" ? "main.rs" : "main.py";
    const testsFilename = currentLang === "rust" ? "tests.rs" : "tests.py";
    // Students never see the answer-key assertions; authors (admins) still can.
    const testsEditorCode = isAuthorRole(user?.role)
        ? (lesson?.test_code || "")
        : studentTestsPlaceholder(currentLang);

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

                {/* Chapter Navigation */}
                <div className="flex flex-col gap-2 mt-4 w-full items-center">
                    {/* Previous Chapter Button */}
                    {chapters.length > 1 && (
                        <button
                            onClick={() => selectLesson(Math.max(0, currentChapterIndex - 1), 0)}
                            disabled={currentChapterIndex === 0}
                            className="p-2 rounded text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Previous Chapter"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}

                    {/* Chapter Name */}
                    {chapters.length > 1 && currentChapter && (
                        <div className="text-xs font-semibold text-slate-400 text-center px-2 py-1">
                            {(currentChapter.name || currentChapter.title).replace('chapter', 'Ch ')}
                        </div>
                    )}

                    {/* Lesson Dots for Current Chapter */}
                    <div className="flex flex-col gap-2">
                        {currentChapter?.lessons.map((les, idx) => {
                            const isDone = completedSlugs.has(les.slug);
                            const isLocked = Boolean(course?.is_project && les.is_locked);
                            return (
                            <div
                                key={les.slug}
                                onClick={() => {
                                    if (!isLocked) selectLesson(currentChapterIndex, idx);
                                }}
                                className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-colors font-bold text-sm
                            ${isLocked ? 'cursor-not-allowed opacity-40 bg-slate-900/60 text-slate-500 border border-slate-800' : 'cursor-pointer'}
                            ${currentLessonIndex === idx ? 'bg-slate-700 text-white' : isDone ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/40' : isLocked ? '' : 'hover:bg-slate-800 text-slate-400'}
                        `}
                                title={isLocked ? `${les.title} (Locked - complete prior steps)` : isDone ? `${les.title} (completed)` : les.title}
                            >
                                {isLocked ? <Lock size={14} /> : isDone ? <Check size={16} /> : idx + 1}
                            </div>
                            );
                        })}
                    </div>


                    {/* Next Chapter Button */}
                    {chapters.length > 1 && (
                        <button
                            onClick={() => selectLesson(Math.min(chapters.length - 1, currentChapterIndex + 1), 0)}
                            disabled={currentChapterIndex === chapters.length - 1}
                            className="p-2 rounded text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                            title="Next Chapter"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <h1 className="font-semibold text-lg tracking-tight text-white">{lesson?.title}</h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {lesson?.exercise_type === 'spreadsheet' ? 'Spreadsheet' : lesson?.exercise_type === 'drawing' ? 'Drawing' : currentLang === 'rust' ? 'Rust' : 'Python'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            File Course
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevious}
                            disabled={currentChapterIndex === 0 && currentLessonIndex === 0}
                            className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-slate-400">
                            {currentChapter ? (
                                <>
                                    {currentLessonIndex + 1} / {currentChapter.lessons.length}
                                    {chapters.length > 1 && ` • ${(currentChapter.name || currentChapter.title).replace('chapter', 'Ch ')}`}
                                </>
                            ) : (
                                '0 / 0'
                            )}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentChapterIndex === chapters.length - 1 && currentChapter && currentLessonIndex === currentChapter.lessons.length - 1}
                            className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="w-px h-6 bg-slate-800 mx-2" />
                        <button
                            onClick={() => setIsLearningGuideOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                            title="Learning Guide & AI Setup"
                        >
                            <Compass size={14} className="text-emerald-400" />
                            <span className="hidden md:inline">Learning Guide</span>
                        </button>
                        {onSwitchUi && (
                            <button
                                onClick={onSwitchUi}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                                title="Switch to the UX Light interface"
                            >
                                <Sparkles size={15} className="text-emerald-400" />
                                <span className="hidden md:inline">UX Light</span>
                            </button>
                        )}
                        {isAuthenticated ? (
                            <UserMenu />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-slate-400 text-xs font-mono">
                                    v{APP_VERSION || 'dev'}
                                </div>
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
                        {/* Left: Instructions & AI (integrated) */}
                        <Panel defaultSize={40} minSize={20} id="left-panel" className="flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden">
                            <div 
                                id="instruction-scroll-container"
                                ref={instructionScrollRef} 
                                className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-[#0b0e14]"
                            >
                                {/* Instructions Section */}
                                <div className="p-2 pt-4">
                                    {lesson && <MarkdownViewer content={lesson.description} />}
                                </div>

                                {/* Divider */}
                                <div className="mx-8 border-t border-slate-800/60 my-2" />

                                {/* AI Assistant — integrated into the same scroll flow */}
                                <div className="flex-1 flex flex-col">
                                    <AIChatPanel
                                        variant="integrated"
                                        lessonId={lesson?.slug ?? ''}
                                        courseSlug={slug}
                                        lessonSlug={lesson?.slug}
                                        exerciseType={lesson?.exercise_type}
                                        runCount={runCount}
                                        onRunCode={() => handleRunCode()}
                                        context={buildTutorContext(lesson, code)}
                                    />
                                </div>
                            </div>
                        </Panel>

                        <Separator className="w-1.5 bg-slate-900 border-l border-slate-800 hover:bg-emerald-500 transition-colors cursor-col-resize flex items-center justify-center z-10" />

                        {/* Right: Code & Output or Spreadsheet or Drawing */}
                        <Panel defaultSize={50} minSize={20} id="code-output-panel" className="flex flex-col bg-[#1e1e1e]">
                            {lesson?.exercise_type === 'drawing' ? (
                                // Drawing Exercise
                                <div className="flex flex-col h-full">
                                    {/* Canvas + Solution area -- takes all remaining space */}
                                    <div className="flex-1 flex overflow-hidden min-h-0">
                                        {(() => {
                                            const imageAuthQuery = token ? `?token=${encodeURIComponent(token)}` : '';
                                            return (
                                                <>
                                                    <div className={`${showDrawingSolution ? 'w-1/2' : 'w-full'} border-r border-[#333] transition-all duration-300 min-h-0`}>
                                                        <DrawingCanvas
                                                            imageUrl={`${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/image${imageAuthQuery}`}
                                                            strokeColor={lesson.stroke_color}
                                                            strokeWidth={lesson.stroke_width}
                                                            onCanvasRef={(ref) => { drawingCanvasRef.current = ref; }}
                                                        />
                                                    </div>
                                                    {showDrawingSolution && (
                                                        <div className="w-1/2 bg-slate-900/30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                                            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-slate-700/40">
                                                                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <Lightbulb size={14} className="fill-yellow-500/20" />
                                                                    Reference Solution
                                                                </h3>
                                                                <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/30">
                                                                    Compare with your drawing
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 overflow-hidden flex items-center justify-center p-3 min-h-0">
                                                                <img
                                                                    src={`${API_BASE_URL}/file-courses/${slug}/${lesson.slug}/solution${imageAuthQuery}`}
                                                                    alt="Solution"
                                                                    className="max-w-full max-h-full object-contain rounded-lg border border-yellow-700/30 shadow-2xl shadow-black/40"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    {/* Bottom section: Terminal-style feedback + Action buttons */}
                                    <div className="shrink-0 flex flex-col bg-[#1e1e1e] border-t border-[#333]">
                                        {/* AI Feedback terminal -- always visible, fixed height */}
                                        <div className="h-28 overflow-y-auto px-4 py-3 custom-scrollbar font-mono bg-[#1a1a2e] border-b border-[#333]">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Feedback</span>
                                                {drawingOutput && (
                                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                                        drawingOutput.toLowerCase().includes('pass') || drawingOutput.toLowerCase().includes('great job') || drawingOutput.toLowerCase().includes('correct')
                                                            ? 'bg-emerald-400'
                                                            : drawingOutput.includes('empty')
                                                                ? 'bg-yellow-400'
                                                                : 'bg-blue-400'
                                                    }`} />
                                                )}
                                            </div>
                                            {drawingOutput ? (
                                                <>
                                                    <p className={`text-xs whitespace-pre-wrap leading-relaxed ${
                                                        drawingOutput.toLowerCase().includes('pass') || drawingOutput.toLowerCase().includes('great job') || drawingOutput.toLowerCase().includes('correct')
                                                            ? 'text-emerald-400'
                                                            : drawingOutput.includes('empty')
                                                                ? 'text-yellow-400'
                                                                : 'text-slate-300'
                                                    }`}>{drawingOutput}</p>
                                                    {drawingChecks.length > 0 && (
                                                        <ul className="mt-2 space-y-1.5">
                                                            {drawingChecks.map((check, idx) => (
                                                                <li key={`${check.label}-${idx}`} className="flex items-start gap-2 text-xs">
                                                                    <span className={check.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                                                        {check.passed ? '✓' : '✗'}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <span className={check.passed ? 'text-slate-200' : 'text-amber-300'}>
                                                                            {check.label}
                                                                        </span>
                                                                        {check.feedback && (
                                                                            <span className="block text-slate-400">{check.feedback}</span>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-xs text-slate-600 italic">Submit your drawing to receive rubric feedback (intent / missing elements / extra marks)...</p>
                                            )}
                                        </div>
                                        {/* Action bar: Show Solution + Submit */}
                                        <div className="h-12 flex items-center justify-between px-4 gap-3">
                                            <button
                                                onClick={() => setShowDrawingSolution(!showDrawingSolution)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all shrink-0 ${
                                                    showDrawingSolution
                                                        ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50 hover:bg-yellow-900/60'
                                                        : 'bg-[#2d2d2d] text-slate-300 border-[#444] hover:bg-[#3d3d3d] hover:text-white'
                                                }`}
                                            >
                                                <Lightbulb size={14} />
                                                {showDrawingSolution ? 'Hide Solution' : 'Show Solution'}
                                            </button>
                                            <button
                                                onClick={handleDrawingSubmit}
                                                disabled={isSubmittingDrawing}
                                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded shadow shadow-blue-900/30 transition-all disabled:opacity-50 shrink-0"
                                            >
                                                <Send size={15} />
                                                {isSubmittingDrawing ? 'Submitting...' : 'Submit Drawing'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            ) : lesson?.exercise_type === 'spreadsheet' && (lesson?.google_sheet_id || Object.keys(lesson?.sheet_cells ?? {}).length > 0) ? (
                                // Spreadsheet Exercise - Google Sheets (live copy) or JSON template preview
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="h-12 border-b border-[#333] flex items-center px-4 bg-[#252526] justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-sm text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                                                <Table size={15} /> {isUsingPersonalCopy ? 'My Copy' : 'Template'}
                                            </span>

                                            <div className="flex-1 max-w-lg flex items-center gap-2 bg-[#1e1e1e] border border-[#444] rounded px-2 py-1">
                                                <Link size={14} className="text-slate-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Paste your private copy link here..."
                                                    className="bg-transparent border-none text-xs text-slate-300 w-full focus:outline-none"
                                                    value={userSheetUrl}
                                                    onChange={(e) => setUserSheetUrl(e.target.value)}
                                                />
                                                {userSheetUrl && (
                                                    <button
                                                        onClick={() => setUserSheetUrl("")}
                                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Remove link"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {(lesson.copy_on_open || Object.keys(lesson.sheet_cells ?? {}).length > 0) && (
                                                <button
                                                    onClick={handleMakeSheetCopy}
                                                    disabled={isCopyingSheet}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                                                >
                                                    <ExternalLink size={14} /> {isCopyingSheet ? 'Creating...' : 'Make a private copy'}
                                                </button>
                                            )}
                                            {hasSheetChecks && (
                                                <button
                                                    onClick={() => handleVerifySheet()}
                                                    disabled={isVerifyingSheet || !hasSheetCopyLink || sheetPassed}
                                                    title={hasSheetCopyLink ? 'Verify the target cells in your copy' : 'Paste your copy link first'}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                                                >
                                                    {isVerifyingSheet ? 'Checking...' : sheetPassed ? 'Checked ✓' : 'Check my work'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* If copy_on_open is true we encourage user to make a private copy; still embed the template for preview */}
                                    <div style={{ flex: 1, backgroundColor: '#fff' }}>
                                        {iframeUrl ? (
                                            <iframe
                                                src={iframeUrl}
                                                style={{
                                                    flex: 1,
                                                    border: 'none',
                                                    width: '100%',
                                                    height: '100%'
                                                }}
                                                title="Google Sheet Exercise"
                                                allow="autorepair;usercopy;useredit"
                                            />
                                        ) : Object.keys(lesson?.sheet_cells ?? {}).length > 0 ? (
                                            <div className="w-full h-full bg-slate-900 text-slate-200 overflow-auto">
                                                <SheetTemplatePreview cells={lesson?.sheet_cells ?? {}} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-500 italic">
                                                Sheet ID not found in metadata...
                                            </div>
                                        )}
                                    </div>

                                    {(isVerifyingSheet || sheetVerification || sheetVerifyError) && (
                                        <div className="shrink-0 max-h-40 overflow-y-auto custom-scrollbar border-t border-[#333] bg-[#1a1a2e] px-4 py-2.5 font-mono">
                                            {isVerifyingSheet ? (
                                                <p className="text-xs text-slate-400 italic">Checking the target cells in your copy...</p>
                                            ) : sheetVerification ? (
                                                <div className="space-y-1.5">
                                                    <p className={`text-xs font-bold ${sheetPassed ? 'text-emerald-400' : 'text-amber-300'}`}>
                                                        {sheetPassed ? '✓ ' : '✗ '}{sheetVerification.message}
                                                    </p>
                                                    {sheetVerification.checks.length > 0 && (
                                                        <ul className="space-y-1">
                                                            {sheetVerification.checks.map((check) => (
                                                                <li key={check.cell} className="flex items-start gap-2 text-xs">
                                                                    <span className={check.ok ? 'text-emerald-400' : 'text-rose-400'}>
                                                                        {check.ok ? '✓' : '✗'}
                                                                    </span>
                                                                    <span className={check.ok ? 'text-slate-300' : 'text-slate-100'}>
                                                                        {check.cell}: {check.ok
                                                                            ? check.actual
                                                                            : `expected ${check.expected}${check.actual !== null ? `, found ${check.actual}` : ' (empty)'}`}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                             ) : sheetVerifyError ? (
                                                 <div className="space-y-1.5">
                                                     <p className="text-xs text-amber-300">{sheetVerifyError}</p>
                                                     <button
                                                         onClick={handleManualSheetPass}
                                                         className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
                                                     >
                                                         I verified it myself — mark complete
                                                     </button>
                                                 </div>
                                             ) : null}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Code Exercise
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
                                                    <FileText size={14} /> {mainFilename}
                                                </button>
                                                <button
                                                    onClick={() => setEditorTab('tests')}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-colors ${editorTab === 'tests'
                                                        ? 'bg-[#1e1e1e] text-slate-200 border-[#333]'
                                                        : 'border-transparent hover:bg-[#2d2d2d]'
                                                        }`}
                                                >
                                                    <FlaskConical size={14} /> {testsFilename}
                                                </button>
                                                {lesson?.has_solution && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!loadedSolution) {
                                                                await toggleSolution();
                                                            } else {
                                                                setShowSolution(true);
                                                            }
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
                                                    onChange={handleCodeChange}
                                                    language={currentLang}
                                                    filename={mainFilename}
                                                />
                                            </div>
                                            <div className="absolute inset-0" style={{ display: editorTab === 'tests' ? 'block' : 'none' }}>
                                                <CodeEditor
                                                    key="editor-tests"
                                                    code={testsEditorCode}
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
                                                        code={loadedSolution}
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
                                                <button
                                                    onClick={handleResetCode}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
                                                >
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
                            )}
                        </Panel>

                    </Group>
                </div>
            </div>
            <WelcomeGate
                isOpen={isLearningGuideOpen}
                onClose={() => setIsLearningGuideOpen(false)}
                initialTab="modalities"
            />
            {sharePayload && (
                <ShareAchievement payload={sharePayload} onClose={() => setSharePayload(null)} />
            )}
        </div>
    );
}
