# /diagnose

## What it does

Turns a bug report into a red-capable signal (a command that already fails on this bug) and a
falsifiable root cause, then writes a fix-contract for the loop to drive. It never opens a fix
itself and never lets a theory form before the signal exists - the order is signal first, root
cause second, and a symptom-only report with no stated expected behavior stops for the reporter
rather than getting a guessed one baked into the fix.

## When to reach for it

| Situation | Route |
|---|---|
| "X is broken / throwing / failing / slow", a crash, a regression, a flaky test, "why is prod down" | `/diagnose` |
| A new feature or capability, not a deviation from existing behavior | `/plan-grill` |
| A whole new app or epic needing a shared foundation first | `/groundwork` |
| A live production incident, even under pressure to hotfix immediately | `/diagnose` first - stabilize, then diagnose against telemetry, before any loop runs |
| An inbound PR from a colleague | `/review` |

## Where it fits

The fix-side twin of `/plan-grill`: both are Phase 1 front-ends that write a contract and hand
off to the same `/autonomous-loop`, which drives red toward green and reports DONE to
`/pr-and-verify`. For a hotfix, `/release-promotion` carries the loop's result to both branches
once it lands.

## Common questions

**The ticket describes something that isn't actually a bug - what happens?** Premise-verify looks for
an intent contract (a test or spec asserting the current behavior is deliberate) before any signal is
built. Finding one stops the run with `NEEDS_INPUT` instead of inventing an expected behavior and
"fixing" a non-bug.

**The reported symptom shows up through one caller, but a grep finds many callers hitting the same
code path - does the fix land only where the ticket pointed?** No. The caller list is produced before
the fix scope is set, and the fix lands once at the shared choke point so every caller is corrected,
not just the named one.

**Three ranked hypotheses each failed their own falsifying prediction - does it keep guessing?** No. A
fourth silent round is exactly what this stops: it converts to `NEEDS_INPUT` carrying what it tried,
what it observed, what it now suspects, and three honest next moves (continue on a genuinely new
hypothesis, escalate with the evidence chain, or land a diagnostic work-item that captures the next
real occurrence).

**Prod is down and the pressure is to hotfix now - does that skip diagnosis?** No. The incident still
routes through `/diagnose` first - stabilize the bleeding, then read telemetry as the signal source -
and enters the loop with an expedited four-line fix-contract rather than a bare edit with nothing
proving the fix and the incident going away are the same thing.

**A log corpus shows hundreds of matches for the error - is that the real frequency?** Not until it's
cleaned. Noise shapes (health checks, retries, the run's own tagged probes) get identified and excluded
first; a count quoted before that cleaning is a guess wearing a number.

## It's working if

- The ledger's fix-contract carries an already-run command and its captured red output, not a
  description of one
- The regression test sits at a seam that exercises the real multi-caller pattern, with an
  attribution comment naming the work-item and the one-sentence root cause
- A resumed or handed-off item's evidence trail shows the ruled-out hypotheses alongside the
  confirmed one, not just the fix that shipped
- The PR that lands shows the original red signal now green, and the fix's diff sits at the
  declared scope rather than spreading across unrelated files
