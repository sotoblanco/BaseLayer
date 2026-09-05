# BaseLayer Issue Prioritization & Technical Roadmap

This document organizes and prioritizes all 23 open issues in the BaseLayer repository. Issues are grouped by architectural tier and ranked in order of recommended execution priority to support an incremental, step-by-step pull request workflow.

---

## Tier 1: Critical Security & Host Stability (Priority: P0 - Immediate)

These issues represent vulnerabilities that could lead to host denial-of-service, process table exhaustion, unauthorized account takeover, or arbitrary filesystem navigation.

| Priority | Issue | Type | Component | Summary |
|---|---|---|---|---|
| **P0.1** | [#45](https://github.com/sotoblanco/BaseLayer/issues/45) | Security | `backend/auth.py` | `local_welcome` allows account takeover and admin privilege escalation for existing accounts without password verification. |
| **P0.2** | [#43](https://github.com/sotoblanco/BaseLayer/issues/43) | Security | `backend/routers/file_courses.py` | Path traversal in course and lesson slug resolution (`get_lesson_path`, `parse_course`) allows escaping `COURSES_DIR`. |
| **P0.3** | [#42](https://github.com/sotoblanco/BaseLayer/issues/42) | Security / DoS | `backend/main.py` | Local Docker runner lacks `--network none`, memory quotas, CPU limits, and PID constraints (vulnerable to fork bombs and OOM kills). |
| **P0.4** | [#46](https://github.com/sotoblanco/BaseLayer/issues/46) | Resource Leak | `backend/main.py` | `TimeoutExpired` kills host client process but leaves orphaned zombie containers running on Docker daemon. |
| **P0.5** | [#28](https://github.com/sotoblanco/BaseLayer/issues/28) | Security | `backend/routers/file_courses.py` | Drawing `question.png` and `solution.png` endpoints lack authentication checks, allowing public leakage of drawing solutions. |

---

## Tier 2: Core Correctness, Data Loss & Runner Integrity (Priority: P1 - High)

These issues cause learner data loss, double or failing test executions, answer leaks, or production container misconfigurations.

| Priority | Issue | Type | Component | Summary |
|---|---|---|---|---|
| **P1.1** | [#47](https://github.com/sotoblanco/BaseLayer/issues/47) | Bug / UX | `frontend/src/pages/FileCodingPage.tsx` | Learner code in Monaco editor is wiped out on lesson navigation or page refresh due to lack of local draft persistence. |
| **P1.2** | [#49](https://github.com/sotoblanco/BaseLayer/issues/49) | Bug | `frontend/src/testsToRun.ts` | Test runner regex appends calls blindly, causing double execution if `__main__` exists and syntax errors on parameterized tests. |
| **P1.3** | [#30](https://github.com/sotoblanco/BaseLayer/issues/30) | Correctness | `frontend/src/tutorContext.ts` | SocratiQ AI context embeds full `test.py` contents, allowing learners to extract expected values and assertions. |
| **P1.4** | [#29](https://github.com/sotoblanco/BaseLayer/issues/29) | DevOps | `backend/Dockerfile` | Production backend container runs uvicorn with development `--reload` flag enabled. |
| **P1.5** | [#48](https://github.com/sotoblanco/BaseLayer/issues/48) | Architecture | `backend/main.py`, `frontend/` | Courses created in Admin Dashboard are saved to SQLite but never displayed on the student homepage (`CoursesPage.tsx`). |

---

## Tier 3: Solveit Generative Learning Engine (Priority: P2 - Feature Epic)

The core product initiative turning user questions (e.g., "I want to learn numpy") into customized, playable, multi-modal Solveit courses.

| Step | Issue | Component | Role in Generative Engine |
|---|---|---|---|
| **Step 1** | [#36](https://github.com/sotoblanco/BaseLayer/issues/36) | Frontend & Intake API | Intake question interface on homepage and markdown storage in `data/learners/`. |
| **Step 2** | [#37](https://github.com/sotoblanco/BaseLayer/issues/37) | Backend & SocratiQ | Solveit tutoring mode for SocratiQ (toy data, 1–3 line micro-steps, single probing question). |
| **Step 3** | [#38](https://github.com/sotoblanco/BaseLayer/issues/38) | Backend AI Planner | Plan a course syllabus from question + platform resources (sandbox packages, existing patterns). |
| **Step 4** | [#39](https://github.com/sotoblanco/BaseLayer/issues/39) | Backend File Writer | Write planned course into file-based lessons (`README.md`, `main.py`, `test.py`, `solution.py`). |
| **Step 5** | [#40](https://github.com/sotoblanco/BaseLayer/issues/40) | Sandbox Verification | Verify generated code and tests actually execute cleanly before publishing to the course list. |
| **Step 6** | [#44](https://github.com/sotoblanco/BaseLayer/issues/44) | End-to-End Orchestrator | Single `POST /ai/learning-path/build` pipeline composing planning, writing, verification, and navigation. |
| **Step 7** | [#41](https://github.com/sotoblanco/BaseLayer/issues/41) | Personalization | Tailor generated courses using learner preferences from `LEARNING.md`. |

---

## Tier 4: Learner Personalization, Tracking & Content (Priority: P3 - Medium)

Platform enhancements to improve long-term learner engagement, profile persistence, and exercise modalities.

| Priority | Issue | Component | Summary |
|---|---|---|---|
| **P3.1** | [#2](https://github.com/sotoblanco/BaseLayer/issues/2) | Backend & Frontend | Store and visualize completed lessons and user progress across courses. |
| **P3.2** | [#23](https://github.com/sotoblanco/BaseLayer/issues/23) | Backend & Storage | Learner profile: store learning style and course activity in a markdown file (`LEARNING.md`). |
| **P3.3** | [#3](https://github.com/sotoblanco/BaseLayer/issues/3) | Frontend / Sheets | Google Sheets automated success verification via metadata cell checks. |
| **P3.4** | [#6](https://github.com/sotoblanco/BaseLayer/issues/6) | Frontend / AI | Make differences between understanding levels visually distinct in the AI chat settings. |
| **P3.5** | [#5](https://github.com/sotoblanco/BaseLayer/issues/5) | Curriculum | Expand Hand-Drawn exercise catalog for visual machine learning topics. |
| **P3.6** | [#4](https://github.com/sotoblanco/BaseLayer/issues/4) | Curriculum | Expand LLMs from Scratch course modules. |

---

## Recommended Immediate PR Sequence

1. **PR 1: Security Hardening** (Issues [#45](https://github.com/sotoblanco/BaseLayer/issues/45), [#43](https://github.com/sotoblanco/BaseLayer/issues/43), [#28](https://github.com/sotoblanco/BaseLayer/issues/28))
   - Fix `local_welcome` account takeover, path traversal in `file_courses.py`, and protect drawing solution assets.
2. **PR 2: Docker Sandbox Resource Isolation & Timeout Cleanup** (Issues [#42](https://github.com/sotoblanco/BaseLayer/issues/42), [#46](https://github.com/sotoblanco/BaseLayer/issues/46), [#29](https://github.com/sotoblanco/BaseLayer/issues/29))
   - Enforce `--network none`, memory/CPU/PID quotas, remove `--reload` from Dockerfile, and kill timed-out containers.
3. **PR 3: Editor Draft Persistence & Test Runner Reliability** (Issues [#47](https://github.com/sotoblanco/BaseLayer/issues/47), [#49](https://github.com/sotoblanco/BaseLayer/issues/49), [#30](https://github.com/sotoblanco/BaseLayer/issues/30))
   - Auto-save learner drafts in `localStorage`, clean up `testsToRun.ts`, and sanitize tutor context.
4. **PR 4: Solveit Engine Foundation** (Issues [#36](https://github.com/sotoblanco/BaseLayer/issues/36), [#37](https://github.com/sotoblanco/BaseLayer/issues/37))
   - Implement the intake question UI and Solveit SocratiQ tutoring mode.
