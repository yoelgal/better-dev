---
name: test-audit
description: Use when a passing test suite has to be checked for whether it defends the behaviour it claims - a standing false-confidence pass over a repo or one area, a green verify command about to be trusted as done-criteria evidence, one suspect test that may be passing on a mock or a vacuous setup, a suite where some tests may never run at all, or a high coverage number sitting next to bugs that keep shipping. It writes no tests and raises no coverage - for a failing test go to /diagnose, for a diff's verdict /review.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Edit
---

# Audit tests for false confidence

One job: **find the tests that pass without defending what they claim, and prove each one by breaking the
code under it.** Not writing tests, not repairing what this pass condemns, not reading the diff
(`/review`).

Coverage is the number this skill exists to distrust. It records that a line executed, never that a wrong
line would turn the suite red, so a suite at 90% coverage with vacuous assertions is 90% of nothing. Never
take a coverage figure as evidence here, and never finish a pass having raised one instead of settling a
test.

Honor this project's recorded decisions - from your harness's durable memory where you have it,
otherwise from the brief you were given (see `/overrides`). A suite always excluded, or a runner
invocation this repo pins, wins over anything below.

## The spine: mutate the code, watch the test

Every lens further down only nominates candidates. One check settles them, and it is observable rather
than argued: break the behaviour the test names, run that test, and see whether it goes red. A test that
reads correct is an argument that it works, and an argument is what this pass refuses - the rule PostHog's
review write-up states as "Don't accept an argument that the code works when you can watch it work".

Per candidate, in order:

1. **Green alone.** Run only that test, by name, and record the command with its exit 0. A candidate
   already red is not a candidate: it is a red signal, triaged by `/autonomous-loop`'s three kinds, and
   this pass leaves it alone.
2. **Snapshot the file** you are about to mutate, by bytes, outside the repo:
   `snap="$(mktemp -d)/$(basename <file>)"; cp <file> "$snap"`. Bytes rather than git state, because
   `git stash` or `git checkout --` in a tree another agent shares reverts more than your mutation.
3. **Mutate the one behaviour the test names.** Invert the comparison, return a wrong constant, drop the
   side effect, move the boundary by one. One file, one behaviour: a mutation elsewhere in the file proves
   nothing about this test.
4. **Re-run the same command.** Red is `CAUGHT`. Only this test's own result counts - a mutation that
   reddens four neighbours while this one stays green is not a catch borrowed from the suite.
5. **On green, prove the mutation ran before calling it `MISSED`.** A green run under mutation has two
   causes and they look identical: the test does not defend the claim, or the mutated code never
   executed. Separate them with a loud mutation - replace the same line with an unconditional raise,
   panic, or abort - and re-run. Loud goes red: the mutation reaches the test, so the step 4 verdict
   stands as `MISSED`, with the mutation's exact text as the evidence, recorded as the diff rather than
   as a description of it. Loud stays green: the verdict is `NOT REACHED` and nothing about the test is
   settled yet.
6. **Revert and prove it.** Copy the snapshot back, show `cmp -s <file> "$snap"` exits 0, then re-run the
   test and watch it return to the step 1 result. A revert is shown, never assumed.
7. **One mutation live at a time.** Nothing commits while one is live, and a pass that has to stop early
   reverts before it stops.

`NOT REACHED` splits again, and the first cause is mechanical rather than interesting: a runtime that
caches a compiled artifact keyed on the source's timestamp and size can serve the pre-mutation build
back. Measured while this skill was written: a same-length edit saved inside the same filesystem-mtime
second as the previous run left Python's `__pycache__` entry valid, so the mutation never executed and
the run stayed green - a `MISSED` verdict for a test that in fact catches the bug. Clear the build or
bytecode cache, confirm the command imports this worktree rather than an installed copy, and re-run
both mutations. When the loud mutation still stays green on a clean cache, the test does not execute the
code it claims to test at all, which is the finding - file it under whichever lens nominated it, never
as a `CAUGHT`.

**When the revert does not come clean** - `cmp` disagrees, the file will not write back, or the re-run
does not return to its step 1 result - stop the whole audit there. Report the source path, the snapshot
path, and the restore command (`cp "$snap" <file>`), and nominate nothing further: an audit that leaves a
mutation in the tree has manufactured the exact defect it came to find. A resumed run's first act is that
same check over any snapshot directory a previous run left behind.

Two conditions before the first mutation: run in the work-item's worktree rather than the primary checkout
(`/worktree-branching` owns it), and stop any watcher, dev server, or auto-format-on-save that would act
on a mutation meant to live for one test run.

Mutation is the expensive step, so nominate widely and mutate the shortlist the lenses rank highest. Say
how many of the nominated set you actually mutated. Nominations you did not mutate are unproven in both
directions, and reporting them as audited is the one way this pass manufactures the false confidence it
was called to remove.

## The lenses that nominate

Each row is a tell you can grep or read for, not a judgement about quality. A nomination is a hypothesis;
the mutation is the verdict.

