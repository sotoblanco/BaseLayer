import { CheckCircle2, Lightbulb, Send, XCircle } from 'lucide-react';
import DrawingCanvas from '../../components/DrawingCanvas';
import type { DrawingFeedback, FileLesson } from '../types';
import { API_BASE_URL } from '../../config';

interface DrawingPaneProps {
  courseSlug: string;
  lesson: FileLesson;
  showSolution: boolean;
  onToggleSolution: () => void;
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  feedback: DrawingFeedback | null;
}

export function DrawingPane({
  courseSlug,
  lesson,
  showSolution,
  onToggleSolution,
  onCanvasRef,
  onSubmit,
  isSubmitting,
  feedback,
}: DrawingPaneProps) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const imageAuthQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const passed = feedback?.passed ?? false;
  const hasFeedback = feedback !== null;
  const checks = feedback?.checks?.length ? feedback.checks : [];

  return (
    <div className="flex flex-col h-full bg-[#05192d]">
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className={`${showSolution ? 'w-1/2' : 'w-full'} border-r border-[#1d3952] min-h-0`}>
          <DrawingCanvas
            imageUrl={`${API_BASE_URL}/file-courses/${courseSlug}/${lesson.slug}/image${imageAuthQuery}`}
            strokeColor={lesson.stroke_color}
            strokeWidth={lesson.stroke_width}
            onCanvasRef={onCanvasRef}
          />
        </div>
        {showSolution && (
          <div className="w-1/2 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-[#1d3952]">
              <h3 className="text-xs font-bold text-[#ffb800] uppercase tracking-widest flex items-center gap-2">
                <Lightbulb size={14} />
                Reference Solution
              </h3>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center p-3 min-h-0">
              <img
                src={`${API_BASE_URL}/file-courses/${courseSlug}/${lesson.slug}/solution${imageAuthQuery}`}
                alt="Solution"
                className="max-w-full max-h-full object-contain rounded-lg border border-[#ffb800]/30"
              />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col border-t border-[#1d3952]">
        <div className="max-h-40 overflow-y-auto px-4 py-3 custom-scrollbar bg-[#0b2338] border-b border-[#1d3952]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#93a3b4]">
              AI Feedback
            </span>
            {hasFeedback && (
              <span
                className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  passed ? 'text-[#03ef62]' : 'text-[#ffb800]'
                }`}
              >
                {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {passed ? 'Passed' : 'Keep iterating'}
              </span>
            )}
          </div>

          {isSubmitting ? (
            <p className="text-xs text-[#5b6b7b] italic mt-2">Evaluating your drawing...</p>
          ) : hasFeedback ? (
            <div className="mt-2 space-y-2">
              {feedback && feedback.message && (
                <p
                  className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    passed ? 'text-[#03ef62]' : 'text-[#e6edf3]'
                  }`}
                >
                  {feedback.message}
                </p>
              )}
              {checks.length > 0 && (
                <ul className="space-y-1.5 pt-1 border-t border-[#1d3952]">
                  {checks.map((check, idx) => (
                    <li key={`${check.label}-${idx}`} className="flex items-start gap-2 text-xs">
                      {check.passed ? (
                        <CheckCircle2 size={14} className="text-[#03ef62] shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={14} className="text-[#ff6b6b] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <span
                          className={check.passed ? 'text-[#e6edf3]' : 'text-[#ffb800]'}
                        >
                          {check.label}
                        </span>
                        {check.feedback && (
                          <span className="block text-[#93a3b4]">{check.feedback}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#5b6b7b] italic mt-2">
              Submit your drawing to receive rubric feedback (intent / missing elements / extra
              marks)...
            </p>
          )}
        </div>
        <div className="h-12 flex items-center justify-between px-4 gap-3">
          <button
            onClick={onToggleSolution}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all ${
              showSolution
                ? 'bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/40'
                : 'bg-[#0b2338] text-[#93a3b4] border-[#1d3952] hover:text-white'
            }`}
          >
            <Lightbulb size={14} />
            {showSolution ? 'Hide Solution' : 'Show Solution'}
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-[#03ef62] hover:bg-[#02c852] text-[#05192d] text-sm font-bold rounded disabled:opacity-50"
          >
            <Send size={15} />
            {isSubmitting ? 'Submitting...' : 'Submit Drawing'}
          </button>
        </div>
      </div>
    </div>
  );
}
