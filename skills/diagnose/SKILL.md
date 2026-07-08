---
name: diagnose
description: Use when a bug, regression, crash, flaky test, or a report that "X is broken / throwing / failing / slow", "why is prod down", or "make it faster" needs root-causing before any fix - the fix-side entry into the work-item loop, where a symptom becomes a reproducible red signal and a root cause.
argument-hint: "[bug report, ticket URL, error, or log snippet]"
---

# Diagnose a bug into a fix-contract

The front-end for a `fix/` work item. Turn a bug report into two things the loop can drive:
a **red-capable signal** (a command that already fails on this bug) and a **falsifiable root cause**.
Package them as a fix-contract in the ledger and hand off to `/autonomous-loop`, which drives the
same red→green loop a feature does. One job: **make the bug reproducible and explained before anyone
touches a fix.**

Read `.better-dev/overrides.md` first - a project override (a repro command, a test seam convention,
a "we never instrument prod" rule) wins over anything here.

Before you re-derive anything about this area, spend one recall on it
(`.better-dev/bin/bd-mem recall "<area>"`) and cite what it returned, or an explicit "recall empty" -
a lesson you already paid for is cheaper than the mistake it prevents. A recalled lesson is a prior
claim, not a current fact - verify it against today's code before acting on it.

The order below matters: a theory before a red signal is the exact failure this skill exists to
prevent. Don't skip forward.

## Phase 0 - Verify the premise

Before building anything, check that the bug is real and the expectation is sound. A bug claim has two
parts: the **claimed-actual** (what the reporter says happens) and the **claimed-expected** (what they
say should happen - often unstated in a symptom-only ticket; record it as `not stated`).

The cheapest evidence in the whole skill is the artifact you already hold: read the **whole** error and
the **full** stack trace, end to end - not just the top line. The failing frame, the message, the exit
code, and the values they name localize most bugs before any file is opened. Read it before you
theorize about it.

One bounded observation pass, cheapest first: locate the code path and read what it actually does on
the reported input; find any **intent contract** - a test, spec, validation rule, or doc that asserts
the current behavior is *deliberate*; run the cheapest already-wired check if one is cheap. The
deliverable of this pass is a verdict with receipts, not a change - no fix, no plan, no hypotheses yet.

Three outcomes send you back to the reporter instead of into a fix:

- The claimed behavior doesn't actually occur (you tried, and it works).
- The requested behavior already works, possibly under a different surface.
- An intent contract says the current behavior is deliberate - the premise, not the code, is likely
  wrong.

In those cases, stop and return the evidence to the reporter (a `NEEDS_INPUT` stop): the right next
move is a conversation, maybe closing the ticket, not a PR. Otherwise the deviation is confirmed and
you continue. Receipts throughout - `file:line`, the command and its output - a verdict without
receipts is just a guess.

