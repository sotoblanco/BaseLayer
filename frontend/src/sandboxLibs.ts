/**
 * Help for lessons that import a Python library the sandbox does not have
 * (e.g. an embeddings package). Mirrors backend/sandbox_libs.py.
 *
 * Execution reality:
 * - Browser (Pyodide): stdlib + numpy only. Native/C-extension packages can
 *   never run here; those runs fall back to the server automatically.
 * - Server (Docker sandbox-runner / Modal): stdlib + SANDBOX_LIBRARIES.
 */

export const SANDBOX_LIBRARIES: string[] = ['numpy', 'torch', 'matplotlib'];

/** Extract the top-level missing module from a traceback, if present. */
export function missingModule(stderr: string): string | null {
  if (!stderr) return null;
  const match = /No module named ['"]([^'"]+)['"]/.exec(stderr);
  if (!match) return null;
  const root = match[1].split('.')[0];
  return root || null;
}

export function isMissingModuleError(stderr: string): boolean {
  return missingModule(stderr) !== null;
}

/** Actionable guidance appended when a module is missing on every engine. */
export function libraryHelpHint(module: string): string {
  return (
    `Module '${module}' is not installed (browser: stdlib + numpy only; ` +
    `server: stdlib + ${SANDBOX_LIBRARIES.join(', ')}). ` +
    `To add it, see docs/adding-sandbox-libraries.md: ` +
    `append it to research/sandbox/Dockerfile, rebuild the sandbox-runner ` +
    `image, and register it in backend/sandbox_libs.py.`
  );
}
