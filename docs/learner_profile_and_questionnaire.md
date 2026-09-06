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

The questionnaire provides a simplified, zero-jargon diagnostic framework grounded in cognitive and educational research (Dual Coding, Cognitive Load Theory, and Concrete-Representational-Abstract scaffolding). It does not require learners to know educational terminology or technical prerequisite jargon; instead, it infers the student's optimal pedagogy through 5 simple preference choices:

### Diagnostic Questions

1. **Intake Preference ("What makes a new concept click for you first?")**
   - **Visual Diagram (`diagram`)**: Boxes, arrows, and visual flowcharts -> infers `drawing` + `code` modalities.
   - **Numbers & Tables (`table`)**: Concrete input numbers, cell formulas, and row outputs -> infers `spreadsheet` + `code` modalities.
   - **Hands-on Code (`hands_on`)**: A tiny snippet of runnable code to break and experiment with -> infers `code` modality.
   - **Story & Analogy (`story`)**: Conceptual real-world analogies and narrative walkthroughs -> infers `text` + `code` modalities.

2. **Explanation Depth ("How detailed should theoretical explanations be before practice?")**
   - **Short & to the point (`short`)**: 2-3 key sentences with the core rule, rapidly transitioning to practice.
   - **Thorough & comprehensive (`thorough`)**: In-depth explanations with conceptual background, why it matters, and detailed analogies.

3. **Practice Structure ("How do you prefer practice challenges to be structured?")**
   - **Bite-sized micro-steps (`micro_steps`)**: 4 to 6 small verified checkpoints where each step is confirmed before moving forward.
   - **Fewer bigger challenges (`macro_challenges`)**: 1 to 2 larger end-to-end problems with minimal intermediate handholding.

4. **Getting Unstuck ("When you get stuck on a problem, what helps you most?")**
   - **Tiny Toy Example (`toy_example`)**: A 2x2 concrete case with simple numbers -> infers `solveit` tutor style.
   - **Guiding Question (`guiding_question`)**: A thoughtful inquiry nudging the learner to discover the insight -> infers `socratic` tutor style.
   - **Direct Explanation (`direct_explanation`)**: Immediate explanation of the bug and the exact theoretical rule -> infers `direct` tutor style.

5. **Study Rhythm & Cadence ("What is your preferred study rhythm?")**
   - **Take my time (`unhurried`)**: Deliberate, step-by-step deep dive exploring nuances and edge cases.
   - **Fast & focused (`sprint`)**: High-velocity iteration with quick milestones and rapid feedback loops.

6. **Explanation Voice & Tone ("How should concepts and software edge cases be explained?")**
   - **Pragmatic & Realistic (`pragmatic`)**: Understated developer realism about bugs, edge cases, and computer pedantry without forced comedy.
   - **Direct & Technical (`direct`)**: Neutral, technical manual documentation style without conversational filler.
   - **Ultra-Concise (`concise`)**: Minimal text — code-first, jump straight into runnable tasks with zero preamble.

7. **Optional Advanced Tuning**
   - Personal goal: Custom objective in the learner's own words.
   - Special focus areas: Specific topics or keywords of personal interest.

---

## 3. Aggregation Logic and Pedagogical Inference

When responses are submitted:
1. **Pedagogical Inference**:
   - `_infer_tutor_style(answers)` resolves hint preferences to tutor personalities (`solveit`, `socratic`, `direct`).
   - `_infer_modalities(answers)` resolves intake preferences to modal tools (`drawing`, `spreadsheet`, `code`, `text`).
2. **Frontmatter Serialization**: Standard YAML frontmatter is generated with validated keys, including `explanation_length`, `exercise_format`, and `tone`.
3. **Pedagogical & Anti-AI Directives**:
   - For `short` explanations: "Keep explanations concise (under 3 sentences); transition rapidly to practice."
   - For `thorough` explanations: "Provide thorough explanations with real-world analogies and conceptual context."
   - For `micro_steps`: "Structure practice into 4-6 small micro-steps with immediate automated assertions."
   - For `macro_challenges`: "Structure practice into 1-2 larger macro challenges with minimal intermediate scaffolding."
   - For `tone`: Pragmatic, direct, or concise voice rules.
   - **Strict Anti-AI Constraints**: Ban synthetic tropes including *"it is not X, but Y"* contrast framing, rhetorical questions, and academic filler transitions (*"Crucially"*, *"In essence"*).
4. **Snapshot Synthesis**: Synthesizes an updated summary paragraph detailing the learner's explanation brevity, exercise grain, primary tools, and guidance pace.
5. **Course History Preservation**: Existing entries in `Courses taken` and `Courses built` are preserved across calibrations.
6. **File Persistence**: Writes to `data/learners/{username}/LEARNING.md` and returns both raw markdown and parsed data.

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
