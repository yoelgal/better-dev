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

import { afterAll, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const HOOK_SOURCE = join(import.meta.dirname, "pre", "bd-session.ts");

const RULE_BODY = "## Communication style\n\nLead with the next action. SENTINEL-RULE-BODY-LINE.";
const RULE_FILE = `---\nalwaysApply: true\n---\n${RULE_BODY}\n`;
const FRONTMATTER_ONLY = "---\nalwaysApply: true\n---\n";

// An entry file that IS wired, for cases that need the onboard nudge out of the way so they can
// assert on something else. Must carry the same marker the hook greps for.
const WIRED_ENTRY = "<!-- BEGIN better-dev -->\nwired\n<!-- END better-dev -->\n";

const PACKAGE_NAME = "better-dev";

/**
 * Install shapes. Everything but the two `marketplace*` shapes and `unknown` is a shape the host
 * DOES load rules from, so the hook must stay quiet on it. Each of those carries its own reason the
 * old answer was wrong, so each needs its own fixture - and each is paired with `omitRecognition`,
 * which strips the one artifact that identifies it and asserts the rule then goes out. Without that
 * pair every one of these cases is a bare negative assertion, which a hook that does nothing also
 * satisfies.
 */
type Install =
  | "marketplace"
  | "marketplace-project"
  | "link"
  | "link-triple-underscore"
  | "link-renamed"
  | "link-scoped"
  | "project"
  | "settings-extension"
  | "settings-extension-user"
  | "unknown";

/**
 * Where an entry file is written, relative to the repo root. The first four are every target
 * /onboard writes the discovery block into, and the hook has to read all four - omp reads the two
 * AGENTS.md spellings and neither CLAUDE one, Claude Code reads the two CLAUDE ones and not
 * AGENTS.md, so a hook that checks a subset tells a wired repo it is unwired and nudges it forever.
 * The last path is a decoy: only the repo ROOT's copies count, and a walk that found this one would
 * read any vendored subtree as wiring the whole repo.
 */
type EntryPath =
  | "AGENTS.md"
  | "CLAUDE.md"
  | ".omp/AGENTS.md"
  | "CLAUDE.local.md"
  | "packages/core/AGENTS.md";

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
  /** Entry-file contents, at `entryFileName`. Omit to ship no entry file. */
  entryFile?: string;
  /** Which entry file carries it. Defaults to the repo root's CLAUDE.md. */
  entryFileName?: EntryPath;
  /** A second entry file beside the first, so order-independence can be measured. */
  secondEntryFile?: { name: EntryPath; text: string };
  /** false makes cwd a plain directory with no repo above it. */
  repo?: boolean;
  /** Start the session this far below the repo root, the way an agent launched in a subdir does. */
  startIn?: string;
  /** Break the host contract on purpose. Every one of these must degrade to silence. */
  host?: "no-ui" | "throwing-notify" | "no-pi" | "throwing-agent-dir";
  /** Ship a package.json that is not JSON. */
  badManifest?: boolean;
  /**
   * Build the shape's tree but omit the artifact that identifies it - the node_modules link, or the
   * settings entry. The positive control for every "stays quiet on shape X" case: the same tree
   * minus that one file has to deliver.
   */
  omitRecognition?: boolean;
  /** How a settings `extensions` entry is spelled. The host accepts all three. */
  extensionEntry?: "absolute" | "tilde" | "relative";
  /**
   * The host layout the state roots are read out of, all three of which the default derivation got
   * wrong. `profile` is `OMP_PROFILE=work`: the agent dir sits one level deeper, at
   * `<config>/profiles/work/agent`, so the parent directory's name is the profile's rather than the
   * config dir's. `xdg` is a machine `omp config init-xdg` has migrated: the plugins tree moves to
   * `$XDG_DATA_HOME/omp/plugins` and the agent dir stays where it was, so the two stop being
   * siblings at all. `xdg-unmigrated` exports the variable and never migrated, which is the common
   * case on linux: the host keeps the config root, and reading XDG there would be wrong the other
   * way round.
   */
  layout?: "profile" | "xdg" | "xdg-unmigrated";
  /**
   * What the host reports as the active model. `promoting` is a first-party Anthropic Opus 4.8+ /
   * Sonnet 5+ model, whose resolved compat carries `supportsMidConversationSystem: true` - the
   * exact field the converter reads before it promotes a developer turn to a wire `system` block.
   * `absent` is a host that has selected no model yet.
   */
  modelCompat?: "promoting" | "plain" | "absent";
  /** The messages already in the request when the context event fires. */
  conversation?: Message[];
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

// A tree built under the real home directory, so a `~`-spelled path in it expands to itself. Bun's
// os.homedir() reads the passwd entry and ignores $HOME, so overriding the environment cannot
// exercise the expansion - only a tree that really is under the home directory can.
const homeRoots: string[] = [];
afterAll(() => {
  for (const root of homeRoots) rmSync(root, { recursive: true, force: true });
});

async function run(fixture: Fixture): Promise<Run> {
  // A `~`-spelled entry only expands to the fixture's own tree when the tree really is under the
  // home directory, so that one case builds there and is removed afterwards.
  const underHome = fixture.extensionEntry === "tilde";
  const root = mkdtempSync(join(underHome ? homedir() : tmpdir(), ".bd-session-"));
  if (underHome) homeRoots.push(root);
  // Mirrors the host's real layout. By default the plugin state root is a sibling of the agent dir;
  // the two layouts below are the supported configurations where it is not, and each is built as
  // the host builds it rather than by pointing the hook at a path.
  const configRoot = fixture.layout === "profile" ? join(root, ".omp", "profiles", "work") : join(root, ".omp");
  const agentDir = join(configRoot, "agent");
  // The resolver only takes the XDG path once `$XDG_DATA_HOME/omp` is already on disk, which is what
  // `omp config init-xdg` leaves behind - so where the tree is created below is what arms each case,
  // and `xdg-unmigrated` sets the variable while leaving that path absent.
  const xdgDataHome = fixture.layout?.startsWith("xdg") === true ? join(root, "xdg") : undefined;
  const stateRoot = fixture.layout === "xdg" ? join(root, "xdg", "omp", "plugins") : join(configRoot, "plugins");
  mkdirSync(agentDir, { recursive: true });
  mkdirSync(join(stateRoot, "node_modules"), { recursive: true });

  const cwd = fixture.startIn === undefined ? join(root, "work") : join(root, "work", fixture.startIn);
  mkdirSync(cwd, { recursive: true });
  const repoRoot = join(root, "work");
  if (fixture.repo !== false) mkdirSync(join(repoRoot, ".git"), { recursive: true });
  // Two of the four targets are nested (`.omp/AGENTS.md`), and one fixture writes below a package
  // dir, so the parent has to be created rather than assumed to be the repo root.
  const writeEntry = (name: EntryPath, text: string): void => {
    const at = join(repoRoot, name);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, text);
  };
  if (fixture.entryFile !== undefined) writeEntry(fixture.entryFileName ?? "CLAUDE.md", fixture.entryFile);
  if (fixture.secondEntryFile !== undefined) {
    writeEntry(fixture.secondEntryFile.name, fixture.secondEntryFile.text);
  }

  const version = fixture.version ?? "0.1.0";
  const pluginRoot = (() => {
    switch (fixture.install) {
      // Both marketplace shapes cache under the USER root, whatever scope the install used:
      // `getPluginsCacheDir()` takes no scope argument. Only the runtime symlink moves.
      case "marketplace":
      case "marketplace-project":
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
  // The same root, spelled the three ways the host accepts: absolute, tilde-relative to the home
  // directory, and relative to the startup directory.
  const extensionsAt = (settings: string): void => {
    const entry =
      fixture.extensionEntry === "tilde"
        ? `~${pluginRoot.slice(homedir().length)}`
        : fixture.extensionEntry === "relative"
          ? relative(cwd, pluginRoot)
          : pluginRoot;
    mkdirSync(dirname(settings), { recursive: true });
    writeFileSync(settings, JSON.stringify({ extensions: [entry] }));
  };
  if (fixture.omitRecognition !== true) {
    switch (fixture.install) {
      // A marketplace install ALSO writes a runtime symlink into the state root of its install
      // scope (MarketplaceManager#registerRuntimePlugin -> #nodeModulesPath(scope)). Omitting it
      // made linkedUnder() miss on every root, so the cache mark - the one line that decides a
      // real marketplace install - was reached by no test in this file, and a mutation deleting it
      // kept the whole suite green.
      case "marketplace":
      case "link":
      case "link-triple-underscore":
        linkAt(PACKAGE_NAME);
        break;
      // `omp plugin install --scope project <name@marketplace>`. Cache at the user root, link under
      // the project root: the two differ by construction, which is what made this shape - the only
      // install shape that HAS a project scope - deliver by no route at all.
      case "marketplace-project":
      case "project":
        linkAt(PACKAGE_NAME, join(repoRoot, ".omp", "plugins"));
        break;
      case "link-renamed":
        linkAt("bd-fork");
        break;
      case "link-scoped":
        linkAt(join("@yoelgal", PACKAGE_NAME));
        break;
      case "settings-extension":
        extensionsAt(join(repoRoot, ".omp", "settings.json"));
        break;
      case "settings-extension-user":
        extensionsAt(join(agentDir, "settings.json"));
        break;
      default:
        break;
    }
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
  // The host's resolved model compat decides where the rule can go, so the fixture has to carry it.
  const model =
    fixture.modelCompat === "absent"
      ? undefined
      : { id: "claude-opus-4-8", compat: { supportsMidConversationSystem: fixture.modelCompat === "promoting" } };
  const ctx = { cwd, ui: fixture.host === "no-ui" ? undefined : ui, model };

  // Dynamic by necessity: the specifier is a per-case fixture path, and loading the hook from that
  // path is the behaviour under test - a static import would resolve the repo's copy and measure
  // the repo's rules/ and package.json instead of the fixture's. chdir'd first, because the hook
  // resolves the host's project-scope plugin root from the startup directory, at load.
  const before = process.cwd();
  // Every case sets this variable, including the ones that want no XDG root at all: a developer
  // machine that happens to export it and happens to have `$XDG_DATA_HOME/omp` on disk would
  // otherwise move the state root out from under every other fixture here, silently.
  const beforeXdg = process.env.XDG_DATA_HOME;
  if (xdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
  else process.env.XDG_DATA_HOME = xdgDataHome;
  process.chdir(cwd);
  let factory: (api: unknown) => void;
  try {
    factory = (await import(join(pluginRoot, "hooks", "pre", "bd-session.ts"))).default;
  } finally {
    process.chdir(before);
  }

  let messages: Message[] = fixture.conversation ?? [{ role: "user", content: "the actual request" }];
  try {
    factory(api);
    for (const handler of sessionStart) handler(undefined, ctx);
    for (const handler of context) {
      const result = handler({ messages }, ctx);
      if (result?.messages) messages = result.messages;
    }
  } finally {
    if (beforeXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = beforeXdg;
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
  // The real conversation survives, and the operator's own turn is still the last one.
  expect(result.messages[result.messages.length - 1]?.content).toBe("the actual request");
});

// The feature's headline path, and the one shape that reaches the model by no other route.
// `omp plugin install --scope project <name@marketplace>` caches under the USER root
// (`getPluginsCacheDir()` takes no scope) and writes its runtime symlink under the PROJECT root
// (`#nodeModulesPath(scope)`), so those two roots differ by construction. Testing the cache mark
// against the root that carried the link made this read as a link root, and the rule was dropped
// entirely - a miss, which is the one direction this design says can never happen. `--scope` is
// refused for npm and git specs, so project scope IS the marketplace channel.
test("injects the comms rule on a project-scope marketplace install, where no route delivers it", async () => {
  const result = await run({ install: "marketplace-project", rule: RULE_FILE });
  expect(result.contextHandlers).toBe(1);
  expect(String(injected(result)?.content)).toContain("SENTINEL-RULE-BODY-LINE");
});

// Role and position are the whole value of the injection, and both are load-bearing.
//
// Role, measured through the host's own `convertAnthropicMessages`: a `developer` turn reaches the
// Anthropic wire as `role: "system"` on a model whose resolved compat allows a mid-conversation
// system block, and as `role: "user"` everywhere else - which is what this message was before.
// Ollama maps `developer` to `system` outright.
test("delivers the rule as a `developer` turn, the strongest role a hook can emit", async () => {
  const rule = injected(await run({ install: "marketplace", rule: RULE_FILE }));
  expect(rule?.role).toBe("developer");
});

// Position is conditional, and the condition is the same field the promotion itself reads:
// `model.compat.supportsMidConversationSystem`. Where the promotion is available the rule is
// appended, because the promotion requires a turn that follows a user turn and is last or precedes
// an assistant turn. Where it is not, the rule must never be the LAST entry - Cursor reads the last
// message as the request being sent, so an appended rule became the request and demoted the
// operator's own into history.
test("appends the rule on a model that promotes a developer turn to a system block", async () => {
  const conversation = [
    { role: "user", content: "an older request" },
    { role: "assistant", content: "done" },
    { role: "user", content: "the actual request" },
  ];
  const result = await run({ install: "marketplace", rule: RULE_FILE, modelCompat: "promoting", conversation });
  expect(result.messages.map(message => message.role)).toEqual(["user", "assistant", "user", "developer"]);
  expect(injected(result)).toBe(result.messages[result.messages.length - 1]);
});

test("keeps the rule off the last position on every other model, where the last turn IS the request", async () => {
  const conversation = [
    { role: "user", content: "an older request" },
    { role: "assistant", content: "done" },
    { role: "user", content: "the actual request" },
  ];
  const result = await run({ install: "marketplace", rule: RULE_FILE, modelCompat: "plain", conversation });
  expect(result.messages.map(message => message.role)).toEqual(["user", "assistant", "developer", "user"]);
  expect(result.messages[result.messages.length - 1]?.content).toBe("the actual request");
});

// A host that has selected no model yet cannot be confirmed to promote, and an unconfirmed promotion
// is not one - so it takes the placement that is safe on every provider.
test("treats a host that reports no model as one that cannot promote", async () => {
  const conversation = [
    { role: "user", content: "an older request" },
    { role: "assistant", content: "done" },
    { role: "user", content: "the actual request" },
  ];
  const result = await run({ install: "marketplace", rule: RULE_FILE, modelCompat: "absent", conversation });
  expect(result.messages.map(message => message.role)).toEqual(["user", "assistant", "developer", "user"]);
});

// An assistant turn at the tail is a prefill the model is meant to continue. Appending after it
// destroys the prefill AND forfeits the promotion, since the appended turn no longer follows a user
// turn. Before it, both hold.
test("puts the rule before a trailing assistant prefill rather than after it", async () => {
  const conversation = [
    { role: "user", content: "the actual request" },
    { role: "assistant", content: "Sure, here" },
  ];
  const result = await run({ install: "marketplace", rule: RULE_FILE, modelCompat: "promoting", conversation });
  expect(result.messages.map(message => message.role)).toEqual(["user", "developer", "assistant"]);
});

// A tool result at the tail is the agentic loop's own shape, and the position that is safe there is
// not the same one. On a promoting model the rule appends after the result and still promotes -
// measured. On every other model it goes back to just after the last user turn: any later position
// would land between an assistant's tool call and its result, which the API rejects outright.
test("never splits an assistant's tool call from its result", async () => {
  const conversation = [
    { role: "user", content: "the actual request" },
    { role: "assistant", content: [{ type: "toolCall", id: "t1", name: "read" }] },
    { role: "toolResult", content: "file contents" },
  ];
  const plain = await run({ install: "marketplace", rule: RULE_FILE, conversation });
  expect(plain.messages.map(message => message.role)).toEqual(["user", "developer", "assistant", "toolResult"]);
  const promoting = await run({ install: "marketplace", rule: RULE_FILE, modelCompat: "promoting", conversation });
  expect(promoting.messages.map(message => message.role)).toEqual(["user", "assistant", "toolResult", "developer"]);
});

// A call carrying no messages: `messages.length - 1` is -1, the non-promoting loop never runs, and
// index 0 falls out of the arithmetic on both branches. The list this pins is the one the hook has
// always produced, so removing the guard that now states the case keeps this green - it is here to
// hold the output, and to be the place a later edit to that arithmetic gets caught.
test("hands back the rule alone when the call carries no messages at all", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, conversation: [] } as const;
  for (const modelCompat of ["plain", "promoting"] as const) {
    const result = await run({ ...fixture, modelCompat });
    expect(result.messages).toHaveLength(1);
    expect(String(result.messages[0]?.content)).toContain("SENTINEL-RULE-BODY-LINE");
  }
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
  // Wired entry file on purpose: this case is about the rule path, and a repo with no block would
  // legitimately raise the onboard nudge, which would make the empty-notices assertion measure two
  // things and fail for the wrong reason.
  const result = await run({ install: "marketplace", entryFileName: "AGENTS.md", entryFile: WIRED_ENTRY });
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

/**
 * Every shape the host already delivers rules for, asserted in BOTH directions: the shape stays
 * quiet, and the same tree with its one identifying artifact removed delivers. The second half is
 * the positive control, and without it each of these cases is a bare negative assertion - satisfied
 * just as well by a hook that does nothing at all. It is also what pins the artifact as the reason:
 * the two runs differ by one symlink or one settings file and nothing else.
 */
async function quietWithPositiveControl(fixture: Fixture): Promise<void> {
  const quiet = await run(fixture);
  expect(quiet.contextHandlers).toBe(0);
  expect(quiet.messages).toHaveLength(1);
  expect(JSON.stringify(quiet.messages)).not.toContain("SENTINEL-RULE-BODY-LINE");
  const control = await run({ ...fixture, omitRecognition: true });
  expect(String(injected(control)?.content)).toContain("SENTINEL-RULE-BODY-LINE");
}

test("stays quiet on a link install, where a rules provider already delivered the rule", async () => {
  await quietWithPositiveControl({ install: "link", rule: RULE_FILE });
});

// The shapes below all resolve to a root the host loads rules from, and each one used to get the
// rule twice - 6877 bytes, ~1.7k tokens, on every LLM call. Each is a separate reason the old answer
// was wrong, so each needs its own fixture.

test("stays quiet on a link root whose directory name carries the marketplace cache grammar", async () => {
  await quietWithPositiveControl({ install: "link-triple-underscore", rule: RULE_FILE });
});

test("stays quiet on a project-scope install, which the host loads as readily as a user one", async () => {
  await quietWithPositiveControl({ install: "project", rule: RULE_FILE });
});

// `omp plugin install --scope project` bootstraps `<cwd>/.omp/` in a directory that is not a git
// repo at all (`resolveOrDefaultProjectRegistryPath`), and the config-dir marker is then the only
// anchor that can find that install. Every other fixture has a `.git` beside the config dir, where
// both markers answer the same - which is why dropping the config-dir pass changed no result.
test("finds a project-scope install anchored on the config dir alone, with no .git above it", async () => {
  await quietWithPositiveControl({ install: "project", rule: RULE_FILE, repo: false });
});

test("stays quiet when the install directory name is not the manifest's package name", async () => {
  await quietWithPositiveControl({ install: "link-renamed", rule: RULE_FILE });
});

test("stays quiet when the root is named in the host's `extensions` settings", async () => {
  await quietWithPositiveControl({ install: "settings-extension", rule: RULE_FILE });
});

// The host reads `extensions` at both scopes - the user list from `<agentDir>/settings.json`, the
// project list from `<cwd>/.omp/settings.json` with no walk-up. Only the project one was fixtured,
// so dropping the user-scope read broke nothing in this suite.
test("stays quiet when the root is named in the user-scope `extensions` settings", async () => {
  await quietWithPositiveControl({ install: "settings-extension-user", rule: RULE_FILE });
});

// Two spellings the host accepts for the same root, and neither was fixtured: a leading tilde
// expands against the home directory, and a relative entry resolves against the startup directory.
// Read literally, either one names a path that exists nowhere and the rule goes out twice.
test("stays quiet when the `extensions` entry is spelled with a leading tilde", async () => {
  await quietWithPositiveControl({ install: "settings-extension", rule: RULE_FILE, extensionEntry: "tilde" });
});

test("stays quiet when the `extensions` entry is a path relative to the startup directory", async () => {
  await quietWithPositiveControl({ install: "settings-extension", rule: RULE_FILE, extensionEntry: "relative" });
});

test("stays quiet on a scoped-package install, which nests one directory deeper", async () => {
  await quietWithPositiveControl({ install: "link-scoped", rule: RULE_FILE });
});

// The two layouts where the state roots are not where the agent dir says they are, and both were
// read wrong. Under a named profile the agent dir is `<config>/profiles/work/agent`, so taking the
// parent's name gave `work` and the upward walk hunted for a directory called that - here it finds
// the repo's own parent and reads a plugin root nothing was ever installed into.
test("finds a project-scope install under a named profile, whose agent dir sits a level deeper", async () => {
  await quietWithPositiveControl({ install: "project", rule: RULE_FILE, layout: "profile" });
});

// After `omp config init-xdg` the plugins tree is at `$XDG_DATA_HOME/omp/plugins` and the agent dir
// has not moved, so the sibling path names nothing and every install under the real root read as
// unrecognised.
test("reads a link install out of the plugins tree an XDG migration moved", async () => {
  await quietWithPositiveControl({ install: "link", rule: RULE_FILE, layout: "xdg" });
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

// The failure this pins is silence, which is why it needs its own case rather than riding along with
// the delivery ones above. An XDG-migrated machine has no plugins tree beside the agent dir, so the
// state root resolved to undefined and the nudge stopped firing - the alert half of what this hook
// is for, gone, on a session that looks perfectly healthy from the outside.
test("still names the upgrade after an XDG migration has moved the plugins tree", async () => {
  const fixture = { install: "marketplace", rule: RULE_FILE, version: "0.1.0", catalogVersion: "0.2.0" } as const;
  const result = await run({ ...fixture, layout: "xdg" });
  expect(result.statuses).toEqual(["better-dev=omp plugin upgrade better-dev@bd - 0.2.0 available"]);
  // And the other way round, which is the reading a bare `$XDG_DATA_HOME` check would get wrong: the
  // variable is exported, nothing was ever migrated, and the host stays with the config root.
  const unmigrated = await run({ ...fixture, layout: "xdg-unmigrated" });
  expect(unmigrated.statuses).toEqual(["better-dev=omp plugin upgrade better-dev@bd - 0.2.0 available"]);
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

// One case per target /onboard writes the block into, and the whole reason that list is four names
// long. Measured 2026-08-21, a unique token per file in a temp repo with each agent asked what
// reached its context: omp loads root AGENTS.md and loads neither root CLAUDE.md nor
// CLAUDE.local.md; Claude Code 2.1.233 loads both of those and not AGENTS.md. The hosts read
// disjoint sets, so /onboard writes one copy per host. The nudge asks whether THIS host is wired, so
// only omp's readable paths clear it: this hook is `hooks/pre/*.ts`, an omp convention that Claude
// Code does not load, so every run of it is an omp run.
for (const name of ["AGENTS.md", ".omp/AGENTS.md"] as EntryPath[]) {
  test(`stays quiet when the block is in ${name}, which omp reads`, async () => {
    const entryFile = `# Repo\n\n${WIRED_ENTRY}`;
    const result = await run({ install: "marketplace", rule: RULE_FILE, entryFileName: name, entryFile });
    expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
  });
}

// The other half, and the reason the union was wrong. A block in a file omp never loads leaves every
// omp session in that repo with no discovery block, so it must still nudge. Counting these reported
// the repo as wired and silenced the one message that would have fixed it. Observed on a real repo:
// `terminal-browser` carries its block in `CLAUDE.local.md` from an earlier solo run.
for (const name of ["CLAUDE.md", "CLAUDE.local.md"] as EntryPath[]) {
  test(`still nudges when the block is only in ${name}, which omp does not read`, async () => {
    const entryFile = `# Repo\n\n${WIRED_ENTRY}`;
    const result = await run({ install: "marketplace", rule: RULE_FILE, entryFileName: name, entryFile });
    expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
  });
}

// The reported bug, inverted from what this suite used to assert. A repo carrying no entry file at
// all is the clearest case for onboarding, and it was the one case that stayed silent: measured
// 2026-08-21 on two real repos, one with both entry files and no block (nudged) and one with neither
// (silent).
test("nudges a repo that carries no entry file at all", async () => {
  const result = await run({ install: "marketplace", rule: RULE_FILE });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
});

// Order independence: the block living in the second entry file must count, or the answer depends on
// which name the hook happens to check first. Repos carrying both files are common.
test("counts the block in AGENTS.md even when an unrelated CLAUDE.md exists", async () => {
  const result = await run({
    install: "marketplace",
    rule: RULE_FILE,
    entryFile: "# project notes, no block\n",
    secondEntryFile: { name: "AGENTS.md", text: WIRED_ENTRY },
  });
  expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
});

// The solo adoption shape on omp: nothing is committed, so the wiring sits in `.omp/AGENTS.md` while
// the committed entry file carries none of it.
test("counts the block in .omp/AGENTS.md when the committed entry file carries none", async () => {
  const result = await run({
    install: "marketplace",
    rule: RULE_FILE,
    entryFile: "# project notes, no block\n",
    entryFileName: "AGENTS.md",
    secondEntryFile: { name: ".omp/AGENTS.md", text: WIRED_ENTRY },
  });
  expect(result.notices.filter(line => line.includes("/onboard"))).toEqual([]);
});

// The real `terminal-browser` shape, end to end: committed files carry no block, the Claude-Code-only
// local file does. omp is unwired here, so the nudge has to fire.
test("nudges when only CLAUDE.local.md is wired and the committed files are not", async () => {
  const result = await run({
    install: "marketplace",
    rule: RULE_FILE,
    entryFile: "# project notes, no block\n",
    secondEntryFile: { name: "CLAUDE.local.md", text: WIRED_ENTRY },
  });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
});

// Only the repo root's copies count, and one target being nested is exactly what would tempt a later
// edit into a recursive search. A vendored subtree carrying its own AGENTS.md says nothing about
// whether THIS repo is wired, and a walk that counted it would read every such repo as wired.
test("does not count an AGENTS.md below the repo root", async () => {
  const result = await run({
    install: "marketplace",
    rule: RULE_FILE,
    entryFileName: "packages/core/AGENTS.md",
    entryFile: WIRED_ENTRY,
  });
  expect(result.notices.filter(line => line.includes("/onboard"))).toHaveLength(1);
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
