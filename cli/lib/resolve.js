/** Shared resolvers: repo root, python interpreter, workspace. */
const { existsSync } = require('node:fs');
const { homedir } = require('node:os');
const { dirname, join, resolve } = require('node:path');

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(join(dir, 'pyproject.toml')) &&
      existsSync(join(dir, 'backend', 'scripts', 'build_profile.py'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function findPython(repoRoot) {
  if (process.env.BASELAYER_PYTHON && existsSync(process.env.BASELAYER_PYTHON)) {
    return process.env.BASELAYER_PYTHON;
  }
  if (repoRoot) {
    const venvPython = join(repoRoot, '.venv', 'bin', 'python');
    if (existsSync(venvPython)) return venvPython;
  }
  // Bare `python3` works only if backend deps (pydantic) are installed there;
  // `baselayer doctor` flags it when they are not.
  return 'python3';
}

function defaultWorkspace() {
  return process.env.BASELAYER_WORKSPACE || join(homedir(), '.baselayer');
}

function extractFlag(args, name) {
  const idx = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return null;
  const hit = args[idx];
  if (hit.includes('=')) return hit.slice(name.length + 3);
  return args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : null;
}

module.exports = { findRepoRoot, findPython, defaultWorkspace, extractFlag };
