---
name: plan-grill
description: Use when a feature work-item is starting and its plan isn't yet watertight — before any implementation, to check the baseline, ideate and grill the design until decisions are settled, and pin the observable done-criteria the loop will drive to. For a bug fix, reach for /diagnose instead.
argument-hint: [feature-slug or rough intent]
---

# plan-grill — the feature front-end

Turn a rough feature intent into a plan grilled watertight, and emit a **done-contract** with
*observable* done-criteria the autonomous loop can drive to. One job: everything a feature needs
settled *before* code, and nothing the implementation loop already owns.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`). A project override —
a different spec location, a house planning style, a skipped phase — wins over anything below.

The flow is four steps behind one closing gate. Work from the feature worktree
(`/worktree-branching` sets it up); the contract lands in the shared ledger, described at the end.

## 1. Check the baseline before planning on it

A feature is built on assumptions — "X doesn't exist yet", "the flow works like Y and we'll extend
it". Grilling a false premise wastes the whole loop, so verify the premise at `file:line` first, in
one bounded observation pass. Locate the code path in the touched area, read what it does *today*,
and look for anything that already provides the capability.

Land on a verdict backed by receipts (`file:line`, a command run and its output). If the baseline
maps as assumed, proceed. If the capability **already exists**, or a core assumption is plainly
false, stop and reframe with the user rather than planning fiction — point at the evidence. For the
full premise-extraction, cost-ordered observation pass, verdict taxonomy, and receipts rule, read
`ground-truth.md`. This is observation, not debugging — no root-cause spiral.

## 2. Ideate — propose, then pick one to grill

If the intent is still rough, sketch two or three distinct ways to satisfy it — a sentence each,
with the trade-off that separates them — and let the user pick one (or blend). Skip this when the
user already arrives with a specific design; grilling *is* the work then. The point is to enter the
grill with one candidate design, not a blank page.

## 3. Grill — one question at a time

Interview the design down every branch of its decision tree, resolving dependencies between
decisions one by one, until you and the user share the same understanding.

- **One question, then wait.** A wall of questions is bewildering; ask, get the answer, ask the
  next. Order them so a decision that unblocks others comes first.
- **Carry a recommended answer.** Every question ships with the answer you'd pick and why — the user
  corrects a default faster than they fill a blank.
- **Explore before asking.** If the codebase can settle a question, go read it instead of spending
  the user's attention — this is where premise-checking pays off again.
- **Confirm as each decision locks.** When a decision settles, reflect it back in a line and move on
  once it holds. If a decision reads like a standing policy for this project (a convention, not a
  one-off), offer to persist it — "make this the default here?" — and on a yes record it with
  `.better-dev/bin/bd-mem persist-override "<line>"`. Don't persist transient facts.

## 4. Capture the done-contract

Synthesize what the grill settled — no fresh interview, just write down what you already know. The
contract's spine is its **done-criteria**: each one is a *runnable check* (a command or test) plus
the **seam** it attaches to, phrased so it is red now and goes green exactly when the criterion is
met. "Done" is a check going green, never a claim — this is what the loop drives to and refuses to
fake. Prefer an existing seam, use the highest one that observes the behavior, and keep the count
low; check the seams with the user before locking them.

Give the goal one clear shape (a capability, an end-state, an invariant, or a removal) so its proof
is obvious. Keep file paths and code snippets out of the prose — they go stale — with one exception:
inline a small prototype-derived type, schema, or state-machine when it pins a decision more
precisely than words. For the full template (problem, goal shape, user stories, done-criteria,
implementation decisions, out-of-scope) read `done-contract.md`.

## Close the gate, then hand off

Present the contract and wait for the user's confirmation before treating the plan as locked —
nothing downstream should run on an un-agreed contract. If a question can't be settled and blocks
the plan, that's a `NEEDS_INPUT` state, not a guess: record it and stop rather than inventing an
answer.

Write the contract to the **primary checkout's** shared ledger so every worktree sees it. Resolve the
item's ledger directory with `.better-dev/bin/bd-mem ledger dir <work-item>` — it returns the
primary-checkout path even when you run it from a feature worktree — and write `contract.md` there.
Then hand the work-item to `/autonomous-loop`, which drives the done-criteria red-to-green.

If `/domain-modeling` is installed and the feature turns on domain vocabulary, run the grill through
it so glossary terms and decision records get written as they crystallize — optional, not required.
