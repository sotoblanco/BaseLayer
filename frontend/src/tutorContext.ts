interface TutorLesson {
  title?: string;
  description?: string;
  language?: string;
  test_code?: string;
}

/**
 * Extracts test function names from Python/Rust test source without leaking
 * expected assertion values, solution tensors, or test internals to the tutor LLM.
 */
function extractTestSummary(testCode: string, language: string): string {
  if (!testCode || !testCode.trim()) {
    return 'No tests specified.';
  }

  if (language === 'python') {
    const fnNames = [...testCode.matchAll(/def\s+(test_[a-zA-Z0-9_]+)\s*\(/g)].map((m) => m[1]);
    const classNames = [...testCode.matchAll(/class\s+(Test[a-zA-Z0-9_]*|[a-zA-Z0-9_]*Test)\b/g)].map(
      (m) => m[1]
    );

    const items: string[] = [];
    if (fnNames.length > 0) {
      items.push(...fnNames.map((name) => `- \`${name}\``));
    }
    if (classNames.length > 0) {
      items.push(...classNames.map((name) => `- Test Class \`${name}\``));
    }

    if (items.length > 0) {
      return `The submission must satisfy the following verification tests:\n${items.join('\n')}\n*(Note: Do not quote raw solutions or expected values directly; guide the student through first principles.)*`;
    }
  }

  return 'The submission must pass the automated verification test suite for this lesson.';
}

export function buildTutorContext(
  lesson: TutorLesson | null | undefined,
  code: string,
  lastError?: string
): string {
  const language = lesson?.language || 'python';
  const testSummary = extractTestSummary(lesson?.test_code || '', language);

  const sections = [
    `## Lesson: ${lesson?.title ?? ''}`,
    `### Assignment`,
    lesson?.description ?? '',
    `### Student's Current Code`,
    '```' + language,
    code,
    '```',
    `### Verification Objectives`,
    testSummary,
  ];

  if (lastError && lastError.trim()) {
    sections.push(`### Last Execution Feedback`, '```', lastError.trim(), '```');
  }

  return sections.join('\n');
}
