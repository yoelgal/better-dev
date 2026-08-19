# Building a red-capable signal

The signal is the whole game. Treat it as a product you're building, not a chore before the "real"
debugging - because once it's tight, the debugging is mechanical.

## The ladder - ways to construct one

Try these in roughly this order; take the first rung that reaches the bug cheaply.

1. **Failing test** at whatever seam reaches the bug - unit, integration, or e2e. Usually the best,
   because it's already the regression test.
2. **Curl / HTTP script** against a running dev server, asserting on the response.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) that drives the UI and asserts on DOM,
   console, or network.
5. **Replayed trace** - save a real request, payload, or event log to disk and replay it through the
   code path in isolation.
6. **Throwaway harness** - a minimal slice of the system (one service, mocked deps) that hits the bug
   path in a single function call.
7. **Property / fuzz loop** - for "sometimes wrong output", run many random inputs and watch for the
   failure mode.
8. **Bisection harness** - if the bug appeared between two known-good states (commit, dataset,
   version), automate "boot at state X, check, repeat" so `git bisect run` can drive it.
9. **Differential loop** - run the same input through old vs new version (or two configs) and diff the
   outputs.
10. **Human-in-the-loop** - a last resort when a person genuinely must click. Keep the loop structured:
    drive *them* with a small script that prints an instruction, waits for Enter, then reads their
    answer back - `step "<instruction>"` and `capture VAR "<question>"` helpers over `read -r`, echoing
    the captured values as `KEY=VALUE` at the end for you to parse. The human is inside a loop, not
    replacing it.

## Tighten it

Once you have *a* loop, sharpen it before you rely on it:

- **Faster** - cache setup, skip unrelated init, narrow the test scope.
- **Sharper signal** - assert on the specific symptom, not "didn't crash".
- **More deterministic** - pin the clock, seed the RNG, isolate the filesystem, freeze the network.

A 2-second deterministic loop is a debugging superpower; a 30-second flaky one barely counts.

## Non-deterministic bugs

The goal isn't a clean one-shot repro - it's a **high enough reproduction rate to debug against**. Loop
the trigger 100×, parallelise it, add stress, narrow the timing window, inject sleeps at suspected race
points. A 50%-flake bug is debuggable; a 1% one isn't - keep raising the rate until it is, then treat
that harness as the signal.

## When it won't reproduce yet

A first miss is a clue about *why*, not a dead end. Triage the shape before you give up:

- **Timing / concurrency** - widen the window: inject sleeps at the suspected race points, run the
  trigger under load or in parallel, add timestamped markers around the suspect region.
- **Environment** - diff the two environments: runtime and OS versions, env vars, and especially data
  (empty vs populated store). A clean CI run often reproduces what a warm laptop hides.
- **State / order** - run the scenario in isolation, then again after the operations that precede it in
  the wild; hunt leaked globals, singletons, and shared caches.
- **Regression** - if it worked at a known-good state, let `git bisect run <your signal>` find the
  commit that broke it; the same automation bisects over a data or dependency version, not just commits.
- **Truly random** - raise the rate (loop the trigger 100x, add stress) until it's debuggable; if it
  stays below usefully-debuggable, add a narrow alert on the exact failure signature and capture the
  next real occurrence rather than fabricating a clean one-shot.

## When it's live in production and you have no local repro

Two jobs, in order. First **stop the bleeding** - the fastest safe reversal is the fix for *now*: flip
the feature flag off, roll back or revert the suspect deploy, drain the bad node. Record it; a rollback
is a mitigation, not the diagnosis. Then treat **telemetry as the signal source** while you build a
local one: pull the logs, traces, and error-tracker events around the failure instant, extract the
exact inputs and the failure signature, and replay them through the code path in isolation (ladder rung
5). The regression test still lands locally - production observation is how you get the repro, not a
substitute for it.

## When you truly can't build one

Stop and say so plainly. List what you tried. Then ask the reporter for exactly one of:

- access to an environment that reproduces it,
- a captured artifact (HAR file, log dump, core dump, timestamped screen recording), or
- permission to add temporary instrumentation where it actually happens.

Returning with a specific ask beats proceeding to hypotheses on no signal - that's the guess this
skill exists to avoid.
