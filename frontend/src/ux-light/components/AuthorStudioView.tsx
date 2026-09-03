import { useState } from 'react';
import { Download, RotateCcw, Check, X, Columns, Eye, Edit, Code, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Editor from '@monaco-editor/react';

interface AuthorStudioViewProps {
  initialMarkdown: string;
  onApply: (updatedMarkdown: string) => void;
  onClose: () => void;
}

export function AuthorStudioView({ initialMarkdown, onApply, onClose }: AuthorStudioViewProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [applied, setApplied] = useState(false);

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exercise.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05192d] text-[#e6edf3] flex flex-col">
      <header className="h-[56px] min-h-[56px] px-3 sm:px-6 bg-[#0b2338] border-b border-[#1d3952] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#03ef62] flex items-center justify-center text-[#05192d] shrink-0">
            <Code size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm text-white truncate">Author Studio</h2>
            <p className="text-xs text-[#93a3b4] hidden sm:block">Markdown course designer</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center bg-[#05192d] p-1 rounded-lg border border-[#1d3952]">
          {([
            ['edit', Edit, 'Editor'],
            ['split', Columns, 'Split'],
            ['preview', Eye, 'Preview'],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
                viewMode === mode ? 'bg-[#1d3952] text-[#03ef62]' : 'text-[#93a3b4] hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {applied && (
            <span className="text-xs text-[#03ef62] font-bold flex items-center gap-1">
              <Sparkles size={14} /> Applied
            </span>
          )}
          <button onClick={handleExport} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#05192d] text-white text-xs font-semibold border border-[#1d3952]">
            <Download size={14} /> Export .md
          </button>
          <button onClick={() => setMarkdown(initialMarkdown)} className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[#05192d] text-[#93a3b4] text-xs font-semibold border border-[#1d3952]">
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => {
              onApply(markdown);
              setApplied(true);
              setTimeout(() => setApplied(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#03ef62] hover:bg-[#02c852] text-[#05192d] font-bold text-xs"
          >
            <Check size={15} />
            <span className="hidden sm:inline">Apply</span>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#93a3b4] hover:text-white hover:bg-[#1d3952]">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden flex-col sm:flex-row">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'sm:w-1/2 sm:border-r border-[#1d3952]' : 'w-full'} h-1/2 sm:h-full flex flex-col`}>
            <div className="h-8 px-4 bg-[#0b2338] border-b border-[#1d3952] flex items-center text-xs text-[#93a3b4] font-mono">exercise.md</div>
            <div className="flex-1">
              <Editor
                height="100%"
                language="markdown"
                value={markdown}
                onChange={(val) => setMarkdown(val || '')}
                theme="vs-dark"
                options={{ fontSize: 13.5, fontFamily: "'JetBrains Mono', Menlo, monospace", minimap: { enabled: false }, wordWrap: 'on', padding: { top: 16 }, scrollBeyondLastLine: false }}
              />
            </div>
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'sm:w-1/2' : 'w-full'} h-1/2 sm:h-full flex flex-col bg-white text-[#1a2733] overflow-y-auto custom-scrollbar`}>
            <div className="h-8 px-4 bg-[#f4f6f8] border-b border-[#e2e8ee] flex items-center text-xs text-[#5b6b7b] font-mono sticky top-0">Live Preview</div>
            <div className="p-6 sm:p-8 prose prose-slate max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