| Lens | The tell | Settled by |
|---|---|---|
| **Mock-shaped assertion** | the asserted value is one the test itself configured on a double (a `return_value`, a stub literal that reappears in the assertion), or the only assertion is that a call happened | mutating the real implementation the double stands in for: a test that never reaches it stays green |
| **Vacuous setup** | the assertion's subject is empty or default at assert time - `assert errors == []` where nothing appends, a loop asserting over a collection the fixture left empty | mutation, plus one run asserting the subject is non-empty before the claim is made about it |
| **Swallowed failure** | a `try` around the assertion, a bare `except`/`rescue`, a soft or logged assert, an early `return` above the assertion, an assertion inside a branch the run never enters | mutation: a swallowing test stays green under every break |
| **Tautology** | the expected side is computed by the code under test, or duplicates its expression verbatim | mutation moves both sides together and the test stays green |
| **Unreachable subject** | the only callers of the symbol under test are tests (the `lsp` tool with `action: references` on the symbol, then grep it across non-test paths) | no mutation: a green test over code production never reaches proves nothing about production, the same defect class as a security finding with no proof of reachability (`/security-pass` owns that gate) |
| **Narrowed to pass** | history rather than current bytes - `git log -p -- <test-file>` shows an assertion loosened (an equality to a truthiness, an exact match to a substring, a deleted case) in the commit that turned the check green | reading that commit pair, then mutating against the assertion as it now stands |
| **Never collected** | the runner's collected list is shorter than the declarations in the tree - a skip or permanent xfail marker, a name outside the runner's discovery pattern, a path excluded in config, a directory no runner root covers | diffing the runner's collection output against the declarations: a test that does not run cannot be mutated into redness |

Two of these settle with no mutation at all - **Unreachable subject** and **Never collected** - so run them
across the whole scope first, before spending a single mutation.

**Narrowed to pass** is the lens this library already pays for. `docs/TRAPS.md` trap 1 is exactly that
edit, and `/autonomous-loop` keeps a protect-set to stop it being proposed. That guard only covers tests a
loop was watching as it wrote them, so this pass is where the ones that already landed get found.

## What the run returns

One table, plus the two lists a table row cannot carry:

```
## Test audit - billing/, 2026-08-18

Scope: 214 test declarations under tests/billing/. Collected by the runner: 209.
Nominated: 23. Mutated: 6. CAUGHT 3 | MISSED 2 | NOT REACHED 1 | tree clean after every mutation: yes

| Test | Claim it makes | Lens | Mutation applied | Verdict |
|---|---|---|---|---|
| tests/billing/test_invoice.py::test_total_matches_lines | invoice total equals the sum of its line items | tautology | `Invoice.total` returns `sum(lines) + 1`; loud raise went red | MISSED |
| tests/billing/test_dunning.py::test_retry_stops_after_three | the retry loop stops after 3 attempts | vacuous setup | `MAX_RETRIES = 3` -> `99`; loud raise went red | MISSED |
| tests/billing/test_tax.py::test_vat_applied | VAT is added for EU addresses | mock-shaped | `apply_vat` returns the untaxed amount | CAUGHT |
| tests/billing/test_ledger.py::test_posting_balances | a posting leaves the ledger balanced | mock-shaped | loud raise in `Ledger.post` stayed green on a cleared cache | NOT REACHED |

Never collected (no mutation possible):
- tests/billing/test_refunds.py - 5 tests behind @pytest.mark.skip("flaky"), skipped since 2026-03-02.

Nominated, not mutated (unproven either way): 17 - listed with their lens in the appendix.
```

Every `MISSED` row carries the mutation verbatim and the loud-mutation result beside it, because that
pair is the finding. A row saying "assertion looks weak" without them is a nomination that never got
settled and belongs in the unproven list.

## The handoff

Each `MISSED` row is one work-item for the human to pick, not a repair to make here. This pass does not
edit the test it condemned: a pass that fixes its own findings is grading its own work, and the
independent read is the only thing that made the finding worth anything. Hand the table over and stop.

The receiving stage (`/plan-grill` for the fix's contract, then `/autonomous-loop`) confirms two things
before it builds: every `MISSED` row carries its mutation and its loud-mutation result, and the
tree-clean line reads yes. It re-reads this table rather than a summary of it. A row missing either
stops the handoff and goes back as a nomination, since a test repaired against a description of its
weakness is the next pass's `MISSED`.

Close out at the end of a pass: record the one reusable line durably (see `/overrides`) - a recurring shape
such as "this repo's service tests assert on the fixture's own doubles" - or write an explicit
`no durable lesson` line saying why. A count of what this run found is a receipt, not a lesson.

## Composability

This skill adds one lens and reimplements nothing: `/codebase-audit` ranks a whole repo and can carry a
`MISSED` row into its table, `/review` judges a diff, and `/autonomous-loop` owns the per-test negative
control for tests it authors mid-flight while this pass is the standing sweep over the tests already in
the tree. When revising this skill, follow `/writing-skills`.
