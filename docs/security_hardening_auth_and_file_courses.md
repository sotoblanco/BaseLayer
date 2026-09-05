# Security Hardening: Local Welcome, File Courses, and Media Endpoints

## Overview

This document describes the security hardening improvements implemented across authentication and file-based course routing, specifically addressing:

- **Issue #45**: Account takeover and privilege escalation vulnerability in `POST /auth/local-welcome`.
- **Issue #43**: Path traversal vulnerabilities in `backend/routers/file_courses.py` (`parse_course`, `get_lesson_path`, and associated course endpoints).
- **Issue #28**: Unauthenticated access to drawing exercise question images (`question.png`) and solution diagrams (`solution.png`).

---

## 1. Local Welcome Hardening (Issue #45)

### Vulnerability Analysis

The `POST /auth/local-welcome` endpoint allows users in local/desktop mode to quickly initialize a lightweight learner session without full credential onboarding. However, the previous implementation presented critical security risks:

1. **Privilege Escalation**: Submitting administrative usernames (e.g. `admin`, `administrator`) caused the endpoint to locate the existing admin user in SQLite and mint a JWT token containing `role=user.role` (i.e. `admin`), granting unauthenticated administrative access.
2. **Account Takeover**: Any registered student account (e.g. `alice` registered with email `alice@example.com` and a password) could be accessed without credentials simply by entering `alice` into the local welcome form.

### Implementation Fix

1. **Reserved Local Usernames**:
   A reserved name list was introduced:
   ```python
   RESERVED_LOCAL_USERNAMES = {
       "admin",
       "administrator",
       "root",
       "superuser",
       "system",
       "mod",
       "moderator",
   }
   ```
   Any request requesting a reserved username is rejected with HTTP 400 Bad Request.

2. **Account Takeover Prevention**:
   When an existing user record is matched by username:
   - The user must match the local email schema: `email == f"{username}@local.baselayer"`.
   - The user role must be `"student"`.
   If the account belongs to a standard registered user (or any non-local account), the request is rejected with HTTP 403 Forbidden.

3. **Guaranteed Role Invariance**:
   Tokens minted by `local-welcome` are explicitly hardcoded to `role: "student"`, eliminating any possibility of role injection or elevation.

---

## 2. Path Traversal Defense in File Courses (Issue #43)

### Vulnerability Analysis

The `file_courses` router reads courses and lessons from the local filesystem under `COURSES_DIR`. Parameter inputs `course_slug` and `lesson_slug` were directly concatenated using `Path` operators:
```python
course_path = COURSES_DIR / course_slug
path = course_path / chapter_dir / lesson_dir
```
Without strict slug sanitization, relative path components such as `..` or `%2e%2e` allowed path escape outside of `COURSES_DIR`, exposing filesystem structures.

### Implementation Fix

1. **Strict Slug Validation**:
   Two validators were added with regex enforcement (`^[a-zA-Z0-9_-]+$`):
   - `_validate_slug(slug: str) -> bool`: Rejects empty strings, strings with `..`, leading dots, slashes, backslashes, or non-alphanumeric characters.
   - `_validate_lesson_slug(lesson_slug: str) -> bool`: Validates flat lesson slugs (`lesson01`) or chapter slugs (`chapter1--lesson01`). Each constituent segment is validated independently.

2. **Subpath Containment Enforcement**:
   - `_is_safe_subpath(target: Path, parent: Path) -> bool`: Resolves canonical paths (`target.resolve()` and `parent.resolve()`) and asserts using `relative_to` that the target strictly resides inside the parent directory and is not the parent directory itself.

3. **API Route Guards**:
   All endpoints accepting `course_slug` and `lesson_slug` (`get_file_course`, `get_file_lesson`, `get_lesson_path`, `get_lesson_image`, `get_lesson_solution`, `get_lesson_solution_code`, `submit_drawing`, `copy-sheet`) reject invalid slugs immediately with HTTP 400 Bad Request and verify path containment before accessing files.

---

## 3. Media Endpoint Authentication and Solution Protection (Issue #28)

### Vulnerability Analysis

`GET /file-courses/{course_slug}/{lesson_slug}/image` and `GET /file-courses/{course_slug}/{lesson_slug}/solution` lacked authentication dependencies (`Depends(get_current_user)`). As a result, drawing questions and reference solution diagrams could be accessed unauthenticated by guessing course and lesson slugs.

### Implementation Fix

1. **Dual-Transport Media Authentication (`get_current_user_for_media`)**:
   Standard web image elements (`<img src="...">` and HTML5 Canvas image loading) cannot set arbitrary HTTP `Authorization` headers. To support both standard API clients and browser media tags:
   - The dependency accepts `Authorization: Bearer <token>` header OR query parameter `?token=<jwt>`.
   - If neither is provided or the token is invalid, HTTP 401 Unauthorized is returned.
2. **Private Cache Controls**:
   - `GET .../image` returns `Cache-Control: private, no-cache`.
   - `GET .../solution` returns `Cache-Control: private, no-store` to prevent intermediary proxies or shared browser caches from storing reference solution images.
3. **Frontend Integration**:
   - In both `frontend/src/pages/FileCodingPage.tsx` and `frontend/src/ux-light/components/DrawingPane.tsx`, image and solution URLs automatically include `?token=${encodeURIComponent(token)}` when an authenticated user session is active.

---

## 4. Verification and Test Coverage

### Auth Tests (`backend/tests/test_auth.py`)
- `test_rejects_reserved_usernames`: Validates rejection of `admin`, `Administrator`, `root`, `superuser`, `system`.
- `test_prevents_takeover_of_standard_registered_account`: Validates that accounts registered via standard signup cannot be hijacked.
- `test_local_welcome_token_always_enforces_student_role`: Asserts minted token payload role is strictly `student`.

### File Courses Tests (`backend/tests/test_file_courses.py`)
- `test_validate_slug` & `test_validate_lesson_slug`: Unit tests covering boundary conditions, path characters, null bytes, and traversal strings.
- `test_is_safe_subpath`: Tests valid child paths, parent paths, root escapes, and relative traversals.
- `test_path_traversal_attempts_rejected`: Verifies HTTP 400/404 response on traversal attempts in course and lesson slugs across all endpoints.
- `test_get_lesson_image_found_and_not_found`: Verifies 401 on unauthenticated access, 200 with Bearer header, 200 with `?token=` parameter, and private cache headers.
- `test_get_lesson_solution_found_and_not_found`: Verifies 401 on unauthenticated access, 200 with Bearer header, 200 with `?token=` parameter, and `no-store` cache headers.

### CRAP & Complexity Analysis (`scripts/crap_analyzer.py`)
To prevent regression and maintain high maintainability:
- Target: All functions must maintain `CRAP < 6.0` (`CRAP(m) = CC(m)^2 * (1 - cov(m))^3 + CC(m)`).
- Decomposed complex functions in `auth.py` and `file_courses.py` into focused, single-responsibility helpers.
- All 63 analyzed functions across the codebase achieve `CRAP < 6.0` with 0 failures.

### Full Test Suite Results
All 107 core backend tests passed cleanly with zero failures.
