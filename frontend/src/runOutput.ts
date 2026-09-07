/**
 * Mirrors backend/run_output.py: keeps the lesson's automated tests (the answer
 * key) out of the student-facing Run console.
 *
 * A failing assert prints its source line (with expected literals) into the
 * traceback, but the Tests editor tab is hidden from students
 * (testVisibility.ts). The server sanitizes /run stderr; this module is the
 * client-side equivalent for Pyodide (in-browser) runs and a defense-in-depth
 * pass over server stderr in codeRunner.ts.
 */

export const GENERIC_ASSERTION_MESSAGE =
  'AssertionError: a test assertion failed. Check your work and try again.';

function isAssertSource(line: string): boolean {
  return line.trimStart().startsWith('assert ');
}

function isCaretLine(line: string): boolean {
  const stripped = line.trim();
  return stripped.length > 0 && [...stripped].every((ch) => ch === '^' || ch === '~' || ch === '*' || ch === '|');
}

export function sanitizeRunStderr(stderr: string): string {
  if (!stderr) return stderr;
  const cleaned: string[] = [];
  for (const line of stderr.split('\n')) {
    if (isAssertSource(line)) continue;
    if (isCaretLine(line)) continue;
    if (line.trimStart().startsWith('AssertionError')) {
      cleaned.push(GENERIC_ASSERTION_MESSAGE);
      continue;
    }
    cleaned.push(line);
  }
  const result = cleaned.join('\n');
  if (stderr.endsWith('\n') && !result.endsWith('\n')) return result + '\n';
  return result;
}
