// better-dev's session hook: it closes the three gaps the deleted installer used to cover, and
// nothing else. Discovered by the host from `hooks/pre/` inside the installed plugin tree - no
// manifest entry, no path registered into machine-global config, nothing an installer writes.
//
// That distinction is the whole reason this file is allowed to exist. The hook this repo deleted on
// 2026-08-20 was registered BY ABSOLUTE PATH into a host's global config by `install.sh`, so a
// `git pull` that moved the target left the host failing a hook every session start, forever, with
// no uninstall path. This one resolves every path it needs from `import.meta.dirname` (its own
// directory inside the plugin), is versioned with the plugin, and disappears when the plugin is
// removed. Nothing here can outlive or rot away from the tree it shipped in.
//
// The three jobs, each measured against a real omp session before being written:
//
//   (a) deliver rules/comms.md when no rules provider did. On a marketplace install the host loads
//       the plugin's skills, commands, hooks and tools but NOT its rules/ - measured: a marketplace
//       plugin's alwaysApply rule was ABSENT from the model's system instructions, while the same
//       rule from a linked plugin was PRESENT. So this is a real gap on exactly one channel, and
//       injecting on the other channels would duplicate the whole rule the host already sent.
//
//   (b) say when an update is cached. The host computes update availability at startup and, per its
//       own docs, `notify` mode "writes update availability only to the debug log; it does not show
//       a user-facing notification". This reads the same on-disk state that computation reads.
//
//   (c) suggest /onboard in a repo that has no discovery block.
//
// All three are one line at most, and (b) and (c) go through ctx.ui.notify - no tokens, no
// transcript, no-op when there is no UI. The rule this hook delivers bans banners and preamble; a
// hook that shouted would discredit the thing it carries.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";

// --- host contract -----------------------------------------------------------------------------
//
// Declared here rather than imported from the host package. A plugin tree resolves node builtins
// and nothing else: importing `@oh-my-pi/pi-coding-agent/...` from inside a hook was measured to
// fail on native-addon load, so a type-only import would still be a dependency this file cannot
// afford. These are the members this hook actually touches, all optional-called at the use site.

interface TextChunk {
  type: string;
  text?: string;
}

interface HostMessage {
  role: string;
  content: string | TextChunk[];
  timestamp?: number;
  synthetic?: boolean;
}

interface ContextEvent {
  messages: HostMessage[];
}

interface ContextResult {
  messages: HostMessage[];
}

interface HookContext {
  cwd: string;
  ui: {
    notify?(message: string, type?: "info" | "warning" | "error"): void;
    setStatus?(key: string, text: string | undefined): void;
  };
}

interface HookApi {
  on(event: "session_start", handler: (event: unknown, ctx: HookContext) => void): void;
  on(event: "context", handler: (event: ContextEvent, ctx: HookContext) => ContextResult | undefined): void;
  logger?: { debug?(message: string, data?: unknown): void };
  // The host's own exports, injected. `getAgentDir()` is the only member read here, and it is the
  // one thing that cannot be derived from this file's own path: it names the host's data root, so
  // the plugin state root beside it can be found without guessing at a home directory.
  pi?: { getAgentDir?(): string };
}

// --- constants ---------------------------------------------------------------------------------

// This file sits at <plugin>/hooks/pre/, so the plugin root is two levels up and every sibling
// (rules/, package.json) is reachable from there. Resolved once, at load.
const PLUGIN_ROOT = resolve(import.meta.dirname, "..", "..");

// Named in /onboard's shipped prose as the observable for "the hook is delivering the rule": an
// agent can search its own context for this token. Changing it breaks that skill.
const SENTINEL = "better-dev:comms";

// The managed discovery block /onboard writes into a repo's entry file. Not a substring of
// `<!-- BEGIN better-dev-comms -->`, so a comms pointer block never reads as a discovery block.
const DISCOVERY_BLOCK = "<!-- BEGIN better-dev -->";

const ENTRY_FILES = ["CLAUDE.md", "AGENTS.md"];

// --- small helpers -----------------------------------------------------------------------------

