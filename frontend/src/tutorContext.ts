interface TutorLesson {
  title?: string;
  description?: string;
  language?: string;
  test_code?: string;
}

export function buildTutorContext(lesson: TutorLesson | null | undefined, code: string): string {
  const language = lesson?.language || 'python';
  return [
    `## Lesson: ${lesson?.title ?? ''}`,
    `### Assignment`,
    lesson?.description ?? '',
    `### Student's Current Code`,
    '```' + language,
    code,
    '```',
    `### Test Suite`,
    '```' + language,
    lesson?.test_code ?? '',
    '```',
  ].join('\n');
}
