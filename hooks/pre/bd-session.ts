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

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

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
  // The host's active model, whose compat record is fully resolved before a hook can see it
  // (`buildModel` materializes it once). One field is read, `compat.supportsMidConversationSystem`,
  // and it is the same field the Anthropic converter reads before promoting a developer turn - so
  // the placement below is keyed on the promotion's own signal instead of guessing at the provider.
  model?: { compat?: { supportsMidConversationSystem?: boolean } };
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

// The directory the host was started in. Which roots the host loads plugins from depends on it:
// omp anchors its project-scope plugin registry at the nearest config dir or `.git` above the
// startup directory. That is a property of the process, not of any later session cwd, so it is
// resolved once here alongside PLUGIN_ROOT.
const CWD = process.cwd();

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

/** Directory entry names, or none when the directory is absent or unreadable. */
function readDirNames(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
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
 * The host's agent dir. The only call in this file that reaches into the host, and the one thing
 * that cannot be derived from this file's own path: it names the host's data root, so the plugin
 * state roots beside it can be found without guessing at a home directory.
 *
 * Wrapped, because it is the one call here that could throw: on omp it cannot (`pi-utils`'s
 * `getAgentDir` returns a field), but a host whose accessor throws would take this whole factory
 * down at load and cost all three features with nothing on screen to say so. Undefined is also the
 * answer for any host that is not omp, and is read below as "cannot confirm a rules provider" -
 * the direction that delivers the rule rather than dropping it.
 */
function hostAgentDir(pi: HookApi): string | undefined {
  let dir: unknown;
  try {
    dir = pi.pi?.getAgentDir?.();
  } catch {
    return undefined;
  }
  return typeof dir === "string" && dir !== "" ? dir : undefined;
}

/**
 * The host's user-scope plugin state root, sibling to the agent dir. Undefined when it is not on
 * disk, which is also the answer to "is there a marketplace cache here to read a catalog from".
 */
function pluginStateRoot(agentDir: string | undefined): string | undefined {
  if (agentDir === undefined) return undefined;
  const root = join(dirname(agentDir), "plugins");
  return existsSync(root) ? root : undefined;
}

/**
 * The marketplace name a cached plugin was installed from, parsed out of the cache directory the
 * plugin lives in. Marketplace installs cache each plugin under a version-pinned directory named
 * `<marketplace>___<plugin>___<version>` - measured, not assumed - so the plugin's own location
 * carries its provenance and nothing has to be looked up.
 *
 * Read for the update nudge only, never for the delivery decision below: a link root is free to
 * carry `___` in its name, and a wrong answer here costs at most a nudge that stays silent.
 */
function cachedFrom(pluginRoot: string): { marketplace: string; plugin: string } | undefined {
  const parts = basename(pluginRoot).split("___");
  if (parts.length !== 3) return undefined;
  const [marketplace, plugin] = parts;
  return marketplace && plugin ? { marketplace, plugin } : undefined;
}

/**
 * Every plugin state root the host installs into, in the order the host resolves them: the user
 * root beside the agent dir, then the project root - which the host anchors at the nearest ancestor
 * of the startup directory carrying a config dir. Both scopes are loaded, so both scopes deliver
 * rules/; reading only the user root is what made a project-scope install deliver this rule twice.
 *
 * The host takes `.git` as a second anchor when no config dir is found at all
 * (`resolveActiveProjectRegistryPath`, pass 2). That pass is deliberately not mirrored, because it
 * cannot name a root this function would find anything under: a project plugin root that EXISTS
 * implies a config dir at or below the same ancestor, so the config-dir pass has already answered.
 * The host needs the fallback to choose where to CREATE a registry; this only ever reads one.
 */
function stateRoots(agentDir: string, cwd: string): string[] {
  const configRoot = dirname(agentDir);
  const userRoot = join(configRoot, "plugins");
  // Read back off the agent dir rather than hardcoded: the config directory is renameable, and
  // taking the host's own spelling keeps this in step with whatever it chose.
  const configDir = basename(configRoot);
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, configDir))) {
      const projectRoot = join(dir, configDir, "plugins");
      // Not a behaviour guard - a duplicate root answers every question below identically. It stops
      // a session started beside the user config dir from reading that root twice, and each read is
      // a directory listing plus a realpath per entry, paid at every session start.
      return projectRoot === userRoot ? [userRoot] : [userRoot, projectRoot];
    }
    const up = dirname(dir);
    if (up === dir) return [userRoot];
    dir = up;
  }
}

