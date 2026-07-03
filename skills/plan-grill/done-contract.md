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

## Goal shape

Give the feature's goal one clear phrasing so its proof is obvious:

- **Capability** — the system will support `<X>`.
- **End-state** — `<Y>` will be the new state of `<subsystem>`.
- **Invariant** — `<Z>` will always hold for `<entity>`.
- **Removal** — `<deprecated thing>` will no longer be reachable.

Not "refactor X" (a task), not "add tests" (a means), not "fix the bug" (no specificity). Behavioral
shapes prove out through runnable checks; a removal or a structural fact proves through a
source-level predicate (a `grep`, a build check).

## Template

```markdown
# Done-contract — <work-item>

## Problem
<the problem, from the user's perspective>

## Solution
<the solution, from the user's perspective>

## Goal
<one shape: capability / end-state / invariant / removal>

## User stories
A long, numbered list. Each: As a <actor>, I want <feature>, so that <benefit>.
Cover the feature's aspects extensively.

## Done-criteria
For each, a runnable check + its seam + red-now/green-when:
- [ ] <criterion> — check: `<command or test>` at seam `<where>`; red now, green when <condition>.

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

## Optional: hand to a slice breakdown

At the planning/implementation boundary the plan can be cut into vertical-slice work-items — each a
thin path through every layer, demoable on its own, prefactoring first. If you do, present the slices
numbered with their blockers and the user stories each covers, and iterate until the user approves
the granularity and dependencies. This decomposition may equally belong to the implementation loop;
it's optional here, not part of locking the contract.
