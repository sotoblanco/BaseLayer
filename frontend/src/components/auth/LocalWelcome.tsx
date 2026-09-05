import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LocalWelcomeProps {
  isOpen: boolean;
  onClose: () => void;
  onForbidden?: () => void;
}

export function LocalWelcome({ isOpen, onClose, onForbidden }: LocalWelcomeProps) {
  const { localWelcome } = useAuth();
  const [name, setName] = useState(() => localStorage.getItem('baselayer_learner_name') || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await localWelcome(name);
      localStorage.setItem('baselayer_learner_name', name.trim());
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not start';
      if (message.toLowerCase().includes('disabled')) {
        onForbidden?.();
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3">Local studio</p>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
        <p className="text-slate-400 text-sm mb-6">
          What should we call you? We will use this to personalize hints and remember your progress on this machine.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            required
            minLength={1}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your first name"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
          >
            {isLoading ? 'Starting…' : 'Start learning'}
          </button>
        </form>
      </div>
    </div>
  );
}
