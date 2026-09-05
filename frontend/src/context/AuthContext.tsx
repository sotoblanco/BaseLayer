import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from "jwt-decode";
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
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser({ username: decoded.sub, role: decoded.role });
                localStorage.setItem('token', token);
            } catch (e) {
                console.error("Invalid token", e);
                logout();
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, [token]);

    const login = (newToken: string) => {
        setToken(newToken);
    };

    const googleLogin = async (credential: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });
            if (response.ok) {
                const data = await response.json();
                login(data.access_token);
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Google Login failed');
            }
        } catch (err) {
            console.error("Google Login Error:", err);
            throw err;
        }
    };

    const localWelcome = async (name: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/local-welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Could not start' }));
            throw new Error(error.detail || 'Could not start');
        }
        const data = await response.json();
        login(data.access_token);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, googleLogin, localWelcome, logout, isAuthenticated: !!user }}>
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
