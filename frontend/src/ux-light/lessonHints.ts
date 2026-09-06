import type { FileLesson } from './types';

const MAX_HINTS = 3;
const MAX_HINT_LENGTH = 200;

const HEADING_KEYWORDS = [
  'toy data',
  'toy',
  'micro-step',
  'micro task',
  'your task',
  'task',
  'inspect',
  'expected outcome',
  'expected result',
  'predict',
  'hint',
  'tip',
];

interface SectionMatch {
  keyword: string;
  content: string;
}

function firstContentAfterHeading(lines: string[], start: number): string {
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) break;
    if (line.startsWith('```') || line.startsWith('---')) continue;
    if (line.startsWith('>')) return line.replace(/^>\s?/, '').trim();
    return line.replace(/^[-*+]\s+/, '').trim();
  }
  return '';
}

function headingSections(markdown: string): SectionMatch[] {
  const lines = markdown.split('\n');
  const matches: SectionMatch[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^#{1,4}\s+(.*)/);
    if (!heading) continue;
    const title = heading[1].trim();
    const lower = title.toLowerCase();
    const keyword = HEADING_KEYWORDS.find((k) => lower.includes(k));
    if (!keyword) continue;
    const content = firstContentAfterHeading(lines, i + 1);
    if (content) matches.push({ keyword, content: content.slice(0, MAX_HINT_LENGTH) });
  }
  return matches;
}

function formatContentHint(match: SectionMatch): string | null {
  const { keyword, content } = match;
  if (keyword.includes('toy')) return `Start from the toy example: ${content}`;
  if (keyword.includes('predict') || keyword.includes('expected')) {
    return `Expected result first: ${content}`;
  }
  if (keyword.includes('inspect')) return `Inspect after running: ${content}`;
  if (keyword.includes('micro')) return `Your micro-step: ${content}`;
  if (keyword.includes('task')) return `Re-read the task: ${content}`;
  if (keyword.includes('hint') || keyword.includes('tip')) return `Hint: ${content}`;
  return null;
}

function contentHints(description: string): string[] {
  const hints: string[] = [];
  for (const match of headingSections(description)) {
    const formatted = formatContentHint(match);
    if (formatted && !hints.includes(formatted)) hints.push(formatted);
    if (hints.length >= MAX_HINTS) break;
  }
  return hints;
}

function typeHints(lesson: FileLesson): string[] {
  const focus = lesson.skills?.[0] || lesson.title || 'this lesson';
  const base = `Restate the task in your own words (${focus}), then pick the smallest toy example from the instructions that exercises it.`;
  switch (lesson.exercise_type) {
    case 'spreadsheet': {
      return [
        base,
        'Predict the number or string each formula should produce before you type it, then inspect the cell result.',
        'Paste your copy link and press "Check my work": the per-cell result shows exactly which cell to fix.',
      ];
    }
    case 'drawing': {
      return [
        base,
        'Sketch the intended structure first (parts and labels), then grade yourself on the three rubric checks: intent, missing elements, extra marks.',
        'Only use "Show solution" after you have tried, then diff your sketch against it.',
      ];
    }
    default: {
      return [
        base,
        'Fill in the starter blanks, then run and inspect the printed output before you submit.',
        'If a check fails, trace the failing value in the output back to the one line you changed.',
      ];
    }
  }
}

/**
 * Build up to three lesson-specific hints for the current exercise.
 *
 * Priority:
 *  1. Explicit `hints` authored in the lesson metadata.
 *  2. Hints derived from Solveit-style README sections (toy data / micro-step / inspect).
 *  3. Exercise-type hints that never reference a "tests tab" (which spreadsheet and
 *     drawing lessons do not have).
 */
export function buildLessonHints(lesson: FileLesson): string[] {
  const authored = (lesson.hints || []).map((h) => h.trim()).filter(Boolean);
  if (authored.length > 0) return authored.slice(0, MAX_HINTS);

  const derived = contentHints(lesson.description || '');
  const fallback = typeHints(lesson);

  if (derived.length >= MAX_HINTS) return derived.slice(0, MAX_HINTS);
  const blended = [...derived, ...fallback].filter(Boolean);
  return blended.slice(0, MAX_HINTS);
}
