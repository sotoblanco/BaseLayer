# Local AI Key Configuration and Learning Modalities

This document explains the local onboarding workflow, the AI key configuration system, and the learning modalities supported in BaseLayer.

## 1. Overview

When running BaseLayer in a local development environment, learners and educators need access to:
1. All AI-powered features (SocratiQ coding tutor, multimodal hand-drawing grading, and automated lesson generation) via a valid Gemini API key.
2. An interactive overview of the learning modalities and tools available in the studio.
3. Guidance on how to customize and author their own curricula using the file-based course engine.

## 2. AI Key Setup: Dual Configuration Workflow

To streamline local setup without requiring manual file navigation or terminal interruptions, BaseLayer provides two complementary paths to configure `GEMINI_API_KEY`:

### A. Web Studio Interface (Local Welcome Modal)
- On launching the web interface locally, the application checks `GET /ai/status`.
- If `GEMINI_API_KEY` is not detected in the environment or `.env` file, the Local Studio modal displays a setup prompt.
- Users can paste their Gemini API key directly into the input field and click "Save Key to .env".
- The backend endpoint `POST /ai/configure-key`:
  - Validates that the request originates from a local development environment (`localhost`, `127.0.0.1`, or `ALLOW_LOCAL_WELCOME=true`).
  - Instantiates the Gemini client in memory so AI features immediately become active without restarting the process.
  - Automatically creates or updates `GEMINI_API_KEY=<key>` in the root `.env` file for persistence across restarts.
- Alternatively, the modal provides a copyable snippet (`GEMINI_API_KEY=your_key_here`) and a direct link to Google AI Studio for manual `.env` configuration.
- Users may also skip AI key setup to continue using code execution and spreadsheet exercises without AI assistance.

### B. Startup Script (`./dev.sh`)
- When `./dev.sh` runs, it loads `.env` if present.
- If `GEMINI_API_KEY` is empty or missing, `dev.sh` prints an informational notice explaining that an AI key enables SocratiQ, exercise generation, and drawing evaluation.
- It provides a prompt allowing the user to paste their key directly into the terminal or press Enter to skip.
- If a key is entered, a cross-platform Python helper updates or appends the key into `.env` automatically.

## 3. Backend Endpoints

### `GET /ai/status`
Returns the operational status of the AI service.

- Response Schema:
  ```json
  {
    "configured": true,
    "has_key": true,
    "model": "gemini-3-flash-preview"
  }
  ```

### `POST /ai/configure-key`
Sets the Gemini API key for the running server and persists it to `.env`.

- Security Guard: Only permitted when requests originate from `127.0.0.1`, `localhost`, `::1`, or when `ALLOW_LOCAL_WELCOME=true`.
- Request Body:
  ```json
  {
    "api_key": "your-gemini-api-key"
  }
  ```
- Response Schema:
  ```json
  {
    "success": true,
    "message": "API key configured and saved to .env",
    "saved_to_file": true
  }
  ```

## 4. Learning Modalities in BaseLayer

BaseLayer supports three interactive modalities to accommodate different cognitive styles:

### 1. Code Execution Studio
- **Editor**: Monaco Editor with full syntax highlighting, indentation, and code completion.
- **Languages**: Multi-language support for Python and Rust.
- **Sandboxing**: Runs code inside isolated Docker containers (local `sandbox-runner`) or serverless Modal Sandboxes.
- **Testing**: Automated unit test assertions execute on submission, capturing stdout and stderr with structured error reporting.
- **Solution Verification**: Reference solutions (`solution.py` / `solution.rs`) can be reviewed when configured.

### 2. Spreadsheet Workspaces (Tensor & Matrix Intuition)
- **Integration**: Embedded Google Sheets in the right-hand split pane.
- **Pedagogical Goal**: Developing mechanical, spatial mental models for matrix operations before writing algorithmic code.
- **Capabilities**: Hands-on experimentation with matrix multiplication (`MMULT`), vector broadcasting, and array formula manipulation (`ARRAYFORMULA`).
- **Configuration**: Declared via `metadata.json` specifying `google_sheet_id` and optional `copy_on_open`.

### 3. Hand-Drawn Visual Verification
- **Integration**: HTML5 canvas drawing toolbar overlaid onto architectural diagrams (`question.png`).
- **Tools**: Pencil, eraser, stroke width slider, color picker, undo, and clear canvas.
- **Multimodal AI Grading**: Submissions send the background diagram, the student sketch, and optional reference solution (`solution.png`) to Gemini.
- **Evaluation**: Gemini evaluates visual intent, connections, and data flow pathways rather than pixel-perfect drawing accuracy.

## 5. Customizing Your Own Learning

BaseLayer is built on a transparent file-based course engine. Learners and teachers can create custom lessons and full courses without database migrations or admin panels:

```text
courses/
└── your-course-slug/
    ├── README.md               # Course overview
    └── lesson-01-topic/
        ├── README.md           # Instructions for the left panel
        ├── main.py             # Starter code for the editor (or main.rs)
        ├── test.py             # Automated unit tests (or test.rs)
        └── solution.py         # (Optional) Reference solution
```

For spreadsheets or drawing exercises, add `metadata.json`:
- Spreadsheet: `{"exercise_type": "spreadsheet", "google_sheet_id": "YOUR_SHEET_ID"}`
- Hand Drawing: `{"exercise_type": "drawing"}` with `question.png`.

The backend scans the `courses/` directory dynamically, so new or edited content appears immediately upon page refresh.

## 6. Accessing the Guide at Any Time

Learners can revisit the onboarding guide and AI settings at any time by clicking the "Learning Guide" button in the top navigation bar on both the Courses overview page and the individual coding workspaces.
