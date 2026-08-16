// better-dev awareness bridge for omp: the tool's bash awareness hooks, in omp's hook API.
// better-dev-omp-hook
//
// omp has no command-hook config - SessionStart, SubagentStart and PreToolUse do not exist in
// it - so the awareness set cannot be registered the way install.sh registers it for Claude
// Code. omp loads this module instead, from $HOME/.omp/agent/hooks/pre/bd-awareness.ts.
//
// Line 2 above is the ours-marker: install.sh and scripts/bd-omp-hook-wire look for that exact
// line to decide whether the file sitting at the target is ours. The wiring script writes a real
// 3-line stub there, carrying that same line, which re-exports this module from the clone -
// never a symlink, because omp's hook discovery silently skips symlinked modules. So
// import.meta.url inside this file is always the clone's own path.
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

interface SwitchEvent {
  reason?: string;
}

// Declared here rather than imported from the omp package: the installed module is read from
// omp's own hooks dir, where nothing resolves but node builtins.
interface HookApi {
  on(event: "session_start" | "session_compact", handler: (event: unknown, ctx: HookContext) => void): void;
  on(event: "session_switch", handler: (event: SwitchEvent | undefined, ctx: HookContext) => void): void;
  on(event: "tool_call", handler: (event: ToolCallEvent, ctx: HookContext) => ToolCallResult | undefined): void;
  sendMessage(message: CustomMessage): void;
}

