import { useState, useRef, useEffect } from 'react';
import { LogOut, User, ChevronDown, Info, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../config';
import { LearningProfileModal } from './LearningProfileModal';

interface UserMenuProps {
    variant?: 'dark' | 'light';
}

export function UserMenu({ variant = 'dark' }: UserMenuProps) {
    const { logout, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isLight = variant === 'light';

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
                className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${
                    isLight
                        ? 'text-[#5b6b7b] hover:text-[#05192d] hover:bg-[#f4f6f8]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Account"
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isLight ? 'bg-[#03ef62] text-[#05192d]' : 'bg-blue-600 text-white'
                }`}>
                    <User size={16} />
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
                    isLight ? 'bg-white border border-[#e2e8ee]' : 'bg-slate-900 border border-slate-800'
                }`}>
                    <div className={`p-3 border-b ${isLight ? 'border-[#e2e8ee]' : 'border-slate-800'}`}>
                        <p className={`text-sm font-medium ${isLight ? 'text-[#05192d]' : 'text-white'}`}>
                            {user?.username || 'My Account'}
                        </p>
                    </div>

                    <div className="p-1 space-y-0.5">
                        <button
                            onClick={() => {
                                setIsProfileOpen(true);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                                isLight
                                    ? 'text-[#05192d] hover:bg-[#f4f6f8]'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <BookOpen size={16} className="text-emerald-400" />
                            <span>Learning Profile</span>
                        </button>

                        <button
                            onClick={logout}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                                isLight
                                    ? 'text-red-500 hover:text-red-600 hover:bg-[#ffecec]'
                                    : 'text-red-400 hover:text-red-300 hover:bg-slate-800/50'
                            }`}
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>

                    <div className={`px-4 py-3 border-t flex items-center gap-2 text-xs ${
                        isLight
                            ? 'bg-[#f4f6f8] border-[#e2e8ee] text-[#93a3b4]'
                            : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}>
                        <Info size={14} />
                        <span>v{displayVersion}</span>
                    </div>
                </div>
            )}

            <LearningProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
}
