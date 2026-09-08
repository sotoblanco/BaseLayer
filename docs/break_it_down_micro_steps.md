# "Let's Break It Down": Guided In-Lesson Micro-Steps

This document outlines the architecture, methodology, and design of the **"Let's break it down"** feature (Issue #86), which decomposes broad lesson objectives into guided Solveit micro-steps inside the active coding environment.

---

## 1. Background and Motivation

Every coding lesson in BaseLayer is verified by automated test suites (`test.py`). In many shipped or generated lessons (such as tensor operations, matrix multiplications, or backpropagation calculations), the lesson objective spans multiple conceptual components.

Prior to this feature, a learner stuck on an objective had only two options:
1. Re-read the assignment instructions.
2. Ask unstructured questions in the SocratiQ chat panel (`POST /ai/discuss`).

There was no structured, in-lesson mechanism to dynamically break the active objective into sequential, verifiable sub-steps that learners could work through one step at a time inside their existing Monaco editor.

---

## 2. Solveit Methodology & Design Principles

BaseLayer embraces the **Solveit** approach:
`Toy data -> 1-3 line micro-target -> Inspect intermediate output -> One question.`

"Let's break it down" operationalizes this methodology in place:
1. **Zero Filesystem Mutation**: No new course folders or lesson slugs are materialized. The guidance is ephemeral and conversational.
2. **Ordered Decomposition**: The lesson objective is split into 3 to 5 logical sub-steps.
3. **Structured Sub-Step Shape**:
   - `step_number`: 1-indexed sequential step identifier.
   - `title`: Short, descriptive name of the sub-step.
   - `toy_data`: Concrete sample inputs (e.g., small arrays, 2-3 numbers, tiny 2x2 tensors).
   - `target`: 1 to 3 lines of targeted code instructions. Crucially, the full solution is never provided.
   - `inspect_prompt`: Explicit verification instruction (e.g., `print(row_sums)` and check shape) to inspect intermediate results in the Run console.
4. **Step Gating**: Exactly one sub-step is active at a time. The learner must execute their code in the editor before the interface unlocks advancement to the next step.
5. **Rejoin and Pass Contract**: After the final sub-step is completed, the tutor guides the learner to rejoin the main lesson and click **Submit**. Official lesson passing remains governed solely by the real `test.py` test suite.

---

## 3. Security and Input Hygiene

In keeping with answer-key security guidelines (established in Issue #73 and Issue #85):
- **Sanitized Tutor Context**: The backend receives only the sanitized tutor context built by `buildTutorContext` (lesson title, assignment description, student current code, and test function names).
- **Zero Test/Solution Leaks**: Raw `test.py` assertion sources, expected literals, and `solution.py` codes are never sent to the LLM or exposed to the client.
- **Answer-Key Preservation**: The LLM prompt explicitly commands SocratiQ never to reveal finished solution code or quote hidden assertions.

---

## 4. Architecture & Data Flow

```
Learner clicks "Let's break it down" in AIChatPanel
                     |
                     v
             POST /ai/breakdown
   [Record "Needed a breakdown on {lesson}" in LEARNING.md Signals]
   [ai_service.generate_breakdown(context, profile)]
                     |
                     v
     BreakdownResponse (3-5 Sub-Steps)
                     |
                     v
AIChatPanel enters Breakdown Mode
   - Shows Sub-Step 1 Card (Toy Data, Target, Inspect)
   - "Next Step" disabled until code execution
                     |
         Learner runs code in Editor
                     |
      (runCount incremented in useLessonPlayer)
                     |
   - "Next Step" unlocked
   - Learner advances to Sub-Step 2...
                     |
            Completed all Sub-Steps
                     |
   - Learner rejoins main lesson
   - Submits solution for grading against test.py
```

---

## 5. Profile Signal Integration

When a breakdown is requested, the backend emits a `breakdown_requested` learner event. In `backend/learner_profile.py`, the `Signals` section of the learner's `LEARNING.md` profile records:

```markdown
## Signals
- Needed a breakdown on tinytorch (lesson02).
```

This signal persists across sessions and informs SocratiQ in subsequent lessons to adapt explanations and suggest micro-step breakdowns when the learner encounters difficulty.
