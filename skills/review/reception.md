# Answering a review

Distrust runs both ways. The reviewer judged the diff without the author's account; the author shouldn't
blind-implement the findings either. A finding is a claim to evaluate against the code, not an order to
carry out. Whoever acts
on the verdict - usually the fix worker - works through it like this:

1. **Read the whole verdict** before touching anything. Findings can be related; acting on half of a set is
   how a partial fix goes wrong.
2. **Check each finding against the code.** Is it right *for this codebase* - this stack, these versions,
   these constraints? Would the suggested change break something that currently works? Is there a reason the
   code is the way it is?
3. **Push back when a finding is wrong**, with technical reasoning and a pointer to the code or test that
   shows it - not defensiveness. If a finding is unclear, ask before implementing; a guess on an unclear
   item produces the wrong fix.
4. **YAGNI-check "do it properly" findings.** Before building out a feature a reviewer wants "done right",
   grep for who actually uses it. Unused → the lazy fix is to remove it, not flesh it out. The same check
   covers guard-shaped findings: before a fix adds a guard, a secret, a mandatory input, or a config knob,
   check whether removing or redesigning the guarded thing deletes the question outright - a design that
   needs no secret beats a well-guarded secret, and the smaller correct fix may sit upstream of the finding.
5. **Quarantine out-of-scope suggestions.** A finding whose fix would reach outside this change's diff -
   a sibling module's bug, an unrelated refactor, a follow-up someone wants bundled in - doesn't go in the
   numbered fix list. Park it in a separate proposals section, one line each, framed as a yes/no for
   whoever owns scope. Widening the diff to chase it is how a focused change sprawls into an unreviewable
   one.
6. **Fix in smallest-blocking-set order, one at a time, checking each.** The verdict leads with the one
   fix that clears the most findings - several often trace back to a single wrong seam, so make that fix
   first and watch how many it retires, rather than working a severity-sorted list top to bottom. Then the
   remaining blockers, the simple fixes, the structural ones. Verify each fix before the next; don't batch
   them into one untested sweep.

## Accept or rebut - one disposition per blocking finding

Steps 2-3 are an obligation, not a permission: every finding, Minor included, ends the fix pass with
exactly one written disposition - no third state, and silence is not a disposition:

| Finding | Disposition | Fix or reason |
|---|---|---|
| its `file:line` | `ACCEPTED` / `REBUTTED` | the hunk or commit that answers it, or one line of technical reasoning plus the code or test that shows it |

A finding with no row is `persistent` at re-review and re-blocks - it never just fades out of the
conversation. And acceptance is a change, not a sentence: re-review checks each `ACCEPTED` row against
the new diff, and an accepted finding whose cited seam the new diff never touches is itself a new
finding, not a pass. Record the table through the memory contract alongside the per-cycle statuses
below, so the next cycle reads dispositions, not vibes.

Skip the performative acknowledgements - "you're absolutely right", "great catch", any thanks. The changed
code shows you heard the feedback. State the fix and move on. If you pushed back and turned out wrong, say
so plainly ("checked it - you're right, it does X; fixing") and continue, no long apology.

Findings of every tier go back through the loop: fix, then re-review the new diff - Minor lands last in
fix order but never defers past the settle. A Minor-only round earns the scoped fix-confirm re-review
`/review` step 5 defines; this table is its input either way. Only reviewer-accepted `REBUTTED` rows and unresolved
`⚠️ cannot verify` items are recorded through the memory contract for the end-of-branch pass; a fixable
finding never waits there.

Because a review can run several cycles, each finding carries a status the next cycle reads, not just a
fix. Track each one as **new** (first raised this cycle), **addressed** (fixed and gone), **persistent**
(raised again, still unfixed), **regressed** (was addressed, now failing again), or **reopened** (was
closed, a later change broke it). A regressed or reopened finding names the change that caused it - a fix
doesn't come undone silently. And a finding can't slide from *addressed* back to *new*: once it's marked
fixed it either stays gone or returns as regressed/reopened with its cause. A finding that simply vanishes
between cycles is a bookkeeping failure, not a pass. Carry this per-cycle status through the memory
contract (`.better-dev/bin/bd-mem`) so the next cycle and the end-of-branch pass both see it.

When reception overturns a grading, that is a calibration event, not just a fix: a finding the reviewer
demoted to `⚠️` or Minor that proves out as a real Critical or Important, or a `REBUTTED` row later shown
right. Record the corrected pattern -
`.better-dev/bin/bd-mem learn "<pattern> - graded low at review, confirmed real" <confidence 0..1>
"<recall key>"` - so the next review grades it on sight instead of relearning the doubt.

## Documented deviations, judged on merit

The claim-blind channels never see the worker's report, so a deviation is judged here, at reception,
where the report is read - never inside the review channels. An in-scope adaptation the worker hit a real
obstacle for and documented in its report is judged on merit, not reflex-blocked: keep it where the
adaptation serves the contract's intent and stays in scope. An equivalent change with no such note is
silent drift, and a finding. The merit is in the documenting, not in the deviating - an undocumented
adaptation, however sensible, still drifted the plan without saying so. The Spec channel's per-criterion
table feeds this judgment: a `CHANGED` row names a goal met by different means than the plan described -
match it against the worker's documented note and judge it by the same merit test.
