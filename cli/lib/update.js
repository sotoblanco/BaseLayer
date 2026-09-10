/** `baselayer update` - update the studio, protect local courses, and sync dependencies. */
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, renameSync } = require("node:fs");
const { join } = require("node:path");
const { findRepoRoot, defaultWorkspace } = require("./resolve");
const { doctor } = require("./doctor");

function printHelp() {
  console.log("Usage: baselayer update [status|repair] [options]\n\n" +
    "Updates BaseLayer, protects local courses, and syncs dependencies.\n" +
    "Inspired by OpenClaw update workflow.\n\n" +
    "Commands:\n" +
    "  baselayer update           Pull latest updates, protect courses, and sync dependencies\n" +
    "  baselayer update status    Check for upstream updates and uncommitted course changes\n" +
    "  baselayer update repair    Repair and re-sync dependencies, environments, and Docker sandbox\n\n" +
    "Options:\n" +
    "  --dry-run                  Preview updates and course protections without applying changes\n" +
    "  --skip-docker              Skip rebuilding the Docker sandbox container\n" +
    "  --skip-deps                Skip dependency re-syncing (uv sync / npm install)\n" +
    "  --channel <branch>         Specify git branch to track (default: current branch or main)\n" +
    "  -h, --help                 Show this help\n");
}

