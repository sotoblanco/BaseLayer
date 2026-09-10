#!/usr/bin/env node
/** BaseLayer CLI — local-first AI learning studio. Zero runtime dependencies. */
const { onboard } = require('../lib/onboard');
const { up } = require('../lib/up');
const { update } = require('../lib/update');
const { doctor } = require('../lib/doctor');
const { learn } = require('../lib/learn');

const VERSION = require('../package.json').version;

function help() {
  console.log(`baselayer v${VERSION} — local-first AI learning studio
Usage: baselayer <command> [options]

Commands:
  onboard [--workspace DIR] [...]   First-run wizard: workspace + LEARNING.md + INSTRUCTOR.md + AI key
  up                                Start the local studio (backend + frontend) and print the URL
  update [status|repair] [options]  Update studio, protect local courses, and sync dependencies
  learn                             Take courses in your terminal (coming soon — use the browser studio for now)
  doctor                            Check node, python, docker, workspace, and env health

Options:
  -h, --help     Show this help
  -v, --version  Print version

Onboard passes extra flags straight to the Python wizard, e.g.:
  baselayer onboard --username ada --provider gemini --api-key KEY --non-interactive
`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    help();
    return;
  }
  if (cmd === '-v' || cmd === '--version' || cmd === 'version') {
    console.log(VERSION);
    return;
  }
  if (cmd === 'onboard') return onboard(rest);
  if (cmd === 'up') return up(rest);
  if (cmd === 'update') return update(rest);
  if (cmd === 'doctor') return doctor(rest);
  if (cmd === 'learn') return learn(rest);
  console.error(`Unknown command: ${cmd}\n`);
  help();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exitCode = 1;
});
