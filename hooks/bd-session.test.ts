// Behaviour test for hooks/pre/bd-session.ts. Run: bun test hooks/bd-session.test.ts
//
// It lives at hooks/ and NOT at hooks/pre/ on purpose: the host discovers every `.ts` file under
// hooks/pre/ as a hook module and expects a default-exported factory, so a test file parked there
// would be loaded into every session and fail at load. One directory up is outside the scan.
//
// Every case builds a throwaway plugin tree and COPIES the hook into it, rather than importing the
// repo's copy. That is the point: the hook resolves rules/comms.md, its own package.json and its own
// provenance from `import.meta.dirname`, so a test that imported it in place would exercise the
// repo's paths and prove nothing about the relative resolution the design rests on.

import { expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK_SOURCE = join(import.meta.dirname, "pre", "bd-session.ts");

const RULE_BODY = "## Communication style\n\nLead with the next action. SENTINEL-RULE-BODY-LINE.";
const RULE_FILE = `---\nalwaysApply: true\n---\n${RULE_BODY}\n`;

interface Fixture {
  /** "marketplace" puts the plugin in the host's version-pinned cache dir; "link" symlinks it into node_modules. */
  install: "marketplace" | "link" | "unknown";
  /** Version in the plugin's own package.json. */
  version?: string;
  /** Version the cached marketplace catalog offers. Omit to cache no catalog at all. */
  catalogVersion?: string;
  /** Omit to ship no rules/comms.md. */
  rule?: string;
  /** Entry-file contents at the repo root. Omit to ship no entry file. */
  entryFile?: string;
  /** false makes cwd a plain directory with no repo above it. */
  repo?: boolean;
}

interface Run {
  /** Every ctx.ui.notify call, in order. */
  notices: string[];
  /** Every ctx.ui.setStatus call, as "key=text". */
  statuses: string[];
  /** Message list after the context chain ran, or the input unchanged when no handler took it. */
  messages: Array<{ role: string; content: unknown }>;
  contextHandlers: number;
}

async function run(fixture: Fixture): Promise<Run> {
  const root = mkdtempSync(join(tmpdir(), "bd-session-"));
  const stateRoot = join(root, "data", "plugins");
  const agentDir = join(root, "data", "agent");
  mkdirSync(agentDir, { recursive: true });

  const packageName = "better-dev";
  const pluginRoot =
    fixture.install === "marketplace"
      ? join(stateRoot, "cache", "plugins", `bd___${packageName}___${fixture.version ?? "0.1.0"}`)
      : join(root, "clone");
  mkdirSync(join(pluginRoot, "hooks", "pre"), { recursive: true });
  cpSync(HOOK_SOURCE, join(pluginRoot, "hooks", "pre", "bd-session.ts"));
  writeFileSync(
    join(pluginRoot, "package.json"),
    JSON.stringify({ name: packageName, version: fixture.version ?? "0.1.0" }),
  );
  if (fixture.rule !== undefined) {
    mkdirSync(join(pluginRoot, "rules"), { recursive: true });
    writeFileSync(join(pluginRoot, "rules", "comms.md"), fixture.rule);
  }

  if (fixture.install === "link") {
    mkdirSync(join(stateRoot, "node_modules"), { recursive: true });
    symlinkSync(pluginRoot, join(stateRoot, "node_modules", packageName));
  }
  if (fixture.install === "marketplace") mkdirSync(join(stateRoot, "node_modules"), { recursive: true });
  if (fixture.catalogVersion !== undefined) {
    const marketplaceDir = join(stateRoot, "cache", "marketplaces", "bd");
    mkdirSync(marketplaceDir, { recursive: true });
    writeFileSync(
      join(marketplaceDir, "marketplace.json"),
      JSON.stringify({ name: "bd", plugins: [{ name: packageName, version: fixture.catalogVersion }] }),
    );
  }

  const cwd = join(root, "work");
  mkdirSync(cwd, { recursive: true });
  if (fixture.repo !== false) mkdirSync(join(cwd, ".git"), { recursive: true });
  if (fixture.entryFile !== undefined) writeFileSync(join(cwd, "CLAUDE.md"), fixture.entryFile);

  const sessionStart: Array<(event: unknown, ctx: unknown) => unknown> = [];
  const context: Array<(event: unknown, ctx: unknown) => { messages?: Run["messages"] } | undefined> = [];
  const notices: string[] = [];
  const statuses: string[] = [];
  const api = {
    on(event: string, handler: (event: unknown, ctx: unknown) => never) {
      if (event === "session_start") sessionStart.push(handler);
      if (event === "context") context.push(handler);
    },
    logger: { debug() {} },
    pi: { getAgentDir: () => agentDir },
  };
  const ctx = {
    cwd,
    ui: {
      notify: (line: string) => void notices.push(line),
      setStatus: (key: string, text: string | undefined) => void statuses.push(`${key}=${text}`),
    },
  };

  // Dynamic by necessity: the specifier is a per-case fixture path, and loading the hook from that
  // path is the behaviour under test - a static import would resolve the repo's copy and measure
  // the repo's rules/ and package.json instead of the fixture's.
  const factory = (await import(join(pluginRoot, "hooks", "pre", "bd-session.ts"))).default;
  factory(api);
  for (const handler of sessionStart) handler(undefined, ctx);

  let messages: Run["messages"] = [{ role: "user", content: "the actual request" }];
  for (const handler of context) {
    const result = handler({ messages }, ctx);
    if (result?.messages) messages = result.messages;
  }
  return { notices, statuses, messages, contextHandlers: context.length };
}

// --- (a) deliver the comms rule ----------------------------------------------------------------

test("injects the comms rule on a marketplace install, where the host delivers no rules", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE });
  expect(result.messages).toHaveLength(2);
  const injected = String(result.messages[0]?.content);
  expect(injected).toContain("better-dev:comms");
  expect(injected).toContain("SENTINEL-RULE-BODY-LINE");
  // Frontmatter is stripped: the host's own rule loader never sends it, so neither does this.
  expect(injected).not.toContain("alwaysApply");
  // The real conversation survives, in order, behind the rule.
  expect(result.messages[1]?.content).toBe("the actual request");
});

test("stays quiet on a link install, where a rules provider already delivered the rule", async () => {
  const result = await run({ install: "link", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
  expect(JSON.stringify(result.messages)).not.toContain("SENTINEL-RULE-BODY-LINE");
});

test("delivers the rule when the install shape is unrecognised, rather than dropping it", async () => {
  const result = await run({ install: "unknown", rule: RULE_FILE });
  expect(String(result.messages[0]?.content)).toContain("SENTINEL-RULE-BODY-LINE");
});

test("says nothing at all when rules/comms.md is absent", async () => {
  const result = await run({ install: "marketplace" });
  expect(result.contextHandlers).toBe(0);
  expect(result.messages).toHaveLength(1);
  expect(result.notices).toEqual([]);
  expect(result.statuses).toEqual([]);
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

// --- (c) onboard nudge -------------------------------------------------------------------------

test("suggests /onboard once when the repo entry file carries no discovery block", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE, entryFile: "# Repo\n\nno block here\n" });
  const nudges = result.notices.filter(line => line.includes("/onboard"));
  expect(nudges).toHaveLength(1);
  expect(nudges[0]).toBe("Run /onboard - this repo has no better-dev block in its entry file");
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
