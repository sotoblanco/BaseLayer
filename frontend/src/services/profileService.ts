import { API_BASE_URL } from '../config';

export interface ProfileFrontMatter {
  username: string;
  updated_at: string;
  version: number;
  preferred_ui: 'classic' | 'light';
  tutor_style: 'solveit' | 'socratic' | 'direct' | 'blooms';
  understanding_level: 'beginner' | 'intermediate' | 'advanced';
  preferred_modalities: string[];
  pace: 'unhurried' | 'sprint' | 'mixed';
  explanation_length?: 'short' | 'thorough';
  exercise_format?: 'micro_steps' | 'macro_challenges';
}

export interface LearningProfileData {
  frontmatter: ProfileFrontMatter;
  snapshot: string;
  courses_taken: string[];
  courses_built: string[];
  signals: string[];
  customize_next: string[];
}

export interface LearningProfileResponse {
  markdown: string;
  parsed: LearningProfileData;
}

export const getLearningProfile = async (): Promise<LearningProfileResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please sign in to view your learning profile.');
  }

  const response = await fetch(`${API_BASE_URL}/me/learning-profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch learning profile');
  }

  return response.json();
};

export const updateLearningProfile = async (
  markdown: string
): Promise<LearningProfileResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please sign in to update your learning profile.');
  }

  const response = await fetch(`${API_BASE_URL}/me/learning-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ markdown }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update learning profile');
  }

  return response.json();
};

export const emitLearnerEvent = async (
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/me/learning-profile/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event_type: eventType, payload }),
    });
  } catch {
    // Non-blocking telemetry
  }
};

export interface LearnerQuestionnaire {
  intake_preference?: 'diagram' | 'table' | 'hands_on' | 'story';
  explanation_length?: 'short' | 'thorough';
  exercise_format?: 'micro_steps' | 'macro_challenges';
  hint_preference?: 'toy_example' | 'guiding_question' | 'direct_explanation';
  goal?: string;
  preferred_modalities?: string[];
  understanding_level?: 'beginner' | 'intermediate' | 'advanced';
  tutor_style?: 'solveit' | 'socratic' | 'direct' | 'blooms';
  pace?: 'unhurried' | 'sprint' | 'mixed';
  preferred_ui?: 'classic' | 'light';
  custom_notes?: string;
}

export const submitLearnerQuestionnaire = async (
  answers: LearnerQuestionnaire
): Promise<LearningProfileResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please sign in to customize your learning profile.');
  }

  const response = await fetch(`${API_BASE_URL}/me/learning-profile/questionnaire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(answers),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit questionnaire');
  }

  return response.json();
};

