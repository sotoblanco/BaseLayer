import Editor, { type OnMount } from '@monaco-editor/react';
import {
  FileCode,
  Lock,
  Play,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  Loader2,
  FlaskConical,
} from 'lucide-react';
import type { EditorTab } from '../types';
import { studentTestsPlaceholder } from '../../testVisibility';

interface CodeEditorPaneProps {
  code: string;
  onChange: (value: string) => void;
  testCode: string;
  testsVisible?: boolean;
  solutionCode: string;
  activeTab: EditorTab;
  onSelectTab: (tab: EditorTab) => void;
  isShowingSolution: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  language?: string;
  filename?: string;
  onReset: () => void;
  onRunCode: () => void;
  onSubmitAnswer: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
}

export function CodeEditorPane({
  code,
  onChange,
  testCode,
  testsVisible = true,
  solutionCode,
  activeTab,
  onSelectTab,
  isShowingSolution,
  theme,
  onToggleTheme,
  language = 'python',
  filename = 'script.py',
  onReset,
  onRunCode,
  onSubmitAnswer,
  isRunning,
  isSubmitting,
}: CodeEditorPaneProps) {
  const isDark = theme === 'dark';
  const testsFilename = language === 'rust' ? 'tests.rs' : 'tests.py';
  const solutionFilename = language === 'rust' ? 'solution.rs' : 'solution.py';

  const handleEditorMount: OnMount = (_, monaco) => {
    monaco.editor.defineTheme('uxlight-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b8096', fontStyle: 'italic' },
        { token: 'keyword', foreground: '03ef62', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'identifier', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#05192d',
        'editor.foreground': '#e6edf3',
        'editorLineNumber.foreground': '#5b6b7b',
        'editorLineNumber.activeForeground': '#03ef62',
        'editorCursor.foreground': '#03ef62',
        'editor.selectionBackground': '#1d3952',
        'editor.inactiveSelectionBackground': '#112940',
        'editor.lineHighlightBackground': '#0b2338',
        'editorIndentGuide.background': '#15293d',
        'editorIndentGuide.activeBackground': '#2b4764',
      },
    });

    monaco.editor.defineTheme('uxlight-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b8096', fontStyle: 'italic' },
        { token: 'keyword', foreground: '028b3a', fontStyle: 'bold' },
        { token: 'string', foreground: 'b45309' },
        { token: 'number', foreground: '7c3aed' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1a2733',
        'editorLineNumber.foreground': '#93a3b4',
        'editorLineNumber.activeForeground': '#05192d',
        'editorCursor.foreground': '#02c852',
        'editor.selectionBackground': '#e2e8ee',
        'editor.lineHighlightBackground': '#f8fafc',
      },
    });

    monaco.editor.setTheme(isDark ? 'uxlight-dark' : 'uxlight-light');
  };

  const isReadOnly = activeTab !== 'script';
  const displayedCode =
    activeTab === 'script'
      ? code
      : activeTab === 'tests'
        ? testsVisible
          ? testCode
          : studentTestsPlaceholder(language)
        : solutionCode;

  return (
    <div className={`h-full flex flex-col relative select-none ${isDark ? 'bg-[#05192d] text-[#e6edf3]' : 'bg-white text-[#1a2733]'}`}>
      <div
        className={`h-[38px] min-h-[38px] px-2 sm:px-3 flex items-center justify-between border-b overflow-x-auto ${
          isDark ? 'bg-[#0b2338] border-[#1d3952] text-[#93a3b4]' : 'bg-[#f4f6f8] border-[#e2e8ee] text-[#5b6b7b]'
        }`}
      >
        <div className="flex items-center gap-1 h-full">
          <button
            onClick={() => onSelectTab('script')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'script'
                ? isDark
                  ? 'bg-[#05192d] text-[#e6edf3] border-t-2 border-t-[#03ef62] border-x border-[#1d3952]'
                  : 'bg-white text-[#05192d] border-t-2 border-t-[#02c852] border-x border-[#e2e8ee]'
                : 'hover:bg-black/10'
            }`}
          >
            <FileCode size={14} className={activeTab === 'script' ? 'text-[#03ef62]' : ''} />
            <span>{filename}</span>
          </button>

          <button
            onClick={() => onSelectTab('tests')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'tests'
                ? isDark
                  ? 'bg-[#05192d] text-[#e6edf3] border-t-2 border-t-[#03ef62] border-x border-[#1d3952]'
                  : 'bg-white text-[#05192d] border-t-2 border-t-[#02c852] border-x border-[#e2e8ee]'
                : 'hover:bg-black/10'
            }`}
          >
            <FlaskConical size={13} />
            <span>{testsFilename}</span>
          </button>

          {isShowingSolution && (
            <button
              onClick={() => onSelectTab('solution')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === 'solution'
                  ? isDark
                    ? 'bg-[#05192d] text-[#ffb800] border-t-2 border-t-[#ffb800] border-x border-[#1d3952]'
                    : 'bg-white text-[#b45309] border-t-2 border-t-[#ffb800] border-x border-[#e2e8ee]'
                  : 'hover:bg-black/10 text-[#ffb800]/80'
              }`}
            >
              <Lock size={12} />
              <span>{solutionFilename}</span>
            </button>
          )}
        </div>

        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded transition-colors shrink-0 ${
            isDark ? 'text-[#93a3b4] hover:text-white hover:bg-[#1d3952]' : 'text-[#5b6b7b] hover:text-[#05192d] hover:bg-[#e2e8ee]'
          }`}
          title={isDark ? 'Light theme' : 'Dark theme'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={displayedCode}
          theme={isDark ? 'uxlight-dark' : 'uxlight-light'}
          onChange={(val) => {
            if (!isReadOnly) onChange(val || '');
          }}
          onMount={handleEditorMount}
          options={{
            fontSize: 13.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
            tabSize: 4,
            insertSpaces: true,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 8,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: isReadOnly,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'line',
            automaticLayout: true,
            padding: { top: 12, bottom: 72 },
            wordWrap: 'on',
            smoothScrolling: true,
          }}
        />

        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5 z-20 flex items-center gap-2">
          <button
            onClick={onReset}
            className="h-9 w-9 rounded-full bg-[#0b2338] hover:bg-[#15324d] active:scale-95 text-[#93a3b4] hover:text-white border border-[#1d3952] shadow-lg flex items-center justify-center transition-all"
            title="Reset code"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onRunCode}
            disabled={isRunning || isSubmitting}
            className="h-9 px-3 sm:px-4 rounded-full bg-[#0b2338] hover:bg-[#143454] active:scale-95 disabled:opacity-50 text-white font-mono text-xs font-semibold border border-[#1d3952] shadow-lg flex items-center gap-2 transition-all"
            title="Run Code (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#03ef62]" />
                <span className="hidden sm:inline">Running...</span>
              </>
            ) : (
              <>
                <Play size={13} className="fill-white" />
                <span>Run Code</span>
              </>
            )}
          </button>
          <button
            onClick={onSubmitAnswer}
            disabled={isRunning || isSubmitting}
            className="h-9 px-3 sm:px-5 rounded-full bg-[#03ef62] hover:bg-[#02c852] active:scale-95 disabled:opacity-50 text-[#05192d] font-bold text-xs shadow-lg shadow-[#03ef62]/20 flex items-center gap-2 transition-all"
            title="Submit Answer (Ctrl+Shift+Enter)"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#05192d]" />
                <span className="hidden sm:inline">Grading...</span>
              </>
            ) : (
              <>
                <Zap size={14} className="fill-[#05192d]" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
