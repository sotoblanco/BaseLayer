/**
 * Execution runner abstraction.
 *
 * Runs Python code locally in the browser via Pyodide WebAssembly when possible
 * (NumPy, standard library, micro-tensors) with ZERO Docker overhead and ~0ms latency.
 *
 * Automatically falls back to backend `/run` for non-Python languages or libraries
 * that require native C++ builds not supported in Wasm (e.g. `torch`, `transformers`).
 */

import { API_BASE_URL } from '../config';
import { messageForRunStatus } from '../runErrors';
import { sanitizeRunStderr } from '../runOutput';

export interface RunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  engine?: 'pyodide' | 'server';
}

export interface RunOptions {
  code: string;
  test_code: string;
  language?: string;
  token?: string | null;
  onStatusUpdate?: (status: string) => void;
  forceServer?: boolean;
  // Explicit submit intent + lesson address for LEARNING.md telemetry.
  // Never inferred from test_code presence: a preliminary Run sends tests too.
  isSubmit?: boolean;
  courseSlug?: string;
  lessonSlug?: string;
}

// Check whether the code requires native server modules (like PyTorch or complex native libs)
export function requiresServerExecution(code: string, testCode: string, language?: string): boolean {
  if (language && language !== 'python') return true;

  const combined = `${code}\n${testCode}`;
  // PyTorch cannot run in Pyodide
  const torchRegex = /(?:^|\s)(?:import\s+torch|from\s+torch)(?:\s|$|\.)/m;
  if (torchRegex.test(combined)) {
    return true;
  }

  // Transformers / huggingface / complex C-extensions not in Pyodide
  const heavyRegex = /(?:^|\s)(?:import\s+(?:transformers|cv2|scapy|tensorflow)|from\s+(?:transformers|cv2|scapy|tensorflow))(?:\s|$|\.)/m;
  if (heavyRegex.test(combined)) {
    return true;
  }

  return false;
}

let workerInstance: Worker | null = null;
let workerLoadPromise: Promise<Worker> | null = null;

function getOrCreateWorker(): Promise<Worker> {
  if (workerInstance) return Promise.resolve(workerInstance);
  if (workerLoadPromise) return workerLoadPromise;

  workerLoadPromise = new Promise((resolve, reject) => {
    try {
      // Use Vite's worker constructor
      const worker = new Worker(new URL('./pyodideWorker.ts', import.meta.url), {
        type: 'module',
      });

      workerInstance = worker;
      resolve(worker);
    } catch (err) {
      workerLoadPromise = null;
      reject(err);
    }
  });

  return workerLoadPromise;
}

/**
 * Pre-warm the Pyodide runtime in background so the first user run is instant.
 */
export function preloadPyodide(): void {
  getOrCreateWorker()
    .then((worker) => {
      worker.postMessage({ id: 'preload', type: 'preload' });
    })
    .catch(() => {
      // Ignore background warm-up errors
    });
}

/**
 * Executes Python code via Pyodide in a Web Worker with a safety timeout.
 */
async function runWithPyodide(
  code: string,
  testCode: string,
  timeoutMs: number = 7000,
  onStatusUpdate?: (status: string) => void
): Promise<RunResult> {
  const worker = await getOrCreateWorker();
  const runId = Math.random().toString(36).substring(2, 9);

  return new Promise((resolve, reject) => {
    let timer: any = null;

    const handleMessage = (e: MessageEvent) => {
      if (e.data.id === runId && e.data.type === 'run_result') {
        cleanup();
        resolve({
          stdout: e.data.stdout,
          stderr: e.data.stderr,
          exit_code: e.data.exit_code,
          engine: 'pyodide',
        });
      }
    };

    const handleError = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(err.message || 'Pyodide execution failed'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };

    timer = setTimeout(() => {
      cleanup();
      // If code was caught in an infinite loop, kill the worker and reset
      if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
        workerLoadPromise = null;
      }
      resolve({
        stdout: '',
        stderr: 'Execution timed out (exceeded limit). Did you write an infinite loop?',
        exit_code: 124,
        engine: 'pyodide',
      });
    }, timeoutMs);

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    onStatusUpdate?.('Executing locally in browser (Pyodide Wasm)...');
    worker.postMessage({
      id: runId,
      type: 'run',
      code,
      test_code: testCode,
    });
  });
}

/**
 * Primary code runner entry point.
 * Transparently runs in browser or server.
 */
export async function executeCode(options: RunOptions): Promise<RunResult> {
  const { code, test_code, language = 'python', token, onStatusUpdate, forceServer, isSubmit = false, courseSlug = '', lessonSlug = '' } = options;

  const mustUseServer = forceServer || requiresServerExecution(code, test_code, language);

  if (!mustUseServer) {
    try {
      return await runWithPyodide(code, test_code, 7000, onStatusUpdate);
    } catch (err) {
      // If client runner fails or worker isn't supported, fall back cleanly to server
      console.warn('Pyodide run failed, falling back to server /run:', err);
    }
  }

  // Server execution fallback
  onStatusUpdate?.('Sending to execution server...');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code,
      test_code,
      language,
      is_submit: isSubmit,
      course_slug: courseSlug,
      lesson_slug: lessonSlug,
    }),
  });

  const runError = messageForRunStatus(response.status);
  if (runError) {
    if (response.status === 401) {
      throw new Error('AUTH_401');
    }
    return {
      stdout: '',
      stderr: runError,
      exit_code: -1,
      engine: 'server',
    };
  }

  const data = await response.json();
  // Defense in depth (issue #106): the server sanitizes /run stderr, but an
  // older backend could still echo assert source lines with expected values.
  // Strip the answer key here too whenever hidden tests ran.
  const serverStderr: string = data.stderr || '';
  return {
    stdout: data.stdout || '',
    stderr: test_code.trim() ? sanitizeRunStderr(serverStderr) : serverStderr,
    exit_code: data.exit_code ?? 0,
    engine: 'server',
  };
}
