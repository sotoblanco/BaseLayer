// Pyodide Web Worker for in-browser Python execution
// Runs completely client-side in WebAssembly without Docker or backend execution.

/* eslint-disable no-restricted-globals */

interface WorkerMessage {
  id: string;
  type: 'run' | 'preload';
  code?: string;
  test_code?: string;
}

let pyodide: any = null;
let pyodideLoadingPromise: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (pyodide) return pyodide;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    // In ES Module Web Workers, import Pyodide via standard dynamic import()
    // rather than importScripts() which is forbidden in module workers.
    const pyodideModuleUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs';
    // Use Function constructor to prevent TS from attempting static resolution of CDN URLs
    const dynamicImport = new Function('url', 'return import(url)');
    const { loadPyodide } = await dynamicImport(pyodideModuleUrl);
    const instance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });
    // Auto-load numpy since most lessons use numpy/micro-tensors
    await instance.loadPackage(['numpy']);
    pyodide = instance;
    return instance;
  })();

  return pyodideLoadingPromise;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, type, code = '', test_code = '' } = e.data;

  if (type === 'preload') {
    try {
      await getPyodide();
      self.postMessage({ id, type: 'preload_done', ok: true });
    } catch (err: any) {
      self.postMessage({ id, type: 'preload_done', ok: false, error: err?.message || String(err) });
    }
    return;
  }

  if (type === 'run') {
    try {
      const py = await getPyodide();

      // Reset standard IO buffers
      py.runPython(`
import sys
import io

class OutputCatcher(io.StringIO):
    pass

sys.stdout = OutputCatcher()
sys.stderr = OutputCatcher()
`);

      // 1. Write submission code to a virtual 'main.py' file and execute it in __main__
      py.FS.writeFile('/home/pyodide/main.py', code);

      // Execute student code in its own module/globals so `from main import ...` works
      const runnerScript = `
import importlib
import sys
import traceback

# Clean up previously imported main module if any
if 'main' in sys.modules:
    del sys.modules['main']

exit_code = 0
error_trace = ""

def _sanitize_traceback(full):
    # Mirrors backend/run_output.py + frontend/runOutput.ts (issue #106):
    # the Tests tab is hidden from students, so never echo assert source
    # lines (expected values) or AssertionError details to the Run console.
    cleaned = []
    for line in full.strip().splitlines():
        s = line.strip()
        if s.startswith("assert "):
            continue
        if s and set(s) <= set("^~*|"):
            continue
        if s.startswith("AssertionError"):
            cleaned.append("AssertionError: a test assertion failed. Check your work and try again.")
            continue
        cleaned.append(line)
    return "\\n".join(cleaned)

try:
    # Load and execute main.py
    spec = importlib.util.spec_from_file_location("main", "/home/pyodide/main.py")
    main_mod = importlib.util.module_from_spec(spec)
    sys.modules["main"] = main_mod
    spec.loader.exec_module(main_mod)

    # Expose main module items into globals for flat tests
    for k, v in main_mod.__dict__.items():
        if not k.startswith("__"):
            globals()[k] = v

    # Now execute test_code if present
    test_snippet = """${test_code.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""
    if test_snippet.strip():
        exec(test_snippet, globals())

except AssertionError:
    exit_code = 1
    error_trace = _sanitize_traceback(traceback.format_exc())
except Exception:
    exit_code = 1
    error_trace = _sanitize_traceback(traceback.format_exc())

captured_stdout = sys.stdout.getvalue()
captured_stderr = sys.stderr.getvalue()
if error_trace:
    captured_stderr = (captured_stderr + "\\n" + error_trace).strip()
`;

      py.runPython(runnerScript);

      const stdout = py.globals.get('captured_stdout');
      const stderr = py.globals.get('captured_stderr');
      const exitCode = py.globals.get('exit_code');

      self.postMessage({
        id,
        type: 'run_result',
        stdout: stdout || '',
        stderr: stderr || '',
        exit_code: exitCode ?? 0,
      });
    } catch (err: any) {
      self.postMessage({
        id,
        type: 'run_result',
        stdout: '',
        stderr: err?.message || String(err),
        exit_code: 1,
      });
    }
  }
};