function readText(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function readJson(path: string): Record<string, unknown> | undefined {
  const text = readText(path);
  if (text === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

// macOS hands out both a symlinked and a real spelling of the same directory, and a marketplace
// install reaches its plugin through a symlink in node_modules - so every path comparison here goes
// through realpath first, or two spellings of one directory read as two directories.
function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function isInside(parent: string, child: string): boolean {
  const p = canonical(parent);
  const c = canonical(child);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

/** Drop a leading YAML frontmatter block. Everything after the closing fence is the rule body. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const fence = text.indexOf("\n---", 3);
  if (fence === -1) return text;
  const eol = text.indexOf("\n", fence + 1);
  return eol === -1 ? "" : text.slice(eol + 1);
}

/**
 * Is `candidate` an upgrade over `current`? Mirrors the host's documented rule for catalog
 * comparisons - semver must be strictly newer, non-semver counts as an update when unequal - so
 * this hook never reports an update the host's own upgrade path would refuse to perform.
 */
function isUpgrade(candidate: string, current: string): boolean {
  const parse = (v: string): number[] | undefined => {
    const core = v.trim().replace(/^v/, "").split(/[-+]/, 1)[0] ?? "";
    const parts = core.split(".");
    if (parts.length !== 3) return undefined;
    const nums = parts.map(Number);
    return nums.every(n => Number.isInteger(n) && n >= 0) ? nums : undefined;
  };
  const a = parse(candidate);
  const b = parse(current);
  if (a === undefined || b === undefined) return candidate.trim() !== current.trim();
  for (let i = 0; i < 3; i++) {
    const [x, y] = [a[i] ?? 0, b[i] ?? 0];
    if (x !== y) return x > y;
  }
  return false;
}

// --- where this plugin came from ---------------------------------------------------------------

/**
 * The host's plugin state root, sibling to its agent dir. Undefined when the host exposes no agent
 * dir, which is also the answer for any host that is not omp - and undefined is read below as
 * "cannot confirm a rules provider", the direction that delivers the rule rather than dropping it.
 */
function pluginStateRoot(pi: HookApi): string | undefined {
  const agentDir = pi.pi?.getAgentDir?.();
  if (typeof agentDir !== "string" || agentDir === "") return undefined;
  const root = join(dirname(agentDir), "plugins");
  return existsSync(root) ? root : undefined;
}

/**
 * The marketplace name a cached plugin was installed from, parsed out of the cache directory the
 * plugin lives in. Marketplace installs cache each plugin under a version-pinned directory named
 * `<marketplace>___<plugin>___<version>` - measured, not assumed - so the plugin's own location
 * carries its provenance and nothing has to be looked up.
 */
function cachedFrom(pluginRoot: string): { marketplace: string; plugin: string } | undefined {
  const parts = basename(pluginRoot).split("___");
  if (parts.length !== 3) return undefined;
  const [marketplace, plugin] = parts;
  return marketplace && plugin ? { marketplace, plugin } : undefined;
}

/**
 * Does a rules provider already deliver this plugin's rules/?
 *
 * The host scans `rules/` under npm, git and link plugin roots, and does not scan it under
 * marketplace roots - both halves measured against a live session. So the question reduces to which
 * kind of root this is, and the answer is POSITIVE for native delivery: stay quiet only when a
 * node_modules entry for this package resolves to this very directory AND this directory is not a
 * marketplace cache. Every other outcome - no state root, a layout this code does not recognise, a
 * project-scoped install - falls through to delivering the rule. A duplicated rule wastes context;
 * a missing one loses the thing the operator asked for, so the uncertain case picks the duplicate.
 */
function hostDeliversRules(pi: HookApi, pluginRoot: string, packageName: string): boolean {
  const stateRoot = pluginStateRoot(pi);
  if (stateRoot === undefined || packageName === "") return false;
  // Two independent marks of a marketplace cache root. Either is enough, so one of them going
  // stale against a future host layout still leaves the rule delivered rather than dropped.
  const cached = isInside(join(stateRoot, "cache", "plugins"), pluginRoot) || cachedFrom(pluginRoot) !== undefined;
  if (cached) return false;
  return canonical(join(stateRoot, "node_modules", packageName)) === canonical(pluginRoot);
}

// --- (b) update available ----------------------------------------------------------------------

/**
 * The version this plugin's marketplace catalog offers, read from the copy the host already cached
 * on disk. No network call: the host refreshes that catalog itself at startup, best-effort, so an
 * offline session reads a stale catalog - which reports an older-or-equal version and therefore
 * says nothing. Silence is the only failure mode available here.
 */
function cachedCatalogVersion(stateRoot: string, marketplace: string, pluginName: string): string | undefined {
  const marketplaceDir = join(stateRoot, "cache", "marketplaces", marketplace);
  // A catalog cached from a direct URL is the bare JSON; one cached from a git or local source is a
  // clone, which carries the catalog at either of the two published locations.
  const candidates = [
    join(marketplaceDir, "marketplace.json"),
    join(marketplaceDir, ".omp-plugin", "marketplace.json"),
    join(marketplaceDir, ".claude-plugin", "marketplace.json"),
  ];
  for (const candidate of candidates) {
    const catalog = readJson(candidate);
    const plugins = catalog?.plugins;
    if (!Array.isArray(plugins)) continue;
    for (const entry of plugins) {
      if (entry === null || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      if (record.name !== pluginName) continue;
      return typeof record.version === "string" ? record.version : undefined;
    }
  }
  return undefined;
}

// --- (c) onboard nudge -------------------------------------------------------------------------

function repoRoot(from: string): string | undefined {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const up = dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

/** The repo's entry file, when it has one, and the block state of it. */
function needsOnboard(cwd: string): boolean {
  const root = repoRoot(cwd);
  if (root === undefined) return false;
  for (const name of ENTRY_FILES) {
    const text = readText(join(root, name));
    if (text === undefined) continue;
    return !text.includes(DISCOVERY_BLOCK);
  }
  return false;
}

// --- the hook ----------------------------------------------------------------------------------

export default function bdSession(pi: HookApi): void {
  const manifest = readJson(join(PLUGIN_ROOT, "package.json")) ?? {};
  const packageName = typeof manifest.name === "string" ? manifest.name : "";
  const ownVersion = typeof manifest.version === "string" ? manifest.version : "";

  // (a) Read the one shipped copy of the rule, live, at load. Never a copy of its text held here:
  // two writers of the same rule is the drift this file exists to end.
  const ruleFile = join(PLUGIN_ROOT, "rules", "comms.md");
  const ruleText = readText(ruleFile);
  const ruleBody = ruleText === undefined ? undefined : stripFrontmatter(ruleText).trim();
  if (ruleBody === undefined || ruleBody === "") {
    // A missing or empty rule file is silence, never a thrown error: a hook that fails at load is
    // exactly the failure this design replaced.
    pi.logger?.debug?.("bd-session: no comms rule to deliver", { ruleFile });
  }

  const deliverRule = ruleBody !== undefined && ruleBody !== "" && !hostDeliversRules(pi, PLUGIN_ROOT, packageName);

  // Built once. `context` fires before every LLM call, so anything per-call here is paid per call.
  const ruleMessage: HostMessage | undefined = deliverRule
    ? {
        role: "user",
        // The sentinel leads, so an agent asked "is the hook delivering this?" can answer from its
        // own context, and so a human reading a dump knows what put it there.
        content: `<!-- ${SENTINEL} source=hooks/pre/bd-session.ts -->\n\n${ruleBody}`,
        synthetic: true,
        timestamp: Date.now(),
      }
    : undefined;

  // `context`, not `before_agent_start`, and the choice matters.
  //
  // `before_agent_start` returns a message the host PERSISTS into the session and shows in the TUI.
  // For a standing rule this long that is wrong twice over: it spends transcript on every prompt
  // unless latched to once, and once-injected history is exactly what compaction is allowed to drop
  // - so the rule would quietly stop applying part-way through a long session, which is the
  // failure the rule's own text ("they do not expire after a few turns") warns about.
  //
  // `context` replaces only the messages of a single LLM call, leaving session history untouched.
  // Re-supplying the rule each call is what the native rules provider already does with the system
  // prompt, so this matches the mechanism it stands in for, at the same cost, and cannot be
  // compacted away. It is chained, so this handler builds on whatever the previous one returned
  // instead of replacing it.
  if (ruleMessage !== undefined) {
    pi.on("context", event => ({ messages: [ruleMessage, ...event.messages] }));
  }

  // Two nudges, two channels, and the split was forced by measurement rather than taste. Two
  // notify calls in one tick leave only the last on screen, so the second call drops the first
  // line rather than adding one; and joining both into a single notify produced a 111-column line
  // the host clipped mid-sentence. So each goes where its content belongs: an update available is
  // a standing fact and lives in the status line, where it persists and stays short, while the
  // /onboard suggestion is a one-time action and gets the one notification.
  pi.on("session_start", (_event, ctx) => {
    // (b) The catalog the host already cached is ahead of what is installed.
    const stateRoot = pluginStateRoot(pi);
    const cached = cachedFrom(PLUGIN_ROOT);
    if (stateRoot !== undefined && cached !== undefined && ownVersion !== "") {
      const available = cachedCatalogVersion(stateRoot, cached.marketplace, cached.plugin);
      if (available !== undefined && isUpgrade(available, ownVersion)) {
        try {
          ctx.ui?.setStatus?.("better-dev", `omp plugin upgrade ${cached.plugin}@${cached.marketplace} - ${available} available`);
        } catch {
          // A nudge that throws would be a hook error on the session-start path. Never worth it.
        }
      }
    }

    // (c) This repo has an entry file with no discovery block in it.
    if (needsOnboard(ctx.cwd)) {
      try {
        ctx.ui?.notify?.("Run /onboard - this repo has no better-dev block in its entry file", "info");
      } catch {
        // Same reason.
      }
    }
  });
}
