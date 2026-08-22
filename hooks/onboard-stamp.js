// Machine-local record that /onboard has run for a git repo on this machine.
// Not a repo file: /onboard writes nothing into the repo. The session hook
// keys off this stamp, never off .better-dev/ (that directory is the loop ledger).
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function repoRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
  } catch {
    return "";
  }
}

function stampPath(root) {
  const id = createHash("sha256").update(root).digest("hex").slice(0, 16);
  return path.join(os.homedir(), ".cache", "better-dev", "onboarded", id);
}

function needsOnboard(cwd) {
  const root = repoRoot(cwd);
  if (!root) return false;
  return !fs.existsSync(stampPath(root));
}

function isRepo(cwd) {
  return repoRoot(cwd) !== "";
}

function onboardLine() {
  return "Run /onboard - this repo has no recorded facts.";
}

function wiredLine(version) {
  const v = String(version || "").trim();
  return v ? `better-dev (${v}) wired` : "better-dev wired";
}

function writeStamp(cwd) {
  const root = repoRoot(cwd);
  if (!root) return "";
  const dest = stampPath(root);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, "");
  return dest;
}

function sessionLine(cwd, version) {
  if (!isRepo(cwd)) return "";
  return needsOnboard(cwd) ? onboardLine() : wiredLine(version);
}

if (require.main === module && process.argv[2] === "--write") {
  writeStamp(process.cwd());
}

module.exports = {
  repoRoot,
  stampPath,
  needsOnboard,
  isRepo,
  onboardLine,
  wiredLine,
  writeStamp,
  sessionLine,
};
