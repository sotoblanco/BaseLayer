# Realistic Chalkboard & Hand-Drawn Exercises Guide

BaseLayer supports authentic, realistic green-board chalkboard exercises for visual, geometric, and architecture concepts (e.g. neural network layer diagrams, 2D vector coordinate spaces, token attention graphs).

This allows course authors to create rich hand-drawn exercises **purely in JSON** without needing external image files (`question.png`/`solution.png`) and without requiring an AI vision model for automated grading.

---

## 1. Quick Example: Pure-JSON Chalkboard Lesson

In your lesson's `metadata.json`:

```json
{
  "exercise_type": "hand_drawn",
  "board_theme": "chalkboard",
  "stroke_color": "#f8fafc",
  "stroke_width": 3,
  "drawing": {
    "prompt_text": "Draw 2D vector plane with King [0.9, 0.1] and Queen [0.8, 0.3], showing angle theta.",
    "solution_diagram": "      y ^\n        |\n  0.3 - |       * Queen [0.8, 0.3]\n  0.1 - |         * King [0.9, 0.1]\n        +-------------> x\n             0.8 0.9",
    "solution_explanation": "King and Queen vectors both point in almost the same direction into the positive quadrant, forming an acute angle theta (~10 degrees)."
  }
}
```

### Key Metadata Fields:
- `exercise_type`: `"hand_drawn"` (or `"drawing"`).
- `board_theme`: `"chalkboard"` (renders the realistic classroom green slate board, wooden frame, chalk tray, and eraser textures).
- `stroke_color`: Default chalk color (e.g. `#f8fafc` for white chalk, `#fde047` for yellow chalk).
- `drawing.prompt_text`: An optional prompt line rendered directly in chalk lettering at the top-left of the board.
- `drawing.solution_diagram`: An ASCII, text, or vector diagram showing the expected reference drawing.
- `drawing.solution_explanation`: Clear theoretical reasoning explaining the expected structure.

---

## 2. The Experience for the Learner

1. **The Green Chalkboard**:
   - The right-hand panel renders a rich, textured dark green chalkboard with a wooden frame, chalk tray, and subtle chalk dust.
   - The learner draws with realistic chalk strokes using White, Yellow, Cyan, Pink, Mint, or Orange chalk.
   - Vector arrows and chalk text can be placed directly on the board.

2. **Self-Evaluation Mode (No AI Required)**:
   - When the learner clicks **Show Solution** or **Submit Drawing**:
   - The reference solution is displayed on a matching green chalkboard card showing the expected diagram and explanation.
   - A button appears: **"I evaluated my drawing — mark complete"**.
   - Clicking it celebrates with confetti, emits `lesson_passed` for telemetry and XP, and marks the lesson complete in `LEARNING.md`!

3. **Hybrid Mode with AI Vision (Optional)**:
   - If an AI vision model (like Gemini or GPT-4o) and a base image are configured, the learner can still receive automated rubric grading (intent, missing edges, extra marks). If the AI is unavailable, it gracefully defaults to self-evaluation.
