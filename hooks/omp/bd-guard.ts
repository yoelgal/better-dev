// better-dev's enforcement pair for omp: bd-guard's check-bash and check-edit, in omp's hook API.
//
// Claude Code registers the pair as two PreToolUse entries (hooks/hooks.json). omp has no hook
// config to register them in, but it has the one capability the pair needs: a tool_call handler
// may answer {block: true, reason}. So the pair reaches omp as a handler that pipes the tool
// input to the same bd-guard the Claude entries call and translates its answer into omp's own
// vocabulary - a deny becomes a blocked call carrying the reason, and an ask becomes a blocked
// call whose reason tells the agent to go and get the user's permission itself.
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
// The bound covers SPAWN time, and spawn time is now all there is: nothing in this handler waits
// on a human. An ask returns its block immediately, so the 5s budget is spent entirely on
// bd-guard spawns and the runner's 30s bound is approached by nothing else. The passage that
// stood here described the operator's own deliberation at a confirm prompt being added back to
// the budget, and it was right for as long as the prompt existed - omp 17.3.5 hands a hook its UI
// through `u = async (g) => { h?.pause(); try { return await g() } finally { h?.resume() } }`,
// where `h` is the handler's own budget, so the runner's bound was already an active-work bound.
// What survives that round is the finding rather than the mechanism: billing human time against a
// spawn budget leaves the rest of a batch unjudged, which is why no path here spends the budget
// on anything but a spawn.
//
// GOVERNING PRINCIPLE: better-dev's enforcement never reaches beyond the layer of the agent
// running it. A hook talks to its agent through that agent's own interface - a blocked call and a
// reason - and the agent owns every layer above, including the user. So an ask does NOT open a
// dialog here: it blocks the call and tells the agent to obtain the user's permission with the
// agent's own ask tool, record the single-use grant the reason names, and retry. The agent's ask
// is a first-class host event that omp, herdr and every other integration already observe, render
// and record; a dialog opened from inside a hook is visible to none of them, belongs to no
// conversation, and cannot be answered in the transcript somebody reads later.
//
// REMOVED, do not re-add - the same standing as the TRIED AND REVERTED note below: a host dialog
// (ctx.ui.confirm, and the CONFIRM_TITLE it carried), a host status line (setStatus), a host toast
// (ctx.ui.notify), and any shell-out to a notifier or a multiplexer (herdr, cmux, osascript,
// notify-send). Every one of them reaches past this agent to the operator's screen from inside a
// hook, so it escalates with no conversation to escalate into, and it leaves a headless run to
// either hang on a prompt nobody can answer or self-approve the class the recorded policy
// escalates. The hasUI branch went with them: with no dialog to open there is no UI case and no
// no-UI case, only one block carrying one reason, so the branch had nothing left to decide.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = "scripts/bd-guard";

// The budget is the whole handler's spawn time, not one spawn's: omp's runner turns its own 30s
// expiry into a block, so an edit carrying several paths must not be able to add spawns until it
// gets there. Nothing else spends it: no path here waits on a human.
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

// The sentence appended to every ask. Fixed text, and deliberately never interpolated: the
// script's reason already carries the model's own command or path as quoted data, so keeping the
// imperative half constant means a crafted path cannot rewrite the instruction the agent reads.
// It names no subject of its own, and no token either - the grant command comes from the script,
// which is the only side that knows the token it recorded for the subject it normalised.
const INSTRUCTION =
  "Do not retry this call yet. Ask the user for permission yourself, using your own ask tool, and " +
  "quote the reason above to them. If the user approves, run the grant command named in that " +
  "reason and then retry the call once. If the user declines, or there is nobody to ask, abandon " +
  "the call and report it as refused.";

// omp dispatches its tool devices as write calls to xd://<device>, so a scope-boundary check on
// xd://ast_edit would deny every device dispatch in every session. A target carrying a scheme is
// not a filesystem path; ast_edit's real paths are judged under its own tool name instead.
const URI = /^[a-z][a-z0-9+.-]*:\/\//i;

