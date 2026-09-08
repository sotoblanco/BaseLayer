import { CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';

interface ChalkboardSolutionProps {
  title?: string;
  diagram?: string;
  explanation?: string;
  imageUrl?: string;
  onMarkComplete?: () => void;
  isComplete?: boolean;
}

export default function ChalkboardSolution({
  title = 'Reference Solution',
  diagram,
  explanation,
  imageUrl,
  onMarkComplete,
  isComplete = false,
}: ChalkboardSolutionProps) {
  return (
    <div className="flex flex-col h-full bg-[#11221a] text-slate-100 overflow-hidden font-sans border border-[#2b4c39]/50 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#182f24] border-b border-[#2b4c39] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-amber-300" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#102119] text-emerald-300 border border-[#2b4c39]">
          Chalk View
        </span>
      </div>

      {/* Chalkboard Slate Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#1a3628] to-[#14291f]">
        {/* Expected Diagram / Drawing */}
        {diagram && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 font-mono">
              Expected Diagram
            </span>
            <div className="bg-[#11231a]/90 border-2 border-[#362115] rounded-lg p-3.5 shadow-inner overflow-x-auto">
              <pre className="font-mono text-xs text-amber-100 leading-relaxed whitespace-pre font-semibold">
                {diagram}
              </pre>
            </div>
          </div>
        )}

        {/* Reference Image (if available) */}
        {imageUrl && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90 font-mono">
              Reference Diagram
            </span>
            <div className="p-2 bg-[#102219] rounded-lg border border-[#2b4c39] flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Solution diagram"
                className="max-h-60 object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Conceptual Explanation */}
        {explanation && (
          <div className="space-y-1.5 bg-[#173024]/80 border border-[#2e523e] p-3 rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
              What was expected
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {explanation}
            </p>
          </div>
        )}

        {/* Self-Evaluation Note */}
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-200/90 flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-300">
            <Sparkles size={14} className="text-emerald-400" />
            Self-Evaluation Mode
          </p>
          <p className="text-[11px] text-emerald-300/80 leading-relaxed">
            Compare your sketch on the chalkboard against the expected diagram. If your drawing matches the intended structure and relationships, mark the exercise complete!
          </p>
          {onMarkComplete && (
            <button
              onClick={onMarkComplete}
              disabled={isComplete}
              className="mt-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {isComplete ? 'Lesson Completed ✓' : 'I evaluated my drawing — mark complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
