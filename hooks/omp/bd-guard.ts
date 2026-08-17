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
// needs no migration. That surface cost is the whole justification, together with bd-guard being
// inert in a repo carrying no .better-dev/. NOT `bd-guard off`: that lifts the scope boundary
// only and leaves the destructive-command ask and the denylist ask armed, so it is not the
// disarm switch a second install target would have been.
//
// Policy lives in bd-guard and is only translated here: no pattern, no denylist, no envelope
// branch and NO REFUSAL OF ITS OWN, so widening the recorded policy stays one `bd-mem remember`.
// That last one is the correction of a review round, kept because the reasoning is the valuable
// part: this bridge twice grew a refusal bd-guard does not have - one for an answer it could not
// decode, one for a spawn budget that ran out - and each turned a producer hiccup or an ordinary
// large edit into a machine-wide block, in every repo, including repos with no .better-dev/ and
// with `bd-guard off` unable to lift it. Every mis-encoding belongs to the encoder. A translator
// that invents semantics is no longer a translator. See the reverted-mechanisms note below.
//
// TOTALITY IS LOAD-BEARING. omp's extension runner converts a tool_call handler that throws, or
// that outruns its bound (30s by default), into {block: true} itself. So a handler here that is
// not total does not degrade to "unguarded" - it denies every bash, write and edit call on the
// operator's machine, with better-dev named as the reason. Every path below catches everything
// and falls back to allowing the call.
//
// The bound covers SPAWN time, not wall-clock time in the handler: the operator's own
// deliberation at a confirm prompt is the deliberate exception, and the interval spent waiting on
// the prompt is added back to the budget. That mirrors the runner rather than working around it.
// omp 17.3.5 hands a hook its UI through `u = async (g) => { h?.pause(); try { return await g() }
// finally { h?.resume() } }`, where `h` is that handler's own timeout budget - so the runner's
// 30s bound is an ACTIVE-WORK bound that excludes dialog time by construction, and an unbounded
// prompt cannot trip it into blocking. Billing thinking time against the spawn budget is what a
// review round proved leaves the rest of a batch unjudged: it is the ONE budget correction that
// survived, because it takes nothing away from the operator and invents no refusal.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = "scripts/bd-guard";

// The budget is the whole handler's spawn time, not one spawn's: omp's runner turns its own 30s
// expiry into a block, so an edit carrying several paths must not be able to add spawns until it
// gets there. Time spent waiting on the operator is added back rather than billed here.
const TIMEOUT_MS = 5000;

// TRIED AND REVERTED, do not re-attempt: refusing on an answer this bridge could not decode, and
// refusing when the spawn budget ran out with paths still unjudged. Both invented a refusal
// semantics bd-guard does not have, and a consumer that invents one turns every producer hiccup
// into a machine-wide outage. The decode refusal blocked every bash, write and edit call on the
// machine as soon as anything printed to stdout ahead of the guard (a $BASH_ENV or direnv shim
// with no trailing newline glues its noise to the decision line; an EXIT-trap shim prints after
// it), in every repo including one with no .better-dev/, with `bd-guard off` unable to lift it.
// The budget refusal blocked ordinary work: 85 paths blocked at 5003ms having already judged 75
// of them CLEAN, and under 8 concurrent handlers a 45-path edit blocked every run. The real bug
// each was standing in for is a MIS-ENCODING, and that is fixed in the encoder: emit_decision now
// escapes losslessly under LC_ALL=C, which fixes Claude Code at the same time. Anything unclear
// allows - that is bd-guard's charter and this bridge only translates it.
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
  // What the operator is being asked about, for the prompt. bd-guard's reason names the PATTERN it
  // matched ("recursive delete (rm -r)"), never the call, so a prompt built from the reason alone
  // asks somebody to approve a command they cannot see.
  subject: string;
}

