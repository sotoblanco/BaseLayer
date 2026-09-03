import { CheckCircle2 } from 'lucide-react';
import type { UXLightChapter } from '../types';

interface ChapterBarProps {
  chapters: UXLightChapter[];
  currentChapterIndex: number;
  completedIds: Set<string>;
  onSelectChapter: (chapterIndex: number) => void;
}

export function ChapterBar({
  chapters,
  currentChapterIndex,
  completedIds,
  onSelectChapter,
}: ChapterBarProps) {
  return (
    <footer className="h-[44px] min-h-[44px] max-h-[44px] bg-[#05192d] border-t border-[#1d3952] flex items-center px-3 sm:px-4 overflow-x-auto custom-scrollbar select-none z-30">
      <div className="flex items-center gap-2 min-w-max">
        {chapters.map((chapter, idx) => {
          const isActive = idx === currentChapterIndex;
          const total = chapter.lessons.length;
          const completedCount = chapter.lessons.filter((ex) => completedIds.has(ex.slug)).length;
          const isAllCompleted = total > 0 && completedCount === total;

          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#03ef62]/20 text-[#03ef62] border border-[#03ef62] shadow-sm'
                  : isAllCompleted
                  ? 'bg-[#0b2338] text-[#93a3b4] border border-[#03ef62]/30 hover:border-[#03ef62] hover:text-white'
                  : 'bg-[#0b2338] text-[#93a3b4] border border-[#1d3952] hover:border-[#5b6b7b] hover:text-white'
              }`}
            >
              {isAllCompleted ? (
                <CheckCircle2 size={13} className="text-[#03ef62] shrink-0" />
              ) : isActive ? (
                <div className="w-2 h-2 rounded-full bg-[#03ef62] animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-[#5b6b7b]" />
              )}
              <span className="font-semibold">
                {chapter.chapterNumber}. {chapter.title}
              </span>
              <span
                className={`px-1.5 rounded-full font-mono text-[10px] ${
                  isActive ? 'bg-[#03ef62] text-[#05192d] font-bold' : 'bg-[#1d3952] text-[#93a3b4]'
                }`}
              >
                {completedCount > 0 && !isAllCompleted ? `${completedCount}/${total}` : `[${total}]`}
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
