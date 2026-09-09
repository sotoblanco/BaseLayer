# Local-First Situational Profile Onboarding

## Overview

BaseLayer is designed for individual developers learning foundational AI and systems directly on their local machines. In this environment, traditional web software authentication patterns (such as "Sign In", "Sign Up", and "Sign Out" buttons) add friction without providing value.

Instead of authenticating with a central server, BaseLayer uses a local-first situational profile builder inspired by OpenClaw. Rather than forcing users to make an upfront exclusionary choice between code, spreadsheets, or drawing canvases (which are all first-class, valid learning tools on BaseLayer), the system presents realistic developer situations focused on problem-solving intuition:
1. Cognitive approach to intricate concepts (concrete calculations, first principles, rapid trial-and-error, or analogies)
2. Exercise format and tutor pedagogy (Solveit micro-steps, Socratic inquiry, direct technical rules, or scaffolded templates)
3. AI tutor tone and depth (pragmatic developer peer, ultra-concise, or thorough first-principles depth)
4. Optional tool focus at the end (or skip to enable all tools simultaneously)

The profile can be configured both **in the web application** and **directly from the terminal** via `uv run python -m backend.scripts.build_profile`. Once built, the profile is saved locally to `data/learners/{username}/LEARNING.md` and remembered on the developer's machine. The application never interrupts or prompts the user with auth modals again.

---

## Architecture and Flow

### 1. Situational Inferences

Instead of presenting dry configuration dropdowns or forcing users to choose between learning tools, the onboarding wizard walks through realistic coding scenarios:

- **Identity & Mission**:
  The developer specifies their handle or name (e.g. `Alex`, `Ada`) and current learning focus. This handles scoping for all personal notes, course progress, and course authoring.

- **Situation 1: Intricate Concept Click**:
  "When learning an intricate algorithm or systems concept, what helps it click fastest?"
  - *Trace concrete values step-by-step*: Empirical grounding with live values and arithmetic before abstract formulas.
  - *Deconstruct first principles & invariants*: Focus on system boundaries, state transitions, and operational rules.
  - *Rapid trial-and-error experimentation*: Testing hypotheses in runnable sandboxes with immediate feedback.
  - *Connect to physical analogies & mental models*: Relating mechanics to physical analogies before formal syntax.

- **Situation 2: Hitting a Roadblock / Error**:
  "You hit a compiler error or failing test while coding. How should the tutor intervene?"
  - *Break into bite-sized micro-steps*: infers Solveit pedagogy (`micro_steps`, `toy_example` hints).
  - *Ask guiding Socratic questions*: infers Socratic tutor (`macro_challenges`, `guiding_question` hints).
  - *Give direct technical rules*: infers Direct technical style (`direct_explanation` hints).
  - *Provide scaffolded templates*: infers Guided scaffolding (`guided_completion`).

- **Situation 3: Tutor Tone and Depth**:
  "How should explanations and code reviews sound?"
  - *Pragmatic developer peer*: realistic, unhurried, focused on engineering trade-offs (`pragmatic`).
  - *Ultra-concise*: high signal density, bullet points, zero fluff (`concise`).
  - *Thorough first-principles depth*: deep conceptual clarity and underlying theory (`thorough`).

- **Situation 4: Optional Tool Focus (or Skip)**:
  All tools (code editor, interactive spreadsheets, drawing canvas) are active by default. The learner can either choose a primary tool preference or click "Skip" to keep all three enabled.

### 2. Terminal Profile Builder CLI

Learners can configure or recalibrate their profile directly from the terminal without opening a browser:

```bash
# Interactive questionnaire in terminal
uv run python -m backend.scripts.build_profile

# Non-interactive CLI with options
uv run python -m backend.scripts.build_profile --username alex --tutor-style socratic --tone concise --non-interactive
```

The script asks the situational questions with clean numbered terminal prompts, constructs the profile markdown, and writes `data/learners/{username}/LEARNING.md`.

### 3. Local Machine Persistence

When the developer completes the profile builder (via terminal or UI):
1. `localWelcome(username)` initiates the local JWT session under the specified handle.
2. `submitLearnerQuestionnaire(payload)` generates and saves `data/learners/{username}/LEARNING.md`.
3. Three keys are saved in `localStorage`:
   - `baselayer_profile_configured = "true"`
   - `baselayer_learner_name = username`
   - `baselayer_diagnostic_completed = "true"`
4. On subsequent page visits and reloads:
   - `CoursesPage` and `FileCodingPage` detect `baselayer_profile_configured === "true"` and never display startup prompts or gates.
   - `AuthContext` uses `baselayer_learner_name` to auto-initialize the local session seamlessly if local state is reset.

### 4. Header & Navigation Updates

- **CoursesPage Header**:
  - Removed "Sign In" and "Get Started" buttons.
  - Removed redundant "Learning Style" and "Learning Guide" buttons.
  - Added a small, clean "AI Features" button that opens model provider setup directly.
  - Shows the developer's handle with a dropdown menu directly, without generic user circle icons.
  - "Build a course" and "Import Course" buttons open directly without authentication modals.
- **FileCodingPage Header**:
  - Replaced "Learning Guide" with the small "AI Features" button.
  - Displays `UserMenu` without user avatar icons.
- **UserMenu**:
  - Removed user circle icon; displays handle directly.
  - Removed "Sign Out" button.
  - Added "Recalibrate Style" to reopen the situational profile builder at any time.

---

## Verification & Testing

- Frontend compiles cleanly with `npm run build` and passes `npm run lint` with 0 errors.
- Backend passes all 320 test cases (`uv run pytest`) including new CLI test cases in `backend/tests/test_build_profile_cli.py`.
- Code cyclomatic complexity maintains Grade A rating across all modules (average complexity 2.9 on CLI tools).
