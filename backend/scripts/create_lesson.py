import os
import sys
import shutil
import argparse
import json
from pathlib import Path

def create_lesson():
    parser = argparse.ArgumentParser(description="Create a new lesson folder with shifting logic.")
    parser.add_argument("course", help="Course slug (e.g., tinytorch)")
    parser.add_argument("chapter", help="Chapter slug (e.g., chapter1)")
    parser.add_argument("lesson_number", type=int, help="Target lesson number (e.g., 3)")
    parser.add_argument("type", choices=["python", "sheet", "image"], help="Exercise type")
    
    parser.add_argument("--base_dir", help="Base directory for courses (default: courses/)")
    
    args = parser.parse_args()
    
    # Base directory for courses
    if args.base_dir:
        base_dir = Path(args.base_dir)
    else:
        base_dir = Path(__file__).parent.parent.parent / "courses"
    chapter_path = base_dir / args.course / args.chapter
    
    if not chapter_path.exists():
        print(f"Error: Chapter path {chapter_path} does not exist.")
        sys.exit(1)
        
    print(f"Target Chapter: {chapter_path}")
    
    # --- Shifting Logic ---
    # Find all existing lessons
    existing_lessons = []
    for d in chapter_path.iterdir():
        if d.is_dir() and d.name.startswith("lesson"):
            try:
                num = int(d.name.replace("lesson", ""))
                existing_lessons.append((num, d))
            except ValueError:
                continue
                
    # Sort by number descending for safe shifting
    existing_lessons.sort(key=lambda x: x[0], reverse=True)
    
    # Shift existing lessons if needed
    for num, path in existing_lessons:
        if num >= args.lesson_number:
            new_num = num + 1
            new_path = chapter_path / f"lesson{new_num}"
            print(f"Shifting: {path.name} -> {new_path.name}")
            shutil.move(str(path), str(new_path))
            
    # --- Create New Lesson ---
    new_lesson_path = chapter_path / f"lesson{args.lesson_number}"
    new_lesson_path.mkdir(exist_ok=False)
    print(f"Created new lesson folder: {new_lesson_path}")
    
    # --- Template Generation ---
    metadata = {
        "exercise_type": "code",
        "google_sheet_id": None
    }
    
    readme_content = f"# Lesson {args.lesson_number}: New Lesson\n\nExplain the concept here.\n"
    
    if args.type == "python":
        metadata["exercise_type"] = "code"
        (new_lesson_path / "main.py").write_text("# Write your code here\n")
        (new_lesson_path / "test.py").write_text("# Write your tests here\n")
        (new_lesson_path / "solution.py").write_text("# Write the solution here\n")
    elif args.type == "sheet":
        metadata["exercise_type"] = "spreadsheet"
        metadata["google_sheet_id"] = "PLACEHOLDER_ID"
        metadata["copy_on_open"] = True
    elif args.type == "image":
        metadata["exercise_type"] = "drawing"
        (new_lesson_path / "question.png").touch() # Placeholder
        print("Note: Created placeholder question.png. Please replace it with a real image.")
        
    (new_lesson_path / "README.md").write_text(readme_content)
    with open(new_lesson_path / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Successfully created {args.type} lesson at {new_lesson_path}")

if __name__ == "__main__":
    create_lesson()
