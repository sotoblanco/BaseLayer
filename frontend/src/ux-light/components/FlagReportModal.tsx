import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Flag, Check } from 'lucide-react';
import type { FileLesson } from '../types';

interface FlagReportModalProps {
  lesson: FileLesson;
  onClose: () => void;
}

export function FlagReportModal({ lesson, onClose }: FlagReportModalProps) {
  const [category, setCategory] = useState('code-issue');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#05192d] border border-[#1d3952] rounded-2xl max-w-lg w-full text-[#e6edf3] shadow-2xl overflow-hidden">
        <div className="p-5 bg-[#0b2338] border-b border-[#1d3952] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/30">
              <Flag size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Report Problem</h3>
              <p className="text-xs text-[#93a3b4] truncate max-w-xs">{lesson.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#93a3b4] hover:text-white hover:bg-[#1d3952]">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#03ef62]/20 border border-[#03ef62] text-[#03ef62] flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h4 className="font-bold text-base text-white">Thanks for the report</h4>
            <p className="text-xs text-[#93a3b4]">We'll review this lesson shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#93a3b4] mb-2">What type of issue?</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b2338] border border-[#1d3952] rounded-xl px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#03ef62]"
              >
                <option value="code-issue">Test or grading issue</option>
                <option value="typo">Typo or confusing instructions</option>
                <option value="broken-solution">Provided solution does not pass</option>
                <option value="environment">Terminal / execution error</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#93a3b4] mb-2">Details (optional)</label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What went wrong?"
                className="w-full bg-[#0b2338] border border-[#1d3952] rounded-xl p-3 text-xs text-[#e6edf3] focus:outline-none focus:border-[#03ef62] placeholder-[#5b6b7b]"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#93a3b4] hover:text-white">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-bold text-xs">
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
