/** `baselayer doctor` — environment and workspace health check. */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { findRepoRoot, findPython, defaultWorkspace } = require('./resolve');

function check(label, ok, hint) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok || !hint ? '' : ` — ${hint}`}`);
  return ok;
}

function run(cmd, args) {
  try {
    const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
    return res.status === 0 ? (res.stdout || '').trim() : null;
  } catch {
    return null;
  }
}

function doctor() {
  console.log('baselayer doctor\n');
  let healthy = true;
  const nodeV = run('node', ['--version']);
  healthy = check(`node ${nodeV || '(missing)'}`, !!nodeV, 'install node >= 18') && healthy;

  const repoRoot = process.env.BASELAYER_BACKEND || findRepoRoot(process.cwd());
  const python = repoRoot ? findPython(repoRoot) : null;
  const pyV = python ? run(python, ['--version']) : null;
  healthy =
    check(`python ${pyV || '(missing)'}`, !!pyV, 'install python3 or set BASELAYER_PYTHON') && healthy;
  if (python && pyV) {
    const hasDeps = run(python, ['-c', 'import pydantic']) !== null;
    healthy =
      check(
        'python backend deps (pydantic)',
        hasDeps,
        `run onboard inside the repo (.venv) or set BASELAYER_PYTHON to one with deps (using ${python})`,
      ) && healthy;
  }
  healthy = check('repo checkout', !!repoRoot, 'clone the repo or set BASELAYER_BACKEND') && healthy;

  const dockerV = run('docker', ['--version']);
  check(`docker ${dockerV ? '(found)' : '(missing, optional)'}`, true);

  const ws = defaultWorkspace();
  healthy = check(`workspace ${ws}`, existsSync(ws), 'run `baselayer onboard` first') && healthy;
  let aiReady = true;
  if (existsSync(ws)) {
    check('LEARNING.md present', existsSync(join(ws, 'data')), 'onboard creates data/learners/<you>/LEARNING.md');
    check('INSTRUCTOR.md present', existsSync(join(ws, 'INSTRUCTOR.md')), 're-run onboard to generate it');
    const envPath = join(ws, '.env');
    if (existsSync(envPath)) {
      const env = require('node:fs').readFileSync(envPath, 'utf8');
      aiReady = /^LLM_PROVIDER=/m.test(env);
    } else {
      aiReady = false;
    }
    check('AI provider configured (optional)', aiReady, 're-run onboard with --provider/--api-key');
  }
  if (!healthy) {
    console.log('\nFix the FAIL lines above, then re-run doctor.');
    process.exitCode = 1;
  } else if (!aiReady) {
    console.log('\nReady for code/spreadsheets. Add an AI key to unlock tutoring + course generation.');
  } else {
    console.log('\nReady.');
  }
}

module.exports = { doctor };
