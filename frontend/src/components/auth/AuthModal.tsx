import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X, Mail, Lock, User, Terminal, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, googleLogin } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/signup';
            
            // Standard login expects OAuth2 form data (username, password)
            // Even when using email, its sent as the 'username' field in the form data
            const formData = new URLSearchParams();
            if (isLogin) {
              formData.append('username', email); // Use email or username here
              formData.append('password', password);
            }

            const payload = isLogin 
              ? formData 
              : JSON.stringify({ email, password, username, role: 'student' });

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: isLogin 
                  ? { 'Content-Type': 'application/x-www-form-urlencoded' } 
                  : { 'Content-Type': 'application/json' },
                body: payload,
            });

            if (response.ok) {
                const data = await response.json();
                if (isLogin) {
                  login(data.access_token);
                  onClose();
                } else {
                  // After signup, switch to login
                  setIsLogin(true);
                  setError("Success! Now please log in.");
                }
            } else {
                const data = await response.json();
                setError(data.detail || 'Authentication failed');
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="pt-8 pb-4 text-center">
                    <div className="inline-flex p-3 mb-4 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <Terminal size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {isLogin ? 'Welcome Back!' : 'Start Learning Today'}
                    </h2>
                    <p className="text-slate-400 mt-1 px-8">
                        {isLogin 
                          ? 'Sign in to access your courses and save progress.' 
                          : 'Create an account to track your path and access exercises.'}
                    </p>
                </div>

                {/* Content */}
                <div className="px-8 pb-8">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {/* Google Login */}
                    <div className="mb-6 flex justify-center">
                        <GoogleLogin
                            theme="filled_black"
                            width="100%"
                            text="continue_with"
                            onSuccess={async (credentialResponse) => {
                                if (credentialResponse.credential) {
                                    try {
                                        await googleLogin(credentialResponse.credential);
                                        onClose();
                                    } catch (err: any) {
                                        setError(err.message);
                                    }
                                }
                            }}
                            onError={() => setError('Google Login Failed')}
                        />
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-900 px-2 text-slate-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input 
                                        type="text" 
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-medium"
                                        placeholder="johndoe"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-medium"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] ${isLoading ? 'opacity-50' : ''}`}
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Guest & Toggle */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                        >
                            Continue as Guest
                        </button>
                        <p className="text-sm text-slate-500">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button 
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-blue-400 hover:text-blue-300 font-bold ml-1 transition-colors underline decoration-blue-400/30 underline-offset-4"
                            >
                                {isLogin ? 'Register' : 'Login'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
