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
   grep for who actually uses it. Unused → the lazy fix is to remove it, not flesh it out.
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

Skip the performative acknowledgements - "you're absolutely right", "great catch", any thanks. The changed
code shows you heard the feedback. State the fix and move on. If you pushed back and turned out wrong, say
so plainly ("checked it - you're right, it does X; fixing") and continue, no long apology.

Critical and Important findings go back through the loop: fix, then re-review the new diff. Minor findings
and unresolved `⚠️ cannot verify` items are recorded through the memory contract for the end-of-branch pass
rather than blocking the current step.

Because a review can run several cycles, each finding carries a status the next cycle reads, not just a
fix. Track each one as **new** (first raised this cycle), **addressed** (fixed and gone), **persistent**
(raised again, still unfixed), **regressed** (was addressed, now failing again), or **reopened** (was
closed, a later change broke it). A regressed or reopened finding names the change that caused it - a fix
doesn't come undone silently. And a finding can't slide from *addressed* back to *new*: once it's marked
fixed it either stays gone or returns as regressed/reopened with its cause. A finding that simply vanishes
between cycles is a bookkeeping failure, not a pass. Carry this per-cycle status through the memory
contract (`.better-dev/bin/bd-mem`) so the next cycle and the end-of-branch pass both see it.

## Documented deviations, judged on merit

The claim-blind channels never see the worker's report, so a deviation is judged here, at reception,
where the report is read - never inside the review channels. An in-scope adaptation the worker hit a real
obstacle for and documented in its report is judged on merit, not reflex-blocked: keep it where the
adaptation serves the contract's intent and stays in scope. An equivalent change with no such note is
silent drift, and a finding. The merit is in the documenting, not in the deviating - an undocumented
adaptation, however sensible, still drifted the plan without saying so.
