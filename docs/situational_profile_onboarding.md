# Local-First Situational Profile Onboarding

## Overview

BaseLayer is designed for individual developers learning foundational AI and systems directly on their local machines. In this environment, traditional web software authentication patterns (such as "Sign In", "Sign Up", and "Sign Out" buttons) add friction without providing value.

Instead of authenticating with a central server, BaseLayer uses a local-first situational profile builder inspired by OpenClaw. Rather than asking users to categorize themselves with abstract terminology, BaseLayer presents concrete developer situations to infer:
1. Preferred learning modalities (executable code, spreadsheets/matrix grids, visual diagrams, or analogies)
2. Exercise format and tutor pedagogy (Solveit micro-steps, Socratic inquiry, direct technical rules, or scaffolded templates)
3. AI tutor tone and depth (pragmatic developer peer, ultra-concise, or thorough first-principles depth)

Once built, the profile is saved locally to `data/learners/{username}/LEARNING.md` and remembered on the developer's machine. The application never interrupts or prompts the user with auth modals again.

---

## Architecture and Flow

### 1. Situational Inferences

Instead of presenting dry configuration dropdowns, the onboarding wizard walks through realistic coding scenarios:

- **Identity & Mission**:
  The developer specifies their handle or name (e.g. `Alex`, `Ada`) and current learning focus. This handles scoping for all personal notes, course progress, and course authoring.

- **Situation 1: Brand-New Concept**:
  "When tackling an unfamiliar, abstract concept (e.g. self-attention heads or memory allocators), what makes it click fastest?"
  - *Walk through executable code*: infers `code` modality (`breakdown_code`).
  - *Inspect numeric matrices & grids*: infers `spreadsheet` modality (`visual_numbers`).
  - *Sketch architecture & data flow*: infers `drawing` modality (`hand_written`).
  - *Read intuitive analogies*: infers `text` modality (`analogy_story`).

- **Situation 2: Hitting a Wall / Compiler Error**:
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

### 2. Local Machine Persistence

When the developer completes the profile builder:
1. `localWelcome(username)` initiates the local JWT session under the specified handle.
2. `submitLearnerQuestionnaire(payload)` generates and saves `data/learners/{username}/LEARNING.md` using the backend questionnaire aggregator.
3. Three keys are saved in `localStorage`:
   - `baselayer_profile_configured = "true"`
   - `baselayer_learner_name = username`
   - `baselayer_diagnostic_completed = "true"`
4. On subsequent page visits and reloads:
   - `CoursesPage` and `FileCodingPage` detect `baselayer_profile_configured === "true"` and never display startup prompts or gates.
   - `AuthContext` uses `baselayer_learner_name` to auto-initialize the local session seamlessly if local state is reset.

### 3. Header & Navigation Updates

All traditional sign-in / sign-out elements have been removed:
- **CoursesPage Header**:
  - Removed "Sign In" and "Get Started" buttons.
  - Displays `UserMenu` directly, alongside a "Set Up Profile" action if not yet configured.
  - "Build a course" and "Import Course" buttons open directly without authentication modals.
- **FileCodingPage Header**:
  - Removed "Sign In" and "Join" buttons.
  - Replaced error-screen "Sign in" button with "Back to Courses".
- **UserMenu**:
  - Removed the "Sign Out" button.
  - Added "Recalibrate Style", allowing the user to reopen the Situational Profile Builder at any time to adjust their learning style.
- **App Routes**:
  - `/login` and `/signup` routes redirect directly to `/`.

---

## Verification & Testing

- Frontend compiles cleanly with `npm run build` and passes `npm run lint` with 0 errors.
- Backend passes all 316 test cases (`uv run pytest`) covering learner profiles, agentic workflows, course imports, and auth.
- Code cyclomatic complexity maintains Grade A rating across all modules.
