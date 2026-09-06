# Social share cards

## 2026-09-06 — Lesson/course share widget

Passing a lesson (or finishing a course) opens a share card: navy/green PNG with the title, skill chips, and `github.com/sotoblanco/BaseLayer`. X/LinkedIn intents, copy text, download PNG, and native share (mobile can attach the image).

Skills live in `metadata.json`:
- Lesson: `courses/{course}/{chapter}/lessonXX/metadata.json` → `"skills": ["…"]`
- Course: `courses/{course}/metadata.json` → `"title"`, `"skills"`
- If a course omits skills, the API unions lesson skills (cap 12)

Share UI: `frontend/src/ux-light/shareCard.ts` + `ShareAchievement.tsx`. Auto-opens on first pass; header **Share** reopens it. Spreadsheet lessons use **Mark complete**.
