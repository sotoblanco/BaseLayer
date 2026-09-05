import { useState } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import type { FileLesson } from '../types';

interface EmbedModalProps {
  lesson: FileLesson;
  currentCode: string;
  solutionCode?: string;
  onClose: () => void;
}

export function EmbedModal({ lesson, currentCode, solutionCode = '', onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false);
  const [embedType, setEmbedType] = useState<'standard' | 'mini'>('standard');

  const snippet = `<!-- UX Light embed snippet -->
<div data-ux-light-exercise data-lang="${lesson.language || 'python'}" data-height="${embedType === 'standard' ? '450' : '300'}">
  <code data-type="sample-code">
${currentCode || lesson.initial_code}
  </code>
  <code data-type="solution">
${solutionCode}
  </code>
  <code data-type="sct">
${lesson.test_code || ''}
  </code>
</div>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#05192d] border border-[#1d3952] rounded-2xl max-w-2xl w-full text-[#e6edf3] shadow-2xl overflow-hidden">
        <div className="p-5 bg-[#0b2338] border-b border-[#1d3952] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#03ef62]/10 text-[#03ef62] border border-[#03ef62]/30">
              <Code2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Embed UX Light</h3>
              <p className="text-xs text-[#93a3b4]">Copy an HTML snippet for this lesson</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#93a3b4] hover:text-white hover:bg-[#1d3952]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#93a3b4]">HTML embed code</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setEmbedType('standard')} className={`px-2.5 py-1 rounded ${embedType === 'standard' ? 'bg-[#1d3952] text-[#03ef62] font-semibold' : 'text-[#93a3b4]'}`}>
                Standard (450px)
              </button>
              <button onClick={() => setEmbedType('mini')} className={`px-2.5 py-1 rounded ${embedType === 'mini' ? 'bg-[#1d3952] text-[#03ef62] font-semibold' : 'text-[#93a3b4]'}`}>
                Compact (300px)
              </button>
            </div>
          </div>
          <pre className="bg-[#0b2338] border border-[#1d3952] rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-64 custom-scrollbar whitespace-pre">{snippet}</pre>
        </div>

        <div className="p-4 bg-[#0b2338] border-t border-[#1d3952] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#93a3b4] hover:text-white">
            Cancel
          </button>
          <button onClick={handleCopy} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#03ef62] hover:bg-[#02c852] text-[#05192d] font-bold text-xs">
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Snippet</>}
          </button>
        </div>
      </div>
    </div>
  );
}
