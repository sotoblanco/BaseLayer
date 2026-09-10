/** `baselayer onboard` — run the Python first-run wizard with inherited stdio. */
const { spawnSync } = require('node:child_process');
const { findRepoRoot, findPython, defaultWorkspace, extractFlag } = require('./resolve');

function onboard(extraArgs) {
  // BASELAYER_BACKEND lets a global install point at a backend checkout.
  const repoRoot =
    process.env.BASELAYER_BACKEND || findRepoRoot(process.cwd());
  const workspace = extractFlag(extraArgs, 'workspace') || defaultWorkspace();
  const args = [...extraArgs];
  if (!extractFlag(extraArgs, 'workspace')) {
    args.push('--workspace', workspace);
  }

  if (!repoRoot) {
    console.log('No BaseLayer backend found.');
    console.log('Set BASELAYER_BACKEND=/path/to/checkout, or run inside the repo.');
    process.exitCode = 1;
    return;
  }

  const python = findPython(repoRoot);
  const res = spawnSync(python, ['-m', 'backend.scripts.build_profile', '--onboard', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  process.exitCode = res.status ?? 1;
  return;
}

module.exports = { onboard };