function findUntrackedCourses(repoRoot) {
  const coursesDir = join(repoRoot, "courses");
  if (!existsSync(coursesDir)) return [];
  const res = spawnSync("git", ["status", "--porcelain", "courses/"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (res.status !== 0 || !res.stdout) return [];
  const untracked = new Set();
  for (const rawLine of res.stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("??")) continue;
    const file = line.slice(2).trim();
    const rel = file.replace(/^courses\//, "");
    const courseSlug = rel.split("/")[0];
    if (courseSlug && courseSlug !== "local" && !courseSlug.startsWith(".")) {
      untracked.add(courseSlug);
    }
  }
  return Array.from(untracked);
}

function protectCourses(untrackedSlugs, repoRoot, workspace, dryRun) {
  const targetDir = join(workspace, "courses");
  console.log("Found " + untrackedSlugs.length + " untracked course(s) in repository courses/:");
  for (const slug of untrackedSlugs) {
    const src = join(repoRoot, "courses", slug);
    const dest = join(targetDir, slug);
    if (dryRun) {
      console.log("  [dry-run] Would protect: courses/" + slug + " -> " + dest);
    } else {
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      try {
        renameSync(src, dest);
        console.log("  Protected: courses/" + slug + " -> " + dest);
      } catch (err) {
        console.error("  Failed to move courses/" + slug + ": " + err.message);
      }
    }
  }
  if (!dryRun) {
    console.log("Courses safely moved to workspace. BaseLayer will continue loading them via union catalog.\n");
  }
}

function hasUncommittedTrackedChanges(repoRoot) {
  const res = spawnSync("git", ["status", "--porcelain", "-uno"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  return res.status === 0 && res.stdout && res.stdout.trim().length > 0;
}

function updateStatus(repoRoot, workspace) {
  console.log("baselayer update status\n");
  const pkgVersion = require("../package.json").version;
  const currentCommitRes = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const currentCommit = currentCommitRes.status === 0 ? currentCommitRes.stdout.trim() : "unknown";
  const branchRes = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const branch = branchRes.status === 0 ? branchRes.stdout.trim() || "main" : "main";

  console.log("CLI version:    v" + pkgVersion);
  console.log("Current branch: " + branch);
  console.log("Current commit: " + currentCommit);

  const untrackedCourses = findUntrackedCourses(repoRoot);
  if (untrackedCourses.length > 0) {
    console.log("\nUntracked courses at risk (" + untrackedCourses.length + "):");
    for (const slug of untrackedCourses) {
      console.log("  - courses/" + slug + " (will be protected to " + workspace + "/courses/ during update)");
    }
  } else {
    console.log("\nCourse isolation: All courses in courses/ are tracked or gitignored.");
  }

  console.log("\nChecking upstream remote for updates...");
  spawnSync("git", ["fetch", "--dry-run"], { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });

  const behindRes = spawnSync("git", ["rev-list", "--count", "HEAD..@{u}"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (behindRes.status === 0) {
    const count = parseInt(behindRes.stdout.trim(), 10) || 0;
    if (count > 0) {
      console.log("Status: " + count + " commit(s) behind upstream.");
      console.log("Run `baselayer update` to pull updates and sync dependencies.");
    } else {
      console.log("Status: Up to date with upstream.");
    }
  } else {
    console.log("Status: Upstream tracking branch not configured or unreachable.");
  }
}

function updateRepair(repoRoot, workspace) {
  console.log("baselayer update repair\n");
  console.log("Repairing BaseLayer environment and dependencies...\n");

  console.log("Verifying workspace at " + workspace + "...");
  mkdirSync(join(workspace, "courses"), { recursive: true });
  mkdirSync(join(workspace, "data", "learners"), { recursive: true });
  console.log("ok  workspace directories verified");

  console.log("\nSyncing Python environment with uv...");
  const uvRes = spawnSync("uv", ["sync"], { cwd: repoRoot, stdio: "inherit" });
  if (uvRes.status !== 0) {
    console.log("Note: `uv sync` exited with non-zero status.");
  }

  const frontendDir = join(repoRoot, "frontend");
  if (existsSync(frontendDir)) {
    console.log("\nInstalling frontend dependencies...");
    spawnSync("npm", ["install"], { cwd: frontendDir, stdio: "inherit" });
  }

  const sandboxDir = join(repoRoot, "research", "sandbox");
  if (existsSync(sandboxDir)) {
    console.log("\nRebuilding Docker sandbox-runner image...");
    const dockerRes = spawnSync("docker", ["build", "-t", "sandbox-runner", sandboxDir], {
      stdio: "inherit",
    });
    if (dockerRes.status === 0) {
      console.log("ok  Docker sandbox-runner built successfully");
    } else {
      console.log("Note: Docker sandbox build skipped or Docker daemon unavailable");
    }
  }

  console.log("\nRunning diagnostics:\n");
  doctor();
}

function update(extraArgs) {
  if (extraArgs.includes("--help") || extraArgs.includes("-h")) {
    printHelp();
    return;
  }

  const subcmd = extraArgs[0];
  const repoRoot = process.env.BASELAYER_BACKEND || findRepoRoot(process.cwd());
  const workspace = process.env.BASELAYER_WORKSPACE || defaultWorkspace();

  if (subcmd === "status" || extraArgs.includes("--check")) {
    if (!repoRoot || !existsSync(join(repoRoot, ".git"))) {
      console.log("No git repository found for BaseLayer.");
      process.exitCode = 1;
      return;
    }
    updateStatus(repoRoot, workspace);
    return;
  }

  if (subcmd === "repair") {
    if (!repoRoot) {
      console.log("No BaseLayer repository found.");
      process.exitCode = 1;
      return;
    }
    updateRepair(repoRoot, workspace);
    return;
  }

  const dryRun = extraArgs.includes("--dry-run");
  const skipDocker = extraArgs.includes("--skip-docker");
  const skipDeps = extraArgs.includes("--skip-deps");

  if (!repoRoot || !existsSync(join(repoRoot, ".git"))) {
    console.log("No git repository found for BaseLayer.");
    console.log("If installed globally via npm, update with: npm update -g baselayer");
    process.exitCode = 1;
    return;
  }

  console.log("baselayer update" + (dryRun ? " (dry-run)" : "") + "\n");
  console.log("Repository: " + repoRoot);
  console.log("Workspace:  " + workspace + "\n");

  // Step 1: Pre-flight course protection
  const untrackedCourses = findUntrackedCourses(repoRoot);
  if (untrackedCourses.length > 0) {
    protectCourses(untrackedCourses, repoRoot, workspace, dryRun);
  }

  // Step 2: Check for uncommitted tracked changes
  if (hasUncommittedTrackedChanges(repoRoot)) {
    if (dryRun) {
      console.log("Note: Working tree has uncommitted tracked changes (preview continuing in dry-run mode).\n");
    } else {
      console.error("Error: Working tree has uncommitted tracked changes.");
      console.error("Commit or stash your changes before running update:");
      console.error("  git stash");
      console.error("  baselayer update");
      console.error("  git stash pop");
      process.exitCode = 1;
      return;
    }
  }

  // Step 3: Fetch upstream
  console.log("Fetching upstream changes...");
  spawnSync("git", ["fetch"], { cwd: repoRoot, stdio: "inherit" });

  // Check pending commits
  const pendingRes = spawnSync("git", ["log", "HEAD..@{u}", "--oneline"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  const pendingCommits = pendingRes.status === 0 && pendingRes.stdout ? pendingRes.stdout.trim() : "";

  if (!pendingCommits) {
    console.log("Already up to date with upstream.");
    if (!dryRun && !skipDeps) {
      console.log("Ensuring dependencies are in sync...");
      spawnSync("uv", ["sync"], { cwd: repoRoot, stdio: "inherit" });
    }
    console.log("\nBaseLayer is up to date.");
    return;
  }

  console.log("\nIncoming updates:\n" + pendingCommits + "\n");

  if (dryRun) {
    console.log("[dry-run] Updates previewed. Run `baselayer update` without --dry-run to apply.");
    return;
  }

  // Step 4: Pull changes fast-forward only
  console.log("Pulling updates (--ff-only)...");
  const pullRes = spawnSync("git", ["pull", "--ff-only"], { cwd: repoRoot, stdio: "inherit" });
  if (pullRes.status !== 0) {
    console.error("\nError: Fast-forward pull failed.");
    console.error("Your branch may have diverged from upstream.");
    process.exitCode = 1;
    return;
  }

  // Step 5: Sync dependencies
  if (!skipDeps) {
    console.log("\nSyncing Python dependencies (uv sync)...");
    spawnSync("uv", ["sync"], { cwd: repoRoot, stdio: "inherit" });

    const frontendDir = join(repoRoot, "frontend");
    if (existsSync(frontendDir)) {
      console.log("\nSyncing frontend dependencies (npm install)...");
      spawnSync("npm", ["install"], { cwd: frontendDir, stdio: "inherit" });
    }
  }

  // Step 6: Refresh Docker sandbox if needed
  if (!skipDocker) {
    const sandboxDir = join(repoRoot, "research", "sandbox");
    if (existsSync(sandboxDir)) {
      console.log("\nBuilding Docker sandbox runner...");
      spawnSync("docker", ["build", "-t", "sandbox-runner", sandboxDir], { stdio: "inherit" });
    }
  }

  console.log("\nBaseLayer updated successfully!\n");
  doctor();
}

module.exports = { update, findUntrackedCourses, protectCourses };
