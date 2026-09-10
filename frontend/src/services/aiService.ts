import { API_BASE_URL } from '../config';
import { getLocalHeaders } from './profileService';

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

export type TutorStyleId = 'solveit' | 'socratic' | 'direct' | 'blooms';

/**
 * Sends the accumulated conversation to SocratiQ.
 *
 * @param messages Ordered prior turns (oldest first) WITHOUT the canned greeting.
 *   The server owns the system prompt and trims/bounds the history itself.
 * @param context Stable per-session exercise context (lesson + current code).
 *   Never includes test.py / solution content.
 * @param tutorStyle Optional explicit style override for this request. When
 *   omitted the server uses the learner's LEARNING.md profile as the source of
 *   truth. The in-app control only sends this after persisting the choice to
 *   the profile via `emitLearnerEvent`.
 */
export const discussImplementation = async (
    messages: ChatTurn[],
    context?: string,
    tutorStyle?: TutorStyleId,
) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getLocalHeaders(),
    };

    const response = await fetch(`${API_BASE_URL}/ai/discuss`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            messages,
            context,
            tutor_style: tutorStyle,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to discuss implementation');
    }

    return response.json();
};

export interface BreakdownSubStep {
    step_number: number;
    title: string;
    toy_data: string;
    target: string;
    inspect_prompt: string;
}

export interface BreakdownResponse {
    lesson_title: string;
    intro: string;
    sub_steps: BreakdownSubStep[];
}

export const requestBreakdown = async (
    context: string,
    courseSlug?: string,
    lessonSlug?: string,
): Promise<BreakdownResponse> => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getLocalHeaders(),
    };

    const response = await fetch(`${API_BASE_URL}/ai/breakdown`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            context,
            course_slug: courseSlug,
            lesson_slug: lessonSlug,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to generate lesson breakdown' }));
        throw new Error(errorData.detail || 'Failed to generate lesson breakdown');
    }

    return response.json();
};

export interface AIProviderInfo {
    id: string;
    name: string;
    needs_key: boolean;
    default_model: string;
    default_base: string | null;
    docs_url: string;
    blurb: string;
    group: 'free' | 'key' | string;
    suggested_models?: string[];
}

export interface AIStatus {
    configured: boolean;
    has_key: boolean;
    provider?: string;
    model: string;
    api_base?: string | null;
    providers?: AIProviderInfo[];
}

export interface ConfigureKeyResult {
    success: boolean;
    message: string;
    saved_to_file: boolean;
    provider?: string;
    model?: string;
}

export interface ConfigureAiRequest {
    provider: string;
    api_key?: string;
    model?: string;
    api_base?: string;
    test_connection?: boolean;
}

export const getAiStatus = async (): Promise<AIStatus> => {
    const response = await fetch(`${API_BASE_URL}/ai/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch AI status');
    }
    return response.json();
};

export const configureAiKey = async (
    body: ConfigureAiRequest | string,
): Promise<ConfigureKeyResult> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const payload =
        typeof body === 'string'
            ? { provider: 'gemini', api_key: body }
            : {
                  provider: body.provider,
                  api_key: body.api_key || '',
                  model: body.model || undefined,
                  api_base: body.api_base || undefined,
                  test_connection: body.test_connection,
              };

    const response = await fetch(`${API_BASE_URL}/ai/configure-key`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to configure AI key');
    }

    return response.json();
};

export const testAiConnection = async (
    body: ConfigureAiRequest,
): Promise<{ success: boolean; message: string; provider: string; model: string }> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/test-connection`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            provider: body.provider,
            api_key: body.api_key || '',
            model: body.model || undefined,
            api_base: body.api_base || undefined,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to connect to AI provider');
    }

    return response.json();
};

export interface ToolTraceItem {
    tool_name: string;
    status: string;
    input_summary: string;
    output_summary: string;
    details?: Record<string, unknown>;
}

export interface BuildCourseResult {
    slug: string;
    title: string;
    description?: string;
    narrative_arc?: string;
    lesson_count: number;
    grounded_in: string[];
    tool_traces?: ToolTraceItem[];
    solveit_compliance?: Record<string, boolean>;
}

export interface LessonVerificationStatus {
    order: number;
    title: string;
    status: string;
    solution_passes: boolean;
    starter_fails: boolean;
    detail?: string;
}

export interface ImportCourseResult extends BuildCourseResult {
    verified?: boolean;
    lesson_verifications?: LessonVerificationStatus[];
}

export interface CoursePreferences {
    preferred_modalities?: string[];
    exercise_format?: 'micro_steps' | 'macro_challenges' | 'guided_completion';
    explanation_length?: 'short' | 'thorough';
    tutor_style?: 'solveit' | 'socratic' | 'direct' | 'blooms';
    understanding_level?: 'beginner' | 'intermediate' | 'advanced';
    course_depth?: 'auto' | 'short' | 'standard' | 'deep';
}

