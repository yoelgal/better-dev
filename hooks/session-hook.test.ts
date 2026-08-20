// Behaviour test for hooks/pre/bd-session.ts. Run: bun test hooks/session-hook.test.ts
//
// It lives at hooks/ and NOT at hooks/pre/ on purpose: the host discovers every `.ts` file under
// hooks/pre/ as a hook module and expects a default-exported factory, so a test file parked there
// would be loaded into every session and fail at load. One directory up is outside the scan.
//
// Every case builds a throwaway plugin tree and COPIES the hook into it, rather than importing the
// repo's copy. That is the point: the hook resolves rules/comms.md, its own package.json and its own
// provenance from `import.meta.dirname`, so a test that imported it in place would exercise the
// repo's paths and prove nothing about the relative resolution the design rests on.
//
// The fixture also chdirs into the session directory before loading the hook, because the host's
// project-scope plugin root is anchored above the directory the process started in and the hook
// reads it at load, exactly as the host does.

import { expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const HOOK_SOURCE = join(import.meta.dirname, "pre", "bd-session.ts");

const RULE_BODY = "## Communication style\n\nLead with the next action. SENTINEL-RULE-BODY-LINE.";
const RULE_FILE = `---\nalwaysApply: true\n---\n${RULE_BODY}\n`;
const FRONTMATTER_ONLY = "---\nalwaysApply: true\n---\n";

const PACKAGE_NAME = "better-dev";

/**
 * Install shapes. Everything but `marketplace` and `unknown` is a shape the host DOES load rules
 * from, so the hook must stay quiet on it; the four `*-duplicate-shape` names are the ones that
 * used to answer wrong and deliver the rule a second time.
 */
type Install =
  | "marketplace"
  | "link"
  | "link-triple-underscore"
  | "link-renamed"
  | "link-scoped"
  | "project"
  | "settings-extension"
  | "unknown";

interface Fixture {
  install: Install;
  /** Version in the plugin's own package.json. */
  version?: string;
  /** Version the cached marketplace catalog offers. Omit to cache no catalog at all. */
  catalogVersion?: string;
  /** Where the catalog is cached: bare file for a direct URL, manifest dir for a cloned source. */
  catalogAt?: "bare" | ".omp-plugin" | ".claude-plugin";
  /** Omit to ship no rules/comms.md. */
  rule?: string;
  /** Entry-file contents at the repo root. Omit to ship no entry file. */
  entryFile?: string;
  /** Which entry file carries it. Both names are promised by the install docs. */
  entryFileName?: "CLAUDE.md" | "AGENTS.md";
  /** false makes cwd a plain directory with no repo above it. */
  repo?: boolean;
  /** Start the session this far below the repo root, the way an agent launched in a subdir does. */
  startIn?: string;
  /** Break the host contract on purpose. Every one of these must degrade to silence. */
  host?: "no-ui" | "throwing-notify" | "no-pi" | "throwing-agent-dir";
  /** Ship a package.json that is not JSON. */
  badManifest?: boolean;
}

interface Message {
  role: string;
  content: unknown;
  synthetic?: boolean;
  timestamp?: number;
}

interface Run {
  /** Every ctx.ui.notify call, in order. */
  notices: string[];
  /** Every ctx.ui.setStatus call, as "key=text". */
  statuses: string[];
  /** Message list after the context chain ran, or the input unchanged when no handler took it. */
  messages: Message[];
  contextHandlers: number;
}

async function run(fixture: Fixture): Promise<Run> {
  const root = mkdtempSync(join(tmpdir(), "bd-session-"));
  // Mirrors the host's real layout: the plugin state root is a sibling of the agent dir, and the
  // directory holding both names the config dir the project scope is looked up under.
  const agentDir = join(root, ".omp", "agent");
  const stateRoot = join(root, ".omp", "plugins");
  mkdirSync(agentDir, { recursive: true });
  mkdirSync(join(stateRoot, "node_modules"), { recursive: true });

  const cwd = fixture.startIn === undefined ? join(root, "work") : join(root, "work", fixture.startIn);
  mkdirSync(cwd, { recursive: true });
  const repoRoot = join(root, "work");
  if (fixture.repo !== false) mkdirSync(join(repoRoot, ".git"), { recursive: true });
  if (fixture.entryFile !== undefined) {
    writeFileSync(join(repoRoot, fixture.entryFileName ?? "CLAUDE.md"), fixture.entryFile);
  }

  const version = fixture.version ?? "0.1.0";
  const pluginRoot = (() => {
    switch (fixture.install) {
      case "marketplace":
        return join(stateRoot, "cache", "plugins", `bd___${PACKAGE_NAME}___${version}`);
      // A link root is free to carry the marketplace cache-dir grammar in its name. Reading the
      // name instead of resolving the install is what made this shape deliver the rule twice.
      case "link-triple-underscore":
        return join(root, `bd___${PACKAGE_NAME}___${version}`);
      default:
        return join(root, "clone");
    }
  })();
  mkdirSync(join(pluginRoot, "hooks", "pre"), { recursive: true });
  cpSync(HOOK_SOURCE, join(pluginRoot, "hooks", "pre", "bd-session.ts"));
  writeFileSync(
    join(pluginRoot, "package.json"),
    fixture.badManifest === true ? "{ name: not json" : JSON.stringify({ name: PACKAGE_NAME, version }),
  );
  if (fixture.rule !== undefined) {
    mkdirSync(join(pluginRoot, "rules"), { recursive: true });
    writeFileSync(join(pluginRoot, "rules", "comms.md"), fixture.rule);
  }

  // The host's key for an installed plugin is the node_modules entry name, at either scope.
  const linkAt = (entry: string, at = stateRoot): void => {
    const target = join(at, "node_modules", entry);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(pluginRoot, target);
  };
  switch (fixture.install) {
    case "link":
    case "link-triple-underscore":
      linkAt(PACKAGE_NAME);
      break;
    case "link-renamed":
      linkAt("bd-fork");
      break;
    case "link-scoped":
      linkAt(join("@yoelgal", PACKAGE_NAME));
      break;
    case "project":
      linkAt(PACKAGE_NAME, join(repoRoot, ".omp", "plugins"));
      break;
    case "settings-extension":
      mkdirSync(join(repoRoot, ".omp"), { recursive: true });
      writeFileSync(join(repoRoot, ".omp", "settings.json"), JSON.stringify({ extensions: [pluginRoot] }));
      break;
    default:
      break;
  }

  if (fixture.catalogVersion !== undefined) {
    const at = fixture.catalogAt ?? "bare";
    const marketplaceDir = join(stateRoot, "cache", "marketplaces", "bd", ...(at === "bare" ? [] : [at]));
    mkdirSync(marketplaceDir, { recursive: true });
    writeFileSync(
      join(marketplaceDir, "marketplace.json"),
      JSON.stringify({ name: "bd", plugins: [{ name: PACKAGE_NAME, version: fixture.catalogVersion }] }),
    );
  }

  const sessionStart: Array<(event: unknown, ctx: unknown) => unknown> = [];
  const context: Array<(event: unknown, ctx: unknown) => { messages?: Message[] } | undefined> = [];
  const notices: string[] = [];
  const statuses: string[] = [];
  const throwingAgentDir = {
    getAgentDir: (): string => {
      throw new Error("no agent dir");
    },
  };
  const api = {
    on(event: string, handler: (event: unknown, ctx: unknown) => never) {
      if (event === "session_start") sessionStart.push(handler);
      if (event === "context") context.push(handler);
    },
    logger: { debug() {} },
    pi:
      fixture.host === "no-pi"
        ? undefined
        : fixture.host === "throwing-agent-dir"
          ? throwingAgentDir
          : { getAgentDir: () => agentDir },
  };
  const ui = {
    notify: (line: string) => {
      notices.push(line);
      if (fixture.host === "throwing-notify") throw new Error("no UI to notify");
    },
    setStatus: (key: string, text: string | undefined) => void statuses.push(`${key}=${text}`),
  };
  const ctx = { cwd, ui: fixture.host === "no-ui" ? undefined : ui };

  // Dynamic by necessity: the specifier is a per-case fixture path, and loading the hook from that
  // path is the behaviour under test - a static import would resolve the repo's copy and measure
  // the repo's rules/ and package.json instead of the fixture's. chdir'd first, because the hook
  // resolves the host's project-scope plugin root from the startup directory, at load.
  const before = process.cwd();
  process.chdir(cwd);
  let factory: (api: unknown) => void;
  try {
    factory = (await import(join(pluginRoot, "hooks", "pre", "bd-session.ts"))).default;
  } finally {
    process.chdir(before);
  }
  factory(api);
  for (const handler of sessionStart) handler(undefined, ctx);

  let messages: Message[] = [{ role: "user", content: "the actual request" }];
  for (const handler of context) {
    const result = handler({ messages }, ctx);
    if (result?.messages) messages = result.messages;
  }
  return { notices, statuses, messages, contextHandlers: context.length };
}

/** The message the hook injected, or undefined when it injected nothing. */
function injected(result: Run): Message | undefined {
  return result.messages.find(message => String(message.content).includes("better-dev:comms"));
}

// --- (a) deliver the comms rule ----------------------------------------------------------------

test("injects the comms rule on a marketplace install, where the host delivers no rules", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE });
  expect(result.messages).toHaveLength(2);
  const rule = String(injected(result)?.content);
  expect(rule).toContain("better-dev:comms");
  expect(rule).toContain("SENTINEL-RULE-BODY-LINE");
  // Frontmatter is stripped: the host's own rule loader never sends it, so neither does this.
  expect(rule).not.toContain("alwaysApply");
  // The real conversation survives, in order.
  expect(result.messages[0]?.content).toBe("the actual request");
});

