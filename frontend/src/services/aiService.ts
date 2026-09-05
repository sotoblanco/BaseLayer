import { API_BASE_URL } from '../config';

export const generateExercise = async (prompt: string, language: string = 'python') => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/generate/exercise`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, language }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate exercise');
    }

    return response.json();
};

export const discussImplementation = async (message: string, context?: string, understandingLevel: string = "Intermediate") => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Please sign in to use the tutor.');
    }
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    const response = await fetch(`${API_BASE_URL}/ai/discuss`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, context, understanding_level: understandingLevel }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to discuss implementation');
    }

    return response.json();
};

export interface AIStatus {
    configured: boolean;
    has_key: boolean;
    model: string;
}

export interface ConfigureKeyResult {
    success: boolean;
    message: string;
    saved_to_file: boolean;
}

export const getAiStatus = async (): Promise<AIStatus> => {
    const response = await fetch(`${API_BASE_URL}/ai/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch AI status');
    }
    return response.json();
};

export const configureAiKey = async (apiKey: string): Promise<ConfigureKeyResult> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/configure-key`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_key: apiKey }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to configure AI key');
    }

    return response.json();
};

