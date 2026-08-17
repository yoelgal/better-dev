// better-dev's enforcement pair for omp: bd-guard's check-bash and check-edit, in omp's hook API.
//
// Claude Code registers the pair as two PreToolUse entries (hooks/hooks.json). omp has no hook
// config to register them in, but it has the one capability the pair needs: a tool_call handler
// may answer {block: true, reason}, and ctx.ui.confirm() is a real prompt. So the pair reaches
// omp as a handler that pipes the tool input to the same bd-guard the Claude entries call and
// translates its answer into omp's own vocabulary - a deny becomes a blocked call carrying the
// reason, an ask becomes a confirm the operator answers.
//
// This is a module the awareness bridge calls into, NOT a second installed hook. The install
// stays one stub at one target path, so hosts/omp, bd-omp-hook-wire, install.sh, --verify and
// the uninstall path all keep exactly one entry to know about, and an already-installed stub
// needs no migration. What a separate target would have bought - turning enforcement off without
// losing awareness - bd-guard already gives in one command (`bd-guard off`), and a repo without
// .better-dev/ is inert by construction.
//
// Policy lives in bd-guard and is only translated here: no pattern, no denylist and no envelope
// branch of its own, so widening the recorded policy stays one `bd-mem remember`.
//
// TOTALITY IS LOAD-BEARING. omp's extension runner converts a tool_call handler that throws, or
// that outruns its bound (30s by default), into {block: true} itself. So a handler here that is
// not total does not degrade to "unguarded" - it denies every bash, write and edit call on the
// operator's machine, with better-dev named as the reason. Every path below catches everything
// and falls back to undefined, and the whole handler is bounded at TIMEOUT_MS, well inside the
// runner's own bound.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = "scripts/bd-guard";

// The bound is the whole handler's, not one spawn's. omp's runner turns its own 30s expiry into
// a block, so an edit carrying several paths must not be able to add spawns until it gets there.
const TIMEOUT_MS = 5000;

const CONFIRM_TITLE = "better-dev safety gate";

// omp dispatches its tool devices as write calls to xd://<device>, so a scope-boundary check on
// xd://ast_edit would deny every device dispatch in every session. A target carrying a scheme is
// not a filesystem path; ast_edit's real paths are judged under its own tool name instead.
const URI = /^[a-z][a-z0-9+.-]*:\/\//i;

export interface GuardContext {
  cwd?: string;
  hasUI?: boolean;
  ui?: { confirm?: (title: string, message: string) => Promise<boolean> };
}

export interface GuardDecision {
  block?: boolean;
  reason?: string;
}

interface GuardToolCallEvent {
  toolName?: string;
  input?: Record<string, unknown>;
}

// Declared here rather than imported from the omp package: the installed module is read from
// omp's own hooks dir, where nothing resolves but node builtins.
export interface GuardHookApi {
  on(
    event: "tool_call",
    handler: (event: GuardToolCallEvent, ctx: GuardContext) => Promise<GuardDecision | undefined>,
  ): void;
}

interface Check {
  sub: "check-bash" | "check-edit";
  stdin: string;
}

