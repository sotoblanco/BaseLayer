import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  Terminal,
  BarChart3,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Send,
  Download,
  ArrowRight,
  Sparkles,
  Share2,
} from 'lucide-react';
import type { ConsoleTab, OutputMessage, GradingResult, PlotFigure } from '../types';

interface ConsolePaneProps {
  activeTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  outputs: OutputMessage[];
  plots: PlotFigure[];
  gradingResult: GradingResult | null;
  onClearConsole: () => void;
  onExecuteReplCommand: (command: string) => void;
  onNextLesson: () => void;
  isNextDisabled: boolean;
  onShare?: () => void;
}

export function ConsolePane({
  activeTab,
  onSelectTab,
  outputs,
  plots,
  gradingResult,
  onClearConsole,
  onExecuteReplCommand,
  onNextLesson,
  isNextDisabled,
  onShare,
}: ConsolePaneProps) {
  const [replInput, setReplInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'shell') {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs, activeTab]);

  const handleReplSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cmd = replInput.trim();
    if (!cmd) return;
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setReplInput('');
    onExecuteReplCommand(cmd);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setReplInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setReplInput('');
      } else {
        setHistoryIndex(nextIndex);
        setReplInput(commandHistory[nextIndex]);
      }
    }
  };

  const downloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#05192d] text-[#e6edf3] select-text">
      <div className="h-[38px] min-h-[38px] px-2 sm:px-3 bg-[#0b2338] border-b border-[#1d3952] flex items-center justify-between select-none overflow-x-auto">
        <div className="flex items-center gap-1 h-full">
          <button
            onClick={() => onSelectTab('shell')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md whitespace-nowrap ${
              activeTab === 'shell'
                ? 'bg-[#05192d] text-[#e6edf3] border-t-2 border-t-[#03ef62] border-x border-[#1d3952]'
                : 'text-[#93a3b4] hover:text-white hover:bg-black/10'
            }`}
          >
            <Terminal size={14} className={activeTab === 'shell' ? 'text-[#03ef62]' : ''} />
            <span>IPython Shell</span>
          </button>

          <button
            onClick={() => onSelectTab('plots')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md whitespace-nowrap ${
              activeTab === 'plots'
                ? 'bg-[#05192d] text-[#e6edf3] border-t-2 border-t-[#03ef62] border-x border-[#1d3952]'
                : 'text-[#93a3b4] hover:text-white hover:bg-black/10'
            }`}
          >
            <BarChart3 size={14} className={activeTab === 'plots' ? 'text-[#03ef62]' : ''} />
            <span>Plots</span>
            {plots.length > 0 && (
              <span className="px-1.5 rounded-full bg-[#03ef62] text-[#05192d] text-[10px] font-bold">
                {plots.length}
              </span>
            )}
          </button>

          {gradingResult && (
            <button
              onClick={() => onSelectTab('feedback')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-t-md whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'bg-[#05192d] text-[#e6edf3] border-t-2 border-t-[#03ef62] border-x border-[#1d3952]'
                  : 'text-[#93a3b4] hover:text-white hover:bg-black/10'
              }`}
            >
              {gradingResult.passed ? (
                <CheckCircle2 size={14} className="text-[#03ef62]" />
              ) : (
                <AlertOctagon size={14} className="text-[#ff6b6b]" />
              )}
              <span>Feedback</span>
            </button>
          )}
        </div>

        {activeTab === 'shell' && (
          <button
            onClick={onClearConsole}
            className="p-1 text-[#93a3b4] hover:text-white hover:bg-[#1d3952] rounded transition-colors"
            title="Clear console"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'shell' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 p-3 sm:p-4 font-mono text-xs overflow-y-auto custom-scrollbar space-y-2">
              <div className="text-[#6b8096] mb-3 pb-2 border-b border-[#1d3952]/60">
                Python interactive environment initialized. Type expressions or run code.
              </div>
              {outputs.length === 0 ? (
                <div className="text-[#5b6b7b] italic py-2">No output yet. Click Run Code or enter commands below.</div>
              ) : (
                outputs.map((out) => {
                  if (out.type === 'prompt') {
                    return (
                      <div key={out.id} className="flex items-start gap-2 text-[#03ef62]">
                        <span className="select-none font-bold">In [&gt;]:</span>
                        <span className="text-[#e6edf3] font-semibold">{out.text}</span>
                      </div>
                    );
                  }
                  if (out.type === 'error' || out.type === 'stderr') {
                    return (
                      <div key={out.id} className="bg-[#2a1215] border-l-2 border-[#ff6b6b] p-2.5 rounded-r text-[#ff8787] whitespace-pre-wrap leading-relaxed my-1">
                        {out.text}
                      </div>
                    );
                  }
                  if (out.type === 'success') {
                    return (
                      <div key={out.id} className="bg-[#0b3323] border-l-2 border-[#03ef62] p-2.5 rounded-r text-[#03ef62] whitespace-pre-wrap leading-relaxed my-1">
                        {out.text}
                      </div>
                    );
                  }
                  return (
                    <div key={out.id} className="text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
                      {out.text}
                    </div>
                  );
                })
              )}
              <div ref={consoleEndRef} />
            </div>

            <form onSubmit={handleReplSubmit} className="h-10 min-h-[40px] px-3 bg-[#0b2338] border-t border-[#1d3952] flex items-center gap-2">
              <span className="text-[#03ef62] font-mono text-xs font-bold select-none">&gt;&gt;&gt;</span>
              <input
                type="text"
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type Python and hit Enter..."
                className="flex-1 bg-transparent border-none text-xs font-mono text-[#e6edf3] focus:outline-none placeholder-[#5b6b7b]"
              />
              <button type="submit" disabled={!replInput.trim()} className="p-1 text-[#93a3b4] hover:text-[#03ef62] disabled:opacity-30">
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'plots' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
            {plots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#5b6b7b]">
                <BarChart3 size={40} className="mb-3 text-[#1d3952]" />
                <h4 className="font-bold text-sm text-[#93a3b4]">No plots generated yet</h4>
                <p className="text-xs max-w-sm mt-1">
                  Execute code containing <code className="text-[#03ef62]">plt.show()</code> to view figures.
                </p>
              </div>
            ) : (
              plots.map((plot, idx) => (
                <div key={plot.id} className="bg-white rounded-xl overflow-hidden border border-[#e2e8ee] shadow-lg max-w-2xl mx-auto">
                  <div className="p-4 bg-[#0b2338] flex items-center justify-center min-h-[180px]">
                    {plot.svg ? (
                      <div className="w-full" dangerouslySetInnerHTML={{ __html: plot.svg }} />
                    ) : plot.pngUrl ? (
                      <img src={plot.pngUrl} alt={plot.title} className="max-h-[300px] object-contain rounded" />
                    ) : null}
                  </div>
                  <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8ee] flex items-center justify-between">
                    <h5 className="font-bold text-xs text-[#05192d]">Figure {idx + 1}: {plot.title}</h5>
                    {plot.svg && (
                      <button
                        onClick={() => downloadSvg(plot.svg!, `figure-${idx + 1}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-[#e2e8ee] text-[#05192d] text-xs font-semibold border border-[#d0dbe5]"
                      >
                        <Download size={13} />
                        Download PNG
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'feedback' && gradingResult && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar flex items-center justify-center">
            {gradingResult.passed ? (
              <div className="bg-[#0b3323] border border-[#03ef62]/40 rounded-xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#03ef62]/20 border border-[#03ef62] flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-[#03ef62]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-white">Great work! Lesson complete.</h4>
                      <p className="text-xs text-[#03ef62]">All checks passed.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#03ef62] text-[#05192d] text-xs font-bold font-mono self-start">
                    <Sparkles size={14} />
                    <span>+{gradingResult.xpEarned} XP</span>
                  </div>
                </div>
                <p className="text-xs text-[#e6edf3] leading-relaxed bg-[#05192d]/50 p-3 rounded-lg border border-[#03ef62]/20 whitespace-pre-wrap">
                  {gradingResult.message}
                </p>
                <div className="flex justify-end gap-2">
                  {onShare && (
                    <button
                      onClick={onShare}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#03ef62]/50 text-[#03ef62] font-bold text-xs hover:bg-[#03ef62]/10"
                    >
                      <Share2 size={15} />
                      <span>Share</span>
                    </button>
                  )}
                  <button
                    onClick={onNextLesson}
                    disabled={isNextDisabled}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#03ef62] hover:bg-[#02c852] disabled:opacity-40 text-[#05192d] font-bold text-xs"
                  >
                    <span>Next Exercise</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#2a1215] border border-[#ff6b6b]/40 rounded-xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff6b6b]/20 border border-[#ff6b6b] flex items-center justify-center">
                    <AlertOctagon size={24} className="text-[#ff6b6b]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">Incorrect submission</h4>
                    <p className="text-xs text-[#ff8787]">{gradingResult.message}</p>
                  </div>
                </div>
                {gradingResult.errorDetail && (
                  <div className="bg-[#05192d] border border-[#ff6b6b]/30 p-3 rounded-lg font-mono text-xs text-[#ff8787] whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar">
                    {gradingResult.errorDetail}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => onSelectTab('shell')}
                    className="px-4 py-2 rounded-lg bg-[#0b2338] hover:bg-[#15324d] text-white text-xs font-semibold border border-[#1d3952]"
                  >
                    Back to Console
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
