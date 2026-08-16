// better-dev awareness bridge for omp: the tool's bash awareness hooks, in omp's hook API.
// better-dev-omp-hook
//
// omp has no command-hook config - SessionStart, SubagentStart and PreToolUse do not exist in
// it - so the awareness set cannot be registered the way install.sh registers it for Claude
// Code. omp loads this module instead, from $HOME/.omp/agent/hooks/pre/bd-awareness.ts.
//
// Line 2 above is the ours-marker: it is how install.sh and scripts/bd-omp-hook-wire decide
// whether the file sitting at that target is ours, through a symlink and for a copy alike.
//
// The literal relative path "hooks/bd-session-start" below is also install.sh --verify's
// assertion for this host: it greps the installed target for that string. Renaming the exec
// path breaks that assertion - keep the two in step.
//
// omp has no subagent-spawn event, so the worker note rides a tool_call handler on the task
// tool, prepended to the batch context field.

import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SESSION_HOOK = "hooks/bd-session-start";
const SUBAGENT_HOOK = "hooks/bd-subagent-start";
const GRAPHIFY_HOOK = "hooks/bd-graphify-refresh-stale";

// omp imposes no timeout of its own on a hook, so the bound has to live here. 5s is what these
// scripts are already written against (hooks/hooks.json, Claude Code's own budget).
const TIMEOUT_MS = 5000;

type ChildEnv = Record<string, string | undefined>;

interface HookContext {
  cwd?: string;
}

interface ToolCallEvent {
  toolName?: string;
  input?: Record<string, unknown>;
}

interface ToolCallResult {
  input: Record<string, unknown>;
}

interface CustomMessage {
  customType: string;
  content: string;
  display: boolean;
  attribution: string;
}

// Declared here rather than imported from the omp package: the installed module is read from
// omp's own hooks dir, where nothing resolves but node builtins.
interface HookApi {
  on(event: "session_start", handler: (event: unknown, ctx: HookContext) => void): void;
  on(event: "tool_call", handler: (event: ToolCallEvent, ctx: HookContext) => ToolCallResult | undefined): void;
  sendMessage(message: CustomMessage): void;
}

// The dir holding omp's own skills/ and hooks/ - $HOME/.omp/agent for the default profile. An
// installed module sits at <agent-dir>/hooks/pre/bd-awareness.ts, so its own directory's ../..
// is that dir. Derived from the UNRESOLVED path on purpose: a symlink install resolves into
// the clone, which is not the agent dir.
function agentDirFor(self: string, home: string): string {
  const guess = resolve(dirname(self), "..", "..");
  if (existsSync(join(guess, "skills", ".better-dev-install"))) return guess;
  return join(home, ".omp", "agent");
}

// The clone the module was installed from, or undefined when nothing confirms one.
function resolveClone(self: string, agentDir: string): string | undefined {
  try {
    // Symlink install: the module's real path is <clone>/hooks/omp/bd-awareness.ts.
    const linked = resolve(dirname(realpathSync(self)), "..", "..");
    if (existsSync(join(linked, SESSION_HOOK))) return linked;
  } catch {
    // an unreadable module path is the copy case below, not a failure to report
  }
  try {
    // Copy install (Windows, or BD_FORCE_COPY): the symlink is gone, so the marker install.sh
    // writes beside the skill links is the only thing that still knows the clone.
    const marked = readFileSync(join(agentDir, "skills", ".better-dev-install"), "utf8").trim();
    if (marked && existsSync(join(marked, SESSION_HOOK))) return marked;
  } catch {
    // no marker: install.sh never ran for this host
  }
  return undefined;
}

