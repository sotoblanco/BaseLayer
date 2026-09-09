import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../config';

interface User {
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => void;
    googleLogin: (credential: string) => Promise<void>;
    localWelcome: (name: string) => Promise<void>;
    setLearner: (name: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [savedName, setSavedName] = useState<string>(() => {
        return localStorage.getItem('baselayer_learner_name') || 'Local Learner';
    });
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('token') || 'local-session-token';
    });

    const user: User = {
        username: savedName,
        role: 'admin',
    };

    const login = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const setLearner = async (name: string) => {
        const cleanName = name.trim() || 'Local Learner';
        localStorage.setItem('baselayer_learner_name', cleanName);
        setSavedName(cleanName);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/active-learner`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanName }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.username) {
                    setSavedName(data.username);
                    localStorage.setItem('baselayer_learner_name', data.username);
                }
            }
        } catch {
            // Local fallback
        }
    };

    const localWelcome = async (name: string) => {
        await setLearner(name);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/local-welcome`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    login(data.access_token);
                }
            }
        } catch {
            // Non-blocking in local mode
        }
    };

    const googleLogin = async () => {
        // No-op in local-first setup
    };

    const logout = () => {
        setSavedName('Local Learner');
        localStorage.setItem('baselayer_learner_name', 'Local Learner');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                googleLogin,
                localWelcome,
                setLearner,
                logout,
                isAuthenticated: true,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