**The symptom-only gate** (a bright line, not a suggestion). A symptom names a deviation - "X is
wrong / broken / slow" - but rarely states the *concrete correct behavior*. Never fill that gap by
guessing the expected behavior from the symptom: a guessed expectation gets baked into the Phase 4
red signal and regression test, so the loop then drives green against a made-up target and may
happily "fix" a non-bug. When the claimed-expected is `not stated`, source it from the reporter, a
spec, or an intent contract before you write the fix-contract - cite where it came from. If none can
state it, halt with a `NEEDS_INPUT` stop that quotes the symptom and asks for the correct behavior (or
a pointer to where it's specified); don't proceed on an invented one. This is the same discipline
`/plan-grill` applies to feature baselines - a goal you can't state concretely isn't one you can prove.

## Phase 1 - Build a red-capable signal

This is the skill; everything after it is mechanical. The loop cannot run without this, so spend
disproportionate effort here - be creative, don't give up early.

Produce **one command you have already run at least once** that goes red on *this* bug. Paste the
invocation and its red output. It must be:

- **Red-capable** - it drives the real bug code path and asserts the user's *exact* symptom, so it
  goes red now and green once fixed. Not "runs without erroring" - it has to catch *this* bug.
- **Deterministic** - same verdict every run. A non-deterministic bug means raising the reproduction
  rate until it's debuggable, not chasing a clean one-shot.
- **Fast** - seconds, not minutes. A 30-second flaky loop is barely better than none.
- **Agent-runnable** - you can run it unattended.

For the ladder of ways to construct a signal (failing test, curl, CLI diff, headless browser, replayed
trace, throwaway harness, fuzz loop, bisection, differential run, and the human-in-the-loop last
resort), how to tighten it, and how to handle non-deterministic bugs, read `signal.md`.

If you catch yourself reading code to build a theory before this command exists, that's the failure
this phase prevents - come back and build the signal first. If a first attempt doesn't reproduce, don't
jump to handing back - the *shape* of the non-reproduction is itself a lead: read `signal.md`'s
non-reproducible triage (timing / environment / state / truly-random), and for a bug that is live in
production its incident path (stabilize first, then read telemetry as the signal), before you conclude
no loop exists. If you genuinely cannot build one after that, stop and say so: list what you tried and
ask for env access, a captured artifact (HAR, log dump, core dump, timestamped recording), or
permission to add temporary instrumentation (a `NEEDS_INPUT` / `BLOCKED` stop). Don't proceed to
hypotheses without a loop.

## Phase 2 - Minimise the repro

Once it's red, shrink to the smallest scenario that still goes red. Cut inputs, callers, config, data,
and steps **one at a time**, re-running the signal after each cut - keep only what's load-bearing.
Done when removing any remaining element turns it green. A minimal repro shrinks the hypothesis space
in Phase 3 and becomes the clean regression test in Phase 4.

## Phase 3 - Root-cause via falsifiable hypotheses

**Recall first.** Before generating any hypotheses, distill the red signal into a **failure
signature** - the stable fingerprint of *this* failure, drawn from the whole error and stack you read
in Phase 0, not the run that happened to expose it: the error class and message shape, the top frames
of the stack, the failing assertion, the symptom in one line. Ask `.better-dev/bin/bd-mem recall "<signature>"` for a prior diagnosis of the same shape. A
confident match returns a known root cause and the fix that resolved it last time - apply it and
re-run the Phase 1 signal to confirm it goes green here too, rather than re-deriving from scratch. A
match that no longer holds (the signal stays red) isn't wasted: it rules out a candidate and tells you
the shape recurred for a new reason. No match, or a stale one, drops you into fresh hypotheses below.

Before free-generating, run the failure signature down the pattern table - a matched row seeds one
ranked hypothesis with its search area attached; no match just means every hypothesis is fresh, not
that the table was skipped.

| Pattern | Smells like | First place to look |
|---|---|---|
| Race / ordering | intermittent, timing- or load-dependent | shared state on concurrent paths; the awaits and callbacks nearest the symptom |
| Null propagation | `TypeError` / null deref far from an obvious cause | where the value was allowed to become null, not where it crashed |
| State corruption | inconsistent data, partial writes, works-then-doesn't | transaction boundaries, error paths that skip cleanup, hooks |
| Off-by-one / boundary | fails at empty, first, last, or size-limit inputs | loop bounds, index math, pagination |
| Missing validation | crash or corruption on malformed input | the trust boundary the input crossed uninspected |
| Integration drift | timeouts, unexpected shapes from a dependency | the external call site and the contract or version it assumes |
| Stale cache / state | old data shown after a change definitely landed | cache keys and invalidation, memoization, state not re-derived |

Write **3-5 ranked hypotheses before testing any of them** - generating one at a time anchors on the
first plausible idea. Each states a prediction that could falsify it: "if X is the cause, then changing
Y makes the bug disappear (or changing Z makes it worse)." A hypothesis with no prediction is a vibe -
sharpen it or drop it. Show the ranked list to the user before testing; they often re-rank it instantly
("we just deployed a change to #3"). Cheap checkpoint - don't block on it if they're away.

After ranking, spend one more recall keyed to the top hypothesis's component - the noun stem of the
module or file it accuses (`auth-cookie`, `session-expiry`), never a sentence or a path. The entry
recall was keyed to the area and the signature recall to the failure's shape; this one surfaces prior
work on the specific component now under suspicion. Cite the hit, or the explicit `recall empty`.

Test one variable at a time. For the instrumentation mechanics - local cheap-experiment loops versus
parallel fan-out for cross-service bugs, tagged trace probes and log peppering, routing verbose output
to disk, and building the evidence chain - read `instrument.md`.

If three ranked hypotheses each fail against their own falsifying prediction, stop generating - a
fourth guess is where a wrong fix comes from, and an unresolved diagnosis recorded plainly beats a
speculative one. Settle `NEEDS_INPUT` carrying three things: the three falsifications (what each
predicted, what the probe showed), what you now suspect and why you can't confirm it, and a menu of
the three honest next moves for the reporter to pick:

- **Continue** - only against a genuinely new hypothesis you name in the ask, never a re-rank of the
  three that died.
- **Escalate** - to someone who knows this subsystem; attach the evidence chain so far.
- **Instrument and wait** - land a diagnostic work-item instead of a fix: a valid `fix/` work-item
  whose deliverable is targeted probes at the boundaries the three failures implicate, plus a narrow
  alert on the failure signature, so the next real occurrence arrives captured (the same
  capture-the-next-occurrence move `signal.md` uses for truly-random bugs, offered here as a
  deliberate deliverable). Its done-criteria are observable like any other work-item's - the probes
  land and the alert demonstrably fires on the signature - with no red-goes-green signal to chase.

The fix-contract is never written from a hypothesis that survived only by default.

Fix the root cause, not the symptom. Before you settle where the fix lands, produce the **caller
list**: grep every caller of the function you'd touch - `/codebase-map` surfaces them from a structural
map when one's installed, plain grep when it isn't - and record them in the evidence chain. One guard
in the shared function all callers route through is a smaller, more correct change than a guard in the
single path the ticket named - which leaves every sibling caller broken. Guarding at the surface -
swallowing an unexpected null, de-duping in the view, wrapping the throw in a try/catch - hides the
deviation instead of fixing it; if a value is unexpectedly null, the bug is wherever it was allowed to
become null, not where it finally crashed.

The caller list also prices the fix before it exists. Read the planned fix's blast radius as
evidence, not a work estimate: one file, additive, reads as the right layer; a fix that needs edits
in more than a handful of files - or in every caller - is a wrong-layer signal. A large fix usually
means the root cause lives one layer further in, where a single change covers what the wide fix
patches piecemeal - re-check the layer before writing the contract. This is a diagnosis check,
distinct from the repo's `safety-scope` gate (~10 files by default), which stops a sprawling *diff*
for a human at loop time: a planned fix already near that number before any code exists means the
diagnosis is wrong, not that the schedule is big.

Land the diagnosis as an evidence chain: symptom observed → checked source → found evidence → confirmed
by a second source → reproduced. That chain, plus the correct hypothesis, is the root cause.

## Phase 4 - Write the fix-contract and hand off

Resolve the item's ledger directory with `.better-dev/bin/bd-mem ledger dir <slug>` (it returns the
**primary checkout's** path - the ledger is shared across worktrees, and the fix worktree doesn't exist
yet) and write `contract.md` there. The contract is what makes the loop's done-criteria observable
rather than asserted:

