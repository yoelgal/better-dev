# Instrumenting to distinguish hypotheses

Once you have a ranked list of falsifiable hypotheses (Phase 3), each probe exists to confirm or kill
*one specific prediction*. Change one variable at a time - batching probes is how you learn nothing
from a green run.

## Local loop vs parallel fan-out

Most bugs are local: keep it in a single context, 2-4 candidates, one cheap experiment per round,
update beliefs between rounds. Order the candidates by `prior × (1 / cost of test)` - a cheap test on a
medium-prior hypothesis beats an expensive test on a high-prior one. After each experiment, mark the
hypothesis confirmed / contradicted / inconclusive with the evidence, cross out the dead ones, and pick
the next cheapest test. A confirmed high-prior candidate ends the round.

Escalate to a parallel fan-out - one investigation per hypothesis, run concurrently - only when the bug
spans services, points at infrastructure (metrics, pods, queues, databases), or three local rounds
turned up no confirmed candidate and no new lead worth a sub-hypothesis. Fan-out costs more; earn it.

## Probe with the sharpest tool, not the loudest

1. A **debugger or REPL breakpoint** if the environment supports one - a single breakpoint beats ten
   log lines.
2. **Targeted logs** at the boundaries that actually distinguish two hypotheses.
3. Never "log everything and grep" - that buries the signal you came for.

For performance regressions, logs usually mislead. Establish a baseline measurement first (a timing
harness, `performance.now()`, a profiler, a query plan), then bisect. Measure, then fix.

## Tagged log peppering

When you do add trace logs, scatter them deliberately and make cleanup a single grep:

- Pick a unique marker that collides with nothing in the codebase - grep the literal prefix first and
  confirm zero hits (e.g. `[DBG-<topic>-<n>]`; the trailing number lets you pepper twice in one run).
- Place them at high-value points: function entry and exit (with args and return value), before and
  after each state mutation ("was X / now X"), inside each suspected branch (log the evaluated
  condition), and before each await / channel send / goroutine - the usual homes of concurrency bugs.
  Start sparse. Bound hot loops with a counter gate rather than flooding.
- Keep every line single-line so grep correlation holds.
- Run the repro, then grep the marker instead of reading the whole log. If the trace stops early,
  something returned early - probe the error paths. If a value is wrong, move the marker upstream to
  where it was set. If the trace looks right but the bug persists, your suspected path isn't the real
  path - widen the net.

Cleanup is part of the job: grep the marker across the repo, remove every hit, confirm zero remain, and
keep the diagnosis instrumentation out of the fix commit. Tagged probes die; real logging is a separate
decision.

## Route verbose output to disk

When a process or service floods context, don't let its output land in the conversation. Redirect it to
a file and pull only what you need:

- `./repro > /tmp/diag-<topic>.log 2>&1`, then grep the file for the error pattern or your marker with
  a couple of lines of context - never `cat` the whole thing.
- For a long-running service, background it and grep the file as it grows; kill it by shell id when
  done.
- For a failure that spans services, merge their timestamped logs and sort by time, then grep a short
  window around the failure instant.

Use a unique `<topic>` per run so concurrent investigations don't clobber each other's files, and keep
these in `/tmp`, out of the repo.

## Land it as an evidence chain

The diagnosis is done when one hypothesis stands on a chain, not a hunch:

1. Observed *symptom* at *time / condition*.
2. Checked *source* → found *evidence A*.
3. *Evidence A* implies *intermediate conclusion*.
4. Verified against a second *source* → *evidence B* confirms.
5. Reproduced by the minimised repro.

State which alternatives you ruled out and how. That chain plus the winning hypothesis is the root
cause that goes into the fix-contract.
