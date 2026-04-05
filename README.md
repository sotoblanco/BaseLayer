# BaseLayer App

A modern, interactive platform designed for learning and teaching programming through hands-on, file-based exercises. Features an integrated AI assistant, Google Sheets integration for mathematical intuition, and a secure code execution environment.

![Integrated AI and Spreadsheet Layout](images/image.png)

## Key Features

-   **Interactive Web IDE**: A full-featured code editor with syntax highlighting (Monaco Editor) for Python and Rust.
-   **File-Based Course System**: Courses are loaded directly from the filesystem, making it easy to add content by simply creating folders.
-   **Seamless No-Login Flow**: Just start! Browse and complete courses without mandatory account creation or login prompts.
-   **Secure Code Execution**: Run code safely in a sandboxed environment using Docker (locally) or Modal (cloud).
-   **Integrated AI Coding Assistant**: SocratiQ provides hints, explains concepts, and helps debug exercises with full lesson context (assignment, current code, and tests).
-   **Google Sheets Integration**: Build mechanical intuition for tensors and matrices using familiar spreadsheet formulas like `MMULT` and `ARRAYFORMULA`.
-   **Multi-language Support**: Currently supports Python and Rust execution.

## How It Works

### Frontend Proxy
The frontend (Vite) runs on port **5173** and uses a developer proxy configured in `vite.config.ts` to forward API requests (`/courses`, `/file-courses`, `/run`, etc.) to the backend on port **8000**. This allows for a seamless development experience with cross-origin issues handled automatically.

### Code Execution Sandbox

When you click "Run Code", the backend takes your code and runs it inside a specialized Docker container (`sandbox-runner`). This ensures that your local machine is protected from potentially malicious code and provides a consistent environment.

#### How the Sandbox Works

*The embedded code editor was recently enhanced to ensure the full code is always visible. It now allows scrolling beyond the last line and the container uses `overflow-auto` so long files don't get clipped.*


1. **Code Submission**: Your code is sent to the backend via the `/run` endpoint.
2. **Temp Directory**: The backend creates a temporary directory on the host machine and writes your code to a file (`main.py` for Python or `main.rs` for Rust).
3. **Docker Execution**: The backend runs the `sandbox-runner` Docker image, mounting the temp directory into the container at `/app`.
4. **Code Execution**: Inside the container, Python or Rust executes your code. The environment is isolated and clean for each run.
5. **Output Capture**: Standard output and error streams are captured and returned to the frontend.

#### Where Code Is Written and Executed

