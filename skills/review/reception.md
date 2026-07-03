# Answering a review

Distrust runs both ways. The reviewer didn't trust the report; the author shouldn't blind-implement the
findings either. A finding is a claim to evaluate against the code, not an order to carry out. Whoever acts
on the verdict — usually the fix worker — works through it like this:

1. **Read the whole verdict** before touching anything. Findings can be related; acting on half of a set is
   how a partial fix goes wrong.
2. **Check each finding against the code.** Is it right *for this codebase* — this stack, these versions,
   these constraints? Would the suggested change break something that currently works? Is there a reason the
   code is the way it is?
3. **Push back when a finding is wrong**, with technical reasoning and a pointer to the code or test that
   shows it — not defensiveness. If a finding is unclear, ask before implementing; a guess on an unclear
   item produces the wrong fix.
4. **YAGNI-check "do it properly" findings.** Before building out a feature a reviewer wants "done right",
   grep for who actually uses it. Unused → the lazy fix is to remove it, not flesh it out.
5. **Fix in order, one at a time, checking each.** Blocking issues first, then simple fixes, then the
   structural ones. Verify each fix before the next; don't batch them into one untested sweep.

Skip the performative acknowledgements — "you're absolutely right", "great catch", any thanks. The changed
code shows you heard the feedback. State the fix and move on. If you pushed back and turned out wrong, say
so plainly ("checked it — you're right, it does X; fixing") and continue, no long apology.

Critical and Important findings go back through the loop: fix, then re-review the new diff. Minor findings
and unresolved `⚠️ cannot verify` items are recorded through the memory contract for the end-of-branch pass
rather than blocking the current step.
