import { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../config';

export function UserMenu() {
    const { logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Default to 'dev' if version isn't injected by CI/CD
    const displayVersion = APP_VERSION || "development";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <User size={16} />
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-800">
                        <p className="text-sm font-medium text-white">My Account</p>
                    </div>

                    <div className="p-1">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>

                    <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                        <Info size={14} />
                        <span>v{displayVersion}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
