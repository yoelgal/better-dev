# /test-audit

## What it does

Finds the tests that pass without defending what they claim, and proves each one by breaking the code
underneath it and watching whether the test goes red. The defining constraint is that a nomination is
never a verdict: a test that reads correct is an argument, and this pass only accepts the observation.
It distrusts coverage on principle, since a line executing says nothing about whether a wrong line
would turn the suite red, and it never repairs what it condemns - grading its own fix would throw away
the independence that made the finding worth anything.

## When to reach for it

| Situation | Route |
|---|---|
| A standing false-confidence pass over a repo or one area | `/test-audit` |
| A green verify command about to be trusted as done-criteria evidence | `/test-audit` |
| One suspect test that may be passing on a mock or a vacuous setup | `/test-audit` |
| A high coverage number sitting next to bugs that keep shipping | `/test-audit` |
| A test that is already failing | `/diagnose` - a red signal is triaged, not audited |
| A diff needs a verdict | `/review` |
| The condemned tests need rewriting | `/plan-grill`, then the loop - one work-item per finding |

## Where it fits

A lens the rest of the chain borrows, and the standing sweep over tests that are already in the tree.
`/codebase-audit` runs it over a swept area when its ranking turns on how well-defended the code is,
`/review` routes a test it doubts here instead of arguing it out in the review, and `/autonomous-loop`
enters it when a done-criterion rests on a test that arrived before the work-item. Each finding leaves
as a work-item for the human to pick, and the receiving stage re-reads the audit table rather than a
summary of it.

## Prerequisites

A suite that currently passes, run in the work-item's worktree rather than the primary checkout, with
any watcher, dev server, or auto-format-on-save stopped first - the pass edits source files for the
length of one test run, and a tool acting on that mutation corrupts both the result and the tree.

## Common questions

**A mutation went in and the test stayed green - so the test is bad?** Not yet. A green run under
mutation has two causes that look identical: the test does not defend the claim, or the mutated code
never executed. A loud mutation separates them - replace the same line with an unconditional raise or
abort and re-run. Loud goes red, the verdict stands. Loud stays green and nothing about the test is
settled, because the code under it may not be running at all.

**Could the mutation have been silently ignored?** Yes, and it was measured while the skill was
written: a same-length edit saved inside the same filesystem-timestamp second as the previous run left
Python's compiled-bytecode entry valid, so the mutation never executed and the run stayed green - a
false condemnation of a test that in fact catches the bug. Clear the build or bytecode cache, confirm
the command imports the worktree rather than an installed copy, and re-run both mutations.

**Is my working tree safe while this runs?** The file is snapshotted by bytes outside the repo before
each mutation, git state is deliberately not used as the restore path (a stash or checkout in a tree
another agent shares reverts more than your mutation), one mutation is live at a time, and the revert
is shown with a byte comparison rather than assumed. Where the revert does not come clean the whole
audit stops and reports the source path, the snapshot path, and the restore command, since an audit
that leaves a mutation behind has manufactured the defect it came to find.

**It nominated 23 tests and mutated 6 - are the other 17 fine?** No, they are unproven in both
directions and the report says so. Mutation is the expensive step, so the pass nominates widely and
mutates the shortlist, and reporting the unmutated remainder as audited is the one way this pass
manufactures the false confidence it was called to remove.

**Isn't this already covered by the loop's own guard?** Partly. Loosening an assertion to turn a check
green is filed as a trap in this library's own trap record, and `/autonomous-loop` keeps a protect-set
so it will not be proposed. That guard only covers tests a loop was watching as it wrote them, which
is exactly why the ones that already landed need this sweep.

## It's working if

- Every condemned test arrives with the exact mutation that stayed green and the loud-mutation result
  beside it, rather than a note that the assertion looks weak
- A green verify command stops being read as done-evidence until the tests behind it have been broken
  on purpose
- The report states that the tree was clean after every mutation, and the suite returns to the result
  it started from
- Tests that never run at all - skipped, mismarked, or outside the runner's discovery - are named as
  such instead of counted among the passes
- Nothing gets repaired inside the pass: the findings arrive as work-items somebody chooses
