import { useState, useEffect } from 'react';
import { Lightbulb, Zap, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import type { FileLesson } from '../types';
import AIChatPanel from '../../components/AIChatPanel';
import { buildTutorContext } from '../../tutorContext';

interface InstructionsPaneProps {
  lesson: FileLesson;
  lessonNumber: number;
  totalInChapter: number;
  isShowingSolution: boolean;
  onToggleSolution: () => void;
  xpPenalty: number;
  onTakeHint: () => void;
  code: string;
}

export function InstructionsPane({
  lesson,
  lessonNumber,
  totalInChapter,
  isShowingSolution,
  onToggleSolution,
  xpPenalty,
  onTakeHint,
  code,
}: InstructionsPaneProps) {
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    setIsHintOpen(false);
    setHintIndex(0);
  }, [lesson.slug]);

  const currentXp = Math.max(5, 35 - xpPenalty);
  const hints = [
    'Read the task list carefully and fill in any `____` blanks in the starter code.',
    'Run your code first, then submit once the output looks right.',
    'Compare your approach with the tests tab if you get stuck.',
  ];

  return (
    <div className="h-full flex flex-col bg-white text-[#1a2733] select-text">
      <div className="h-[40px] min-h-[40px] px-4 sm:px-6 bg-[#f4f6f8] border-b border-[#e2e8ee] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#5b6b7b]">
          Instructions {lessonNumber}/{totalInChapter}
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#05192d] text-white text-xs font-mono font-bold">
          <Zap size={12} className="text-[#03ef62] fill-[#03ef62]" />
          <span>{currentXp} XP</span>
        </div>
      </div>

      <div id="instruction-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 sm:p-6 space-y-5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#05192d] tracking-tight">
            {lesson.title}
          </h1>

          <div className="prose prose-slate max-w-none text-sm text-[#1a2733] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-extrabold text-[#05192d] mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-[#05192d] mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-bold text-[#05192d] mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => <p className="mb-3 text-[#1a2733]">{children}</p>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="px-1.5 py-0.5 rounded bg-[#f4f6f8] text-[#05192d] font-mono text-xs border border-[#e2e8ee] font-semibold"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  );
                },
                li: ({ children }) => (
                  <li className="flex items-start gap-2.5 mb-2 list-none">
                    <div className="w-5 h-5 rounded-full bg-[#e8fbef] border border-[#03ef62]/50 text-[#028b3a] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      •
                    </div>
                    <div className="flex-1 font-medium">{children}</div>
                  </li>
                ),
                ul: ({ children }) => <ul className="my-3 pl-0">{children}</ul>,
                ol: ({ children }) => <ol className="my-3 space-y-1.5 list-decimal list-inside">{children}</ol>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[#03ef62] bg-[#e8fbef]/40 p-3 rounded-r text-[#05192d] my-3 italic text-xs">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {lesson.description}
            </ReactMarkdown>
          </div>

          <div>
            {!isHintOpen ? (
              <button
                onClick={() => {
                  setIsHintOpen(true);
                  onTakeHint();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#b45309] bg-[#fffbeb] hover:bg-[#fef3c7] border border-[#fde68a] transition-all"
              >
                <Lightbulb size={15} className="text-[#f59e0b]" />
                <span>Take Hint (-10 XP)</span>
              </button>
            ) : (
              <div className="border-l-4 border-[#ffb800] bg-[#fffbeb] p-4 rounded-r-xl border-y border-r border-[#fde68a] text-xs text-[#92400e] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[#b45309]">
                    <Lightbulb size={16} className="text-[#f59e0b]" />
                    <span>Hint {hintIndex + 1}/{hints.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHintIndex(Math.max(0, hintIndex - 1))}
                      disabled={hintIndex === 0}
                      className="p-1 rounded hover:bg-[#fef3c7] disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setHintIndex(Math.min(hints.length - 1, hintIndex + 1))}
                      disabled={hintIndex === hints.length - 1}
                      className="p-1 rounded hover:bg-[#fef3c7] disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <p>{hints[hintIndex]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mx-4 sm:mx-6 border-t border-[#e2e8ee]" />

        <div className="flex-1 flex flex-col min-h-[220px]">
          <AIChatPanel
            variant="integrated"
            lessonId={lesson.slug}
            context={buildTutorContext(lesson, code)}
          />
        </div>
      </div>

      <div className="h-[44px] min-h-[44px] px-4 sm:px-6 bg-[#f8fafc] border-t border-[#e2e8ee] flex items-center justify-between text-xs text-[#5b6b7b]">
        <button
          onClick={onToggleSolution}
          className="flex items-center gap-1.5 font-bold hover:text-[#05192d] transition-colors"
        >
          {isShowingSolution ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{isShowingSolution ? 'Hide Solution' : 'Show Solution'}</span>
        </button>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#93a3b4]">
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#d0dbe5] text-[#5b6b7b]">Ctrl + Enter</kbd>
          <span>to run</span>
        </div>
      </div>
    </div>
  );
}
