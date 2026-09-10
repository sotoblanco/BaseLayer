# Local-First Architecture and Setup Guide

## Overview

BaseLayer is designed as a local-first learning and development environment for individual developers working on their local machines. 

Earlier iterations included cloud-oriented deployment scaffolding (such as Modal serverless functions, Google OAuth integration, session tokens, and password-based signup/login). In a local developer environment, these layers added unnecessary operational friction, external network requirements, and 401 Unauthorized interruptions.

This document describes the simplified, local-first architecture, explaining how user identity and preferences are resolved directly from local files (LEARNING.md) and how courses are run locally.

---

## Key Changes and Improvements

### 1. Zero-Friction Identity Resolution

Instead of requiring registration, login forms, or OAuth flows, the application automatically resolves the active developer on the machine:

1. **Header or Query Parameter**: Requests can explicitly specify the learner via the `X-Learner-Name` HTTP header or the `?learner=` query parameter.
2. **Active Learner File**: When set in the UI or CLI, the active username is stored in `data/active_learner.txt`.
3. **Existing Profiles**: If no active learner file exists, BaseLayer scans `data/learners/` for any existing profile folder containing a `LEARNING.md` file.
4. **Default Local Learner**: If no profiles exist yet, it seamlessly falls back to `local-learner`.

At no point does the local backend reject legitimate requests with `401 Unauthorized`. Developers are granted local administrative privileges by default, enabling course building, importing, and lesson execution without arbitrary permission errors.

### 2. Elimination of Cloud Deployment Dependencies

- **Removed Modal Cloud Runner**: The remote Modal execution pathway (`modal_app.py`, remote execution triggers) has been removed. Code execution uses the local Docker sandbox runner.
- **Removed Google OAuth and Passwords**: The `auth.py` router no longer depends on Google authentication client libraries, bcrypt hashing, or token verification walls.
- **Simplified Client State**: The frontend `AuthContext` now defaults to an authenticated local session, eliminating login redirects, login/signup modals, and session expiration interrupts.

### 3. Direct Markdown Profile Integration (LEARNING.md)

Each learner's profile lives directly inside their directory:
```
data/learners/{username}/LEARNING.md
```

The profile contains:
- **Learner Metadata**: Name, current status, goals, and experience level.
- **Modalities**: Code, spreadsheets, and drawings (visual diagramming).
- **Pedagogical Settings**: Tutor style (Solveit, Socratic, Direct, Bloom's), explanation depth, and pace.
- **History and Progress**: Notes, progress logs, and concepts mastered.

Developers can create or update this profile via:
- The terminal CLI: `uv run python backend/scripts/build_profile.py --username <name>`
- The in-app profile customization settings.

### 4. Repository-Native Courses

Courses are stored directly in the repository filesystem under `courses/`. Each course is self-contained:
```
courses/{course-slug}/
  metadata.json
  README.md
  chapter1/
    {lesson-slug}/
      metadata.json
      README.md
      starter.py
      solution.py
      test.py
```

The course catalog is dynamically discovered from the filesystem. There are no external databases or cloud sync requirements needed to add, edit, or test courses.

---

## Local Development Workflow

### Starting the Backend
From the repository root:
```bash
uv run uvicorn backend.main:app --reload --port 8000
```

### Starting the Frontend
From `frontend/`:
```bash
npm run dev
```

### Running the Profile Builder CLI
To configure your learning style interactively through situational prompts:
```bash
uv run python backend/scripts/build_profile.py
```

---

## Benefits for Local Users

1. **Complete Privacy**: All learning progress, code submissions, notes, and profiles remain on your machine.
2. **Instant Startup**: No cloud accounts, OAuth credentials, or third-party tokens required to start learning.
3. **Offline Capability**: Local courses and code execution work completely offline once local dependencies and Docker are available.
4. **Full Ownership**: Course materials and personal learning profiles are stored as plain text and Markdown files under version control.