export const buildLearningCourse = async (
    topic: string,
    referenceText?: string,
    coursePreferences?: CoursePreferences,
    outline?: string,
): Promise<BuildCourseResult> => {
    const resources = referenceText?.trim()
        ? [{ kind: 'pasted-notes', name: 'Learner-provided notes', text: referenceText.trim() }]
        : [];
    const response = await fetch(`${API_BASE_URL}/ai/learning-path/build`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getLocalHeaders(),
        },
        body: JSON.stringify({
            topic: topic.trim(),
            resources,
            course_preferences: coursePreferences,
            outline: outline?.trim() || '',
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Could not build the learning course');
    }
    return response.json();
};

export interface LessonPreview {
    order: number;
    original_order?: number;
    title: string;
    modality: string;
    objective: string;
    explanation?: string;
    toy_data: string;
    expected_result?: string;
    micro_task?: string;
    inspect_prompt?: string;
    curiosity_prompt?: string;
    sheet_cells?: Record<string, string | number | boolean>;
    success_cells?: Array<Record<string, unknown>>;
    drawing_prompt?: string;
    sheet_text?: string;
    target_text?: string;
    skills?: string[];
}

export interface CoursePlanPreviewResult {
    plan_id: string;
    slug: string;
    title: string;
    description?: string;
    narrative_arc?: string;
    lesson_count: number;
    suggested_lesson_count?: number;
    course_depth?: string;
    grounded_in: string[];
    tool_traces?: ToolTraceItem[];
    solveit_compliance?: Record<string, boolean>;
    lessons: LessonPreview[];
}

export interface ApproveLessonEdit {
    order: number;
    original_order?: number;
    title?: string;
    modality?: string;
    objective?: string;
    explanation?: string;
    toy_data?: string;
    expected_result?: string;
    micro_task?: string;
    inspect_prompt?: string;
    curiosity_prompt?: string;
    sheet_cells?: Record<string, string | number | boolean> | string;
    success_cells?: Array<Record<string, unknown>> | string;
    drawing_prompt?: string;
}

export interface ApproveCoursePayload {
    plan_id: string;
    title?: string;
    description?: string;
    lessons?: ApproveLessonEdit[];
}

export const planLearningCourse = async (
    topic: string,
    referenceText?: string,
    coursePreferences?: CoursePreferences,
    outline?: string,
): Promise<CoursePlanPreviewResult> => {
    const resources = referenceText?.trim()
        ? [{ kind: 'pasted-notes', name: 'Learner-provided notes', text: referenceText.trim() }]
        : [];
    const response = await fetch(`${API_BASE_URL}/ai/learning-path/plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getLocalHeaders(),
        },
        body: JSON.stringify({
            topic: topic.trim(),
            resources,
            course_preferences: coursePreferences,
            outline: outline?.trim() || '',
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Could not plan the learning course');
    }
    return response.json();
};

export const approveLearningCourse = async (
    payload: ApproveCoursePayload,
): Promise<BuildCourseResult> => {
    const response = await fetch(`${API_BASE_URL}/ai/learning-path/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getLocalHeaders(),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Could not materialize the approved course');
    }
    return response.json();
};

export interface CourseInstructionsResult {
    instructions: string;
    personalization?: {
        understanding_level: string;
        tutor_style: string;
        explanation_length: string;
    } | null;
}

/**
 * Dead-simple, no-LLM path: generate the copy-paste instruction prompt for a
 * topic. The learner pastes this into any free chat and pastes the reply back
 * into {@link importLearningCourse}.
 */
export const getCourseBuildInstructions = async (
    topic: string,
    referenceText?: string,
    coursePreferences?: CoursePreferences,
): Promise<CourseInstructionsResult> => {
    const resources = referenceText?.trim()
        ? [{ kind: 'pasted-notes', name: 'Learner-provided notes', text: referenceText.trim() }]
        : [];
    const response = await fetch(`${API_BASE_URL}/ai/learning-path/instructions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getLocalHeaders(),
        },
        body: JSON.stringify({
            topic: topic.trim(),
            resources,
            course_preferences: coursePreferences,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Could not generate the build instructions');
    }
    const data = await response.json();
    return {
        instructions: data.instructions as string,
        personalization: data.personalization ?? null,
    };
};

/** Import a chat model's pasted reply as a verified course. No AI key needed. */
export const importLearningCourse = async (
    topic: string,
    responseText: string,
    verify: boolean = true,
): Promise<ImportCourseResult> => {
    const response = await fetch(`${API_BASE_URL}/ai/learning-path/import`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getLocalHeaders(),
        },
        body: JSON.stringify({
            topic: topic.trim(),
            response_markdown: responseText,
            verify,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Could not import the course');
    }
    return response.json();
};
