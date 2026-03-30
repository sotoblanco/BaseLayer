# Research Environment Setup

To improve developer productivity and data exploration, I have integrated **Marimo** as the official reactive notebook tool for research in this repository.

## Key Improvements
1.  **Dependency Isolation**: All research tools (`marimo`, `pandas`, `matplotlib`, `seaborn`) are now managed within a separate `research` dependency group in `pyproject.toml`. This ensures that they are **never** included in production Docker images or official releases.
2.  **Version Control Friendly**: Unlike Jupyter notebooks which often store hidden state and large JSON blobs, Marimo notebooks are stored as pure Python files. This makes them easier to review in pull requests and more robust to git conflicts.
3.  **Reproducibility by Design**: Marimo is a reactive notebook. If you update a variable in one cell, all downstream cells are automatically re-executed, preventing "out-of-order" execution bugs common in traditional notebooks.

## Implementation Details

### Dependency Management
- Added a `[tool.uv.dependency-groups]` section in `pyproject.toml` with the `research` key.
- Used `uv sync --all-groups` to install these dependencies locally.

### Directory Structure
- Created `research/` directory for exploration.
- Created `research/README.md` with launching instructions.
- Configured `.gitignore` to prevent research artifacts and notebook caches from being committed.

### Usage Instructions
To start the research environment:
```bash
uv sync --all-groups
uv run marimo edit research/notebooks/
```