// Role and position are the whole value of the injection, and both are load-bearing. Measured
// through the host's own `convertAnthropicMessages`: a `developer` turn appended after the last user
// turn lands on the Anthropic wire as `role: "system"`, while the same content prepended - or sent
// as `user` from anywhere - lands as `role: "user"`. Ollama maps `developer` to `system` outright.
// Neither the role nor the position is recoverable from anything else in this suite, so this is the
// only guard on the difference between the rule being an instruction and being a remark.
test("delivers the rule as a `developer` turn appended after the conversation", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE });
  expect(result.messages.map(message => message.role)).toEqual(["user", "developer"]);
  expect(result.messages[result.messages.length - 1]).toBe(injected(result));
});

// Not decoration: `synthetic` marks the turn as not authored by the operator, and the host reads a
// message's timestamp when it orders and renders one.
test("marks the injected rule synthetic and stamps it", async () => {
  const before = Date.now();
  const rule = injected(await run({ install: "marketplace", rule: RULE_FILE }));
  expect(rule?.synthetic).toBe(true);
  expect(rule?.timestamp).toBeGreaterThanOrEqual(before);
});

test("says nothing at all when rules/comms.md is absent", async () => {
  const result = await run({ install: "marketplace" });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
  expect(result.notices).toEqual([]);
  expect(result.statuses).toEqual([]);
});

