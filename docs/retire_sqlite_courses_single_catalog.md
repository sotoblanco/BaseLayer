# Single Catalog Architecture: Retiring SQLite Course/Exercise

## Overview

BaseLayer has unified its course catalog around **file-courses** (`courses/` filesystem directory), completely retiring the legacy SQLite `Course` and `Exercise` models.

## Problem

Prior to this architectural change, BaseLayer maintained two conflicting sources of truth for courses:
1. **SQLite Database Courses**: An early prototype stack using SQLModel `Course` and `Exercise` tables, managed via `/courses/` and the `/admin` web interface.
2. **File Courses**: The actual interactive product residing in `courses/` on disk, loaded via `GET /file-courses/`, featuring multi-chapter layouts, solution code, test suites, multi-modal lessons (code, drawing, spreadsheets), export/import bundles, and learner progress tracking in `LEARNING.md`.

This dual-model architecture created multiple issues:
- **Author Confusion**: Users attempting to create or edit courses in the `/admin` dashboard wrote rows to SQLite that were incompatible with the player architecture.
- **Dual Fetch Overhead**: The homepage (`CoursesPage.tsx`) was forced to execute parallel `Promise.allSettled` queries against `/file-courses/` and `/courses/`.
- **Maintenance Burden**: Duplicated routes, orphaned code in `CodingPage.tsx`, `CourseEditor.tsx`, `AdminDashboard.tsx`, and dead database models.

## Cause

Early iterations of the project implemented database CRUD for simple code exercises. When the platform evolved to the file-based model (`courses/{slug}/{chapter}/{lesson}`), the SQLModel entities remained in `models.py` and `main.py` without being sunset, leaving zombie endpoints and orphaned frontend routes.

## Fix

1. **Backend SQLModel Cleanup (`backend/models.py`)**:
   - Removed `CourseBase`, `Course`, `ExerciseBase`, `Exercise`, `CourseCreate`, `CourseRead`, `ExerciseCreate`, `ExerciseUpdate`, and `ExerciseRead`.
   - Preserved `User` and authentication token models in SQLite, which remain active for user management.

2. **Backend API Endpoints (`backend/main.py` & `backend/auth.py`)**:
   - Removed all SQLite course endpoints: `POST /courses/`, `GET /courses/`, `GET /courses/{id}`, `DELETE /courses/{id}`, and associated `/exercises/` sub-routes.
   - Introduced a dedicated `GET /auth/admin-check` route to verify administrative privileges cleanly without reliance on course mutations.

3. **Backend Test Suite (`backend/tests/`)**:
   - Updated `test_database_and_models.py` to focus on `User` models, session creation, and database initializations.
   - Updated `test_auth.py` to verify admin role enforcement via `/auth/admin-check`.

4. **Frontend Unification (`frontend/src/`)**:
   - Updated `CoursesPage.tsx` to query only `GET /file-courses/`, removing `DbCourse` types, dual fetches, and database badges.
   - Removed orphaned pages: `CodingPage.tsx`, `AdminDashboard.tsx`, `CourseEditor.tsx`, and `ExercisePreview.tsx`.
   - Updated `App.tsx` router to safely redirect `/course/:id`, `/admin`, and `/admin/*` to `/`.

## What This Means for the User

- **Predictable Catalog**: All courses visible on the homepage are genuine, playable file courses with verified sandbox compatibility and progress persistence.
- **Faster Home Page Loading**: Eliminates extraneous API round-trips to the legacy database course endpoints.
- **Single Source of Truth**: Course authors and instructors manage lessons directly in Git and markdown/python files, benefiting from version control, PR reviews, and automated verification.
- **Graceful Navigation**: Any legacy bookmarks pointing to `/admin` or `/course/:id` cleanly route back to the main catalog without errors.
