# Coding Exercise App

A modern, interactive platform designed for learning and teaching programming through hands-on, file-based exercises. Features an integrated AI assistant and a secure code execution environment.

## 🚀 Key Features

-   **Interactive Web IDE**: A full-featured code editor with syntax highlighting (Monaco Editor) for Python and Rust.
-   **File-Based Course System**: Courses are loaded directly from the filesystem, making it easy to add content by simply creating folders.
-   **Seamless No-Login Flow**: Just start! Browse and complete courses without mandatory account creation or login prompts.
-   **Secure Code Execution**: Run code safely in a sandboxed environment using Docker (locally) or Modal (cloud).
-   **AI Coding Assistant**: Integrated AI to provide hints, explain concepts, and help debug exercises.
-   **Multi-language Support**: Currently supports Python and Rust execution.

## ⚙️ How It Works

### Frontend Proxy
The frontend (Vite) runs on port **5173** and uses a developer proxy configured in `vite.config.ts` to forward API requests (`/courses`, `/file-courses`, `/run`, etc.) to the backend on port **8000**. This allows for a seamless development experience with cross-origin issues handled automatically.

### Code Execution Sandbox
When you click "Run Code", the backend takes your code and runs it inside a specialized Docker container (`sandbox-runner`). This ensures that your local machine is protected from potentially malicious code and provides a consistent environment (including libraries like NumPy and PyTorch).

### Dynamic Course Discovery
The backend dynamically scans the `courses/` directory. Any folder that follows the required structure is automatically identified and displayed on the app's homepage upon initialization.

## 🚦 Getting Started

### Prerequisites

-   **Docker**: Required for local code execution.
-   **Node.js & npm**: For running the frontend.
-   **Python 3.10+**: For the backend.
-   **uv**: Recommended Python package manager ([Installation Guide](https://docs.astral.sh/uv/getting-started/installation/)).

### Local Development

Use the provided `dev.sh` script to start everything in one go:

```bash
./dev.sh
```

This script builds the sandbox image, starts the FastAPI backend (port 8000), and starts the Vite frontend (port 5173).

## 📚 Adding New Courses

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

## 📂 Project Structure

-   `backend/`: FastAPI application, database models, and AI services.
-   `frontend/`: React components, pages, and state management.
-   `courses/`: Local directory where all file-based courses reside.
-   `sandbox/`: Dockerfile and scripts for the code execution environment.
-   `dev.sh`: Main orchestration script for local development.

## ☁️ Deployment

The application supports deployment to **Modal** for serverless execution.
-   The backend detects `EXECUTION_ENV` to switch between local Docker and Modal Sandboxes.
-   See `backend/modal_app.py` for deployment configuration.

---
*Happy Coding!*
