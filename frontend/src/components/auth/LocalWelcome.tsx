import { useState, useEffect } from 'react';
import {
  User,
  Key,
  Layers,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  X,
  Code2,
  Table,
  PenTool,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAiStatus, configureAiKey, type AIStatus } from '../../services/aiService';

type ModalTab = 'profile' | 'ai' | 'modalities' | 'customization';

interface LocalWelcomeProps {
  isOpen: boolean;
  onClose: () => void;
  onForbidden?: () => void;
  initialTab?: ModalTab;
}

export function LocalWelcome({
  isOpen,
  onClose,
  onForbidden,
  initialTab,
}: LocalWelcomeProps) {
  const { localWelcome, user, isAuthenticated } = useAuth();
  const [name, setName] = useState(
    () => localStorage.getItem('baselayer_learner_name') || user?.username || ''
  );
  const [activeTab, setActiveTab] = useState<ModalTab>(() => {
    if (initialTab) return initialTab;
    const savedName = localStorage.getItem('baselayer_learner_name');
    return savedName ? 'modalities' : 'profile';
  });

  const [nameError, setNameError] = useState('');
  const [isNameSaving, setIsNameSaving] = useState(false);

  // AI Key state
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loadingAiStatus, setLoadingAiStatus] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadAiStatus();
    }
  }, [isOpen, initialTab]);

  const loadAiStatus = async () => {
    setLoadingAiStatus(true);
    try {
      const status = await getAiStatus();
      setAiStatus(status);
      if (!status.configured) {
        setShowKeyInput(true);
      }
    } catch (err) {
      console.error('Failed to load AI status', err);
    } finally {
      setLoadingAiStatus(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    setNameError('');
    setIsNameSaving(true);
    try {
      await localWelcome(name.trim());
      localStorage.setItem('baselayer_learner_name', name.trim());
      setActiveTab('ai');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not set name';
      if (message.toLowerCase().includes('disabled')) {
        onForbidden?.();
        return;
      }
      setNameError(message);
    } finally {
      setIsNameSaving(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    setKeyFeedback(null);
    try {
      const res = await configureAiKey(apiKeyInput.trim());
      setKeyFeedback({
        message: res.saved_to_file
          ? 'API key configured and saved to .env successfully.'
          : 'API key activated in runtime memory.',
        isError: false,
      });
      setApiKeyInput('');
      setShowKeyInput(false);
      await loadAiStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to configure API key';
      setKeyFeedback({ message, isError: true });
    } finally {
      setSavingKey(false);
    }
  };

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText('GEMINI_API_KEY=your_gemini_api_key_here');
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const tabs: { id: ModalTab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Learner', icon: User },
    { id: 'ai', label: 'AI Features', icon: Key },
    { id: 'modalities', label: 'Learning Modalities', icon: Layers },
    { id: 'customization', label: 'Custom Learning', icon: FolderPlus },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                BaseLayer Local Studio
              </h2>
              <p className="text-xs text-slate-400">
                Configure your local workspace and explore learning options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/50 flex gap-2 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.id === 'ai' && aiStatus && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      aiStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5">
                <h3 className="text-base font-semibold text-white mb-1">
                  Local Learner Profile
                </h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                  Enter your name or handle. BaseLayer runs locally without requiring
                  external authentication; your name is used to personalize hints,
                  code reviews, and remember your progress on this device.
                </p>

                {nameError && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{nameError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveName} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your First Name or Handle
                    </label>
                    <input
                      type="text"
                      required
                      minLength={1}
                      maxLength={40}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      {isAuthenticated
                        ? 'Profile initialized for this local session.'
                        : 'Stored locally in your browser.'}
                    </span>
                    <button
                      type="submit"
                      disabled={isNameSaving || !name.trim()}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>{isNameSaving ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Local Privacy Note</p>
                <p>
                  Your code runs directly inside your local environment or isolated
                  containers. No course progress is sent to third-party databases.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AI Key Setup */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  AI Key Setup & Features Activation
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  BaseLayer uses Google Gemini to deliver intelligent interactive features.
                  Configure your API key to unlock the complete studio experience.
                </p>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  aiStatus?.configured
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}
              >
                {aiStatus?.configured ? (
                  <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-amber-400 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {aiStatus?.configured
                        ? 'AI Features Active'
                        : 'Gemini API Key Required for AI Features'}
                    </p>
                    <button
                      onClick={loadAiStatus}
                      disabled={loadingAiStatus}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      title="Refresh status"
                    >
                      <RefreshCw size={12} className={loadingAiStatus ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {aiStatus?.configured
                      ? 'The AI service is configured and ready. SocratiQ tutoring, multimodal sketch grading, and dynamic exercise creation are available.'
                      : 'Without an API key, coding execution and spreadsheet exercises work normally, but AI chat tutoring and visual drawing grading will be paused.'}
                  </p>
                  {aiStatus?.configured && !showKeyInput && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowKeyInput(true)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                      >
                        Change or update API key
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Alert */}
              {keyFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    keyFeedback.isError
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {keyFeedback.isError ? (
                    <AlertCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>{keyFeedback.message}</span>
                </div>
              )}

              {/* Key Input Form */}
              {(showKeyInput || !aiStatus?.configured) && (
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Set Key via Web Studio
                  </h4>
                  <p className="text-xs text-slate-400">
                    Paste your Gemini API key below. When running locally, BaseLayer
                    automatically updates your local <code>.env</code> file.
                  </p>

                  <form onSubmit={handleSaveKey} className="space-y-3">
                    <input
                      type="password"
                      autoComplete="off"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste your GEMINI_API_KEY here"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Get a free key from Google AI Studio</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        type="submit"
                        disabled={savingKey || !apiKeyInput.trim()}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Key size={13} />
                        <span>{savingKey ? 'Saving...' : 'Save Key to .env'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Manual .env Instructions */}
              <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Or Configure Directly in .env File
                  </h4>
                  <button
                    onClick={copyEnvSnippet}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSnippet ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can edit the <code>.env</code> file in the repository root directly:
                </p>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                  GEMINI_API_KEY=your_gemini_api_key_here
                </pre>
                <p className="text-xs text-slate-500">
                  After modifying the file manually, restart <code>./dev.sh</code> to
                  reload the environment.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Learning Modalities */}
          {activeTab === 'modalities' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  How You Learn: Three Core Modalities
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  BaseLayer combines practical programming, tactile mathematical intuition,
                  and visual verification into one cohesive learning environment.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Modality 1 */}
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="p-2 w-fit bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                      <Code2 size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-white">Coding Studio</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Write real Python or Rust code in a full Monaco editor. Run tests
                      instantly with Docker sandboxing.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-blue-400" />
                      <span>Isolated Docker execution</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-blue-400" />
                      <span>Automated unit assertions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-blue-400" />
                      <span>Reference solution reveals</span>
                    </div>
                  </div>
                </div>

                {/* Modality 2 */}
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="p-2 w-fit bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                      <Table size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-white">Spreadsheet Workspace</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Build physical intuition for tensors and matrices using embedded
                      Google Sheets formulas before coding.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Matrix math (MMULT, broadcasting)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Direct 2D/3D visual layout</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>Interactive formula calculations</span>
                    </div>
                  </div>
                </div>

                {/* Modality 3 */}
                <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="p-2 w-fit bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                      <PenTool size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-white">Hand Drawing Verification</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Draw data flows, weights, and layer connections directly over diagrams.
                      Graded visually by Gemini.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-rose-400" />
                      <span>Integrated drawing canvas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-rose-400" />
                      <span>Multimodal AI visual grading</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 size={12} className="text-rose-400" />
                      <span>Focus on conceptual intent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SocratiQ Callout */}
              <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-4 flex items-center gap-4">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    SocratiQ AI Tutor
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                    Available in the right-hand panel of coding exercises. Ask for guidance,
                    syntax explanations, or debugging tips. SocratiQ guides you with
                    questions rather than giving away code answers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom Learning */}
          {activeTab === 'customization' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Customize & Author Your Own Learning
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  BaseLayer is not limited to built-in courses. The file-based architecture
                  lets you design custom curricula, exercises, and study notes by simply
                  creating folders on your disk.
                </p>
              </div>

              {/* Architecture Explanation */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  File-Based Course Structure
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add a new folder inside <code>courses/</code>. The backend dynamically
                  discovers your exercises without any database migration:
                </p>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <p className="text-slate-500"># Inside the courses/ directory:</p>
                  <p className="text-emerald-400">courses/your-topic/</p>
                  <p className="text-slate-300">├── README.md &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Course overview</p>
                  <p className="text-emerald-400">└── lesson-01-introduction/</p>
                  <p className="text-slate-300">&nbsp;&nbsp;&nbsp;&nbsp;├── README.md &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Lesson instructions</p>
                  <p className="text-slate-300">&nbsp;&nbsp;&nbsp;&nbsp;├── main.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Starter code in editor</p>
                  <p className="text-slate-300">&nbsp;&nbsp;&nbsp;&nbsp;├── test.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Automated tests</p>
                  <p className="text-slate-300">&nbsp;&nbsp;&nbsp;&nbsp;└── solution.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# (Optional) Reference solution</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 pt-1">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                    <p className="font-semibold text-slate-200">For Rust Exercises</p>
                    <p>
                      Use <code>main.rs</code>, <code>test.rs</code>, and{' '}
                      <code>solution.rs</code>. BaseLayer automatically detects Rust syntax.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                    <p className="font-semibold text-slate-200">For Google Sheets Exercises</p>
                    <p>
                      Include <code>metadata.json</code> containing{' '}
                      <code>&quot;exercise_type&quot;: &quot;spreadsheet&quot;</code> and your Sheet ID.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Live Reloading</p>
                <p>
                  As soon as you save or edit files in <code>courses/</code>, refreshing the
                  courses page or exercise view immediately reflects your changes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div>
            {currentTabIndex > 0 ? (
              <button
                onClick={() => setActiveTab(tabs[currentTabIndex - 1].id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Previous</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500">Local Studio Mode</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {currentTabIndex < tabs.length - 1 ? (
              <button
                onClick={() => setActiveTab(tabs[currentTabIndex + 1].id)}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
              >
                <span>Next</span>
                <ArrowRight size={13} />
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