export interface GuardContext {
  cwd?: string;
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

// There is no `subject` on a Check any more, and no middle-eliding helper to build one: the prompt
// they were for is gone. bd-guard's reason names the PATTERN it matched ("recursive delete
// (rm -r)") and never the call, so somebody still has to name the call - and that is the side
// which normalised it. The script names it as quoted data in its own reason, and the grant command
// it appends carries an opaque 16-hex token instead of that subject.
//
// TRIED AND REVERTED, do not re-attempt: naming the subject inside the grant command. Every
// check-bash subject contains, by construction, the destructive substring that made it ask, so
// `bd-guard grant 'rm -rf src'` is itself judged destructive and draws its own ask, whose grant
// command nests the same substring again. Measured on `rm -rf src`, `git push --force origin
// main`, `git reset --hard HEAD~1`, `docker rm -f web` and `kubectl delete pod x`: all five
// regress, so every check-bash grant was unreachable. The token also removes the respelling
// failure - the subject is looked up rather than retyped, so a grant the agent reconstructed
// slightly differently can no longer be recorded, reported successful and never consumable - and
// it removes the quoting hazard with it, since a 16-hex word needs no quoting at all.

function editCheck(path: string): Check {
  return {
    sub: "check-edit",
    stdin: JSON.stringify({ tool_input: { file_path: path } }),
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
        ? [{ sub: "check-bash", stdin: JSON.stringify({ tool_input: { command } }) }]
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
    // The marker the script keys its host-specific behaviour on. Only this bridge sets it: Claude
    // Code's hook entries do not, so the script can tell the two hosts apart and its Claude Code
    // decisions stay byte-identical while it names a grant command here. The process environment
    // is EXTENDED, never replaced - the script reads PATH, TMPDIR and git's own variables, and a
    // guard that cannot find git fails as an ALLOW, which is a hole that shows up nowhere.
    env: { ...process.env, BD_GUARD_HOST: "omp" },
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
        const deadline = Date.now() + TIMEOUT_MS;
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
          // An ask is a BLOCK carrying an instruction, and never a dialog. better-dev's
          // enforcement stops at the layer of the agent running it: the guard tells this agent
          // what it may not do and why, and the agent owns everything above - including asking the
          // user, which it does with its own ask tool, a first-class host event omp already
          // renders and records.
          //
          // The reason is the script's own wording plus fixed text. `why` carries the model's
          // command or path as quoted data; the grant command inside it carries an opaque token
          // rather than that subject, so nothing the agent has to retype can carry the substring
          // that made the guard ask. INSTRUCTION is a constant and never interpolated, so a
          // crafted path cannot rewrite the imperative half of what the agent reads.
          //
          // This RETURNS rather than judging the rest of the batch, which is the one semantic the
          // dialog's removal moves. An approval used to clear the single path the operator had been
          // shown and leave the others to be judged; nobody has answered anything at this point, so
          // there is nothing to carry, and the whole call is refused. The retry after a grant
          // re-enters this handler and judges every path again from the first.
          return { block: true, reason: `${why} ${INSTRUCTION}` };
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

// A TRIPWIRE, not a UI. GuardContext no longer declares `hasUI` or `ui` because nothing in the
// handler reads them, but omp's real ctx still carries both, so the fake still hands them over -
// cast in, since the interface has dropped them - and counts every confirm it is asked for. That
// is what makes "confirm was never called" an assertion rather than an absence: the recorder
// answers TRUE, so a re-added dialog would show up twice over, as a call it counted and as the
// allow that call used to produce.
function operator(cwd: string, hasUI = true): Recorder {
  const calls: { title: string; message: string }[] = [];
  return {
    calls,
    ctx: {
      cwd,
      hasUI,
      ui: {
        confirm: async (title: string, message: string) => {
          calls.push({ title, message });
          return true;
        },
      },
    } as unknown as GuardContext,
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

// The grant invocation an ask reason names, matched by SHAPE rather than by text. Its argument is
// an opaque 16-hex token the script recorded for the subject it normalised, and never the subject
// itself: every check-bash subject contains, by construction, the destructive substring that made
// the guard ask, so an invocation carrying it - `bd-guard grant 'rm -rf src'` - is itself judged
// destructive and draws its own ask. Measured on five patterns, all five regressed, so the
// argument's SHAPE is what these cases assert, and the subject is asserted separately, in prose.
const GRANT = /(\S*bd-guard grant)[ \t]+(\S+)/g;
const TOKEN = /^[0-9a-f]{16}$/;

// Every grant invocation in a reason, as the exact command the agent would run plus its argument.
function grants(reason: string | undefined): { text: string; arg: string }[] {
  return [...(reason ?? "").matchAll(GRANT)].map(m => ({ text: `${m[1]} ${m[2]}`, arg: m[2] }));
}

// Two cases below strip those invocations out of a reason with `.replace(GRANT, " ")` and assert
// the subject against what is LEFT. That is the sentence somebody gets quoted to them, so
// asserting against it rather than against the whole reason is what keeps "the block names the
// subject" from being satisfied by an incidental echo inside the command the agent is told to type.

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

    // 2. an ask becomes a BLOCK whose reason carries the guard's own wording, the subject, and the
    // grant command the agent is to run once the user approves. No dialog is opened: the tripwire
    // ctx would have counted one, and would have answered yes.
    const asked = operator(fx.repo);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, asked.ctx);
    check(!r.threw, `a destructive bash call threw on an ask: ${String(r.threw)}`);
    check(r.value?.block === true, "a destructive bash call was not blocked on an ask");
    check(r.value?.reason?.includes("[better-dev]") === true, `the block does not carry the guard's own wording: ${String(r.value?.reason)}`);
    // bd-guard's reason names the PATTERN it matched ("recursive delete (rm -r)") and never the
    // call, so a block the agent is expected to relay to a user has to name the command from
    // somewhere. Asserted against the reason with its grant invocations stripped out, so that
    // naming the command only inside the command the agent must retype cannot satisfy it. Sharper
    // than the bare includes() this replaces, which the old subject-carrying invocation satisfied
    // on its own; every reason that passed the old form passes this one.
    check((r.value?.reason ?? "").replace(GRANT, " ").includes("rm -rf /some/dir"),
      `the block does not name the command being judged outside the grant invocation: ${String(r.value?.reason)}`);
    // ...and the grant command names an opaque TOKEN rather than that command: exactly one
    // invocation, whose only argument is 16 lowercase hex.
    const askGrants = grants(r.value?.reason);
    check(askGrants.length === 1, `the block names ${askGrants.length} grant commands, expected exactly 1: ${String(r.value?.reason)}`);
    check(TOKEN.test(askGrants[0]?.arg ?? ""), `the grant command's argument is not a 16-hex token: ${String(askGrants[0]?.arg)}`);
    check(askGrants[0]?.text.includes("rm -rf /some/dir") !== true, `the grant invocation embeds the command being judged: ${String(askGrants[0]?.text)}`);
    check(r.value?.reason?.includes(INSTRUCTION) === true, `the block does not carry the ask instruction: ${String(r.value?.reason)}`);
    check(asked.calls.length === 0, `confirm was called ${asked.calls.length} times on an ask`);
    check(fx.spawns() === 1, `expected one guard spawn for a bash ask, got ${fx.spawns()}`);
    const askReason = r.value?.reason;

    // ...and the command that reason tells the agent to run is itself CLEAN, judged by the real
    // guard. This is the case the shape assertions above exist for: while the invocation carried
    // the subject, granting a destructive command meant running a command containing that
    // destructive text, so the grant drew its own ask and no check-bash grant was reachable at
    // all. The string reads harmless to a reader, so the only assertion that catches it is feeding
    // the exact command back through check-bash.
    //
    // What is fed is what an agent following INSTRUCTION would COPY: the imperative removed, then
    // everything from the command name to the end of the reason - the script puts the grant
    // sentence last precisely so that span is the whole command and nothing else. Taking only the
    // first whitespace-delimited argument instead would make this case vacuous, since a
    // subject-carrying invocation truncated at its first space (`grant 'rm`) is judged clean; the
    // endsWith check below is what keeps the extraction honest.
    const regress = operator(fx.repo);
    const copied = (/\S*bd-guard grant[^\n]*/.exec((askReason ?? "").replace(INSTRUCTION, ""))?.[0] ?? "").trim();
    check(copied.endsWith(askGrants[0]?.arg ?? "\u0000"), `the grant command does not end at its argument, so the reason has text after it: ${copied}`);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: copied } }, regress.ctx);
    check(!r.threw, `the grant command the ask names threw when judged: ${String(r.threw)}`);
    check(r.value === undefined, `the grant command the ask names draws its own decision: ${copied} -> ${String(r.value?.reason)}`);
    check(regress.calls.length === 0, `confirm was called ${regress.calls.length} times judging the grant command`);