// A long command is elided in the middle rather than truncated: the tail of a shell line is where
// the redirect and the target live, and those are what an operator needs to see to answer.
function subjectOf(kind: string, value: string): string {
  const flat = value.replace(/\s+/g, " ").trim();
  const shown = flat.length > 300 ? `${flat.slice(0, 180)} [...] ${flat.slice(-100)}` : flat;
  return `${kind}: ${shown}`;
}

function editCheck(path: string): Check {
  return {
    sub: "check-edit",
    stdin: JSON.stringify({ tool_input: { file_path: path } }),
    subject: subjectOf("path", path),
  };
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
// Named coverage limits, deliberate. eval (python and JS source, and bd-guard's pattern set is
// shell-shaped, so matching it would be fake coverage), hub with op "start", a hashline MV
// destination (not one of the paths omp derives), and bash's env map.
//
// env is the one that was TRIED and reverted, so it stays named rather than re-attempted: omp's
// bash input carries an env map, and `$X` with env {X: "rm -rf /"} does reach the shell fully
// formed. But submitting the spelling `VAR=value command` was measured worse than not submitting
// it, both ways round. Splicing any prefix - correctly escaped included - perturbs bd-guard's
// quote-stripping lexer and can re-pair quotes with the command, so an `eval "$P" # '` that denies
// on its own ALLOWS once a prefix is spliced in; and judging values on their own turns ordinary
// prose into a deny (`MSG=fix the eval path git commit -m "$MSG"`), an unpromptable false refusal
// on a commit message. bd-guard's own header says it stops accidents, not attacks - a plain `sed`
// already defeats it - so judging env was serving a requirement the tool does not claim. The
// command string is submitted unchanged, byte-identical to what Claude Code judges.
function plan(event: GuardToolCallEvent | undefined): Check[] {
  const input = event?.input ?? {};
  switch (event?.toolName) {
    case "bash": {
      const command = str(input.command);
      return command
        ? [{ sub: "check-bash", stdin: JSON.stringify({ tool_input: { command } }), subject: subjectOf("command", command) }]
        : [];
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

// Raw stdout of a clean run, or undefined for every other outcome: a missing script, a non-zero
// exit, or the remaining budget expiring. All of those allow, which is bd-guard's own documented
// check-* posture. The tool input travels as JSON on stdin, never as argv, so no model text
// reaches a shell.
//
// The stream is taken as it comes. Selecting a line out of it was tried, to serve a refusal that
// no longer exists, and it cannot be done safely anyway: a shim that prints without a trailing
// newline and one that prints from an EXIT trap defeat first-line and last-line selection
// respectively.
function consult(guard: string, check: Check, cwd: string | undefined, deadline: number): string | undefined {
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

// bd-guard's decision envelope is Claude Code's PreToolUse shape. Read it defensively: anything
// that is not a recognised decision is an allow. That includes the {} of an allow, an output this
// bridge cannot parse at all, and a decision word it does not know.
//
// Parse failure is SILENCE, deliberately, and this is the line a round of review moved and moved
// back. A garbled refusal reaching a host as an allow is a real hole, but it is a mis-encoding,
// and the encoder is where it is fixed: refusing here instead put every guarded call on the
// machine one stray byte away from being blocked, including in repos this tool has no business
// touching.
function envelope(raw: string): { decision?: string; reason?: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object") return {};
  const nested = (value as Record<string, unknown>).hookSpecificOutput;
  if (!nested || typeof nested !== "object") return {};
  const out = nested as Record<string, unknown>;
  return { decision: str(out.permissionDecision), reason: str(out.permissionDecisionReason) };
}

export function installGuard(pi: GuardHookApi, root: string, guard: string = join(root, GUARD)): void {
  try {
    pi.on("tool_call", async (event, ctx) => {
      try {
        const checks = plan(event);
        if (checks.length === 0) return undefined;
        let deadline = Date.now() + TIMEOUT_MS;
        for (const check of checks) {
          // A spawn that could not answer - missing script, non-zero exit, or the budget gone -
          // does not stop the call, and does not stop the remaining paths from being judged. A
          // batch big enough to outrun the budget therefore runs its tail unguarded rather than
          // being refused: an ordinary 85-path edit is not an attack, and discarding paths the
          // guard already judged clean to refuse the whole call was measured worse than the hole.
          const raw = consult(guard, check, ctx?.cwd, deadline);
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
          // The prompt text is DATA. `why` carries the model's own path verbatim, so an operator
          // reading this dialog is reading model-influenced prose: omp renders it as data and
          // never as markup, but a crafted path can still make the sentence read misleadingly.
          // Escaping cannot fix prose, so it is named here instead.
          const asked = Date.now();
          let approved = false;
          try {
            approved = (await ui.confirm(CONFIRM_TITLE, `${why}\n\n${check.subject}`)) === true;
          } catch {
            // A prompt that failed is not an approval: it is the no-UI condition arriving late,
            // and nobody answered.
            return { block: true, reason: `${why} (the confirm prompt failed, so the ask is refused)` };
          } finally {
            // The operator's deliberation is not spawn time. Without adding it back, any prompt a
            // human actually reads spends the budget, every later path comes back unjudged, and
            // one approval carries the whole batch across the boundary. Leaving the prompt itself
            // unbounded is safe for the same reason this restore is correct: omp's runner pauses
            // a handler's own timeout budget for the duration of a UI dialog, so its 30s bound
            // measures active work, never the operator.
            deadline += Date.now() - asked;
          }
          if (!approved) return { block: true, reason: `${why} (declined)` };
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

// `delay` is what makes a timing case able to fail: a confirm that resolves in microseconds
// cannot show operator deliberation being billed against the spawn budget.
function operator(cwd: string, answer: boolean, hasUI = true, delay = 0): Recorder {
  const calls: { title: string; message: string }[] = [];
  return {
    calls,
    ctx: {
      cwd,
      hasUI,
      ui: {
        confirm: async (title: string, message: string) => {
          calls.push({ title, message });
          if (delay > 0) {
            const waited = Promise.withResolvers<void>();
            setTimeout(waited.resolve, delay);
            await waited.promise;
          }
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
  // The wrapper's tally file, so a case needing a fake guard of its own can still be counted.
  log: string;
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
    log,
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
    // bd-guard's reason names the PATTERN it matched, never the call, so a prompt built from the
    // reason alone asks the operator to approve a command they cannot see.
    check(declined.calls[0]?.message.includes("rm -rf /some/dir") === true,
      `the confirm prompt does not name the command being judged: ${String(declined.calls[0]?.message)}`);
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
    //
    // The confirm here resolves only AFTER the guard's whole bound has elapsed, which is the half
    // that bites: with deliberation billed against the spawn budget, the second path's spawn gets
    // a budget of <= 0, comes back as silence, and the batch proceeds unjudged. A microsecond
    // confirm cannot see that, and this case passed with one before the review round.
    const mixed = operator(fx.repo, true, true, TIMEOUT_MS + 200);
    const mixedStarted = Date.now();
    r = await called(
      handler(fx.wrapper),
      { toolName: "edit", input: { paths: [join(fx.inside, ".env"), fx.outside] } },
      mixed.ctx,
    );
    const mixedElapsed = Date.now() - mixedStarted;
    check(!r.threw, `an approved-ask-then-denied edit threw: ${String(r.threw)}`);
    check(mixedElapsed >= TIMEOUT_MS, `the slow confirm did not outlast the bound, so the case proves nothing: ${mixedElapsed}ms`);
    // The REASON, not the bare boolean: a block asserted on its own would be satisfied by any
    // future refusal this bridge grew, which is how two invented ones hid in this case for a round.
    check(r.value?.block === true, "an approved ask on the first path waived the boundary deny on the second");
    check(r.value?.reason?.includes(fx.outside) === true, `the refusal does not name the denied path: ${String(r.value?.reason)}`);
    check(
      r.value?.reason?.includes("outside the scope boundary") === true,
      `the refusal is not the boundary deny the second path draws: ${String(r.value?.reason)}`,
    );
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

    // ...and so does an answer that arrived and could not be decoded. Refusing on it was TRIED
    // AND REVERTED: it is a mis-encoding, the encoder is where it is fixed, and refusing here put
    // every guarded call on the machine one stray byte away from being blocked.
    const undecodable = script(join(fx.root, "undecodable"), "printf 'not json at all\\n'\nexit 0");
    r = await called(handler(undecodable), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a guard emitting unparseable stdout threw: ${String(r.threw)}`);
    check(r.value === undefined, "a guard answer that could not be decoded blocked the call");

    // ...and the {} of a real allow allows, which is the shape every ordinary tool call takes.
    const allowed = script(join(fx.root, "allowing"), "printf '{}\\n'\nexit 0");
    r = await called(handler(allowed), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `an allowing guard threw: ${String(r.threw)}`);
    check(r.value === undefined, "the {} of an allow was refused");

    // ...and the two shapes that PROVE selecting a line out of the stream cannot be done safely,
    // which is why the stream is taken as it comes. Both are real: a $BASH_ENV or direnv shim
    // printing with no trailing newline glues its noise to the decision line, and a shim printing
    // from an EXIT trap lands after it. Under line selection each of these blocked every bash,
    // write, edit and ast_edit call in every session on the machine. Now each one costs coverage
    // for that call and nothing else.
    const glued = script(join(fx.root, "glued"), "printf 'direnv: loading .envrc'\nprintf '{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"[better-dev] glued deny\"}}\\n'\nexit 0");
    r = await called(handler(glued), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a guard whose decision is glued to shim output threw: ${String(r.threw)}`);
    check(r.value === undefined, `a shim printing without a trailing newline blocked the call: ${String(r.value?.reason)}`);

    const trailing = script(join(fx.root, "trailing"), "printf '{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"[better-dev] trailing deny\"}}\\n'\nprintf 'direnv: export +FOO\\n'\nexit 0");
    r = await called(handler(trailing), { toolName: "write", input: { path: fx.outside } }, { cwd: fx.repo });
    check(!r.threw, `a guard followed by EXIT-trap output threw: ${String(r.threw)}`);
    check(r.value === undefined, `a shim printing after the decision blocked the call: ${String(r.value?.reason)}`);

    // ...and the encoding path end to end, across BOTH programs: fx.wrapper execs the real
    // scripts/bd-guard, so this case spans the producer's escape and this bridge's decode. A path
    // carrying a control character used to make a real boundary DENY arrive as invalid JSON, and
    // with a parse failure back to meaning "allow", that garbling is now a SILENT hole rather than
    // a noisy one - which is exactly why the producer's lossless escaping is what closes it and why
    // this case asserts the REASON. `block === true` alone would let a refusal that arrived garbled
    // pass for the boundary deny it was supposed to be.
    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: join(fx.repo, "x\ny") } }, { cwd: fx.repo });
    check(!r.threw, `a write to a path carrying a control character threw: ${String(r.threw)}`);
    check(r.value?.block === true, "a write outside the boundary named with a control character was allowed");
    check(
      r.value?.reason?.includes("outside the scope boundary") === true,
      `a real boundary deny did not survive the encoding round trip: ${String(r.value?.reason)}`,
    );

    // ...and a batch whose budget runs out mid-way ALLOWS the tail rather than refusing the call.
    // Refusing was TRIED AND REVERTED: an ordinary 85-path edit blocked at 5003ms having already
    // judged 75 paths clean, with no prompt and no override, and it fired in un-onboarded repos
    // too. A batch that outruns the budget runs its tail unguarded, which is the coverage limit
    // this bridge accepts rather than becoming the thing that stops ordinary work.
    //
    // Exhaustion is guaranteed by CONSTRUCTION, not by racing the clock. The fake sleeps a known
    // 200ms per call and allows, so 30 paths cost 6s of wall time against the 5s bound on any
    // machine, and a slower machine only makes the premise more true. Padding real bd-guard spawns
    // instead made this case flaky by construction: it passed on one CI run and failed on the next
    // over identical code, because 100 spawns finished in 4003ms on a runner faster than the
    // author's laptop. The premise check below is what caught that, and it stays: without it a fast
    // machine would judge the whole batch inside the bound and the case would report that an
    // exhausted budget allows while never having exhausted anything.
    const slow = script(join(fx.root, "slow"), `printf 'x\\n' >> "${fx.log}"\nsleep 0.2\nprintf '{}\\n'`);
    const padded = Array.from({ length: 30 }, (_unused, n) => join(fx.inside, `pad${n}.ts`));
    const paddedStarted = Date.now();
    r = await called(handler(slow), { toolName: "edit", input: { paths: padded } }, { cwd: fx.repo });
    const paddedElapsed = Date.now() - paddedStarted;
    check(!r.threw, `a padded batch threw: ${String(r.threw)}`);
    check(paddedElapsed >= TIMEOUT_MS, `the padded batch did not reach the bound, so the case proves nothing: ${paddedElapsed}ms`);
    check(r.value === undefined, `a batch whose budget ran out was refused: ${String(r.value?.reason)}`);
    check(fx.spawns() < padded.length, `the batch was not cut short by the bound: ${fx.spawns()} spawns`);

    // ...and a hung guard is bounded here, because the runner's own bound expiring IS a block.
    // The lower bound is the load-bearing half: without it a handler that spawned nothing at all
    // would return instantly and pass having run no guard.
    //
    // The upper bound discriminates against ONE alternative - the child running to completion, at
    // 30s - so it only has to sit well below that. It used to read 6000, which left 1000ms for
    // process setup and reaping and was the same clock-race shape that made the padded case flaky
    // on a loaded runner. Widened, with the discriminating power unchanged - and expressed against
    // TIMEOUT_MS like its lower sibling, so a later change to the bound rescales the window with it
    // rather than leaving a literal that silently admits an elapsed the bound never intended.
    const hung = script(join(fx.root, "hung"), "sleep 30");
    const started = Date.now();
    r = await called(handler(hung), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: fx.repo });
    const elapsed = Date.now() - started;
    check(!r.threw, `a hung guard threw: ${String(r.threw)}`);
    check(r.value === undefined, "a hung guard blocked the call");
    check(elapsed >= TIMEOUT_MS - 500 && elapsed < TIMEOUT_MS * 2, `a hung guard was not bounded: returned in ${elapsed}ms`);

    // ...and the hostile-context half the sibling module already asserts. ctx is omp's object,
    // not ours: a cwd that is not a string makes spawnSync throw ERR_INVALID_ARG_TYPE, and a
    // throw escaping this handler is converted by omp's runner into a block on every guarded
    // call on the machine.
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: 42 } as unknown as GuardContext);
    check(!r.threw, `a non-string ctx.cwd threw: ${String(r.threw)}`);
    check(r.value === undefined, "a throwing spawn blocked the call");

    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: fx.outside } }, undefined as unknown as GuardContext);
    check(!r.threw, `an absent ctx threw: ${String(r.threw)}`);

    // ...and a confirm that REJECTS is the no-UI condition arriving late: a session tearing down
    // mid-prompt, or a host whose confirm throws outside an interactive context. Nobody answered,
    // so it refuses rather than landing in the allow bucket with the errors.
    const broken: GuardContext = {
      cwd: fx.repo,
      hasUI: true,
      ui: { confirm: async () => { throw new Error("prompt torn down"); } },
    };
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, broken);
    check(!r.threw, `a rejecting confirm threw out of the handler: ${String(r.threw)}`);
    check(r.value?.block === true, "a confirm that failed was read as an approval");
    check(r.value?.reason?.includes("confirm prompt failed") === true, `the refusal does not name the failed prompt: ${String(r.value?.reason)}`);
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
