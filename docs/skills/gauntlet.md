# /gauntlet

## What it does

Turns a rough greenfield idea into one paste-ready prompt for a Gauntlet Loop - a long,
unattended, builder-critic run in a fresh session that chases a real reference until a human
calls it. This skill never builds the thing: it grills the idea until goal, bar, fences, harness,
stop condition, progress surface, and blast radius are all settled, writes the handoff prompt, and
stops. If the conversation drifts toward building here instead, that is the one outcome the skill
refuses - a gauntlet run inside a half-spent session loses the fresh-context advantage the method
depends on.

## When to reach for it

Reach for it on "gauntlet this", "one-shot the whole thing", or "write me a prompt to build X in a
fresh session against a real bar" - and when a front-end offers the gauntlet route on a greenfield
ask and you take it. It is for a whole build run graded against a bar, not for incremental work in
a codebase that already exists: a single feature there is `/plan-grill`, a whole new app or epic
that needs a shared foundation first is `/groundwork`.

## Where it fits

Sits upstream of everything else in the chain: its output is a prompt for a *different*, fresh
session, not a work-item this repo's loop drives. Once that run lands code, the first work-item
against it is a review pass through `/autonomous-loop`, not a feature - the bar rows from the
prompt become that review's done-criteria.

## Common questions

**I don't have a real bar, just "make it good" - what happens?** An adjective is rejected as a bar
outright. The skill either extracts a concrete comp or measurement from you in conversation, or
writes bar-finding into the prompt as the run's own first task, so the handoff never ships with a
vague target standing in for a real one.

**My bar is a folder of screenshots of a competitor - does that cover the whole app?** Only the
axes those screenshots actually show. A visual comp does not grade an importer, a schema, or a
sync job; each of those needs its own row, and any axis you genuinely don't want graded is written
down as `none, deliberate` rather than left silent. The same scoping applies when your product is
meant to differ from the comp on purpose: that difference is written as a named delta exempt from
blind comparison, not left for the critic to score as a gap.

**What if the run dies partway through (context runs out, the session closes)?** The prompt is
saved as a file beside the run, not only on the clipboard, and the run's own progress record is an
append-only file a page renders - never overwritten each round. A fresh session resumes with the
saved prompt plus one added line telling it to read the record and continue; nothing depends on
the dead session's transcript.

**Can the run reach my staging database or other live systems?** Only what you name to it. An
unnamed environment is treated as off-limits, not as permission by omission - if nothing live is
in reach, the default written into the prompt is a fresh directory, no credentials, no calls to
anything you didn't name. Where a live or shared system genuinely is in reach, that's one of the
three questions the grill always asks outright rather than predicts.

## It's working if

- The turn ends with one paste-ready prompt handed to you, and nothing was built in this session.
- The bar in that prompt names a concrete reference, measurement, or written behavior list -
  never an adjective standing in for one.
- Any live or shared system the run could reach was named to you before the handoff, not
  discovered afterward.
- A dead run resumes in a fresh session from the saved prompt plus its own record, without
  needing the original conversation.