    // ...and a check-edit ask the same way. The path in the reason is the guard's own NORMALISED
    // absolute path rather than an echo of the model's string, which is why the script owns that
    // sentence and this bridge only passes the reason through. It is asserted in the prose now,
    // since the invocation carries no subject left to inspect.
    const denylisted = join(fx.inside, ".env");
    const editAsk = operator(fx.repo);
    r = await called(handler(fx.wrapper), { toolName: "write", input: { path: denylisted } }, editAsk.ctx);
    check(!r.threw, `a write to a denylisted path threw: ${String(r.threw)}`);
    check(r.value?.block === true, "a write to a denylisted path was not blocked");
    check((r.value?.reason ?? "").replace(GRANT, " ").includes(denylisted),
      `the block does not name the path being judged outside the grant invocation: ${String(r.value?.reason)}`);
    const editGrants = grants(r.value?.reason);
    check(editGrants.length === 1, `the edit block names ${editGrants.length} grant commands, expected exactly 1: ${String(r.value?.reason)}`);
    check(TOKEN.test(editGrants[0]?.arg ?? ""), `the edit grant command's argument is not a 16-hex token: ${String(editGrants[0]?.arg)}`);
    // A path was the one subject a quoted invocation could carry safely, since no path matches
    // check_bash's patterns - which is exactly why the check-bash regress hid for a round behind a
    // green edit case. It is asserted absent here too: one token form for both subjects leaves no
    // second spelling to respell, and no quoting for a path with a space or an apostrophe in it.
    check(editGrants[0]?.text.includes(denylisted) !== true, `the edit grant invocation embeds the path being judged: ${String(editGrants[0]?.text)}`);
    check(r.value?.reason?.includes(INSTRUCTION) === true, `the edit block does not carry the ask instruction: ${String(r.value?.reason)}`);
    check(editAsk.calls.length === 0, `confirm was called ${editAsk.calls.length} times on an edit ask`);