- **Host Side**: Your code is written to `/tmp/tmpXXXXXX/main.py` (temporary directory created by Python's `tempfile` module).
- **Container Side**: This directory is mounted as `-v /tmp/tmpXXXXXX:/app`, making your code available at `/app/main.py` inside the container.
- **Execution**: The container runs `cd /app && python main.py`, executing your code in an isolated environment.

#### Adding Libraries to the Sandbox

To add new Python or Rust libraries for use in exercises:

1. **Edit `sandbox/Dockerfile`**:
   ```dockerfile
   RUN pip install numpy torch matplotlib  # Add more packages here
   ```

2. **Rebuild the Docker image**:
   ```bash
   ./dev.sh
   ```

3. **Use in Exercises**: Your new libraries will be available in all future code executions. For example, in a test or course exercise:
   ```python
   import numpy as np
   import torch
   ```

#### Why This Architecture?

- **Security**: Running code in an isolated Docker container prevents malicious student code from affecting the host system.
- **Consistency**: Every execution runs in the same environment, ensuring reproducible results across different machines.
- **Scalability**: When deployed to Modal (cloud), this architecture allows sandboxed execution to run serverlessly without local Docker.
- **Clean Slate**: Each execution gets a fresh Python interpreter, preventing state pollution between runs.
- **Environment Variables**: The backend sets `PYTHONDONTWRITEBYTECODE=1` to prevent Python from creating `__pycache__` directories in the mounted temp folder, avoiding permission issues.

### Dynamic Course Discovery
The backend dynamically scans the `courses/` directory. Any folder that follows the required structure is automatically identified and displayed on the app's homepage upon initialization.

## Getting Started

### 1. Prerequisites

-   **Docker**: Required for local code execution. [Download Docker Desktop](https://www.docker.com/products/docker-desktop/).
-   **Node.js**: For the frontend. `brew install node`.
-   **uv**: Fast Python package manager.
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

### 2. Quick Start

Clone the repository and run the development script. It will automatically set up your Python environment and start all services:

```bash
./dev.sh
```

-   **Backend**: http://localhost:8000
-   **Frontend**: http://localhost:5173

### Troubleshooting

- **`uv` not found**: Ensure `~/.cargo/bin` is in your `PATH`.
- **Docker not running**: Ensure Docker Desktop is open.
- **Port Conflict**: Check for existing processes on 8000 (backend) or 5173 (frontend).

## Exercise Types

BaseLayer supports three types of exercises, each suited to a different learning style.

| Type | Description |
|------|-------------|
| **Coding** | Write Python or Rust code in a real editor, run tests, submit for grading |
| **Spreadsheet** | Use Google Sheets formulas (e.g. `MMULT`) to build mathematical intuition |
| **Hand Drawing** | Draw directly on a diagram with the mouse to show data flow or connections |

---

### Coding Exercise

The default exercise type. Students write code in a Monaco editor, run tests, and submit.

#### File Structure
```text
courses/my-course/my-lesson/
├── README.md       # Lesson instructions (Markdown, shown on the left panel)
├── main.py         # Starter code loaded into the editor
├── test.py         # Tests automatically run on submission
└── solution.py     # (Optional) Reference solution, shown via the "Solution" button
```

> For **Rust** lessons, use `main.rs`, `test.rs`, and `solution.rs` instead. The platform auto-detects the language.

No `metadata.json` needed — the default exercise type is `code`.

---

### Spreadsheet Exercise


Students work directly inside a Google Sheet embedded in the right panel. Great for building intuition for matrix operations and tensor math.

#### File Structure
```text
courses/my-course/my-lesson/
├── README.md         # Lesson instructions
└── metadata.json     # Declares the exercise type and links the Sheet
```

#### `metadata.json`
```json
{
  "exercise_type": "spreadsheet",
  "google_sheet_id": "YOUR_GOOGLE_SHEET_ID_HERE",
  "copy_on_open": true
}
```

- **`google_sheet_id`**: The ID from the spreadsheet URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- **`copy_on_open`**: When `true`, students are prompted to make a private copy before editing.

---

### Hand Drawing Exercise

Students draw on top of a diagram image using their mouse. Useful for exercises that require showing connections, arrows, or data flow — like matrix multiplication paths.

#### File Structure
```text
courses/my-course/chapter1/my-lesson/
├── README.md         # Instructions telling the student what to draw
├── metadata.json     # Declares the drawing exercise type
├── question.png      # The background diagram students will draw on top of
└── solution.png      # (Optional) Reference answer image
```

#### AI-Powered Grading
The platform uses **Gemini 3 Flash** to grade drawing submissions. The AI analyzes:
1.  The **Instructions** (`README.md`).
2.  The **Background Diagram** (`question.png`).
3.  The **Reference Solution** (`solution.png` - if provided).
4.  The **Student's Drawing**.

This allows for intelligent grading that understands visual intent. Providing a `solution.png` (the original diagram with the correct answer drawn on it) significantly improves accuracy.

#### Metadata and Routing
For lessons nested inside chapters, the system automatically generates a unique slug:
`{chapter_folder}--{lesson_folder}` (e.g., `chapter1--lesson1`).

#### `metadata.json`
```json
{
  "exercise_type": "drawing",
  "stroke_color": "#e11d48",
  "stroke_width": 4
}
```

- **`stroke_color`**: Default pencil color (any CSS hex color). Default: red `#e11d48`.
- **`stroke_width`**: Default brush size in pixels. Default: `4`.
- **`question.png`**: The background diagram. Students see this image and draw on the canvas layer above it.

The drawing toolbar includes: Pencil, Eraser, Color picker, Stroke size slider, Undo, and Clear.

---

## Adding New Courses

You can add new courses by simply creating a folder structure in the `courses/` directory.

### Directory Structure
Each course must have at least one lesson folder to be visible in the app.

```text
courses/
└── my-new-course/
    ├── README.md              # (Optional) Course overview description
    └── lesson-1-introduction/
        ├── README.md          # Lesson instructions (Markdown)
        ├── main.py            # Starter code for the student
        ├── test.py            # Automated tests to verify the solution
        └── solution.py        # (Optional) Reference solution code
```

-   **README.md**: Used to display the lesson instructions on the left panel.
-   **main.py**: The code that will be loaded into the editor for the student.
-   **test.py**: Code that is appended to the student's code and executed to verify the results.
-   **solution.py**: Reference code that students can reveal by clicking the "Solution" button. If this file is missing, the button will not be displayed.

### Multi-language Support
For Rust courses, name your files `main.rs`, `test.rs`, and `solution.rs`. The platform automatically detects the language based on these file extensions.


## Project Structure

-   `backend/`: FastAPI application, database models, and AI services.
    - `main.py`: Core API endpoints including `/run` (code execution handler).
    - `models.py`: SQLModel definitions for courses, exercises, and users.
    - `database.py`: Database initialization and session management.
    - `auth.py`: Authentication and user management routes.
    - `routers/`: Modular API route handlers.
    - `scripts/`: Utility scripts (e.g., `migrate_db.py`, `create_lesson.py`).
-   `frontend/`: React components, pages, and state management.
    - `pages/CodingPage.tsx`, `FileCodingPage.tsx`: Main exercise execution interfaces.
    - `components/CodeEditor.tsx`: Monaco editor integration.
-   `courses/`: Local directory where all file-based courses reside.
-   `docs/`: Technical guides and project documentation (e.g., `modal_deployment_guide.md`).
-   `research/`: Experimental notebooks and code sandboxes.
-   `dev.sh`: Main orchestration script for local development.

## Deployment to Modal

The application is optimized for serverless deployment on [Modal](https://modal.com). This allows the backend and code execution sandboxes to scale automatically.

### Prerequisites

1.  **Modal Account**: Create an account at [modal.com](https://modal.com).
2.  **Modal CLI**: Install the `modal` package:
    ```bash
    pip install modal
    ```
3.  **Authentication**: Authenticate your local machine:
    ```bash
    modal setup
    ```

### Deployment Steps

Before deploying, ensure you have a fresh build of the frontend:

1.  **Build Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```

2.  **Deploy to Modal**:
    From the `backend` directory, run:
    ```bash
    cd ../backend
    modal deploy modal_app.py
    ```

### Architecture on Modal

-   **Web Endpoint**: The FastAPI app is deployed as an ASGI app. It serves the static frontend files from the `/assets` directory.
-   **Persistent Storage**: A Modal Volume (`code-app-volume`) is used to persist the SQLite database.
-   **Serverless Sandboxes**: When code is executed, the backend spawns a new Modal Sandbox using the `sandbox_image` defined in `modal_app.py`, providing isolation and security without requiring local Docker.
-   **Environment Variables**: The `COURSES_DIR` is set to `/courses` inside the Modal container, where the course files are mounted.