- **Red signal** - the exact command and its captured red output. This is the loop's done-when-green.
- **Minimised repro** - the smallest failing scenario.
- **Root cause** - one sentence plus the evidence chain.
- **Fix scope** - the narrowest set of paths the root cause and caller list implicate: one directory,
  a short explicit file list, or `repo-wide` plus one sentence of why (a missing reason is a missing
  scope). Declared only now, after the root cause - a scope guessed at investigation start locks the
  wrong module. When the scope is a single directory it doubles as the mechanical edit boundary where
  the repo runs enforced guardrails (`bd-guard scope` - the mechanism lives with guardrails; this line
  just declares its target); a file list or `repo-wide` scope stays a prose tripwire with its reason
  recorded.
- **Regression test at a correct seam** - a seam that exercises the *real* bug pattern at the call site.
  A too-shallow seam (a single-caller unit test for a bug that needs several callers) gives false
  confidence. If no correct seam exists, that itself is the finding: note it - the architecture is
  preventing the bug from being locked down - and flag it for follow-up rather than testing at a wrong
  seam. The test body carries a one-line attribution comment - the work-item slug and the one-sentence
  root cause - so a future red on this test identifies itself as *this bug recurring*, not as a new
  mystery or a flake candidate.
- **Merge disposition** - the same seal question `/plan-grill`'s done-contract defines settles the
  fix-contract's `merge: auto | hold` line; a fix earns auto-merge exactly the way a feature does,
  never by being "just a fix".

Then hand to `/autonomous-loop`. The same loop that builds features drives this red→green: it writes
the regression test, watches it fail, applies the fix, watches it pass, and re-runs the Phase 1 signal
against the original scenario. The fix's done-contract is exactly *red signal goes green + regression
test at a correct seam* - no new discipline for the loop to learn.

When the diagnosis was fresh (recall found nothing), close the loop that Phase 3 opened: propose
capturing the **failure signature → root cause + fix** through `.better-dev/bin/bd-mem learn` so the
next occurrence of this shape hits the fast-path instead of re-deriving. Record the *durable* thing -
the root cause and the fix that resolved it, plus any repro technique worth reusing - never the
transient run that surfaced it (a one-off timeout, a flake seed, a machine-specific path). `bd-mem`
proposes rather than writes; you're offering a candidate, not editing memory by hand.

## Composability

Diagnose adds; it never replaces an installed debugger, test runner, or observability skill - it
sequences them. It's the fix-side twin of `/plan-grill` (the feature front-end); both feed the same
`/autonomous-loop`. A live production incident is diagnosed here first; once the fix lands through the
loop and `/pr-and-verify`, `/release-promotion` carries the hotfix to both branches. When revising this
skill, follow `/writing-skills`.
