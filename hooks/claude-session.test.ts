// Behaviour test for hooks/claude-session.js. Run: bun test hooks/claude-session.test.ts
//
// The script is Claude Code's SessionStart command. It prints one JSON object to stdout.
// Network is never hit here: BETTER_DEV_SKIP_UPDATE / BETTER_DEV_LATEST are the seams.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dirname, "claude-session.js");

function pluginTree(opts: { comms?: string; version?: string } = {}) {
  const root = mkdtempSync(join(tmpdir(), "bd-claude-"));
  mkdirSync(join(root, "rules"), { recursive: true });
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(root, "rules", "comms.md"),
    opts.comms ?? "---\nalwaysApply: true\n---\n## Communication style\n\nSENTINEL-CLAUDE-COMMS.\n",
  );
  writeFileSync(
    join(root, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "better-dev", version: opts.version ?? "0.2.0" }),
  );
  return root;
}

function run(env: Record<string, string>, tree?: string, cwd?: string) {
  const root = tree ?? pluginTree();
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...env },
    cwd: cwd ?? root,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout);
}

test("emits the comms body as SessionStart additionalContext", () => {
  const out = run({ BETTER_DEV_SKIP_UPDATE: "1" });
  expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
  expect(out.hookSpecificOutput.additionalContext).toContain("better-dev:comms");
  expect(out.hookSpecificOutput.additionalContext).toContain("SENTINEL-CLAUDE-COMMS");
  expect(out.hookSpecificOutput.additionalContext).not.toContain("alwaysApply");
  expect(out.systemMessage).toBeUndefined();
});

test("names the upgrade on the operator-visible systemMessage when latest is newer", () => {
  const tree = pluginTree({ version: "0.2.0" });
  const out = run({ BETTER_DEV_LATEST: "0.3.0" }, tree);
  expect(out.systemMessage).toBe("better-dev 0.3.0 available. Run: claude plugin update better-dev@better-dev");
  expect(out.hookSpecificOutput.additionalContext).toContain("SENTINEL-CLAUDE-COMMS");
});

test("stays quiet about updates when latest equals installed", () => {
  const out = run({ BETTER_DEV_LATEST: "0.2.0" });
  expect(out.systemMessage).toBeUndefined();
});

test("stays quiet about updates when latest is behind", () => {
  const out = run({ BETTER_DEV_LATEST: "0.1.0" });
  expect(out.systemMessage).toBeUndefined();
});

test("still emits comms when rules/comms.md is missing, as empty context rather than crashing", () => {
  const root = mkdtempSync(join(tmpdir(), "bd-claude-empty-"));
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ version: "0.2.0" }));
  const out = run({ BETTER_DEV_SKIP_UPDATE: "1" }, root);
  expect(out.hookSpecificOutput.additionalContext).toBe("");
});

function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "bd-claude-repo-"));
  spawnSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  return dir;
}

test("asks for /onboard when cwd is a git repo with no stamp", () => {
  const out = run({ BETTER_DEV_SKIP_UPDATE: "1" }, undefined, gitRepo());
  expect(out.systemMessage).toBe("Run /onboard - this repo has no recorded facts.");
});

test("says better-dev is wired when the stamp is present", () => {
  const dir = gitRepo();
  spawnSync(process.execPath, [join(import.meta.dirname, "onboard-stamp.js"), "--write"], { cwd: dir, stdio: "ignore" });
  const out = run({ BETTER_DEV_SKIP_UPDATE: "1" }, pluginTree({ version: "0.2.0" }), dir);
  expect(out.systemMessage).toBe("better-dev (0.2.0) wired");
});

