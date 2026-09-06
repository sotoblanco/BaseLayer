# Learner Profile Questionnaire and Privacy Architecture

## Overview

BaseLayer provides a personalized learning environment that adapts to each student's goals, preferred modalities (code, spreadsheets, drawings, guided explanations), baseline depth, and tutoring style.

To prevent student data leaks and repository bloat, individual student profiles are stored locally on each learner's machine and are excluded from version control, while a generic canonical template is maintained in the repository for reference.

---

## 1. Storage and Privacy Architecture

### File Location
Each student's profile is stored at:
```text
data/learners/{username}/LEARNING.md
```

### Git Isolation
The `data/learners/` directory is explicitly gitignored:
- Personal student learning habits, struggle logs, and customized goals are never committed to git.
- Repository forks and pull requests remain clean without personal learner artifacts.

### Canonical Template
A reference template is provided at:
```text
templates/LEARNING.template.md
```
This template defines standard frontmatter keys, allowed options, section structures, and example defaults without binding to any specific student.

---

## 2. Onboarding Diagnostic Questionnaire

The questionnaire provides an intuitive survey that aggregates student responses into a structured `LEARNING.md` profile.

### Questionnaire Fields

1. **Learning Goal (`goal`)**
   - Captures the student's core motivation (for example: conceptual mathematical intuition, clean systems engineering, or visual model exploration).
2. **Preferred Modalities (`preferred_modalities`)**
   - Multi-select: `code`, `spreadsheet`, `drawing`, `text`.
   - Informs the Agentic Course Builder which lesson types to generate (Python/Rust exercises, Google Sheets intuition warm-ups, or whiteboard sketches).
3. **Understanding Level (`understanding_level`)**
   - Choices: `beginner`, `intermediate`, `advanced`.
   - Tunes AI explanations and starting assumptions.
4. **Tutor Guidance Style (`tutor_style`)**
   - `solveit`: Guided step-by-step with toy data and unit test assertions.
   - `socratic`: Progressive questions leading to insights before revealing code.
   - `direct`: Clear theory and concise code walkthroughs.
   - `blooms`: Cognitive scaffolding following Bloom's taxonomy.
5. **Cadence & Pace (`pace`)**
   - Choices: `unhurried`, `sprint`, `mixed`.
6. **Custom Notes (`custom_notes`)**
   - Allows learners to specify specific topics of interest (such as backpropagation, attention matrices, or GPU kernels).

---

## 3. Aggregation Logic and Profile Generation

When answers are submitted:
1. **Frontmatter Serialization**: Standard YAML frontmatter is generated with validated keys and ISO timestamp.
2. **Snapshot Synthesis**: Synthesizes a high-level summary paragraph describing the student's learning strategy.
3. **Modalities Recommendation**: Formulates clear guidance for the AI tutor and course authoring agent based on selected modalities.
4. **Course History Preservation**: If the student has already started or built courses, existing entries in `Courses taken` and `Courses built` are preserved across questionnaire calibrations.
5. **File Persistence**: Writes to `data/learners/{username}/LEARNING.md` and returns both raw markdown and parsed structured data.

---

## 4. API Endpoints

### `POST /me/learning-profile/questionnaire`
Submits diagnostic questionnaire answers and returns the newly calibrated profile.

**Request:**
```json
{
  "goal": "Understand transformers and attention from scratch",
  "preferred_modalities": ["code", "spreadsheet", "drawing"],
  "understanding_level": "intermediate",
  "tutor_style": "solveit",
  "pace": "unhurried",
  "preferred_ui": "light",
  "custom_notes": "Focus on self-attention weight calculations"
}
```

**Response:**
```json
{
  "markdown": "---\nusername: learner\n...\n",
  "parsed": {
    "frontmatter": { ... },
    "snapshot": "...",
    "courses_taken": [ ... ],
    "courses_built": [ ... ],
    "signals": [ ... ],
    "customize_next": [ ... ]
  }
}
```

---

## 5. UI Integration

Inside the Living Learner Profile modal (`LearningProfileModal.tsx`), three modes are available:
1. **Rendered (`Eye`)**: Displays the formatted profile with visual metadata badges, recorded signals, and markdown body.
2. **Diagnostic (`Sliders`)**: Interactive questionnaire form with presets, multi-select modality cards, style selectors, and one-click profile calibration.
3. **Markdown (`Edit`)**: Monaco editor for direct raw markdown editing and saving.

---

## 6. Test Isolation Guarantee

To avoid test runs populating `data/learners/`:
- `backend/tests/conftest.py` includes an `autouse=True` fixture that sets the `LEARNERS_DATA_DIR` environment variable to a clean `tmp_path`.
- All automated tests run in complete isolation from the production or local repository filesystem.
