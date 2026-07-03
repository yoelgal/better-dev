# Reading CI truthfully — three probes, one signal

A PR's real state is not what any single command reports. `gh pr checks` shows job-level results but
misses a workflow that dispatched without producing a job yet, and it happily reads "all checks passed"
while a review approval or an unresolved thread still blocks the merge. Read three probes each pass —
each covers a blind spot of the others — then classify into one signal. The classification is what step 2
of the skill acts on.

## Sync the base first, every pass

Before reading anything, bring the integration branch into the PR branch, so CI evaluates against the
current base and base-introduced breakage surfaces on the PR rather than after merge. Fetch the base and
merge it in (never force-push to a shared base). No new base commits is a clean no-op — HEAD unchanged,
nothing pushed. A base merge that advances HEAD pushes once and re-triggers CI, and this pass reads the
synced HEAD. A genuine merge **conflict** here is not something to loop on — it settles `BLOCKED`
(external), for whoever owns the branch to resolve.

## The three probes

- **A — required checks:** `gh pr checks <n>` for job-level state.
- **B — workflow runs at HEAD:**
  `gh run list --commit "$(git rev-parse HEAD)" --json status,conclusion,workflowName` — catches a run
  that was dispatched but has no job for probe A to see.
- **C — merge-gate readiness:** `gh pr view --json mergeable,mergeStateStatus,reviewDecision` plus the
  unresolved-thread count — catches the non-CI gates: a missing approval, an unresolved review thread, a
  pending external context like a review bot.

## Classify

Read the probes in this order and stop at the first that matches:

- **RUNNING** — any check still in flight, or any workflow whose status is not `completed`. Wait on the
  next state change; do not count this as a pass or a failure.
- **RED** — any conclusion in `{failure, cancelled, timed_out, action_required}`. Hand the failing run
  id and its first failure line back to the fix loop (skill step 4).
- **GATED** — nothing running or red, but probe C shows the merge is still blocked (`mergeStateStatus`
  outside `{CLEAN, HAS_HOOKS}`): an unresolved thread, a missing approval, a pending external context.
  A gate is not a code failure — surface it. A gate a human must clear is `NEEDS_INPUT`; a review verdict
  still pending is answered through `/review` and, if you are watching to merge, `watch.md`.
- **GREEN** — nothing running, nothing red, probe C clean. Necessary for done, but not sufficient on its
  own — the contract's done-criteria still have to be run and watched pass (skill step 3).

## Act versus wait, when something is red while other jobs run

Not every red result is worth a fix pass the instant it lands. Act when the failure is self-contained and
unrelated to what is still running. Wait when in-flight jobs touch the same surface, or the failure looks
like a flake worth a second data point, and re-read once they settle. This keeps a fix pass from chasing
a failure that the still-running jobs are about to change.

## Stuck, not slow

A red signal that repeats across passes with the same failing check, the same error string, and no new
learning is not progress waiting to happen — it is the stuck case (`NO_PROGRESS`), which the loop's
stuck-check confirms and restart-from-contract answers. Keep it distinct from a genuine external block
(`BLOCKED`), which waits, and from a spent operator budget (`EXHAUSTED`), which stops. None of the three
is ever a green.
