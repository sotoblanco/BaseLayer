import { useState, useEffect } from 'react';
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
import { ShareAchievement } from './components/ShareAchievement';
import { ShareModal } from '../components/ShareModal';
import { WelcomeGate } from '../components/auth/WelcomeGate';
import { isAuthorRole } from '../testVisibility';
import type { MobileTab, FileLesson } from './types';
import { useLessonPlayer } from '../player/useLessonPlayer';

export default function UXLightPage({ onSwitchUi }: { onSwitchUi?: () => void }) {
  const player = useLessonPlayer();
  const [editorTheme, setEditorTheme] = useState<'dark' | 'light'>('dark');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [isFlagOpen, setIsFlagOpen] = useState(false);
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
    setMobileTab('instructions');
  }, [player.lesson?.slug]);

  if (!player.isAuthenticated || !player.course || player.chapters.length === 0 || !player.lesson || !player.currentChapter) {
    return (
      <div className="flex h-screen w-full bg-[#f4f6f8] items-center justify-center text-[#5b6b7b]">
        <div className="text-center">
          {player.courseError ? <p className="text-red-500">{player.courseError}</p> : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03ef62] mx-auto mb-4" />
              <p>Loading course...</p>
            </>
          )}
        </div>
        <WelcomeGate isOpen={player.isAuthModalOpen} onClose={() => player.navigate('/')} />
      </div>
    );
  }

  const {
    slug,
    lesson,
    course,
    chapters,
    currentChapterIndex,
    currentLessonIndex,
    currentChapter,
    allLessons,
    currentGlobalIndex,
    code,
    handleCodeChange,
    handleResetCode,
    activeEditorTab,
    setActiveEditorTab,
    isShowingSolution,
    showDrawingSolution,
    setShowDrawingSolution,
    loadedSolution,
    toggleSolution,
    isRunning,
    isSubmitting,
    outputs,
    clearOutputs,
    gradingResult,
    activeConsoleTab,
    setActiveConsoleTab,
    handleRunCode,
    runCount,
    drawingCanvasRef,
    drawingFeedback,
    isSubmittingDrawing,
    handleDrawingSubmit,
    userSheetUrl,
    setUserSheetUrl,
    handleMakeSheetCopy,
    isCopyingSheet,
    handleVerifySheet,
    isVerifyingSheet,
    sheetVerification,
    sheetVerifyError,
    handleManualSheetPass,
    completedIds,
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
    user,
    selectLesson,
    handleNext,
    handlePrevious,
  } = player;

  const displayLesson: FileLesson = lessonOverrideMd[lesson.slug]
    ? { ...lesson, description: lessonOverrideMd[lesson.slug] }
    : lesson;

  const currentLang = lesson.language || 'python';
  const filename = currentLang === 'rust' ? 'main.rs' : 'script.py';
  const exerciseType = lesson.exercise_type || 'code';

  const onRunCodeWrapper = (customCommand?: string, isSubmit = false) => {
    if (isMobile) setMobileTab('console');
    return handleRunCode(customCommand, isSubmit);
  };

  const instructions = (
    <InstructionsPane
      lesson={displayLesson}
      lessonNumber={currentLessonIndex + 1}
      totalInChapter={currentChapter.lessons.length}
      isShowingSolution={isShowingSolution}
      onToggleSolution={toggleSolution}
      xpPenalty={xpPenalty}
      onTakeHint={() => setXpPenalty((p) => Math.min(p + 10, 25))}
      code={code}
      courseSlug={slug}
      runCount={runCount}
      onRunCode={() => handleRunCode()}
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
        feedback={drawingFeedback}
      />
    ) : exerciseType === 'spreadsheet' && (lesson.google_sheet_id || Object.keys(lesson.sheet_cells ?? {}).length > 0) ? (
      <SpreadsheetPane
        lesson={lesson}
        userSheetUrl={userSheetUrl}
        onChangeUrl={setUserSheetUrl}
        onMakeCopy={handleMakeSheetCopy}
        isCopying={isCopyingSheet}
        onVerify={handleVerifySheet}
        isVerifying={isVerifyingSheet}
        verification={sheetVerification}
        verifyError={sheetVerifyError}
        onMarkComplete={handleManualSheetPass}
        isComplete={completedIds.has(lesson.slug)}
      />
    ) : (
      <CodeEditorPane
        code={code}
        onChange={handleCodeChange}
        testCode={lesson.test_code || ''}
        testsVisible={isAuthorRole(user?.role)}
        solutionCode={loadedSolution}
        activeTab={activeEditorTab}
        onSelectTab={setActiveEditorTab}
        isShowingSolution={isShowingSolution}
        theme={editorTheme}
        onToggleTheme={() => setEditorTheme(editorTheme === 'dark' ? 'light' : 'dark')}
        language={currentLang}
        filename={filename}
        onReset={handleResetCode}
        onRunCode={() => onRunCodeWrapper()}
        onSubmitAnswer={() => onRunCodeWrapper(undefined, true)}
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
      onClearConsole={clearOutputs}
      onExecuteReplCommand={(cmd) => onRunCodeWrapper(cmd)}
      onNextLesson={handleNext}
      isNextDisabled={currentGlobalIndex === allLessons.length - 1}
      onShare={() => openShare('lesson')}
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
        onSelectLesson={selectLesson}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onOpenEmbed={() => setIsEmbedOpen(true)}
        onOpenStudio={() => setIsStudioOpen(true)}
        onOpenFlag={() => setIsFlagOpen(true)}
        onSwitchUi={onSwitchUi}
        onShare={() => openShare(completedIds.size >= allLessons.length ? 'course' : 'lesson')}
        canShare={completedIds.has(displayLesson.slug)}
        onShareBundle={() => setIsShareBundleOpen(true)}
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
        onSelectChapter={(cIdx) => selectLesson(cIdx, 0)}
      />

      {isStudioOpen && (
        <AuthorStudioView
          initialMarkdown={displayLesson.description}
          onApply={(md) => setLessonOverrideMd((prev) => ({ ...prev, [lesson.slug]: md }))}
          onClose={() => setIsStudioOpen(false)}
        />
      )}
      {isEmbedOpen && (
        <EmbedModal lesson={lesson} currentCode={code} solutionCode={loadedSolution} onClose={() => setIsEmbedOpen(false)} />
      )}
      {isFlagOpen && <FlagReportModal lesson={lesson} onClose={() => setIsFlagOpen(false)} />}
      {sharePayload && (
        <ShareAchievement
          payload={sharePayload}
          onClose={() => setSharePayload(null)}
          onNext={
            sharePayload.kind === 'course'
              ? () => {
                  setSharePayload(null);
                  player.navigate('/');
                }
              : currentGlobalIndex < allLessons.length - 1
                ? () => {
                    setSharePayload(null);
                    handleNext();
                  }
                : undefined
          }
          nextLabel={sharePayload.kind === 'course' ? 'Back to courses' : 'Next Exercise'}
        />
      )}
      {isShareBundleOpen && course && displayLesson && (
        <ShareModal
          isOpen={true}
          onClose={() => setIsShareBundleOpen(false)}
          courseSlug={course.slug}
          lessonSlug={displayLesson.slug}
          title={displayLesson.title}
        />
      )}
      <WelcomeGate isOpen={player.isAuthModalOpen} onClose={() => player.setIsAuthModalOpen(false)} />
    </div>
  );
}