// An empty rule file, or one that is nothing but frontmatter, has no rule in it. Delivering the
// sentinel with no body would spend a message per LLM call to say nothing, and would report the
// hook as "delivering" to the skill that looks for the sentinel.
test("stays quiet when rules/comms.md is empty", async () => {
  const result = await run({ install: "marketplace", rule: "" });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

test("stays quiet when rules/comms.md is nothing but frontmatter", async () => {
  const result = await run({ install: "marketplace", rule: FRONTMATTER_ONLY });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

// --- (a) which install shapes the host already covers -------------------------------------------

test("stays quiet on a link install, where a rules provider already delivered the rule", async () => {
  const result = await run({ install: "link", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
  expect(JSON.stringify(result.messages)).not.toContain("SENTINEL-RULE-BODY-LINE");
});

// The four shapes below all resolve to a root the host loads rules from, and all four used to get
// the rule twice - 6877 bytes, ~1.7k tokens, on every LLM call. Each one is a separate reason the
// old answer was wrong, so each needs its own fixture.

test("stays quiet on a link root whose directory name carries the marketplace cache grammar", async () => {
  const result = await run({ install: "link-triple-underscore", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

test("stays quiet on a project-scope install, which the host loads as readily as a user one", async () => {
  const result = await run({ install: "project", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

test("stays quiet when the install directory name is not the manifest's package name", async () => {
  const result = await run({ install: "link-renamed", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

test("stays quiet when the root is named in the host's `extensions` settings", async () => {
  const result = await run({ install: "settings-extension", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

test("stays quiet on a scoped-package install, which nests one directory deeper", async () => {
  const result = await run({ install: "link-scoped", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
});

// The bias, and it is the whole reason the answers above are allowed to be wrong in one direction
// only: a shape this code does not recognise gets the rule. A duplicate wastes context; a miss
// loses the thing the operator asked for. The CLI's `-e <dir>` roots are the live example - they
// exist only in the host's process state, so they land here.
test("delivers the rule when the install shape is unrecognised, rather than dropping it", async () => {
  const result = await run({ install: "unknown", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(1);
  expect(String(injected(result)?.content)).toContain("SENTINEL-RULE-BODY-LINE");
});

// --- (b) update available ----------------------------------------------------------------------

test("names the upgrade when the cached catalog is ahead of the installed version", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0" });
  expect(result.statuses).toEqual(["better-dev=omp plugin upgrade better-dev@bd - 0.2.0 available"]);
  // The status line is width-clamped by the host, so an over-long line is a line the reader never
  // finishes. Measured: a 111-column notification came back clipped mid-sentence.
  expect(result.statuses[0]?.length).toBeLessThan(80);
});

test("stays quiet when the cached catalog is level with the installed version", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, version: "0.2.0", catalogVersion: "0.2.0" });
  expect(result.statuses).toEqual([]);
});

test("stays quiet when the cached catalog is behind, so a stale offline cache never cries wolf", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, version: "0.2.0", catalogVersion: "0.1.0" });
  expect(result.statuses).toEqual([]);
});

test("stays quiet when no catalog is cached at all", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, version: "0.1.0" });
  expect(result.statuses).toEqual([]);
});

test("stays quiet about updates on a link install, which git updates rather than the marketplace", async () => {
  const result = await run({ install: "link", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0" });
  expect(result.statuses).toEqual([]);
});

// A catalog cached from a direct URL is the bare JSON; one cached from a git or local source is a
// clone, which carries the catalog at either published manifest location. Reading only the bare
// path reports "up to date" forever on the two clone layouts.
test("reads the catalog a cloned source cached under .omp-plugin/", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0" } as const;
  const result = await run({ ...fixture, catalogAt: ".omp-plugin" });
  expect(result.statuses[0]).toContain("0.2.0 available");
});

test("reads the catalog a cloned source cached under .claude-plugin/", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0" } as const;
  const result = await run({ ...fixture, catalogAt: ".claude-plugin" });
  expect(result.statuses[0]).toContain("0.2.0 available");
});

// --- (c) onboard nudge -------------------------------------------------------------------------

test("suggests /onboard once when the repo entry file carries no discovery block", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, entryFile: "# Repo\n\nno block here\n" });
  const nudges = result.notices.filter(line => line.includes("/onboard"));
  expect(nudges).toHaveLength(1);
  expect(nudges[0]).toBe("Run /onboard - this repo has no better-dev block in its entry file");
});

// Both install tables promise AGENTS.md as an entry file, so a repo that has only that one has to
// be read. Nothing else in this suite fixtures it.
test("reads AGENTS.md as an entry file, not only CLAUDE.md", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, entryFile: "# Repo\n\nno block here\n" } as const;
  const result = await run({ ...fixture, entryFileName: "AGENTS.md" });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
});

// An agent is often started somewhere below the repo root. The entry file is at the root, so the
// nudge depends on the upward walk finding it from there.
test("finds the repo's entry file when the session starts in a subdirectory", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, entryFile: "# Repo\n\nno block here\n" } as const;
  const result = await run({ ...fixture, startIn: join("packages", "core", "src") });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
});

test("stays quiet when the entry file already carries the discovery block", async () => {
  const entryFile = "# Repo\n\n<!-- BEGIN better-dev -->\nwired\n<!-- END better-dev -->\n";
  const result = await run({ install: "marketplace", rule: RULE_FILE, entryFile });
  expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
});

test("stays quiet when the repo has no entry file", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE });
  expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
});

test("stays quiet outside a git repo", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, entryFile: "# no block\n", repo: false });
  expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
});

// A comms pointer block is not a discovery block, so a repo carrying only the pointer still gets
// nudged. The two markers differ by one character of separator, which is exactly the kind of
// substring collision that would silently disable this nudge.
test("does not read a comms pointer block as a discovery block", async () => {
  const entryFile = "<!-- BEGIN better-dev-comms -->\npointer\n<!-- END better-dev-comms -->\n";
  const result = await run({ install: "marketplace", rule: RULE_FILE, entryFile });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
});

// --- both nudges at once -----------------------------------------------------------------------

// Measured in a real TUI, not reasoned: two notify calls in one tick leave only the last on screen,
// so the update line vanished behind the /onboard line; joining both into one notify then produced
// a 111-column line the host clipped mid-sentence. Hence one notify call at most, ever, with the
// standing fact on the status line instead. This is the regression test for both findings.
test("uses one channel each, so neither nudge can drop or clip the other", async () => {
  const result = await run({
    install: "marketplace",
    rule: RULE_FILE,
    version: "0.1.0",
    catalogVersion: "0.2.0",
    entryFile: "# Repo\n\nno block here\n",
  });
  expect(result.notices).toHaveLength(1);
  expect(result.statuses).toHaveLength(1);
  expect(result.notices[0]).toContain("/onboard");
  expect(result.statuses[0]).toContain("omp plugin upgrade better-dev@bd");
  for (const line of [...result.notices, ...result.statuses]) expect(line).not.toContain("\n");
});

// --- every failure degrades to silence ----------------------------------------------------------

// The design's headline claim, and until these cases existed it was defended by comments. A hook
// that throws at load costs all three features and reaches only the host's debug log, so nothing on
// screen would say the plugin had stopped working.

test("delivers the rule and says nothing when the host exposes no UI at all", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, entryFile: "# no block\n" } as const;
  const result = await run({ ...fixture, version: "0.1.0", catalogVersion: "0.2.0", host: "no-ui" });
  expect(result.notices).toEqual([]);
  expect(result.statuses).toEqual([]);
  expect(injected(result)).toBeDefined();
});

test("keeps the status line when ctx.ui.notify throws", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, entryFile: "# no block\n" } as const;
  const result = await run({ ...fixture, version: "0.1.0", catalogVersion: "0.2.0", host: "throwing-notify" });
  expect(result.statuses).toHaveLength(1);
  expect(injected(result)).toBeDefined();
});

// No `pi.pi` means no way to confirm a rules provider, which is the answer for every host that is
// not omp. That is the uncertain case, so the rule goes out.
test("delivers the rule when the host injects no exports of its own", async () => {
  const result = await run({ install: "link", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0", host: "no-pi" });
  expect(injected(result)).toBeDefined();
  expect(result.statuses).toEqual([]);
});

// The one call in the hook that reaches into the host. Unwrapped, a throwing accessor propagated
// out of the factory at load and took the rule, the update nudge and the /onboard nudge with it.
test("survives a host whose getAgentDir throws, rather than failing at load", async () => {
  const result = await run({ install: "link", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0", host: "throwing-agent-dir" });
  expect(injected(result)).toBeDefined();
  expect(result.statuses).toEqual([]);
});

// A package.json that will not parse costs the version comparison and nothing else.
test("still delivers the rule when its own package.json is malformed", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, catalogVersion: "0.2.0" } as const;
  const result = await run({ ...fixture, badManifest: true });
  expect(injected(result)).toBeDefined();
  expect(result.statuses).toEqual([]);
});
