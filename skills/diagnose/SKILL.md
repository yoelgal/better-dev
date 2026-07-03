---
name: diagnose
description: Use when a bug, regression, crash, flaky test, or "X is broken / throwing / failing / slow" report needs diagnosing before any fix — the fix-side entry into the work-item loop, where a symptom becomes a reproducible red signal and a root cause.
argument-hint: "[bug report, ticket URL, error, or log snippet]"
---

# Diagnose a bug into a fix-contract

The front-end for a `fix/` work item. Turn a bug report into two things the loop can drive:
a **red-capable signal** (a command that already fails on this bug) and a **falsifiable root cause**.
Package them as a fix-contract in the ledger and hand off to `/autonomous-loop`, which drives the
same red→green loop a feature does. One job: **make the bug reproducible and explained before anyone
touches a fix.**

Read `.better-dev/overrides.md` first — a project override (a repro command, a test seam convention,
a "we never instrument prod" rule) wins over anything here.

The order below matters: a theory before a red signal is the exact failure this skill exists to
prevent. Don't skip forward.

## Phase 0 — Verify the premise

Before building anything, check that the bug is real and the expectation is sound. A bug claim has two
parts: the **claimed-actual** (what the reporter says happens) and the **claimed-expected** (what they
say should happen — often unstated in a symptom-only ticket; record it as `not stated`).

One bounded observation pass, cheapest first: locate the code path and read what it actually does on
the reported input; find any **intent contract** — a test, spec, validation rule, or doc that asserts
the current behavior is *deliberate*; run the cheapest already-wired check if one is cheap. This is
observation, not debugging — no fix, no hypotheses yet.

Three outcomes send you back to the reporter instead of into a fix:

- The claimed behavior doesn't actually occur (you tried, and it works).
- The requested behavior already works, possibly under a different surface.
- An intent contract says the current behavior is deliberate — the premise, not the code, is likely
  wrong.

In those cases, stop and return the evidence to the reporter (a `NEEDS_INPUT` stop): the right next
move is a conversation, maybe closing the ticket, not a PR. Otherwise the deviation is confirmed and
you continue. Receipts throughout — `file:line`, the command and its output — a verdict without
receipts is just a guess.

## Phase 1 — Build a red-capable signal

This is the skill; everything after it is mechanical. The loop cannot run without this, so spend
disproportionate effort here — be creative, don't give up early.

Produce **one command you have already run at least once** that goes red on *this* bug. Paste the
invocation and its red output. It must be:

- **Red-capable** — it drives the real bug code path and asserts the user's *exact* symptom, so it
  goes red now and green once fixed. Not "runs without erroring" — it has to catch *this* bug.
- **Deterministic** — same verdict every run. A non-deterministic bug means raising the reproduction
  rate until it's debuggable, not chasing a clean one-shot.
- **Fast** — seconds, not minutes. A 30-second flaky loop is barely better than none.
- **Agent-runnable** — you can run it unattended.

For the ladder of ways to construct a signal (failing test, curl, CLI diff, headless browser, replayed
trace, throwaway harness, fuzz loop, bisection, differential run, and the human-in-the-loop last
resort), how to tighten it, and how to handle non-deterministic bugs, read `signal.md`.

If you catch yourself reading code to build a theory before this command exists, that's the failure
this phase prevents — come back and build the signal first. If you genuinely cannot build one, stop
and say so: list what you tried and ask for env access, a captured artifact (HAR, log dump, core dump,
timestamped recording), or permission to add temporary instrumentation (a `NEEDS_INPUT` / `BLOCKED`
stop). Don't proceed to hypotheses without a loop.

## Phase 2 — Minimise the repro

Once it's red, shrink to the smallest scenario that still goes red. Cut inputs, callers, config, data,
and steps **one at a time**, re-running the signal after each cut — keep only what's load-bearing.
Done when removing any remaining element turns it green. A minimal repro shrinks the hypothesis space
in Phase 3 and becomes the clean regression test in Phase 4.

## Phase 3 — Root-cause via falsifiable hypotheses

Write **3–5 ranked hypotheses before testing any of them** — generating one at a time anchors on the
first plausible idea. Each states a prediction that could falsify it: "if X is the cause, then changing
Y makes the bug disappear (or changing Z makes it worse)." A hypothesis with no prediction is a vibe —
sharpen it or drop it. Show the ranked list to the user before testing; they often re-rank it instantly
("we just deployed a change to #3"). Cheap checkpoint — don't block on it if they're away.

Test one variable at a time. For the instrumentation mechanics — local cheap-experiment loops versus
parallel fan-out for cross-service bugs, tagged trace probes and log peppering, routing verbose output
to disk, and building the evidence chain — read `instrument.md`.

Fix the root cause, not the symptom. Before you settle on where the fix lands, grep every caller of the
function you'd touch: one guard in the shared function all callers route through is a smaller, more
correct change than a guard in the single path the ticket named — which leaves every sibling caller
broken.

Land the diagnosis as an evidence chain: symptom observed → checked source → found evidence → confirmed
by a second source → reproduced. That chain, plus the correct hypothesis, is the root cause.

## Phase 4 — Write the fix-contract and hand off

Resolve the item's ledger directory with `.better-dev/bin/bd-mem ledger dir <slug>` (it returns the
**primary checkout's** path — the ledger is shared across worktrees, and the fix worktree doesn't exist
yet) and write `contract.md` there. The contract is what makes the loop's done-criteria observable
rather than asserted:

- **Red signal** — the exact command and its captured red output. This is the loop's done-when-green.
- **Minimised repro** — the smallest failing scenario.
- **Root cause** — one sentence plus the evidence chain.
- **Regression test at a correct seam** — a seam that exercises the *real* bug pattern at the call site.
  A too-shallow seam (a single-caller unit test for a bug that needs several callers) gives false
  confidence. If no correct seam exists, that itself is the finding: note it — the architecture is
  preventing the bug from being locked down — and flag it for follow-up rather than testing at a wrong
  seam.

Then hand to `/autonomous-loop`. The same loop that builds features drives this red→green: it writes
the regression test, watches it fail, applies the fix, watches it pass, and re-runs the Phase 1 signal
against the original scenario. The fix's done-contract is exactly *red signal goes green + regression
test at a correct seam* — no new discipline for the loop to learn.

Record any durable lesson worth carrying forward with `.better-dev/bin/bd-mem learn "<lesson>"` (for
example, a repro technique that worked, or a recurring flake signature).

## Composability

Diagnose adds; it never replaces an installed debugger, test runner, or observability skill — it
sequences them. It's the fix-side twin of `/plan-grill` (the feature front-end); both feed the same
`/autonomous-loop`. When revising this skill, follow `/writing-skills`.