/**
 * Does a node_modules entry under `stateRoot` resolve to `pluginRoot`?
 *
 * Every entry is compared, rather than building `node_modules/<manifest name>` and testing that one
 * path: the entry's DIRECTORY NAME is the host's key for a plugin and need not equal the manifest's
 * `name`, so an install under a different name is loaded by the host and was missed here. Scoped
 * packages nest one level deeper.
 */
function linkedUnder(stateRoot: string, pluginRoot: string): boolean {
  const nodeModules = join(stateRoot, "node_modules");
  const target = canonical(pluginRoot);
  for (const entry of readDirNames(nodeModules)) {
    const entryPath = join(nodeModules, entry);
    if (entry.startsWith("@")) {
      for (const scoped of readDirNames(entryPath)) {
        if (canonical(join(entryPath, scoped)) === target) return true;
      }
      continue;
    }
    if (canonical(entryPath) === target) return true;
  }
  return false;
}

/**
 * Is this plugin root named in the host's `extensions` settings, at either scope? The host treats a
 * root listed there exactly like an installed plugin and loads its rules/, so a repo wired that way
 * already has this rule.
 *
 * The same list can also be passed on the command line (`-e <dir>`), and those roots live in
 * process state and reach no file - so a session started that way still pays for a duplicate. That
 * is the one install shape here that cannot be read off disk, and it lands on the safe side.
 */
function namedInExtensions(agentDir: string, cwd: string, pluginRoot: string): boolean {
  const target = canonical(pluginRoot);
  const configDir = basename(dirname(agentDir));
  for (const settings of [join(agentDir, "settings.json"), join(cwd, configDir, "settings.json")]) {
    const entries = readJson(settings)?.extensions;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (typeof entry !== "string" || entry === "") continue;
      // A bare tilde, or a tilde followed by a path, expands to the home directory. The other
      // tilde spelling - a leading tilde naming another user - expands here to a path that exists
      // nowhere, so it matches nothing and the rule goes out: the not-recognised direction.
      const expanded = entry.startsWith("~") ? join(homedir(), entry.slice(1)) : entry;
      if (canonical(isAbsolute(expanded) ? expanded : resolve(cwd, expanded)) === target) return true;
    }
  }
  return false;
}

/**
 * Does a rules provider already deliver this plugin's rules/?
 *
 * The host scans `rules/` under npm, git and link plugin roots at either scope, and does not scan
 * it under marketplace roots - both halves measured against a live session and confirmed in the
 * host's source. So the question reduces to which kind of root this is, and the answer is POSITIVE
 * for native delivery: a duplicated rule wastes context, a missing one loses the thing the operator
 * asked for, so every uncertain case picks the duplicate.
 */
