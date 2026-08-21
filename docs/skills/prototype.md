# /prototype

## What it does

Settles one decision by building something throwaway instead of arguing about it, then throws the
build away. The defining constraint is at both ends: it refuses to start without a named decision and
a written answer condition, and it refuses to let the code survive the run - the verdict, the
discarded directions, and at most one decision-pinning snippet cross into the real work, and
everything else is deleted or parked on a throwaway branch. A beautiful variant set with the decision
still open is a failed run, not a good one.

## When to reach for it

| Situation | Route |
|---|---|
| Competing options that read identically once written down | `/prototype` |
| "Show me a few versions before I commit", "mock it up first" | `/prototype` |
| A state model or data shape that looks fine on paper and needs its awkward cases pushed through | `/prototype` |
| A grill question a fourth paraphrase has not moved | `/prototype` |
| "Let's see what it could look like", with no direction stated yet | `/design-brief` first, then return with the direction as a constraint |
| "Prototype the whole app so we can demo it" | `/groundwork`, or `/gauntlet` if the ask is really a built demo |
| Writing the plan, or building the real thing | `/plan-grill`, then `/autonomous-loop` |

Once the decision is named, the run forks once: a question about how something should look produces
several structurally different variants rendered on a real route with real data; a question about
whether a logic, state model, or data shape holds up produces one self-contained page over a pure
module with the full state rendered after every click.

## Where it fits

Called by the skills that get stuck, never a front-end of its own. `/design-brief` enters it when
candidate directions stop separating on description alone, `/plan-grill` at the point where a decision
about behaviour needs a concrete artifact to react to, `/groundwork` for a foundation shape with
several viable forms. The verdict lands in the work-item's own record, and the stage that picks the
decision up re-reads that record rather than trusting the prototype run's summary.

## Prerequisites

A named decision, a written condition for when it is answered, and an owner for the answer. A
prototype with nothing riding on it is a side project that absorbs a day and produces a demo, so
"we'll know it when we see it" is turned back into an answer condition before anything is built.

## Common questions

**Can we just ship the winning variant?** No. It was written with no tests, no error handling, and no
abstractions, so the winner is rewritten properly when it is folded in. Promoting variant code
directly is how throwaway code becomes production without anyone deciding that it should. The one
exception is the logic branch's pure module, which was written to be liftable - the shell around it
still goes.

**The three variants came back looking the same.** That is the common failure and the bar is
structural: different layout, different information hierarchy, different primary affordance, not
different colours. The fix is to regenerate one with an explicit prohibition ("do not use a card
grid") rather than to iterate the set. The logic branch has the same bar and forgets it more often -
three reducers over the same state tree are one candidate, not three.

**I want B's header with C's sidebar - is that a failed round?** That is the expected and most useful
feedback, and it is the actual design being asked for. Each round closes as one winner plus a written
line per losing variant saying what it did better and why it still lost, and those lines are folded
into the winner before the next round starts.

**Where does the variant set go, so a week of work is not lost?** Where re-deriving it would cost real
time, the full set is committed onto a throwaway prototype branch off the integration branch and the
branch pointer is recorded beside the verdict. What never happens is leaving variant components and a
switcher in the main line, which rot fast and confuse the next reader.

## It's working if

- A decision that had survived three paraphrases ends with one recorded verdict naming which option
  won and why
- Each losing variant leaves a line behind saying what it did better, so a killed direction is not
  re-proposed next round
- The variants are judged inside the real surrounding surface, with real data and real density, rather
  than alone on a blank route
- The working tree carries no prototype code once the run ends, and the switcher never reaches a
  production build
- The stage that picks the decision up can find the verdict in the record without asking whoever ran
  the prototype