// stdout of a clean run, or undefined for every other outcome: a missing script, a non-zero
// exit, or the bound expiring. stdin is closed rather than piped so a hook that reads it gets
// EOF instead of waiting on us.
function run(script: string, cwd: string | undefined, env: ChildEnv): string | undefined {
  const res = spawnSync(script, [], { cwd, env, timeout: TIMEOUT_MS, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (res.status !== 0 || typeof res.stdout !== "string") return undefined;
  return res.stdout;
}

// Fire-and-forget: the staleness refresh emits no context, and waiting on it would put a
// second 5s bound in series with the session hook's.
function fire(script: string, cwd: string | undefined, env: ChildEnv): void {
  try {
    const child = spawn(script, [], { cwd, env, timeout: TIMEOUT_MS, stdio: "ignore" });
    child.on("error", () => {}); // an unhandled 'error' event on a missing script kills the session
    child.unref();
  } catch {
    // best-effort by design
  }
}

function parse(raw: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// The hooks branch their context field per host: Cursor takes snake_case, Claude Code the
// nested shape, everything else the top-level one. Read all three rather than pinning the
// branch whichever host env vars happen to be set would select.
function noteOf(out: Record<string, unknown>): string | undefined {
  const nested = out.hookSpecificOutput;
  const inner = nested && typeof nested === "object" ? (nested as Record<string, unknown>).additionalContext : undefined;
  return text(inner) ?? text(out.additionalContext) ?? text(out.additional_context);
}

// TOTALITY. omp's emitToolCall is the one event whose handler errors it does NOT swallow: a
// throw here blocks the tool call, so a broken better-dev hook would block every task
// dispatch on the machine. Both handlers therefore catch everything and fall back to
// injecting nothing.
function install(pi: HookApi, self: string, home: string): void {
  try {
    const agentDir = agentDirFor(self, home);
    const root = resolveClone(self, agentDir);
    if (!root) return;
    // bd-session-start's link and hook nudges answer for the host that invoked them, so tell
    // it which host that is. Empty settings is omp's real answer rather than a missing value:
    // there is no JSON hook config here for a wired set to be compared against.
    const env: ChildEnv = {
      ...process.env,
      BD_HOST_SKILLS_DIR: join(agentDir, "skills"),
      BD_HOST_HOOK_SETTINGS: "",
      BD_HOST_HOOK_WIRE: "bd-omp-hook-wire",
    };

    pi.on("session_start", (_event, ctx) => {
      try {
        const out = run(join(root, SESSION_HOOK), ctx?.cwd, env);
        fire(join(root, GRAPHIFY_HOOK), ctx?.cwd, env);
        const parsed = out ? parse(out) : undefined;
        if (!parsed) return;
        const note = noteOf(parsed);
        if (note) pi.sendMessage({ customType: "better-dev", content: note, display: false, attribution: "user" });
        // The welcome is operator-facing, which is the whole reason it is a separate field.
        const welcome = text(parsed.systemMessage);
        if (welcome) pi.sendMessage({ customType: "better-dev", content: welcome, display: true, attribution: "user" });
      } catch {
        // an awareness nudge is never worth a broken session
      }
    });

    pi.on("tool_call", (event, ctx) => {
      try {
        if (event?.toolName !== "task") return undefined;
        const out = run(join(root, SUBAGENT_HOOK), ctx?.cwd, env);
        const parsed = out ? parse(out) : undefined;
        const note = parsed ? noteOf(parsed) : undefined;
        if (!note) return undefined;
        const input = event.input ?? {};
        const prior = typeof input.context === "string" ? input.context : "";
        return { input: { ...input, context: `${note}\n\n${prior}` } };
      } catch {
        return undefined;
      }
    });
  } catch {
    // a bridge that cannot resolve its own clone registers nothing
  }
}

export default function bdAwareness(pi: HookApi): void {
  install(pi, fileURLToPath(import.meta.url), homedir());
}

// --- selftest -----------------------------------------------------------------------------
// Runs against a recording fake pi and tempdir fixtures holding fake hook scripts. Offline,
// no network, no reach outside the tempdir.

interface Fake {
  pi: HookApi;
  handlers: Map<string, (event: unknown, ctx: HookContext) => unknown>;
  messages: CustomMessage[];
}

function fake(): Fake {
  const handlers = new Map<string, (event: unknown, ctx: HookContext) => unknown>();
  const messages: CustomMessage[] = [];
  const pi = {
    on(event: string, handler: (event: unknown, ctx: HookContext) => unknown) {
      handlers.set(event, handler);
    },
    sendMessage(message: CustomMessage) {
      messages.push(message);
    },
  } as unknown as HookApi;
  return { pi, handlers, messages };
}

function script(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
}

interface Fixture {
  clone: string;
  home: string;
  self: string;
  cwd: string;
}

let fixtureSeq = 0;

// A clone carrying the module and fake hooks, plus a working dir with a .better-dev/ scaffold.
// The session hook always exists: it is what clone resolution confirms a clone by.
function fixture(tmp: string, session: string, subagent?: string): Fixture {
  const dir = join(tmp, `f${++fixtureSeq}`);
  const clone = join(dir, "clone");
  const self = join(clone, "hooks", "omp", "bd-awareness.ts");
  mkdirSync(dirname(self), { recursive: true });
  writeFileSync(self, "");
  script(join(clone, SESSION_HOOK), session);
  script(join(clone, GRAPHIFY_HOOK), "exit 0");
  if (subagent !== undefined) script(join(clone, SUBAGENT_HOOK), subagent);
  const cwd = join(dir, "proj");
  mkdirSync(join(cwd, ".better-dev"), { recursive: true });
  const home = join(dir, "home");
  mkdirSync(home, { recursive: true });
  return { clone, home, self, cwd };
}

function called(fn: unknown, event: unknown, ctx: HookContext): { value?: unknown; threw?: unknown } {
  try {
    return { value: (fn as (e: unknown, c: HookContext) => unknown)(event, ctx) };
  } catch (err) {
    return { threw: err };
  }
}

function selftest(): void {
  const bad: string[] = [];
  const check = (ok: unknown, why: string) => {
    if (!ok) bad.push(why);
  };
  const tmp = mkdtempSync(join(tmpdir(), "bd-omp-awareness-"));
  try {
    // 1. the default output shape, the note hidden and the welcome displayed. The fake hook
    // emits only when it can see the scaffold in its cwd, so ctx.cwd reaching the child is
    // load-bearing here rather than assumed, and it records the host-scoping env it was given.
    const one = fixture(
      tmp,
      'printf "%s|%s|%s\\n" "$BD_HOST_SKILLS_DIR" "${BD_HOST_HOOK_SETTINGS-unset}" "$BD_HOST_HOOK_WIRE" > "$PWD/env.txt"\n'
        + '[ -d .better-dev ] || exit 0\n'
        + 'printf \'{"systemMessage":"W","additionalContext":"NOTE-BODY"}\\n\'',
    );
    let f = fake();
    install(f.pi, one.self, one.home);
    check(f.handlers.has("session_start"), "no session_start handler registered on a resolvable clone");
    let r = called(f.handlers.get("session_start"), { type: "session_start" }, { cwd: one.cwd });
    check(!r.threw, `session_start threw: ${String(r.threw)}`);
    const hidden = f.messages.filter(m => m.display === false);
    const shown = f.messages.filter(m => m.display === true);
    check(hidden.length === 1, `expected exactly one hidden message, got ${hidden.length}`);
    check(hidden[0]?.content.includes("NOTE-BODY"), "hidden message does not carry the hook's note");
    check(hidden[0]?.customType === "better-dev", "hidden message has the wrong customType");
    check(hidden[0]?.attribution === "user", "hidden message has the wrong attribution");
    check(shown.length === 1 && shown[0].content.includes("W"), "welcome not sent as a displayed message");
    const recorded = existsSync(join(one.cwd, "env.txt")) ? readFileSync(join(one.cwd, "env.txt"), "utf8").trim() : "";
    check(recorded === `${join(one.home, ".omp", "agent", "skills")}||bd-omp-hook-wire`, `host-scoping env not passed to the child: ${recorded}`);

    // 2. the nested shape Claude Code's branch emits is read too.
    const two = fixture(tmp, 'printf \'{"hookSpecificOutput":{"additionalContext":"NOTE-BODY"}}\\n\'');
    f = fake();
    install(f.pi, two.self, two.home);
    r = called(f.handlers.get("session_start"), {}, { cwd: two.cwd });
    check(!r.threw, `nested-shape session_start threw: ${String(r.threw)}`);
    check(f.messages.length === 1 && f.messages[0].content.includes("NOTE-BODY"), "nested additionalContext not read");

    // 3. welcome with no context - the not-installed case - injects no context message.
    const three = fixture(tmp, 'printf \'{"systemMessage":"W"}\\n\'');
    f = fake();
    install(f.pi, three.self, three.home);
    r = called(f.handlers.get("session_start"), {}, { cwd: three.cwd });
    check(!r.threw, `welcome-only session_start threw: ${String(r.threw)}`);
    check(f.messages.filter(m => m.display === false).length === 0, "injected a context message with no note in the output");

    // 4. the task tool gets the worker note prepended to its batch context.
    const four = fixture(tmp, "exit 0", 'printf \'{"hookSpecificOutput":{"additionalContext":"WORKER-NOTE"}}\\n\'');
    f = fake();
    install(f.pi, four.self, four.home);
    check(f.handlers.has("tool_call"), "no tool_call handler registered on a resolvable clone");
    const tasks: unknown[] = [];
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER", tasks } }, { cwd: four.cwd });
    check(!r.threw, `task tool_call threw: ${String(r.threw)}`);
    const revised = (r.value as ToolCallResult | undefined)?.input;
    const context = typeof revised?.context === "string" ? revised.context : "";
    check(context.includes("WORKER-NOTE"), "revised task context is missing the worker note");
    check(context.includes("CALLER"), "revised task context dropped the caller's own context");
    check(context.indexOf("WORKER-NOTE") < context.indexOf("CALLER"), "worker note is not prepended");
    check(revised?.tasks === tasks, "tasks did not survive the context revision untouched");

    // 5. every other tool is left alone.
    f = fake();
    install(f.pi, four.self, four.home);
    r = called(f.handlers.get("tool_call"), { toolName: "bash", input: { command: "true" } }, { cwd: four.cwd });
    check(!r.threw, `bash tool_call threw: ${String(r.threw)}`);
    check(r.value === undefined, "a non-task tool call was revised");

    // 6. and 7. TOTALITY: a throw here would block every task dispatch on the machine, so an
    // absent hook and a hook exiting non-zero with garbage both have to come back undefined.
    const six = fixture(tmp, "exit 0");
    f = fake();
    install(f.pi, six.self, six.home);
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER" } }, { cwd: six.cwd });
    check(!r.threw, `task tool_call threw with bd-subagent-start absent: ${String(r.threw)}`);
    check(r.value === undefined, "revised the task input with bd-subagent-start absent");

    const seven = fixture(tmp, "exit 0", 'printf "not json\\n"\nexit 1');
    f = fake();
    install(f.pi, seven.self, seven.home);
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER" } }, { cwd: seven.cwd });
    check(!r.threw, `task tool_call threw on a failing bd-subagent-start: ${String(r.threw)}`);
    check(r.value === undefined, "revised the task input from a failing bd-subagent-start");

    // 8. a hung hook is bounded here, because omp bounds nothing itself.
    const eight = fixture(tmp, "sleep 30");
    f = fake();
    install(f.pi, eight.self, eight.home);
    const started = Date.now();
    r = called(f.handlers.get("session_start"), {}, { cwd: eight.cwd });
    const elapsed = Date.now() - started;
    check(!r.threw, `hung session_start threw: ${String(r.threw)}`);
    // The lower bound is the load-bearing half: without it a clone that stopped resolving
    // would return instantly, inject nothing, and pass this case having run no hook at all.
    check(elapsed >= TIMEOUT_MS - 500 && elapsed < 6000, `hung session hook was not bounded: returned in ${elapsed}ms`);
    check(f.messages.length === 0, "injected something from a hook that never emitted");

    // ...and the task handler, the one whose hang would stall every dispatch on the machine.
    const eightTask = fixture(tmp, "exit 0", "sleep 30");
    f = fake();
    install(f.pi, eightTask.self, eightTask.home);
    const taskStarted = Date.now();
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER" } }, { cwd: eightTask.cwd });
    const taskElapsed = Date.now() - taskStarted;
    check(!r.threw, `hung task tool_call threw: ${String(r.threw)}`);
    check(taskElapsed >= TIMEOUT_MS - 500 && taskElapsed < 6000, `hung subagent hook was not bounded: returned in ${taskElapsed}ms`);
    check(r.value === undefined, "revised the task input from a hook that never emitted");

    // 9. no clone, no handlers, no throw.
    const orphanSelf = join(tmp, "orphan", "hooks", "omp", "bd-awareness.ts");
    mkdirSync(dirname(orphanSelf), { recursive: true });
    writeFileSync(orphanSelf, "");
    f = fake();
    let threw: unknown;
    try {
      install(f.pi, orphanSelf, join(tmp, "orphan-home"));
    } catch (err) {
      threw = err;
    }
    check(!threw, `install threw with no clone resolvable: ${String(threw)}`);
    check(f.handlers.size === 0, "registered handlers with no clone resolvable");

    // The copy install, where the symlink is gone and only the marker knows the clone.
    const copied = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY"}\\n\'');
    const copyAgent = join(copied.home, ".omp", "agent");
    const copySelf = join(copyAgent, "hooks", "pre", "bd-awareness.ts");
    mkdirSync(dirname(copySelf), { recursive: true });
    writeFileSync(copySelf, "");
    mkdirSync(join(copyAgent, "skills"), { recursive: true });
    writeFileSync(join(copyAgent, "skills", ".better-dev-install"), `${copied.clone}\n`);
    f = fake();
    install(f.pi, copySelf, copied.home);
    r = called(f.handlers.get("session_start"), {}, { cwd: copied.cwd });
    check(!r.threw, `copy-install session_start threw: ${String(r.threw)}`);
    check(f.messages.length === 1 && f.messages[0].content.includes("NOTE-BODY"), "clone not resolved from the install marker");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  if (bad.length > 0) {
    console.error(`selftest FAIL: ${bad.join("; ")}`);
    process.exit(1);
  }
  console.log("selftest OK");
}

if (import.meta.main) selftest();
