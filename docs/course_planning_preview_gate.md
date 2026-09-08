# Course Planning and Preview Gate Architecture

This document describes the two-phase course creation pipeline introduced to preview and adjust agentic courses before they are written to disk.

## Background and Motivation

In the initial implementation, `POST /ai/learning-path/build` was monolithic and eager. As soon as a user requested a topic, the backend executed planning and immediately called `materialize_curated_course` to write lesson folders to `courses/`.

This created three friction points:
1. **No preview before committing**: The course appeared in the filesystem and catalog before the learner had a chance to inspect or tweak the curriculum.
2. **Duplication and collision**: Generating multiple courses on the same or similar topic resulted in suffix proliferation (e.g., `generated-numpy-1234`).
3. **Answer-key exposure risks**: If the full lesson blueprint was returned directly to client state prior to enrollment, test assertions and reference solutions could be leaked to dev tools or network inspect panels.

## Two-Phase Pipeline Architecture

The workflow separates curriculum design from filesystem materialization:

```
Learner Request
      |
      v
POST /ai/learning-path/plan
  [Tool 1: get_learning_intent]
  [Tool 2: get_context_learning]
  [Tool 3: get_platform_content_tools]
  [Tool 4: curate_solveit_course]
      |
      v
Store in Ephemeral Plan Store (UUID with 2-hour TTL)
      |
      v
Return Safe Preview Response (NO starter_code, test_code, or solution_code)
      |
      v
Learner UI Preview Gate
  - Inspect Title, Narrative Arc, and Lessons (Toy data, micro-task, live inspection)
  - Options:
      * Edit: Rename title/description, reorder lessons, drop lessons
      * Regenerate: Request a new plan from the LLM
      * Approve & Build: Confirm the plan
      |
      v
POST /ai/learning-path/approve
  [Apply user edits]
  [Materialize to courses/<slug>] (Overwrites existing generated slug on re-approval)
  [Record course_authored event in LEARNING.md]
      |
      v
Fast-track learner to Course Lesson 1
```

## Security and Hygiene (Answer-Key Protection)

The `POST /ai/learning-path/plan` endpoint returns `CoursePlanPreviewResponse`:
- Included: `plan_id`, `slug`, `title`, `description`, `narrative_arc`, `lesson_count`, `grounded_in`, `tool_traces`, `solveit_compliance`, and per-lesson metadata (`order`, `title`, `modality`, `objective`, `toy_data`, `expected_result`, `micro_task`, `inspect_prompt`, `curiosity_prompt`, `skills`).
- Excluded: `starter_code`, `test_code`, and `solution_code`.

Because the full blueprint is cached server-side in `course_plans.py` keyed by `plan_id`, the client never receives test assertions or reference solutions during the preview phase.

## Slug Overwrite Semantics

When `POST /ai/learning-path/approve` executes:
- Generated course slugs (`generated-*`) overwrite existing directories when confirmed again, eliminating timestamp suffix spam (`-1234`) and 409 conflicts.
- Platform-owned foundational courses (`tinytorch`, `data-modeling`, `pytorch`, `llms-from-scratch`) are protected from overwrites.
