# Adding a Python library to the sandbox

Learner code runs in up to three places. A library (e.g. an embeddings
package like `sentence-transformers`) must be installed everywhere it can
execute, and registered in one allowlist, or lessons using it will fail.

## The three runtimes

| Runtime | What is installed | Source |
|---|---|---|
| Browser (Pyodide) | stdlib + `numpy` only | `frontend/src/services/pyodideWorker.ts` |
| Local Docker (`sandbox-runner`) | stdlib + `numpy`, `torch`, `matplotlib` | `research/sandbox/Dockerfile` |
| Modal | stdlib + `numpy`, `torch` | `backend/modal_app.py` (`pip_install`) |

The canonical allowlist is `SANDBOX_LIBRARIES` in `backend/sandbox_libs.py`.
Course generation (`agentic_tools.py`) and course import (`course_import.py`)
both read it: a lesson importing anything outside stdlib + that list is
rejected before it ever runs.

Native/C-extension packages (torch, transformers, embeddings backends) can
**never** run in the browser. That is fine: `executeCode` automatically retries
a browser `ModuleNotFoundError` on the server. Pure-Python packages could run
in Pyodide in principle, but today they also go through the server path.

## Steps to add a library (example: `sentence-transformers`)

1. **Docker image** — append the package to the pip line in
   `research/sandbox/Dockerfile`, then rebuild:
   `docker build -t sandbox-runner research/sandbox`
   (or restart `./dev.sh`, which rebuilds when the image is missing).
2. **Modal image** — add the same package to `pip_install` in
   `backend/modal_app.py` so Modal runs match local runs.
3. **Allowlist** — add its import name to `SANDBOX_LIBRARIES` in
   `backend/sandbox_libs.py` so the planners and `import_course` accept it.
4. **Verify** — author a lesson importing it and Run it: the server result
   should be green, and the browser attempt should transparently fall back
   to the server first.

Keep the images lean: every package increases build time and the
`sandbox-runner` size for all learners. Prefer stdlib + numpy/torch/matplotlib
when the lesson works without the extra dependency.
