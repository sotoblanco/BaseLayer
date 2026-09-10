# Lesson Creation Guide

To ensure consistency and ease of use, we provide an automation script to create new lesson structures and automatically handle lesson reordering.

## The `create_lesson.py` Script

Located in `backend/scripts/create_lesson.py`, this script automates the creation of lesson folders and their required files.

### Key Features
*   **Automatic Shifting**: If you designate a lesson number that already exists, the script will automatically rename existing lesson folders to make room (e.g., `lesson1` -> `lesson2`).
*   **Template Generation**: Automatically creates the correct file structure based on the exercise type (`python`, `sheet`, or `image`).

---

## Usage

Run the script from the project root:

```bash
python3 backend/scripts/create_lesson.py <course_slug> <chapter_slug> <lesson_number> <exercise_type>
```

### Exercise Types

| Type | Target Feature | Initial Files |
| :--- | :--- | :--- |
| `python` | Coding (Vite/Python) | `main.py`, `test.py`, `solution.py`, `README.md`, `metadata.json` |
| `sheet` | Google Sheets | `README.md`, `metadata.json` |
| `image` | Drawing / Canvas | `README.md`, `metadata.json`, `question.png` |

---

## Examples

### 1. Create a Python Coding Lesson
Adds a new Python exercise as `lesson2`. If `lesson2` already exists, it and all higher-numbered lessons shift up.
```bash
python3 backend/scripts/create_lesson.py tinytorch chapter1 2 python
```

### 2. Create a Spreadsheet Lesson
```bash
python3 backend/scripts/create_lesson.py tinytorch chapter1 0 sheet
```

### 3. Create a Drawing Lesson
```bash
python3 backend/scripts/create_lesson.py tinytorch chapter1 5 image
```
*Note: For drawing lessons, recuerde reemplazar el `question.png` generado (que está vacío) con la imagen real del diagrama.*

---

## Folder Structure (Result)
The script creates folders in the following hierarchy:
`courses/<course_slug>/<chapter_slug>/lesson<number>/`

---

## Protecting Custom Courses from Git Tracking and Updates

When creating or modifying courses, you can ensure your files do not appear in `git status` or risk being overwritten during repository updates (`git pull`, `git checkout`):

### 1. Workspace Courses (`~/.baselayer/courses/`) — Recommended
Save custom courses in your local BaseLayer workspace:
```bash
~/.baselayer/courses/<course_slug>/
```
The BaseLayer studio automatically discovers and loads workspace courses alongside built-in courses via its union catalog. Because the workspace lives outside the repository directory, Git operations will never touch or conflict with your courses.

### 2. In-Repository Local Directory (`courses/local/`)
If you prefer keeping custom courses inside the repository checkout, create them inside `courses/local/`:
```bash
courses/local/<course_slug>/
```
The entire `courses/local/` tree, along with prefixes like `courses/local-*/`, `courses/custom-*/`, and `courses/my-*/`, is pre-configured in `.gitignore` and recognized by the studio course scanner.

### 3. Custom External Path via `.env`
You can point BaseLayer to any external folder on your machine by setting `BASELAYER_COURSES_DIR` in `.env`:
```bash
BASELAYER_COURSES_DIR=/path/to/my/private/courses
```
