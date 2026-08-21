# /groundwork

## What it does

Groundwork takes a greenfield idea or a large new epic to the point where parallel feature work can
start safely: it designs the minimum shared substrate the first wave of features would collide on,
lands that substrate first, then cuts everything else into disjoint work-items sized for N worktrees
to build at once. Its defining constraint is what it refuses to do: it never builds a feature itself,
even one the session judges obvious mid-carve - every carved item is handed down to `/plan-grill` or
`/diagnose` and driven by `/autonomous-loop` in its own worktree, and the carve is a draft until the
user has seen the full list and approved it, never a design the session judged clean enough to skip
confirming.

## When to reach for it

- A greenfield product or a large new area/epic, before any single feature is grilled.
- An existing epic whose carve is already in the ledger, to check in on progress or carve the next
  wave.

Near-neighbours: one feature on its own goes to `/plan-grill` directly - groundwork over a single
work-item is ceremony. A bug or regression goes to `/diagnose`. Groundwork itself asks one early fork
on a greenfield build: steered (this skill's route - foundation, then carved items, reviewed one at a
time) or one-shot (`/gauntlet` - a single loop prompt handed to a fresh session that then builds for
hours largely unattended). A recorded override or a user who already named a route by name skips the
ask.

## Where it fits

It sits above `/plan-grill` in the chain, after `/onboard` has wired the tool and the branching
base. Its lean built-in grill (used when `/plan-grill`'s composables are absent) batches questions
into small rounds by settled prerequisites - the same rhythm, and the same guards, the plan-grill
page describes. The foundation it designs goes through the normal pipeline as the epic's first
work-item - its own worktree, grilled, driven by the loop, merged - before any carved item bases off
it. Each carved item then goes down its own front-end (`/plan-grill` or `/diagnose`) into
`/autonomous-loop` and `/pr-and-verify`, same as any other work-item; groundwork's job ends at the
handoff.

## Prerequisites

`/onboard` has already wired the tool and the branching base in this repo - groundwork runs after
that, not before.

## Common questions

**Why does it ask me steered-vs-one-shot in three lines instead of laying out both options in full?**
An operator handed a longer, labelled version of the same fork once and answered with "A, and stop
asking me to pick things" - the fork now fires as one plain question naming the cost to your attention
in each route, nothing more.

**I told it to just build the obvious feature while we were mid-carve - why didn't it?** The pull to
start building one item is treated as the signal the carve has reached its edge, not a shortcut:
groundwork names the pull out loud, keeps the item as a carved work-item, and routes it through its own
front-end after the carve gate - no feature code gets written inside a groundwork session.

**Why does it print the whole carve instead of a one-line summary before asking me to approve it?**
An approval on a summary line, a ledger entry, or a file you haven't opened is not an approval on the
carve - it's a guess from the question's own framing. The full work-item list (owns, depends-on, base,
wave) is rendered as message text before or alongside the approval ask, every time, even when the carve
looks obviously clean.

**I pasted a rich brief - does groundwork skip asking me things it can already infer?** No. A brief can
seed an answer, and a seeded answer is recorded as decoded with the line it came from, but silence in
the brief is never transcribed as something you stated knowingly. What no line in the brief supports
stays a question groundwork asks you directly.

## It's working if

- The foundation merges to the integration branch before any carved item's worktree opens, and a fresh
  checkout of it builds and its pipeline runs green.
- The carve you approved appears in full - owns, depends-on, base, wave per item - as message text
  before the approval question, not folded into the question's own summary.
- Re-entering an epic already underway opens with one line per carved item's state before anything
  else, rather than restarting the carve from scratch.
- A wide mechanical change (a rename that touches every caller) shows up in the carve as separate
  expand / migrate-batch / contract items, never as one item expected to go green in a single slice.
