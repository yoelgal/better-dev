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
| A bare decode with no build ask behind it | lands here, and that is now its own front door rather than a collision |

## Where it fits

`/plan-grill` step 0 enters it whenever the intent arrives as relayed language, and returns with its
artifact: the quoted brief lands in the contract above `## Problem`, the problem sentence and two scope
lines seed Problem, Goal and Out-of-scope, and the trigger's factual claims become premises for the
baseline check. `/diagnose`'s symptom-only gate enters it too, for a report whose claimed-actual is only
an adjective with no event and no artifact behind it. `/groundwork`'s lean grill enters it where an epic
arrives as somebody else's words.

Adopted 2026-08-17 by operator ruling, as a clean cutover: `skills/plan-grill/brief-decode.md` was
deleted in the same change, so the six decode moves live here and nowhere else. That reverses D15, which
had adopted the capability as plan-grill step 0 plus that sibling and named the skill form as examined
and rejected. What changed since D15 is a second consumer: `/diagnose` needs the same decode for an
adjective-only report and cannot reach into another skill's files, and the authoring standard forbids it
from trying.

## Prerequisites

Nothing. Three skills hand it a brief, and it also fires on a bare decode ask with no build behind it,
which is the case that has no other home: three of the five decode outcomes are not features at all.

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
