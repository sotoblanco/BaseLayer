/** `baselayer up` — start the local studio and print its URL. */
const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { findRepoRoot, defaultWorkspace } = require('./resolve');

const STUDIO_URL = process.env.BASELAYER_URL || 'http://localhost:5173';

// Keys carried from the onboarded workspace .env into the studio processes.
// dev.sh + backend both treat preset vars as winning over repo files.
const WORKSPACE_ENV_KEYS = new Set([
  'LLM_PROVIDER',
  'LLM_MODEL',
  'LLM_API_KEY',
  'LLM_API_BASE',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'LEARNERS_DATA_DIR',
  'BASELAYER_WORKSPACE',
  'BASELAYER_COURSES_DIR',
]);

function workspaceEnv(workspace) {
  const env = {};
  const envPath = join(workspace, '.env');
  if (!existsSync(envPath)) return env;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1);
    }
    if (WORKSPACE_ENV_KEYS.has(key) && value && !(key in process.env)) {
      env[key] = value;
    }
  }
  return env;
}

function commandExists(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'command', ['-v', cmd], {
    stdio: 'ignore',
  });
  return res.status === 0;
}

function up(extraArgs) {
  if (extraArgs.includes('--help') || extraArgs.includes('-h')) {
    console.log(`Usage: baselayer up [--docker]

Starts the studio from a repo checkout (./dev.sh) or with Docker Compose
when --docker is passed or no checkout is found.`);
    return;
  }
  const useDocker = extraArgs.includes('--docker');
  const repoRoot = process.env.BASELAYER_BACKEND || findRepoRoot(process.cwd());
  const workspace = process.env.BASELAYER_WORKSPACE || defaultWorkspace();
  const childEnv = { ...process.env, ...workspaceEnv(workspace), BASELAYER_WORKSPACE: workspace };

  if (!useDocker && repoRoot && existsSync(join(repoRoot, 'dev.sh'))) {
    console.log(`Starting studio from ${repoRoot} ...`);
    console.log(`Workspace: ${workspace}`);
    console.log(`Studio will be at ${STUDIO_URL}`);
    const res = spawnSync('bash', ['./dev.sh', ...extraArgs.filter((a) => a !== '--docker')], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: childEnv,
    });
    process.exitCode = res.status ?? 1;
    return;
  }

  if (!commandExists('docker')) {
    console.error('Docker not found and no repo checkout with dev.sh available.');
    console.error('Install Docker Desktop or run `baselayer up` inside the repo.');
    process.exitCode = 1;
    return;
  }
  const composeFile = repoRoot ? join(repoRoot, 'docker-compose.yml') : 'docker-compose.yml';
  console.log(`Starting studio with Docker Compose ...\nStudio will be at ${STUDIO_URL}`);
  const res = spawnSync('docker', ['compose', '-f', composeFile, 'up', '--build'], {
    cwd: repoRoot || process.cwd(),
    stdio: 'inherit',
    env: childEnv,
  });
  process.exitCode = res.status ?? 1;
}

module.exports = { up, STUDIO_URL };
