import { Lightbulb, Send } from 'lucide-react';
import DrawingCanvas from '../../components/DrawingCanvas';
import type { FileLesson } from '../types';
import { API_BASE_URL } from '../../config';

interface DrawingPaneProps {
  courseSlug: string;
  lesson: FileLesson;
  showSolution: boolean;
  onToggleSolution: () => void;
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  feedback: string;
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
  const passed =
    feedback.toLowerCase().includes('pass') ||
    feedback.toLowerCase().includes('great job') ||
    feedback.toLowerCase().includes('correct');

  return (
    <div className="flex flex-col h-full bg-[#05192d]">
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className={`${showSolution ? 'w-1/2' : 'w-full'} border-r border-[#1d3952] min-h-0`}>
          <DrawingCanvas
            imageUrl={`${API_BASE_URL}/file-courses/${courseSlug}/${lesson.slug}/image`}
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
                src={`${API_BASE_URL}/file-courses/${courseSlug}/${lesson.slug}/solution`}
                alt="Solution"
                className="max-w-full max-h-full object-contain rounded-lg border border-[#ffb800]/30"
              />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col border-t border-[#1d3952]">
        <div className="h-24 overflow-y-auto px-4 py-3 custom-scrollbar font-mono bg-[#0b2338] border-b border-[#1d3952]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#93a3b4]">AI Feedback</span>
          {feedback ? (
            <p className={`text-xs whitespace-pre-wrap leading-relaxed mt-1 ${passed ? 'text-[#03ef62]' : 'text-[#e6edf3]'}`}>
              {feedback}
            </p>
          ) : (
            <p className="text-xs text-[#5b6b7b] italic mt-1">Submit your drawing to receive feedback...</p>
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
