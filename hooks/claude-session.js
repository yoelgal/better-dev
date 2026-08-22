#!/usr/bin/env node
// Claude Code SessionStart hook. This file is Claude Code's plugin-hook command, not omp's.
//
// Three jobs, all on stdout as the JSON Claude Code reads:
//   (a) additionalContext = rules/comms.md, so the rule reaches the session.
//   (b) systemMessage     = operator-visible lines: update when a newer release exists,
//                           and whether this git repo is onboarded on this machine.
//
// Paths resolve from CLAUDE_PLUGIN_ROOT (the installed plugin tree). Nothing here is
// registered into ~/.claude/settings.json, so uninstall removes the hook with the plugin.

const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");

const ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const MARKER = "<!-- better-dev:comms source=hooks/claude-session.js -->";

function stripFrontmatter(text) {
  return String(text || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, "").trim();
}

function readComms() {
  try {
    return stripFrontmatter(fs.readFileSync(path.join(ROOT, "rules", "comms.md"), "utf8"));
  } catch {
    return "";
  }
}

function ownVersion() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8");
    return String(JSON.parse(raw).version || "");
  } catch {
    return "";
  }
}

function isUpgrade(candidate, current) {
  const parse = (v) => {
    const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined;
  };
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return candidate !== current && candidate !== "" && current !== "";
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}

function cachePath() {
  return path.join(os.homedir(), ".cache", "better-dev", "latest.json");
}

function readCache() {
  try {
    const data = JSON.parse(fs.readFileSync(cachePath(), "utf8"));
    if (typeof data.version === "string" && typeof data.checkedAt === "number") return data;
  } catch {
    // missing or corrupt: fetch
  }
  return undefined;
}

function writeCache(version) {
  try {
    const dir = path.dirname(cachePath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify({ version, checkedAt: Date.now() }));
  } catch {
    // cache is best-effort
  }
}

function getJson(urlPath) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: "api.github.com",
        path: urlPath,
        headers: { "User-Agent": "better-dev-hook", Accept: "application/vnd.github+json" },
        timeout: 2500,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, body }));
      },
    );
    req.on("error", () => resolve(undefined));
    req.on("timeout", () => {
      req.destroy();
      resolve(undefined);
    });
  });
}

function versionFromGithub(payload) {
  if (!payload) return "";
  try {
    const data = JSON.parse(payload.body);
    if (payload.status >= 400) return "";
    if (data && typeof data.tag_name === "string") return data.tag_name.replace(/^v/, "");
    if (Array.isArray(data) && data[0] && typeof data[0].name === "string") {
      return data[0].name.replace(/^v/, "");
    }
  } catch {
    return "";
  }
  return "";
}

async function latestVersion() {
  if (process.env.BETTER_DEV_SKIP_UPDATE === "1") return "";
  if (process.env.BETTER_DEV_LATEST) return process.env.BETTER_DEV_LATEST;

  const cached = readCache();
  if (cached && Date.now() - cached.checkedAt < 60 * 60 * 1000) return cached.version;

  const release = versionFromGithub(await getJson("/repos/yoelgal/better-dev/releases/latest"));
  const tag = release || versionFromGithub(await getJson("/repos/yoelgal/better-dev/tags?per_page=1"));
  if (tag) writeCache(tag);
  else if (cached) return cached.version;
  return tag;
}

async function main() {
  const body = readComms();
  const additionalContext = body ? `${MARKER}\n\n${body}` : "";
  const out = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  };

  const notices = [];
  const installed = ownVersion();
  const latest = await latestVersion();
  if (latest && installed && isUpgrade(latest, installed)) {
    notices.push(`better-dev ${latest} available. Run: claude plugin update better-dev@better-dev`);
  }
  try {
    const { sessionLine } = require("./onboard-stamp.js");
    const line = sessionLine(process.cwd(), installed);
    if (line) notices.push(line);
  } catch {
    // Missing helper or a dead git: skip the onboard line.
  }
  if (notices.length) out.systemMessage = notices.join(" ");

  process.stdout.write(JSON.stringify(out));
}

main().catch(() => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "" },
    }),
  );
});