function editCheck(path: string): Check {
  return { sub: "check-edit", stdin: JSON.stringify({ tool_input: { file_path: path } }) };
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// What gets judged, and out of which input field. These are the fields omp itself derives for
// its own approval gate, so the guard judges exactly what omp gates on and never parses the
// hashline patch language. Every other tool spawns nothing.
//
// Named coverage limits, deliberate: eval (python and JS source, and bd-guard's pattern set is
// shell-shaped, so matching it would be fake coverage), hub with op "start", and a hashline
// MV destination (not one of the paths omp derives).
function plan(event: GuardToolCallEvent | undefined): Check[] {
  const input = event?.input ?? {};
  switch (event?.toolName) {
    case "bash": {
      const command = str(input.command);
      return command ? [{ sub: "check-bash", stdin: JSON.stringify({ tool_input: { command } }) }] : [];
    }
    case "write": {
      const target = str(input.path);
      if (!target || URI.test(target) || target.startsWith("xd:")) return [];
      return [editCheck(target)];
    }
    case "edit": {
      const derived = strings(input.paths);
      if (derived.length > 0) return derived.map(editCheck);
      const single = str(input.path);
      return single ? [editCheck(single)] : [];
    }
    case "ast_edit":
      return strings(input.paths).map(editCheck);
    default:
      return [];
  }
}

// stdout of a clean run, or undefined for every other outcome: a missing script, a non-zero
// exit, or the remaining budget expiring. The tool input travels as JSON on stdin, never as
// argv, so no model text reaches a shell.
function ask(guard: string, check: Check, cwd: string | undefined, deadline: number): string | undefined {
  const budget = deadline - Date.now();
  if (budget <= 0) return undefined;
  const res = spawnSync("bash", [guard, check.sub], {
    cwd,
    input: check.stdin,
    timeout: budget,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
  if (res.status !== 0 || typeof res.stdout !== "string") return undefined;
  return res.stdout;
}

// bd-guard's decision envelope is Claude Code's PreToolUse shape. Read defensively: anything
// that is not a recognised decision - including the {} of an allow, and including garbage from a
// half-broken script - is an allow, because a parse bug here would become a machine-wide
// tool-call outage.
function envelope(raw: string): { decision?: string; reason?: string } {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return {};
    const nested = (value as Record<string, unknown>).hookSpecificOutput;
    if (!nested || typeof nested !== "object") return {};
    const out = nested as Record<string, unknown>;
    return { decision: str(out.permissionDecision), reason: str(out.permissionDecisionReason) };
  } catch {
    return {};
  }
}

export function installGuard(pi: GuardHookApi, root: string, guard: string = join(root, GUARD)): void {
  try {
    pi.on("tool_call", async (event, ctx) => {
      try {
        const checks = plan(event);
        if (checks.length === 0) return undefined;
        const deadline = Date.now() + TIMEOUT_MS;
        for (const check of checks) {
          const raw = ask(guard, check, ctx?.cwd, deadline);
          // A guard that could not answer for this path does not stop the call, and does not
          // stop the remaining paths from being judged.
          if (raw === undefined) continue;
          const { decision, reason } = envelope(raw);
          if (decision !== "deny" && decision !== "ask") continue;
          const why = reason ?? "[better-dev] refused under the recorded safety policy.";
          if (decision === "deny") return { block: true, reason: why };
          // An ask with nobody to escalate to is a refusal, not an approval: a headless run
          // (omp -p, an unattended loop) would otherwise silently self-approve exactly the
          // class the recorded policy escalates.
          const ui = ctx?.hasUI === true ? ctx.ui : undefined;
          if (!ui || typeof ui.confirm !== "function") {
            return { block: true, reason: `${why} (no interactive prompt in this session, so the ask is refused)` };
          }
          const approved = await ui.confirm(CONFIRM_TITLE, why);
          if (approved !== true) return { block: true, reason: `${why} (declined)` };
          // An approved ask clears THIS path and nothing else: the operator answered for the file
          // they were shown, so the remaining paths are still judged. Returning here would let one
          // approval carry a batch across the boundary, one prompt at a time.
          continue;
        }
        return undefined;
      } catch {
        // A throw here would be converted into a block by omp's runner.
        return undefined;
      }
    });
  } catch {
    // a host whose on() rejects the event registers nothing, and costs nothing
  }
}

// --- selftest -----------------------------------------------------------------------------
// Runs against a recording fake pi, the REAL scripts/bd-guard for the translation cases, and
// fake guard scripts for the broken-guard cases. Offline, no network, no reach outside the
// fixture dir.

interface Fake {
  pi: GuardHookApi;
  handlers: ((event: GuardToolCallEvent, ctx: GuardContext) => Promise<GuardDecision | undefined>)[];
}

function fake(): Fake {
  const handlers: ((event: GuardToolCallEvent, ctx: GuardContext) => Promise<GuardDecision | undefined>)[] = [];
  const pi = {
    on(_event: string, handler: (event: GuardToolCallEvent, ctx: GuardContext) => Promise<GuardDecision | undefined>) {
      handlers.push(handler);
    },
  } as unknown as GuardHookApi;
  return { pi, handlers };
}

interface Recorder {
  ctx: GuardContext;
  calls: { title: string; message: string }[];
}

function operator(cwd: string, answer: boolean, hasUI = true): Recorder {
  const calls: { title: string; message: string }[] = [];
  return {
    calls,
    ctx: {
      cwd,
      hasUI,
      ui: {
        confirm: async (title: string, message: string) => {
          calls.push({ title, message });
          return answer;
        },
      },
    },
  };
}

interface Fixture {
  root: string;
  clone: string;
  repo: string;
  inside: string;
  outside: string;
  wrapper: string;
  spawns(): number;
  clear(): void;
}

// A git repo carrying .better-dev/ and a scope boundary on its src/ subdir, plus a wrapper that
// counts spawns and then execs the real bd-guard, so the same case can assert both the
// translation and that a spawn happened at all.
//
// The fixture must sit outside two things at once: check-edit's temp allowlist (/tmp,
// /private/tmp and $TMPDIR are always allowed, so a fixture under $TMPDIR makes every boundary
// assertion short-circuit to allow - Linux mktemp lands under /tmp), AND any real repo carrying
// .better-dev/ (else the repo gate resolves to this clone's own scaffold). ~/.cache is neither,
// and mkdtemp inside it keeps the run unique and self-cleaning - the same base bd-guard's own
// selftest picks for the same two reasons.
function fixture(): Fixture {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  mkdirSync(base, { recursive: true });
  const root = realpathSync(mkdtempSync(join(base, "bd-omp-guard-")));
  const clone = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const repo = join(root, "repo");
  const inside = join(repo, "src");
  mkdirSync(join(repo, ".better-dev"), { recursive: true });
  // The recorded policy the denylist half of check-edit reads. Without it that half is skipped
  // entirely, so a case needs it to reach an ASK on an edit path at all.
  writeFileSync(join(repo, ".better-dev", "rules.md"), "safety-denylist: .env*, *.pem\n");
  mkdirSync(inside, { recursive: true });
  spawnSync("git", ["init", "-q", repo], { stdio: "ignore" });
  spawnSync("bash", [join(clone, GUARD), "scope", inside, "--ttl", "0"], { cwd: repo, stdio: "ignore" });

  const log = join(root, "spawns.txt");
  const wrapper = join(root, "guard-wrapper");
  writeFileSync(
    wrapper,
    `#!/usr/bin/env bash\nprintf '%s\\n' "$1" >> "${log}"\nexec bash "${join(clone, GUARD)}" "$@"\n`,
  );
  writeFileSync(log, "");
  return {
    root,
    clone,
    repo,
    inside,
    outside: join(repo, "outside.ts"),
    wrapper,
    spawns: () => (existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(line => line.length > 0).length : 0),
    clear: () => writeFileSync(log, ""),
  };
}

function script(path: string, body: string): string {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  return path;
}

async function called(
  fn: ((event: GuardToolCallEvent, ctx: GuardContext) => Promise<GuardDecision | undefined>) | undefined,
  event: GuardToolCallEvent,
  ctx: GuardContext,
): Promise<{ value?: GuardDecision | undefined; threw?: unknown }> {
  try {
    return { value: await (fn as (e: GuardToolCallEvent, c: GuardContext) => Promise<GuardDecision | undefined>)(event, ctx) };
  } catch (err) {
    return { threw: err };
  }
}

async function selftest(): Promise<void> {
  const bad: string[] = [];
  const check = (ok: unknown, why: string) => {
    if (!ok) bad.push(why);
  };
  const fx = fixture();
  // The handler under test is the guard's own, registered on a pi it shares with the awareness
  // bridge's handler; `guard` overrides only the script path so a case can point it at a fake.
  const handler = (guard?: string) => {
    const f = fake();
    installGuard(f.pi, fx.clone, guard);
    check(f.handlers.length === 1, `installGuard registered ${f.handlers.length} tool_call handlers, expected 1`);
    fx.clear();
    return f.handlers[0];
  };
  try {
    check(existsSync(join(fx.clone, GUARD)), `the real guard is not where clone resolution says: ${join(fx.clone, GUARD)}`);
    check(existsSync(join(fx.repo, ".git")), "the fixture repo did not initialise, so the repo gate cannot fire");
    check(existsSync(join(fx.repo, ".git", "bd-scope")), "the scope boundary was not set, so every boundary case would pass vacuously");

    // 1. a deny reaches omp's vocabulary, through the PRODUCTION script path: no override, so
    // this case is what proves join(root, GUARD) resolves the real guard.
    let r = await called(handler(), { toolName: "bash", input: { command: 'eval "$PAYLOAD"' } }, { cwd: fx.repo });
    check(!r.threw, `an obfuscated-shell bash call threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an obfuscated-shell bash call was not blocked");
    check(r.value?.reason?.includes("[better-dev]") === true, `the refusal does not carry the marker: ${String(r.value?.reason)}`);

    // 2. an ask becomes a confirm the operator answers, and their answer decides the call.
    const declined = operator(fx.repo, false);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, declined.ctx);
    check(!r.threw, `a destructive bash call threw on a declined confirm: ${String(r.threw)}`);
    check(r.value?.block === true, "a destructive bash call proceeded after the operator declined");
    check(declined.calls.length === 1, `expected exactly one confirm on a declined ask, got ${declined.calls.length}`);
    check(declined.calls[0]?.title === CONFIRM_TITLE, `the confirm carries the wrong title: ${String(declined.calls[0]?.title)}`);
    check(declined.calls[0]?.message.includes("[better-dev]") === true, "the confirm prompt does not carry the guard's reason");
    check(r.value?.reason?.endsWith("(declined)") === true, `the refusal does not say the operator declined: ${String(r.value?.reason)}`);
    check(fx.spawns() === 1, `expected one guard spawn for a bash ask, got ${fx.spawns()}`);

    const approved = operator(fx.repo, true);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, approved.ctx);
    check(!r.threw, `a destructive bash call threw on an approved confirm: ${String(r.threw)}`);
    check(r.value === undefined, "a destructive bash call was blocked after the operator approved it");
    check(approved.calls.length === 1, `expected exactly one confirm on an approved ask, got ${approved.calls.length}`);

    // 3. the same ask with no UI blocks and never prompts. This is the headless case: an ask is
    // a decision, and a run with nobody to escalate to must not read it as an allow.
    const headless = operator(fx.repo, true, false);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, headless.ctx);
    check(!r.threw, `a destructive bash call threw with no UI: ${String(r.threw)}`);
    check(r.value?.block === true, "a destructive bash call proceeded in a session with no UI");
    check(r.value?.reason?.includes("no interactive prompt") === true, `the no-UI refusal does not name the escalation: ${String(r.value?.reason)}`);
    check(headless.calls.length === 0, `confirm was called ${headless.calls.length} times in a session with no UI`);

    // 4. an allow is silent: a build clean draws neither a block nor a prompt.
    const clean = operator(fx.repo, false);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf node_modules" } }, clean.ctx);
    check(!r.threw, `a safe rm threw: ${String(r.threw)}`);
    check(r.value === undefined, "a safe rm target was interrogated");
    check(clean.calls.length === 0, `confirm was called ${clean.calls.length} times on a safe rm`);
    check(fx.spawns() === 1, `expected one guard spawn for a safe rm, got ${fx.spawns()}`);

    // 5. the edit surfaces are judged against the boundary: write's own path field, inside and
    // outside.
    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a write outside the boundary threw: ${String(r.threw)}`);
    check(r.value?.block === true, "a write outside the scope boundary was allowed");
    check(r.value?.reason?.includes(fx.outside) === true, `the refusal does not name the path: ${String(r.value?.reason)}`);

    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: join(fx.inside, "app.ts") } }, { cwd: fx.repo });
    check(!r.threw, `a write inside the boundary threw: ${String(r.threw)}`);
    check(r.value === undefined, "a write inside the scope boundary was refused");
    check(fx.spawns() === 1, `expected one guard spawn for a write, got ${fx.spawns()}`);

    // 6. ...and the device surface is not misjudged. omp dispatches its tool devices as a write
    // to xd://<device>; judging that as a path would deny every device dispatch in every
    // session, so nothing is even spawned for it.
    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: "xd://ast_edit" } }, { cwd: fx.repo });
    check(!r.threw, `a device-dispatch write threw: ${String(r.threw)}`);
    check(r.value === undefined, "a write to an xd:// device path was judged as a filesystem path");
    check(fx.spawns() === 0, `the guard was spawned ${fx.spawns()} times for an xd:// device path`);

    // 7. edit's derived paths are judged one by one, and the first non-allow wins.
    const two = [join(fx.inside, "a.ts"), fx.outside];
    r = await called(handler(fx.wrapper), { toolName: "edit", input: { paths: two } }, { cwd: fx.repo });
    check(!r.threw, `a multi-path edit threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an edit whose second path is outside the boundary was allowed");
    check(r.value?.reason?.includes(fx.outside) === true, `the refusal does not name the offending path: ${String(r.value?.reason)}`);
    check(fx.spawns() === 2, `expected two guard spawns for a two-path edit, got ${fx.spawns()}`);

    // ...and the single-path fallback, for an edit omp derived a `path` rather than `paths` for.
    r = await called(handler(fx.wrapper), { toolName: "edit", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a single-path edit threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an edit carrying only `path` was not judged");

    // ...and an approved ask does NOT stand in for the paths the operator never saw. A patch whose
    // first path draws a denylist ask and whose second sits outside the boundary is still refused:
    // the operator answered for the file they were shown, and reading their yes as consent for the
    // rest of the batch is how a boundary gets crossed one approval at a time.
    const mixed = operator(fx.repo, true);
    r = await called(
      handler(fx.wrapper),
      { toolName: "edit", input: { paths: [join(fx.inside, ".env"), fx.outside] } },
      mixed.ctx,
    );
    check(!r.threw, `an approved-ask-then-denied edit threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an approved ask on the first path waived the boundary deny on the second");
    check(r.value?.reason?.includes(fx.outside) === true, `the refusal does not name the denied path: ${String(r.value?.reason)}`);
    check(mixed.calls.length === 1, `expected exactly one confirm across the batch, got ${mixed.calls.length}`);
    check(fx.spawns() === 2, `expected both paths judged, got ${fx.spawns()} spawns`);

    // 8. ast_edit is covered under its own tool name, which is where its real paths appear.
    r = await called(
      handler(fx.wrapper),
      { toolName: "ast_edit", input: { paths: [join(fx.inside, "a.ts"), join(fx.inside, "b.ts")] } },
      { cwd: fx.repo },
    );
    check(!r.threw, `an ast_edit threw: ${String(r.threw)}`);
    check(r.value === undefined, "an ast_edit inside the boundary was refused");
    check(fx.spawns() === 2, `expected two guard spawns for a two-path ast_edit, got ${fx.spawns()}`);

    // 9. every other tool costs nothing: no decision, no spawn. task is the awareness handler's
    // tool, and this is the half that keeps the guard out of its way.
    for (const toolName of ["read", "grep", "task"]) {
      const fn = handler(fx.wrapper);
      r = await called(fn, { toolName, input: { path: fx.outside, pattern: "x", command: "rm -rf /", context: "c" } }, { cwd: fx.repo });
      check(!r.threw, `a ${toolName} call threw: ${String(r.threw)}`);
      check(r.value === undefined, `a ${toolName} call was judged`);
      check(fx.spawns() === 0, `the guard was spawned ${fx.spawns()} times for a ${toolName} call`);
    }

    // 10. TOTALITY. A missing, failing or garbage-emitting guard leaves the call alone rather
    // than throwing - omp's runner would convert a throw into a block on every guarded call.
    r = await called(handler(join(fx.root, "not-a-file")), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: fx.repo });
    check(!r.threw, `a missing guard script threw: ${String(r.threw)}`);
    check(r.value === undefined, "a missing guard script blocked the call");

    const failing = script(join(fx.root, "failing"), "printf 'garbage not json\\n'\nexit 3");
    r = await called(handler(failing), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: fx.repo });
    check(!r.threw, `a non-zero guard threw: ${String(r.threw)}`);
    check(r.value === undefined, "a guard exiting non-zero with garbage blocked the call");

    const garbage = script(join(fx.root, "garbage"), "printf 'not json at all\\n'\nexit 0");
    r = await called(handler(garbage), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a guard emitting unparseable stdout threw: ${String(r.threw)}`);
    check(r.value === undefined, "a guard emitting unparseable stdout blocked the call");

    // ...and a hung guard is bounded here, because the runner's own bound expiring IS a block.
    // The lower bound is the load-bearing half: without it a handler that spawned nothing at all
    // would return instantly and pass having run no guard.
    const hung = script(join(fx.root, "hung"), "sleep 30");
    const started = Date.now();
    r = await called(handler(hung), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: fx.repo });
    const elapsed = Date.now() - started;
    check(!r.threw, `a hung guard threw: ${String(r.threw)}`);
    check(r.value === undefined, "a hung guard blocked the call");
    check(elapsed >= TIMEOUT_MS - 500 && elapsed < 6000, `a hung guard was not bounded: returned in ${elapsed}ms`);
  } finally {
    rmSync(fx.root, { recursive: true, force: true });
  }

  if (bad.length > 0) {
    console.error(`selftest FAIL: ${bad.join("; ")}`);
    process.exit(1);
  }
  console.log("selftest OK");
}

if (import.meta.main) await selftest();
