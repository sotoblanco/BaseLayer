"""Single source of truth for the BaseLayer code sandbox's Python libraries.

Three execution environments run learner code, and all three must agree on
what ``import`` works:

1. Browser (Pyodide): Python standard library + ``numpy`` only
   (see ``frontend/src/services/pyodideWorker.ts``). Native/C-extension
   packages can never run here; those runs fall back to the server.
2. Local Docker (``sandbox-runner`` image built from ``research/sandbox/``):
   standard library plus :data:`SANDBOX_LIBRARIES`.
3. Modal (``backend/modal_app.py``): standard library plus the same set via
   ``pip_install``.

Course authors who need another package (e.g. an embeddings library) add it
to the Docker/Modal images AND to :data:`SANDBOX_LIBRARIES` so the planners
and import validators accept it. See ``docs/adding-sandbox-libraries.md``.
"""

from __future__ import annotations

import re

# Installed in sandbox-runner (research/sandbox/Dockerfile) and Modal.
SANDBOX_LIBRARIES: tuple[str, ...] = ("numpy", "torch", "matplotlib")

SANDBOX_LIBRARIES_TEXT: str = ", ".join(SANDBOX_LIBRARIES)

_MISSING_MODULE_RE = re.compile(r"No module named ['\"]([^'\"]+)['\"]")


def missing_module(stderr: str) -> str | None:
    """Return the top-level module missing from a traceback, if any.

    Matches ``ModuleNotFoundError: No module named 'X'`` (also the
    ``'X.y'`` dotted form, reduced to ``X``).
    """
    if not stderr:
        return None
    match = _MISSING_MODULE_RE.search(stderr)
    if not match:
        return None
    return match.group(1).split(".")[0] or None


def library_help_hint(module: str) -> str:
    """Actionable guidance for a module missing from the sandbox."""
    return (
        f"Module '{module}' is not installed in the BaseLayer sandbox "
        f"(server: standard library + {SANDBOX_LIBRARIES_TEXT}; "
        "browser: standard library + numpy only). "
        "To add it: 1) append it to the pip line in research/sandbox/Dockerfile "
        "and rebuild with `docker build -t sandbox-runner research/sandbox` "
        "(or restart ./dev.sh); 2) add the same package to pip_install in "
        "backend/modal_app.py for Modal runs; 3) add its import name to "
        "SANDBOX_LIBRARIES in backend/sandbox_libs.py so course generation "
        "and import accept it. Details: docs/adding-sandbox-libraries.md"
    )
