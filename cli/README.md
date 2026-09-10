# baselayer CLI

Local-first AI learning studio on your machine. Zero runtime dependencies (plain Node 18+).

## Install (local dev)

```bash
npm install -g ./cli
# or without -g:
node cli/bin/baselayer.js --help
```

Publishing `baselayer` to npm works unchanged (`npm publish ./cli`) once a
license is chosen; backend delivery for checkouts without the repo ships with
`baselayer up --docker`.

## Commands

```bash
baselayer onboard [--workspace DIR] [wizard flags]
baselayer up [--docker]
baselayer update [status|repair] [options]
baselayer learn
baselayer doctor
```

### onboard

First-run wizard. Builds the local context from scratch:

- `<workspace>/.env` — `LLM_PROVIDER/MODEL/API_KEY` (key validated live before saving)
- `<workspace>/config.json` — workspace metadata
- `<workspace>/INSTRUCTOR.md` — global teaching defaults (style, tone, pace, depth, hints)
- `<workspace>/MEMORY.md` — progress digest shared by browser + terminal
- `<workspace>/data/learners/<you>/LEARNING.md` — your learner profile
- `<workspace>/courses/` — generated courses land here

```bash
# Interactive (asks everything, key entry hidden):
baselayer onboard

# Non-interactive:
baselayer onboard --username ada --provider gemini --api-key KEY --non-interactive

# Skip AI (coding and spreadsheets still work):
baselayer onboard --username ada --skip-ai --non-interactive
```

Extra flags pass straight through to the Python wizard
(`backend/scripts/build_profile.py --onboard`): `--goal`, `--tutor-style`,
`--tone`, `--modalities`, `--instructor-*`, `--model`, `--api-base`.

Environment overrides: `BASELAYER_BACKEND` (backend checkout path),
`BASELAYER_PYTHON` (interpreter), `BASELAYER_WORKSPACE` (workspace root),
`BASELAYER_IGNORE_WORKSPACE=1` (hermetic runs, tests).

## Workspace wiring (what `up` actually uses)

`baselayer up` injects the onboarded workspace `.env` (whitelisted `LLM_*`,
provider aliases, `LEARNERS_DATA_DIR`, `BASELAYER_*`) into the studio
processes. Precedence: real environment > repo `.env` > workspace `.env`
(`dev.sh` preserves preset vars; the backend fills the rest with setdefault).

The backend also honors the workspace on its own:

- `llm.load_settings()` and `main.py` bootstrap load `~/.baselayer/.env`
  (keys) and default `LEARNERS_DATA_DIR` / `BASELAYER_COURSES_DIR` into it.
- `LEARNING.md` stays the system of record; global `INSTRUCTOR.md` supplies
  defaults for learners without a stored profile.
- Course/lesson events mirror a one-line progress digest into `MEMORY.md`
  (shared by browser + terminal); `COURSES_DIR` still overrides the catalog.

### up / doctor / learn

- `up` runs `./dev.sh` in a checkout (or Docker Compose with `--docker`) and prints the studio URL.
- `doctor` checks node, python, repo, docker, workspace files, and AI key presence.
- `learn` is the terminal player placeholder; the browser studio is the player today.

### update (OpenClaw-inspired)

Manages updates, protects untracked user courses, and syncs dependencies:

```bash
# Pull latest updates and sync dependencies
baselayer update

# Preview updates and course protections without modifying files
baselayer update --dry-run

# Check current version, tracking branch, and commits behind upstream
baselayer update status

# Repair environments, re-sync Python venv, and rebuild Docker sandbox
baselayer update repair
```

**Course safety guarantee:** Before updating, `baselayer update` scans for untracked courses in the repository `courses/` directory. If any are found, it safely moves them to your workspace (`~/.baselayer/courses/`), ensuring `git pull` will never overwrite, conflict with, or destroy user work. BaseLayer's union catalog continues serving the moved courses immediately.