    // 3. the same ask with no UI is the SAME block, reason for reason. There is no dialog to be
    // missing, so there is no headless special case to get wrong: what the agent is told does not
    // depend on whether the host could have drawn a prompt. The old code had a refusal of its own
    // here, naming the absent prompt, and that is what this case now forbids.
    const headless = operator(fx.repo, false);
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, headless.ctx);
    check(!r.threw, `a destructive bash call threw with no UI: ${String(r.threw)}`);
    check(r.value?.block === true, "a destructive bash call proceeded in a session with no UI");
    check(r.value?.reason === askReason, `the block differs with no UI: ${String(r.value?.reason)}`);
    // That byte-for-byte equality now also pins the TOKEN's determinism, which is load-bearing
    // elsewhere: the token is a hash of the subject, so the same subject asked twice names the same
    // grant and re-asking rewrites one pending entry instead of appending a new one. A per-ask
    // random token would leave this case as the only thing that noticed.
    check(headless.calls.length === 0, `confirm was called ${headless.calls.length} times in a session with no UI`);

    // ...and the marker the script keys on reaches the spawn. A fake guard records its own
    // environment because the spawn is the only place the value has to arrive: the real script
    // reads BD_GUARD_HOST to decide whether to consume a grant and whether to name one, so a
    // bridge that stopped passing it would silently take the Claude Code path in an omp session -
    // an ask with no way to approve it, and nothing else different enough to notice.
    const spawnEnvLog = join(fx.root, "spawn-env.txt");
    const recording = script(join(fx.root, "recording"), `printf '%s\\n' "host=$BD_GUARD_HOST path=$PATH" >> "${spawnEnvLog}"\nprintf '{}\\n'`);
    r = await called(handler(recording), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, { cwd: fx.repo });
    check(!r.threw, `an env-recording guard threw: ${String(r.threw)}`);
    check(r.value === undefined, "a guard answering {} blocked the call");
    const spawnEnv = existsSync(spawnEnvLog) ? readFileSync(spawnEnvLog, "utf8") : "";
    check(spawnEnv.includes("host=omp"), `the guard spawn did not carry BD_GUARD_HOST=omp: ${JSON.stringify(spawnEnv)}`);
    // ...and the process environment was EXTENDED rather than replaced. Replacing it strips PATH,
    // the script then cannot find git, and a guard that cannot answer ALLOWS - so this failure mode
    // is silent everywhere else in this file.
    check(/\bpath=[^\s]*\//.test(spawnEnv), `the guard spawn replaced the process environment: ${JSON.stringify(spawnEnv)}`);

    // 4. an allow is silent: a build clean draws neither a block nor a prompt.
    const clean = operator(fx.repo);
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

    // ...and an ask short-circuits the batch, which is the ONE semantic the dialog's removal moves.
    // An approval used to clear the single path the operator had been shown and leave the rest to be
    // judged, because reading their yes as consent for the whole batch is how a boundary gets crossed
    // one approval at a time. Nobody has answered anything by the time the block is returned now, so
    // there is nothing to carry: the whole call is refused, and the retry after a grant judges every
    // path again from the first. The second path here is clean and inside the boundary, so the spawn
    // count is what shows it was never reached.
    const batch = operator(fx.repo);
    r = await called(
      handler(fx.wrapper),
      { toolName: "edit", input: { paths: [join(fx.inside, ".env"), join(fx.inside, "a.ts")] } },
      batch.ctx,
    );
    check(!r.threw, `an ask-then-clean edit threw: ${String(r.threw)}`);
    // The REASON, not the bare boolean: a block asserted on its own would be satisfied by any
    // future refusal this bridge grew, which is how two invented ones hid in this case for a round.
    check(r.value?.block === true, "an edit whose first path draws an ask was allowed");
    const batchGrants = grants(r.value?.reason);
    check(batchGrants.length === 1, `the batch block names ${batchGrants.length} grant commands, expected exactly 1: ${String(r.value?.reason)}`);
    check(TOKEN.test(batchGrants[0]?.arg ?? ""), `the batch grant command's argument is not a 16-hex token: ${String(batchGrants[0]?.arg)}`);
    check(r.value?.reason?.includes(INSTRUCTION) === true, `the batch block does not carry the ask instruction: ${String(r.value?.reason)}`);
    check(batch.calls.length === 0, `confirm was called ${batch.calls.length} times across the batch`);
    check(fx.spawns() === 1, `an ask did not short-circuit the batch: ${fx.spawns()} spawns`);

    // ...and an ask followed by a DENY in the same batch short-circuits the same way, which is the
    // sequence no case reached before: the batch above pairs the ask path with a clean path, the
    // one below puts the deny first. Here the agent sees ONLY the ask, so a grant it then obtains
    // is spent by the retry, which re-judges from the first path and blocks on the deny. The end
    // state is fail-closed - the boundary is never crossed, because a grant is keyed to the subject
    // the guard asked about and the denied path was never asked about - but one approval is spent
    // on a call that stays blocked, which is worth pinning rather than rediscovering. What is
    // asserted is the short-circuit itself: the ASK reason with its token, the deny's wording and
    // path absent, and one spawn, because the second path is never reached to be judged.
    const askDeny = operator(fx.repo);
    r = await called(
      handler(fx.wrapper),
      { toolName: "edit", input: { paths: [join(fx.inside, ".env"), fx.outside] } },
      askDeny.ctx,
    );
    check(!r.threw, `an ask-then-deny edit threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an ask-then-deny edit was allowed");
    // Positively the denylist ASK, not merely "not the deny": naming which decision came back is
    // what makes the two absence assertions below mean the deny was never reached, rather than
    // meaning some third refusal was returned whose wording happens to match neither.
    check(r.value?.reason?.includes("recorded safety-denylist") === true, `the block is not the denylist ask the first path draws: ${String(r.value?.reason)}`);
    check((r.value?.reason ?? "").replace(GRANT, " ").includes(join(fx.inside, ".env")),
      `the ask does not name the first path outside the grant invocation: ${String(r.value?.reason)}`);
    const askDenyGrants = grants(r.value?.reason);
    check(askDenyGrants.length === 1, `the ask-then-deny block names ${askDenyGrants.length} grant commands, expected exactly 1: ${String(r.value?.reason)}`);
    check(TOKEN.test(askDenyGrants[0]?.arg ?? ""), `the ask-then-deny grant argument is not a 16-hex token: ${String(askDenyGrants[0]?.arg)}`);
    check(r.value?.reason?.includes(INSTRUCTION) === true, `the ask-then-deny block does not carry the ask instruction: ${String(r.value?.reason)}`);
    check(r.value?.reason?.includes("outside the scope boundary") !== true, `the ask did not short-circuit before the deny: ${String(r.value?.reason)}`);
    check(r.value?.reason?.includes(fx.outside) !== true, `the ask-then-deny block names the path behind the ask: ${String(r.value?.reason)}`);
    check(askDeny.calls.length === 0, `confirm was called ${askDeny.calls.length} times across an ask-then-deny batch`);
    check(fx.spawns() === 1, `an ask did not short-circuit before the deny: ${fx.spawns()} spawns`);

    // ...and a deny short-circuits exactly as it always did, which is the half this change must not
    // have moved: the offending path is judged, the block carries its own reason, and the paths
    // behind it are never spawned for.
    r = await called(
      handler(fx.wrapper),
      { toolName: "edit", input: { paths: [fx.outside, join(fx.inside, "a.ts")] } },
      { cwd: fx.repo },
    );
    check(!r.threw, `a deny-first edit threw: ${String(r.threw)}`);
    check(r.value?.block === true, "an edit whose first path is outside the boundary was allowed");
    check(
      r.value?.reason?.includes("outside the scope boundary") === true,
      `the block is not the boundary deny the first path draws: ${String(r.value?.reason)}`,
    );
    check(r.value?.reason?.includes(fx.outside) === true, `the block does not name the denied path: ${String(r.value?.reason)}`);
    check(fx.spawns() === 1, `a deny did not short-circuit the batch: ${fx.spawns()} spawns`);

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

    // ...and a ctx whose confirm THROWS is now indistinguishable from any other ask. The old code
    // read a rejecting prompt as the no-UI condition arriving late - a session tearing down
    // mid-prompt, a host whose confirm throws outside an interactive context - and refused with
    // wording of its own. Nothing consults it any more, so the block is the ordinary one, and a
    // re-added dialog fails here loudly rather than quietly changing a reason.
    const hostile = {
      cwd: fx.repo,
      hasUI: true,
      ui: { confirm: async () => { throw new Error("prompt torn down"); } },
    } as unknown as GuardContext;
    r = await called(handler(fx.wrapper), { toolName: "bash", input: { command: "rm -rf /some/dir" } }, hostile);
    check(!r.threw, `a ctx carrying a throwing confirm threw out of the handler: ${String(r.threw)}`);
    check(r.value?.block === true, "an ask was not blocked when ctx carried a throwing confirm");
    check(r.value?.reason === askReason, `the block changed because ctx carried a throwing confirm: ${String(r.value?.reason)}`);
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
