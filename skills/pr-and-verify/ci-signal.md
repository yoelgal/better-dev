# Reading CI truthfully - three probes, one signal

A PR's real state is not what any single command reports. `gh pr checks` shows job-level results but
misses a workflow that dispatched without producing a job yet, and it happily reads "all checks passed"
while a review approval or an unresolved thread still blocks the merge. Read three probes each pass -
each covers a blind spot of the others - then classify into one signal. The classification is what step 2
of the skill acts on.

## Sync the base first, every pass

Before reading anything, bring the integration branch into the PR branch, so CI evaluates against the
current base and base-introduced breakage surfaces on the PR rather than after merge. Fetch the base and
merge it in (never force-push to a shared base). No new base commits is a clean no-op - HEAD unchanged,
nothing pushed. A base merge that advances HEAD pushes once and re-triggers CI, and this pass reads the
synced HEAD. A genuine merge **conflict** here is not something to loop on - it settles `BLOCKED`
(external), for whoever owns the branch to resolve.

## The three probes

- **A - required checks:** `gh pr checks <n>` for job-level state.
- **B - workflow runs at HEAD:**
  `gh run list --commit "$(git rev-parse HEAD)" --json status,conclusion,workflowName` - catches a run
  that was dispatched but has no job for probe A to see.
- **C - merge-gate readiness:** `gh pr view --json mergeable,mergeStateStatus,reviewDecision` plus the
  unresolved-thread count - catches the non-CI gates: a missing approval, an unresolved review thread, a
  pending external context like a review bot.

## Classify

Read the probes in this order and stop at the first that matches:

- **RUNNING** - any check still in flight, or any workflow whose status is not `completed`. Wait on the
  next state change; do not count this as a pass or a failure.
- **RED** - any conclusion in `{failure, cancelled, timed_out, action_required}`. A red is a signal to
  triage, not an automatic fix target - classify it first (next section) and route by kind.
- **GATED** - nothing running or red, but probe C shows the merge is still blocked (`mergeStateStatus`
  outside `{CLEAN, HAS_HOOKS}`): an unresolved thread, a missing approval, a pending external context.
  A gate is not a code failure - surface it. A gate a human must clear is `NEEDS_INPUT`; a review verdict
  still pending is answered through `/review` and, if you are watching to merge, `watch.md`.
- **GREEN** - nothing running, nothing red, probe C clean. Necessary for done, but not sufficient on its
  own - the contract's done-criteria still have to be run and watched pass (skill step 3).

## Triage a red before treating it as a fix target

A red conclusion does not name its own cause. Before driving any fix, classify the failure with the
flake / infra / genuine triage `/autonomous-loop` owns - that is where the classification lives; this
skill only routes on its verdict:

- **Genuine** - this PR's own real failure: an assertion, a compile error, a lint the diff introduced.
  This, and only this, is a fix pass - hand the failing run id and its first failure line back to the fix
  loop (skill step 4).
- **Flake** - a non-deterministic failure that a re-run would likely clear. Not a code change; take a
  second data point (re-read once in-flight jobs settle, or re-run the check) rather than editing toward a
  failure that was never in the diff.
- **Infra** - a runner lost, a registry or network blip, a quota or OOM on the runner, or a base that went
  red underneath this PR. Not a code change either: it clears when the incident clears or the base goes
  green. That is a single external condition to wait on, not a fix - arm the bounded wait-for gate
  (`watch.md`) and resume when it clears.

The bright line the triage holds: a code, contract, or genuine-stuck failure is never reclassified as a
flake or infra to dodge it. When the failing check is this PR's own red test, it is genuine - the fix
loop's job, not the gate's.

Timing still matters within the genuine case: when other jobs are in flight over the same surface, or a
flake is worth a second data point, re-read once they settle rather than chasing a failure the running
jobs are about to change.

## Stuck, not slow

A red signal that repeats across passes with the same failing check, the same error string, and no new
learning is not progress waiting to happen - it is the stuck case (`NO_PROGRESS`), which the loop's
stuck-check confirms and restart-from-contract answers. Keep it distinct from a genuine external block
(`BLOCKED`), which waits, and from a spent operator budget (`EXHAUSTED`), which stops. None of the three
is ever a green.