function hostDeliversRules(agentDir: string | undefined, pluginRoot: string, cwd: string): boolean {
  if (agentDir === undefined) return false;
  const roots = stateRoots(agentDir, cwd);
  // The marketplace cache mark is tested first, and against EVERY root rather than against the root
  // that carried a link. The cache is a property of the machine, not of an install scope:
  // `getPluginsCacheDir()` takes no scope argument, so a cached plugin always sits under the user
  // root, while the runtime symlink the installer writes goes under the INSTALL scope's root
  // (`#nodeModulesPath(scope)`). At project scope those are different directories by construction,
  // so a mark tested against the link's own root can never fire there - and
  // `omp plugin install --scope project` read as a link root and lost the rule by every route.
  for (const root of roots) {
    if (isInside(join(root, "cache", "plugins"), pluginRoot)) return false;
  }
  // Otherwise a resolved node_modules entry is authoritative. The
  // `<marketplace>___<plugin>___<version>` cache-directory grammar is deliberately NOT read here: a
  // link root is free to carry `___` in its name, and testing the name before resolving the entry
  // made every such root deliver the rule twice. `cachedFrom` still reads that grammar for the
  // update nudge, where a wrong answer costs nothing but silence.
  for (const root of roots) {
    if (linkedUnder(root, pluginRoot)) return true;
  }
  return namedInExtensions(agentDir, cwd, pluginRoot);
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

// --- (a) where the rule goes --------------------------------------------------------------------

/**
 * Where the rule lands in one call's message list, and why it is not simply "last".
 *
 * Following a user turn is what earns the strongest role. Anthropic upgrades a `developer` turn to
 * a real wire `role: "system"` block, but only when it immediately follows a user turn and is
 * either last or followed by an assistant turn (`convertAnthropicMessages`), and only when the
 * model's resolved compat carries `supportsMidConversationSystem` - first-party endpoint and Opus
 * 4.8+ / Sonnet 5+ (`pi-catalog/src/compat/anthropic.ts`). Measured through that converter across
 * six session shapes: the placement below reaches the wire as `role: "system"` on all six, where a
 * plain append reached it on four and prepending reached it on none.
 *
 * Appending is not free everywhere, though, and the earlier claim that it was "never worse
 * anywhere" was wrong. Three provider paths read the FINAL entry instead of treating it as context:
 *
 *   - Cursor takes `messages[length - 1]` and, when that message is `user` OR `developer`, makes it
 *     the request's own `userMessageAction` and excludes it from history
 *     (`pi-ai/src/providers/cursor.ts`, `buildCursorRequest`). Appended, this rule BECAME the
 *     operator's request and demoted the real one into history. Prepending never did that.
 *   - GitHub Copilot classifies the request from the last message's role, so a non-`user` tail makes
 *     every request read as agent-initiated rather than user-initiated (`inferCopilotInitiator`).
 *   - The OpenAI Chat Completions and Responses adapters place their prompt-cache breakpoint from
 *     the last user-or-developer entry, so a trailing rule moves that boundary each call.
 *
 * So the placement is keyed on the promotion's own signal rather than on taste. Where the promotion
 * is available the rule takes the tail, which is worth having. Where it is not, the rule is an
 * ordinary turn with nothing to gain from being last, so it goes as late as it can WITHOUT being
 * the tail and without landing between an assistant's tool call and its result - the API rejects a
 * tool_use whose tool_result does not follow it. That means directly after the last user turn, or
 * directly before that turn when the turn is itself the tail. Measured on the same six shapes: one
 * position later than a prepend on five of them, the same on the sixth (a first turn, where there
 * is only one message to be earlier than), and never last on any.
 *
 * One case both branches share: an assistant turn at the tail is a prefill the model is meant to
 * continue, and appending after it would break the prefill and forfeit the promotion anyway, since
 * the appended turn no longer follows a user turn. There the rule goes before the prefill, where
 * the promotion still fires.
 */
function placeRule(messages: HostMessage[], rule: HostMessage, promotable: boolean): HostMessage[] {
  const last = messages.length - 1;
  const at = ((): number => {
    if (promotable) return messages[last]?.role === "assistant" ? last : messages.length;
    for (let i = last; i >= 0; i--) {
      if (messages[i]?.role !== "user") continue;
      return i === last ? i : i + 1;
    }
    return 0;
  })();
  return [...messages.slice(0, at), rule, ...messages.slice(at)];
}

// --- the hook ----------------------------------------------------------------------------------

export default function bdSession(pi: HookApi): void {
  const agentDir = hostAgentDir(pi);
  const manifest = readJson(join(PLUGIN_ROOT, "package.json")) ?? {};
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

  const deliverRule = ruleBody !== undefined && ruleBody !== "" && !hostDeliversRules(agentDir, PLUGIN_ROOT, CWD);

  // Built once. `context` fires before every LLM call, so anything per-call here is paid per call.
  //
  // The host's message union has no `system` role a hook can emit, but it does have one above
  // `user`: `developer`. Ollama maps `developer` to `system` outright, OpenAI emits it as a
  // developer instruction where the model supports the role, and Anthropic can promote it to a real
  // wire `role: "system"` block - see `placeRule`, which is where that promotion is won or lost.
  const ruleMessage: HostMessage | undefined = deliverRule
    ? {
        role: "developer",
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
    // The one field read off the host's model, and it is the promotion's own gate: a host that
    // reports no model, or a provider whose compat record has no such field, both answer false -
    // the placement that is safe on every provider.
    pi.on("context", (event, ctx) => ({
      messages: placeRule(event.messages, ruleMessage, ctx.model?.compat?.supportsMidConversationSystem === true),
    }));
  }

  // Two nudges, two channels, and the split was forced by measurement rather than taste. Two
  // notify calls in one tick leave only the last on screen, so the second call drops the first
  // line rather than adding one; and joining both into a single notify produced a 111-column line
  // the host clipped mid-sentence. So each goes where its content belongs: an update available is
  // a standing fact and lives in the status line, where it persists and stays short, while the
  // /onboard suggestion is a one-time action and gets the one notification.
  pi.on("session_start", (_event, ctx) => {
    // (b) The catalog the host already cached is ahead of what is installed.
    const stateRoot = pluginStateRoot(agentDir);
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
