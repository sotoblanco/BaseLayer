export function testsToRun(testCode: string, language: string, isSubmit: boolean): string {
  const tests = testCode || '';
  if (language && language !== 'python') return tests;
  const names = [...tests.matchAll(/^def\s+(test_[a-zA-Z0-9_]+)\s*\(/gm)].map((m) => m[1]);
  if (names.length === 0) return tests;
  const count = isSubmit ? names.length : Math.max(1, Math.ceil(names.length * 0.2));
  return `${tests}\n\n${names.slice(0, count).map((fn) => `${fn}()`).join('\n')}`;
}
