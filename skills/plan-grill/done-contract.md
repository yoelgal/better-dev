# The done-contract

Step 4 of plan-grill in full. This is the artifact the whole flow exists to produce: a synthesis of
the grilled conversation into something the autonomous loop can drive to and prove. No fresh
interview — write down what the grill already settled.

Its center of gravity is the **done-criteria**. Everything else frames them.

## Done-criteria — the observable part

Each criterion is a check that can run, not a sentence to nod at:

- a **runnable check** — a command or a test — that is **red now** and turns **green exactly when**
  the criterion is met,
- the **seam** it attaches to — the point in the system where the behavior is observed.

Rules for the seam:

- Prefer an existing seam to a new one; a feature that needs no new seam is the good case.
- Use the **highest** seam that still observes the behavior — an end-to-end or API-level check over a
  unit poke at internals, so the check survives refactors.
- Keep the count low; the ideal is one. More seams is more to maintain and more to go stale.
- Check the seams with the user before locking them — a seam mismatch here misdirects the loop.

"Done" is a check going green. Never a claim, never "until it looks right." The loop reads these,
drives them red-to-green, and refuses to mark done what it can't prove.

### Right-size the criteria

Aim for the smallest set that proves the goal — one per distinct property the goal claims, not a
coverage quota. Run one self-check on each candidate: *would removing this miss a property the goal
claims?* If no, drop it — it's redundant with another criterion or it's checking a path the goal never
promised.

An **absence or removal** criterion has no runtime observable, so its check is a source-level predicate,
and the craft is in the predicate. Negate a grep so success means the thing is gone —
`! grep -n '<symbol>' -- <touched dirs>`, exit 0 = no matches = satisfied. Scope the paths to the
directories the change touches, so an unrelated hit elsewhere doesn't fail the check. Keep it read-only;
a predicate observes, it never mutates. Name the symbol or path, not "cleaned up".

### How the criteria prove the goal

Under the criteria, write a ≤2-sentence line tying the set back to the goal's end-state — *these checks,
green, mean the goal holds because …*. It's the join between the criteria and the goal, not a
restatement of each check. Its real work is negative: a goal that no criterion covers surfaces here as a
sentence you find you can't honestly write.

## Goal shape

Give the feature's goal one clear phrasing so its proof is obvious:

- **Capability** — the system will support `<X>`.
- **End-state** — `<Y>` will be the new state of `<subsystem>`.
- **Invariant** — `<Z>` will always hold for `<entity>`.
- **Removal** — `<deprecated thing>` will no longer be reachable.

Not "refactor X" (a task), not "add tests" (a means), not "fix the bug" (no specificity). Behavioral
shapes prove out through runnable checks; a removal or a structural fact proves through a
source-level predicate (a `grep`, a build check).

### Scope cap — at most three committed goals

A contract commits to a small goal set: one main goal plus at most two secondary end-states, three in
all. Past that, the change is too large to review as one unit and its criteria sprawl beyond what a
reviewer can hold in their head. When the grill surfaces a fourth committed goal, halt *before any code*
and split into focused work items — each its own contract, worktree, and PR — rather than carrying a
contract nobody can review whole. Out-of-scope items don't count against the cap; they're the explicit
record of what this feature won't do.

## Template

```markdown
# Done-contract — <work-item>

## Problem
<the problem, from the user's perspective>

## Solution
<the solution, from the user's perspective>

## Goal
The main goal in one shape (capability / end-state / invariant / removal), plus any secondary
committed end-states — at most three in all (see scope cap).

## User stories
A long, numbered list. Each: As a <actor>, I want <feature>, so that <benefit>.
Cover the feature's aspects extensively.

## Done-criteria
For each, a runnable check + its seam + red-now/green-when:
- [ ] <criterion> — check: `<command or test>` at seam `<where>`; red now, green when <condition>.

How these prove the goal: <≤2 sentences tying the criteria set back to the goal's end-state>.

## Implementation decisions
Modules touched, interfaces, schema/API contracts, architectural calls, clarifications from the
grill. No file paths or code snippets — they go stale. Exception: inline a small prototype-derived
type, schema, reducer, or state-machine when it pins a decision more precisely than prose; note it
came from a prototype and trim to the decision.

## Out of scope
What this feature deliberately does not do.

## Open concerns
Anything unresolved. If one blocks the plan, the state is NEEDS_INPUT — stop, don't guess.

## Ground truth
Verdict from the baseline check + link to ground-truth.md.
```

## Approval is pinned to the contract's content

When the user confirms the contract, pin the approval to its bytes with
`.better-dev/bin/bd-mem ledger approve <work-item>` — it records a content hash of `contract.md` beside
the ledger entry. The approval attaches to *that text*, not to the bare fact that an approval once
happened. Before it drives, the loop runs `.better-dev/bin/bd-mem ledger check-approval <work-item>`
(exit 0 = still approved). If the contract was later edited — a criterion reworded, a goal added, a seam
moved — the hash no longer matches, the check fails, and the approval gate re-opens: the loop reads the
plan as un-agreed again and waits for a fresh confirmation. So it never advances on a silently-changed,
stale sign-off.

## Optional: hand to a slice breakdown

At the planning/implementation boundary the plan can be cut into vertical-slice work-items — each a
thin path through every layer, demoable on its own, prefactoring first. If you do, present the slices
numbered with their blockers and the user stories each covers, and iterate until the user approves
the granularity and dependencies. This decomposition may equally belong to the implementation loop;
it's optional here, not part of locking the contract.