// The clone this module lives in, or undefined when nothing confirms one. The stub at the target
// re-exports this file, so import.meta.url is already inside the clone and its realpath is all
// resolution needs.
function resolveClone(self: string): string | undefined {
  try {
    const root = resolve(dirname(realpathSync(self)), "..", "..");
    if (existsSync(join(root, SESSION_HOOK))) return root;
  } catch {
    // an unreadable module path confirms no clone, which is not a failure to report
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
// dispatch on the machine. Every handler therefore catches everything and falls back to
// injecting nothing.
function install(pi: HookApi, self: string, home: string): void {
  try {
    // The dir holding omp's own skills/ and hooks/. $HOME/.omp/agent is where omp reads them for
    // the default profile, the only profile install.sh wires; under a named profile omp reads a
    // different dir, so the link nudge would then name a skills dir that profile never loads.
    const agentDir = join(home, ".omp", "agent");
    const root = resolveClone(self);
    if (!root) return;
    // bd-session-start's link and hook nudges answer for the host that invoked them, so tell
    // it which host that is. The hook target is not a JSON hook config here - omp has none -
    // but the module path omp loads the bridge from, the same target hosts/omp declares and
    // install.sh writes, so the hook nudge plans against the file omp actually reads. An empty
    // value is NOT omp's answer: bd-omp-hook-wire maps it to Path(".") and answers unreadable,
    // which silences the nudge on every state including the stale one it exists for.
    const env: ChildEnv = {
      ...process.env,
      BD_HOST_SKILLS_DIR: join(agentDir, "skills"),
      BD_HOST_HOOK_SETTINGS: join(agentDir, "hooks", "pre", "bd-awareness.ts"),
      BD_HOST_HOOK_WIRE: "bd-omp-hook-wire",
    };

    // Claude Code's manifest fires bd-session-start on startup|resume|clear|compact - every
    // transition that leaves the model looking at a context the note is not in. omp splits
    // those four across three events, so the body all of them need lives here once.
    //
    // refresh carries the manifest's OTHER matcher: bd-graphify-refresh-stale is wired to
    // startup|resume alone, never clear or compact, so a compaction-heavy session does not
    // re-run a staleness check the manifest never asked for.
    //
    // Nothing suppresses a repeat. Every trigger in this set IS a context the note is absent
    // from, so an earlier injection says nothing about whether it is present now: wall-clock
    // proximity measures the wrong thing, and guessing wrong means silence at exactly the
    // compaction this set exists for. A duplicate costs one bounded run and one hidden message.
    const announce = (ctx: HookContext, refresh: boolean): void => {
      try {
        const out = run(join(root, SESSION_HOOK), ctx?.cwd, env);
        if (refresh) fire(join(root, GRAPHIFY_HOOK), ctx?.cwd, env);
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
    };

    pi.on("session_start", (_event, ctx) => announce(ctx, true));

    // omp reports resume and clear as one event carrying a reason: "resume" is the manifest's
    // resume, and "new" is its clear, a context emptied down to nothing. The other two reasons
    // are NOT in the set - fork() copies the transcript into the new session file and handoff
    // carries a summary built from it, so the note is already in the context both land in.
    pi.on("session_switch", (event, ctx) => {
      const reason = event?.reason;
      if (reason === "resume") announce(ctx, true);
      else if (reason === "new") announce(ctx, false);
    });

    // Compaction is the trigger the set exists for: the one that drops the note out of a
    // session that is otherwise still running. omp emits this AFTER it has rebuilt the context
    // from the compaction entry - replaceMessages precedes the emit at all three commit sites
    // in omp 17.3.5 - so the note lands in the rebuilt context, not the discarded one.
    pi.on("session_compact", (_event, ctx) => announce(ctx, false));

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
// The session hook always exists: it is what clone resolution confirms a clone by. The staleness
// refresh exists unless a case asks for it to be absent - a missing one is the input fire()'s
// 'error' listener is there for, so a case has to be able to produce it.
function fixture(tmp: string, session: string, subagent?: string, graphify = true): Fixture {
  const dir = join(tmp, `f${++fixtureSeq}`);
  const clone = join(dir, "clone");
  const self = join(clone, "hooks", "omp", "bd-awareness.ts");
  mkdirSync(dirname(self), { recursive: true });
  writeFileSync(self, "");
  script(join(clone, SESSION_HOOK), session);
  if (graphify) script(join(clone, GRAPHIFY_HOOK), "exit 0");
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

async function selftest(): Promise<void> {
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
    // The hook target is the one value bd-session-start cannot supply for itself: it names the
    // module omp loads, hosts/omp declares and install.sh writes, and hook_nudge hands it
    // straight to bd-omp-hook-wire. An empty one plans against Path(".") -> unreadable, so the
    // nudge never fires; assert the real path rather than merely that something was passed.
    const target = join(one.home, ".omp", "agent", "hooks", "pre", "bd-awareness.ts");
    check(recorded === `${join(one.home, ".omp", "agent", "skills")}|${target}|bd-omp-hook-wire`, `host-scoping env not passed to the child: ${recorded}`);

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

    // 6. and 7. TOTALITY, the return-undefined half: an absent hook and a hook exiting non-zero
    // with garbage both come back undefined rather than revising the input. Neither reaches the
    // handler's catch - spawnSync reports both by return value, never by throwing.
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

    // ...and the exit status alone decides it. Case 7 pairs its non-zero exit with garbage, so
    // parse() rejects that body whatever the status was; only a WELL-FORMED note behind a
    // non-zero exit puts the status check under test. A hook that prints its note and then
    // trips set -e is a hook that did not finish, and its half-built note is not honoured.
    const sevenB = fixture(tmp, "exit 0", 'printf \'{"hookSpecificOutput":{"additionalContext":"WORKER-NOTE"}}\\n\'\nexit 1');
    f = fake();
    install(f.pi, sevenB.self, sevenB.home);
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER" } }, { cwd: sevenB.cwd });
    check(!r.threw, `task tool_call threw on a non-zero bd-subagent-start with a valid note: ${String(r.threw)}`);
    check(r.value === undefined, "honoured a note from a bd-subagent-start that exited non-zero");

    // ...the same on the session side, where the note would reach the model instead.
    const sevenC = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY","systemMessage":"W"}\\n\'\nexit 1');
    f = fake();
    install(f.pi, sevenC.self, sevenC.home);
    r = called(f.handlers.get("session_start"), {}, { cwd: sevenC.cwd });
    check(!r.threw, `session_start threw on a non-zero hook with a valid note: ${String(r.threw)}`);
    check(f.messages.length === 0, "injected a note from a session hook that exited non-zero");

    // ...and the catch itself. ctx is omp's object, not ours: a cwd that is not a string makes
    // spawnSync throw ERR_INVALID_ARG_TYPE, and that throw escaping the tool_call handler would
    // block every task dispatch on the machine.
    const hostile = { cwd: 42 } as unknown as HookContext;
    f = fake();
    install(f.pi, four.self, four.home);
    r = called(f.handlers.get("tool_call"), { toolName: "task", input: { context: "CALLER" } }, hostile);
    check(!r.threw, `task tool_call threw on a non-string ctx.cwd: ${String(r.threw)}`);
    check(r.value === undefined, "revised the task input from a throwing run");
    r = called(f.handlers.get("session_start"), {}, hostile);
    check(!r.threw, `session_start threw on a non-string ctx.cwd: ${String(r.threw)}`);
    check(f.messages.length === 0, "injected something from a throwing run");

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

    // 10. TOTALITY, the asynchronous half: an absent staleness refresh. spawn() reports a
    // missing binary by emitting 'error' on a LATER tick, when fire()'s try/catch has already
    // returned, so nothing in this module's synchronous path can catch it - an unhandled 'error'
    // event terminates the process, taking the session with it. The note still has to arrive,
    // and this process still has to be alive one tick later to check that it did: the await
    // below IS the assertion, because a dead process runs nothing after it.
    const ten = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY"}\\n\'', undefined, false);
    check(!existsSync(join(ten.clone, GRAPHIFY_HOOK)), "the graphify-less fixture still ships a staleness refresh");
    f = fake();
    install(f.pi, ten.self, ten.home);
    r = called(f.handlers.get("session_start"), {}, { cwd: ten.cwd });
    check(!r.threw, `session_start threw with the staleness refresh absent: ${String(r.threw)}`);
    const tick = Promise.withResolvers<void>();
    setTimeout(tick.resolve, 500);
    await tick.promise;
    check(f.messages.length === 1 && f.messages[0].content.includes("NOTE-BODY"), "note lost with the staleness refresh absent");

    // A tick to let a fire-and-forget child land, the same wait case 10 makes inline. The
    // cases below need it more than once, so it gets a name here rather than editing case 10.
    const settle = async (ms: number): Promise<void> => {
      const done = Promise.withResolvers<void>();
      setTimeout(done.resolve, ms);
      await done.promise;
    };

    // 11. resume and clear, two of the three triggers startup-only was missing. omp reports
    // both through session_switch: the manifest's resume as reason "resume", and its clear as
    // reason "new", a context emptied down to nothing.
    const eleven = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY"}\\n\'');
    f = fake();
    install(f.pi, eleven.self, eleven.home);
    check(f.handlers.has("session_switch"), "no session_switch handler registered on a resolvable clone");
    r = called(f.handlers.get("session_switch"), { type: "session_switch", reason: "resume" }, { cwd: eleven.cwd });
    check(!r.threw, `session_switch(resume) threw: ${String(r.threw)}`);
    check(f.messages.length === 1 && f.messages[0].content.includes("NOTE-BODY"), `no note injected on session_switch(resume): ${f.messages.length} messages`);
    // ...and again on the next trigger. Nothing suppresses a repeat: each of these events is a
    // context the note is absent from, so a note injected moments ago is not one that is still
    // there. This second injection IS that decision, made observable.
    r = called(f.handlers.get("session_switch"), { type: "session_switch", reason: "new" }, { cwd: eleven.cwd });
    check(!r.threw, `session_switch(new) threw: ${String(r.threw)}`);
    check(f.messages.length === 2 && f.messages[1].content.includes("NOTE-BODY"), `no note injected on session_switch(new), omp's clear: ${f.messages.length} messages`);

    // ...while the two reasons outside the manifest's set inject nothing. fork() copies the
    // transcript into the new session file and handoff carries a summary built from it, so the
    // note is already in the context both of those land in. A reason omp has not shipped yet,
    // or an event object that is not one at all, is left alone too rather than throwing.
    for (const reason of ["fork", "handoff", "future-reason", undefined]) {
      r = called(f.handlers.get("session_switch"), { type: "session_switch", reason }, { cwd: eleven.cwd });
      check(!r.threw, `session_switch(${String(reason)}) threw: ${String(r.threw)}`);
    }
    for (const event of [undefined, 42, null]) {
      r = called(f.handlers.get("session_switch"), event, { cwd: eleven.cwd });
      check(!r.threw, `session_switch threw on a ${String(event)} event: ${String(r.threw)}`);
    }
    check(f.messages.length === 2, `injected on a session_switch outside the manifest's set: ${f.messages.length} messages`);

    // 12. compaction, the trigger the whole set exists for: it is the one that drops the note
    // out of a session that is otherwise still running, which is precisely when Claude Code
    // re-injects. Both fields ride it, the same as any other trigger.
    const twelve = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY","systemMessage":"W"}\\n\'');
    f = fake();
    install(f.pi, twelve.self, twelve.home);
    check(f.handlers.has("session_compact"), "no session_compact handler registered on a resolvable clone");
    r = called(f.handlers.get("session_compact"), { type: "session_compact", fromExtension: false }, { cwd: twelve.cwd });
    check(!r.threw, `session_compact threw: ${String(r.threw)}`);
    const afterCompact = f.messages.filter(m => m.display === false);
    check(afterCompact.length === 1 && afterCompact[0].content.includes("NOTE-BODY"), `no note injected on session_compact: ${f.messages.length} messages`);
    check(f.messages.filter(m => m.display === true).length === 1, "welcome not sent as a displayed message on session_compact");

    // 13. the staleness refresh keeps the manifest's NARROWER matcher. hooks.json fires
    // bd-session-start on four triggers but bd-graphify-refresh-stale on startup|resume only,
    // so clear and compact must not re-run a staleness check the manifest never asked for -
    // otherwise a compaction-heavy session runs one per compaction.
    const thirteen = fixture(tmp, 'printf \'{"additionalContext":"NOTE-BODY"}\\n\'');
    script(join(thirteen.clone, GRAPHIFY_HOOK), 'printf "x" >> "$PWD/refresh.txt"');
    const refreshes = (): number => {
      const marker = join(thirteen.cwd, "refresh.txt");
      return existsSync(marker) ? readFileSync(marker, "utf8").length : 0;
    };
    f = fake();
    install(f.pi, thirteen.self, thirteen.home);
    called(f.handlers.get("session_switch"), { type: "session_switch", reason: "new" }, { cwd: thirteen.cwd });
    called(f.handlers.get("session_compact"), { type: "session_compact" }, { cwd: thirteen.cwd });
    await settle(500);
    check(f.messages.length === 2, `the two refresh-less triggers did not both inject: ${f.messages.length} messages`);
    check(refreshes() === 0, `staleness refresh fired outside startup|resume: ${refreshes()} runs`);
    // ...and the upper half: resume is in that matcher, so it does fire there. Without this the
    // case would pass on a bridge that never ran the refresh at all.
    called(f.handlers.get("session_switch"), { type: "session_switch", reason: "resume" }, { cwd: thirteen.cwd });
    await settle(500);
    check(refreshes() === 1, `staleness refresh did not fire on resume: ${refreshes()} runs`);
    called(f.handlers.get("session_start"), { type: "session_start" }, { cwd: thirteen.cwd });
    await settle(500);
    check(refreshes() === 2, `staleness refresh did not fire on startup: ${refreshes()} runs`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  if (bad.length > 0) {
    console.error(`selftest FAIL: ${bad.join("; ")}`);
    process.exit(1);
  }
  console.log("selftest OK");
}

if (import.meta.main) await selftest();
