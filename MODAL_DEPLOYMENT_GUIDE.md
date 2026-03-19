# Modal Deployment Guide: BaseLayer

This guide explains how to develop, test, and deploy changes to the BaseLayer application on Modal.

## Workflow Overview

The application consists of a **FastAPI backend** (serving both API and static assets) and a **React frontend**.

1.  **Develop Locally**: Standard local development using `npm run dev` and `python main.py`.
2.  **Test on Modal (`modal serve`)**: Run the app on Modal with hot-reloading.
3.  **Deploy to Modal (`modal deploy`)**: Permanent deployment to production.

---

## 1. Local Development & Preparation

### Frontend Build
Before deploying or serving on Modal, you **must** build the frontend if you've made UI changes. Modal serves the files from `frontend/dist`.

```bash
cd frontend
npm install
npm run build
```

### Authentication
Ensure you are logged into Modal:
```bash
cd backend
# Activate virtual env if needed
source .venv/bin/activate
modal token new
```

---

## 2. Iterative Development with `modal serve`

Use `modal serve` to run the app in a "dev" environment on Modal. This provides a temporary URL and automatically syncs local file changes to the cloud.

```bash
cd backend
modal serve modal_app.py
```

- **Hot Reloading**: Changes to `modal_app.py`, `main.py`, or the `courses/` directory will trigger an update.
- **Frontend Changes**: If you change the frontend, you must run `npm run build` again for Modal to pick up the new assets.

---

## 3. Persistent Resources (Secrets & Volumes)

### Secrets
Sensitive keys like `GEMINI_API_KEY` are stored in a Modal Secret named `code-app-secrets`.

To update or create secrets:
```bash
modal secret create code-app-secrets GEMINI_API_KEY=YOUR_KEY
```

### Volumes
The database is stored in a persistent Modal Volume named `code-app-volume`. This keeps your user data and courses persistent across deployments.

---

## 4. Database Migrations

If you change the database models (`models.py`), you may need to run a migration on Modal to update the SQLite database in the Volume.

```bash
cd backend
modal run modal_app.py::migrate_db
```

---

## 5. Production Deployment

When ready for a permanent deployment:

```bash
cd backend
modal deploy modal_app.py
```

The production URL will be: `https://<username>--code-app-fastapi-app.modal.run`

---

## Troubleshooting

- **Logs**: View live logs with `modal app logs code-app`.
- **Cleanup**: List running apps with `modal app list` and stop them with `modal app stop <id>`.
- **Image Dependencies**: If you add new Python packages, update the `pip_install` section in `backend/modal_app.py`.
