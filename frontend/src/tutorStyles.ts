export type TutorStyleId = 'solveit' | 'socratic' | 'direct' | 'blooms';

export interface TutorStyleOption {
    id: TutorStyleId;
    label: string;
    emoji: string;
    tagline: string;
}

/**
 * Single source of truth for the SocratiQ tutor-style picker. The ids match the
 * `tutor_style` literals persisted to LEARNING.md (see learner_profile.py), so a
 * choice made here is stored in the profile and drives the server system prompt.
 * Includes Solveit alongside Socratic/Direct/Bloom's.
 */
export const TUTOR_STYLES: TutorStyleOption[] = [
    {
        id: 'solveit',
        label: 'Solveit',
        emoji: '🧩',
        tagline: 'Toy data, 1–3 line micro-steps, run & inspect, one question.',
    },
    {
        id: 'socratic',
        label: 'Socratic',
        emoji: '❓',
        tagline: 'Guiding questions that make you discover the answer.',
    },
    {
        id: 'direct',
        label: 'Direct',
        emoji: '🎯',
        tagline: 'Clear rule-first explanations with minimal preamble.',
    },
    {
        id: 'blooms',
        label: "Bloom's Taxonomy",
        emoji: '🧠',
        tagline: 'Climb from remember & understand up to evaluate & create.',
    },
];

export const TUTOR_STYLE_BY_ID: Record<TutorStyleId, TutorStyleOption> = Object.fromEntries(
    TUTOR_STYLES.map((style) => [style.id, style])
) as Record<TutorStyleId, TutorStyleOption>;

export function isTutorStyleId(value: string | null | undefined): value is TutorStyleId {
    return value === 'solveit' || value === 'socratic' || value === 'direct' || value === 'blooms';
}
