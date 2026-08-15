# /review

## What it does

An independent verdict on a diff, delivered by a worker that never saw how the code was written. It
reads the diff and the plan or contract, judges two separate questions - is it built well
(Standards) and is it the thing that was asked for (Spec) - and reports findings on a fixed severity
ladder. The defining constraint is what it refuses: it never reads the implementer's report, the PR
body, or the loop's narration of what was built. Seeing that account and discounting it is a weaker
discipline than never seeing it at all - review's whole value is a verdict nobody wrote their own
account into first.

## When to reach for it

- **The loop's gate** - every work-item's diff gets one before it can settle DONE.
- **A whole-branch pass before a PR** into the integration branch - runs at deep effort by default,
  though a small, fingerprint-clean, under-tripwire branch steps down to the effort its diff earns.
- **"Review since X"** - a standalone pass against a fixed point with no work-item ledger behind it.
- **A colleague's inbound, human-authored PR** - composes the host's PR-review mechanics with this
  repo's recorded policy overlay (`inbound.md`); no ledger write, no fix-worker dispatch, no
  auto-merge.

For a quick scan of a working diff with none of this ceremony, the host's own `/code-review` is the
right size. For the code itself needing fixing rather than judging, that's the loop's fix worker, not
this skill.

## Where it fits

Sits on the build loop between the implementer and the PR: an implementer's diff lands here, a clean
verdict is what lets `/pr-and-verify` open or advance a PR without re-running review itself
(`/pr-and-verify` checks the recorded verdict as an entry precondition and never re-derives it). Any
finding routes to the loop's fix worker and comes back for re-review. It composes
`/orchestrating-agents` for every worker it dispatches, `/security-pass` (or the host's own security
skill) as its Security channel, and `/graphify-wrapper-query` for ripple analysis. `reception.md`
carries the author's side of acting on a verdict; `inbound.md` carries the colleague-PR path.

## Prerequisites

For the loop's gate specifically: an implementer has already reported the diff done - review reads a
finished diff, not one still in progress. The other three invocation modes (whole-branch pre-PR,
review since X, colleague inbound PR) carry no such precondition of their own.

## Common questions

**Does a small diff still get the full channel fan-out?** No - effort scales to blast radius, not to
occasion. A whole-branch pre-PR pass defaults to deep, but a branch whose net diff is small, touches
no fingerprint surface, and stays under the scope tripwire runs at the effort that diff earns; light
stays legal even at the PR gate. The reverse holds too: a single-commit change that touches auth or a
migration pulls effort up regardless of how it was requested.

**What happens to a finding nobody explicitly answered?** It stays open. Every finding - Minor
included - needs exactly one recorded disposition, `ACCEPTED` or `REBUTTED` with reasoning
(`reception.md`). A finding with no row is `persistent` at re-review and blocks again; it does not
quietly fade between cycles, and an `ACCEPTED` row whose cited fix the new diff doesn't actually touch
counts as a fresh finding, not a pass.

**Why does a re-review need to declare an "angle"?** A second full round dispatched with the same
brief as the first tends to look in the same place and come back clean for the wrong reason. Each
full re-review opens with one line naming an angle outside the exclusion set the prior rounds already
covered, and a round whose angle repeats what was already tried is read as a rubber stamp, not a clean
verdict, and gets re-dispatched rather than trusted.

**Does a green test suite settle a criterion?** No - the suite already ran in the loop; review reads
the test code in the diff, not a run of it. A new test is presumed vacuous until something shows it
can fail (a recorded red, or a negative control); absent that, it's an Important finding naming the
test, not a pass.

**What's the one known sharp edge in review's own mechanics?** The ripple check
(`/graphify-wrapper-query --affected`) reads the graph as of its last build - a stale or never-built
graph can miss a ripple silently. The stopgap is that any hit is confirmed at `file:line` before it's
reported, so a graph result is a lead to verify, never a finding on its own; this is a stopgap, not a
promise the graph is current.

## It's working if

- The report opens with an axis verdict token (`compliant` / `issues-found` / `cannot-verify`) and a
  five-line counts block (`CRITICAL` / `IMPORTANT` / `MINOR` / `CANNOT_VERIFY` / `GATE_BREACH`) that
  matches the findings printed above it.
- Spec and Standards (and Security, Refuter, or a lens where the diff earns one) each appear under
  their own heading, never merged into one blended list or a single pass/fail call.
- A clean verdict is recorded to the work-item's ledger keyed to the reviewed commit, and
  `/pr-and-verify` proceeds without re-running review.
- Any finding - any tier - comes back through a fix pass and a fresh diff before the item settles
  DONE; nothing rides into a PR unaddressed.
- Any finding naming a caller outside the diff shows a confirmed `file:line` beside it, never a bare
  claim of "affected code elsewhere".
