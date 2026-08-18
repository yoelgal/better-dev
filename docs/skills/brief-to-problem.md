# /brief-to-problem

## What it does

**Authored, not adopted, and not wired: no skill in the chain routes into it, and the capability it
holds ships today as `/plan-grill`'s step 0 instead. Its description is live, so a bare ask to decode a
brief can still land here, which is why this page opens with the status rather than with the practice.**
What it does, when a session does land on it: decodes somebody else's words - relayed feedback, a quoted
ticket, a pasted message, a brief that names an artifact as if it were the requirement - into one
measurable problem sentence, a line for what is in scope, a line for what is not, and the questions the
decode could not close. Its defining constraint is that nothing about the solution is decided: the run
ends at the problem sentence, and a decode that finishes with a draft sentence and five honest questions
is a complete run rather than a failed one.

## When to reach for it

The adopted path first, because it is the one the rest of the chain enters:

| Situation | Route |
|---|---|
| A relayed brief, and a plan is what you want next | `/plan-grill` - its step 0 is the adopted decode |
| A bug report that arrived as an adjective with no event behind it | `/diagnose` - the trigger event has to be recovered before a reproduction can be picked |
| First-person intent the operator owns ("I want to add X") | `/plan-grill` - no decode is owed; interrogating the design is the grill's job |
| A link rather than a brief | `/source-harvest` first - a link is not a brief until the text is captured |
| A bare decode with no build ask behind it | may land here on its description alone; read the status above before running it |

## Where it fits

It does not, yet. D15 adopted this capability as `/plan-grill` step 0 plus that skill's own
`brief-decode.md` sibling, and the same ruling names it as examined and rejected in its own right, so no
skill points here. D39 records the open operator call: adopt this skill as a clean cutover and delete the
sibling file, justified by a second consumer that did not exist at D15 (`/diagnose` needs the same decode
for an adjective-only report and cannot reach into another skill's files), or keep D15 and delete this
skill with one sentence inlined at `/diagnose`'s symptom-only gate. Overturning a user-ratified ruling is
the operator's call, and this page does not argue it.

## Prerequisites

Nothing wires it, so nothing hands it a brief. Read this page's status before running it: doing so beside
`/plan-grill` step 0 decodes the same brief twice, which is the one concrete cost of the current state.

## Common questions

**Is it live?** Its text ships and its description is in the live catalogue, so a natural-language ask to
decode a brief can route here - checked against that catalogue, not assumed. What does not exist is any
pointer into it from another skill, and the ruling that adopted the capability put it inside
`/plan-grill` as step 0. So it runs if you land on it, and nothing plans around it.

**Which should I read, this or `/plan-grill` step 0?** Step 0, for anything you intend to build. The two
hold the same practice, and step 0 is the one the chain enters on its own.

**So what is the open call really about?** One decode with two consumers. Step 0 lives inside
`/plan-grill`, and a bug report that arrives as an adjective needs the same decode on the way into
`/diagnose`, which cannot read another skill's sibling file. That is the argument for a skill; the
argument against is D15's own ruling that a decode step is not a skill. Both are recorded rather than
resolved.

**Does having both cost anything today?** Two live descriptions claim the same trigger, so which one a
given phrasing reaches is not stable, and the same brief can get decoded twice. That is the cost the open
call closes either way it goes.

## It's working if

- A relayed brief that arrives with a build ask gets decoded on the way into the plan, rather than here
- A reader who lands here, by name or by a bare decode ask, learns from the first line that it is not
  adopted, instead of running it as though it were
- The same brief does not get decoded twice, once here and once inside the plan
