import { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Edit,
  Eye,
  Check,
  RotateCcw,
  Loader,
  AlertCircle,
  Activity,
  Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
import {
  getLearningProfile,
  updateLearningProfile,
  type LearningProfileData,
} from '../services/profileService';

interface LearningProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LearningProfileModal({ isOpen, onClose }: LearningProfileModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [initialMarkdown, setInitialMarkdown] = useState('');
  const [parsed, setParsed] = useState<LearningProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLearningProfile();
      setMarkdown(data.markdown);
      setInitialMarkdown(data.markdown);
      setParsed(data.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      const data = await updateLearningProfile(markdown);
      setMarkdown(data.markdown);
      setInitialMarkdown(data.markdown);
      setParsed(data.parsed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LEARNING.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Living Learner Profile</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  LEARNING.md
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personal learning style, recorded signals, and active preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === 'preview'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={13} />
                <span>Rendered</span>
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === 'edit'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit size={13} />
                <span>Markdown</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs">Loading LEARNING.md...</span>
            </div>
          ) : viewMode === 'edit' ? (
            <div className="h-[420px] rounded-xl overflow-hidden border border-slate-800">
              <Editor
                height="100%"
                language="markdown"
                value={markdown}
                onChange={(val) => setMarkdown(val || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  padding: { top: 12 },
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Meta Cards */}
              {parsed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Tutor Style
                    </span>
                    <p className="font-bold text-white capitalize">
                      {parsed.frontmatter.tutor_style}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Level
                    </span>
                    <p className="font-bold text-emerald-400 capitalize">
                      {parsed.frontmatter.understanding_level}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Preferred Pacing
                    </span>
                    <p className="font-bold text-white capitalize">{parsed.frontmatter.pace}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                      Modalities
                    </span>
                    <p className="font-bold text-blue-400 capitalize truncate">
                      {parsed.frontmatter.preferred_modalities.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Signals & Struggles Activity */}
              {parsed && parsed.signals.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Activity size={14} className="text-emerald-400" />
                    <span>Recorded Learning Signals & Struggles</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {parsed.signals.map((sig, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{sig.replace(/^- /, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rendered Markdown Body */}
              <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-6 prose prose-invert max-w-none text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {saveSuccess && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> Saved to LEARNING.md
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              title="Download local LEARNING.md file"
            >
              <Download size={13} />
              <span>Download .md</span>
            </button>

            {viewMode === 'edit' && (
              <button
                onClick={() => setMarkdown(initialMarkdown)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white"
                title="Revert edits"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {viewMode === 'edit' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save LEARNING.md</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
