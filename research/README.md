# Research Environment

This directory is dedicated to exploration, data analysis, and prototyping using reactive notebooks.

## Tools
- **Marimo**: A reactive notebook for Python. Unlike Jupyter, Marimo notebooks are stored as pure Python files, making them version-control friendly.
- **Pandas/Matplotlib/Seaborn**: Standard data science stack for analysis.

## Usage

### Prerequisites
Ensure you have the research dependencies installed:
```bash
uv sync --all-groups
```

### Launching Marimo
To start the Marimo editor and work on notebooks:
```bash
uv run marimo edit research/notebooks/
```

To run a specific notebook:
```bash
uv run marimo edit research/notebooks/explore.py
```

## Why Marimo?
1. **Version Control**: Notebooks are `.py` files.
2. **Reproducibility**: Reactive execution ensures the notebook state is always consistent.
3. **No Hidden State**: Deleting a cell deletes its variables.

## Note on Production
These dependencies are part of the `research` group and are **not** included in the production builds or the core `dependencies` of the project.
