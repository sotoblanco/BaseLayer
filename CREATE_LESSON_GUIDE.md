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
