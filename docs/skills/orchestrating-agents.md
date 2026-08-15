# /orchestrating-agents

## What it does

Gives every other skill one agent-agnostic verb for splitting work and running it through fresh,
isolated-context workers instead of doing it all in one long session: decompose into self-contained
subtasks, dispatch each as a file brief, and verify the result independently of whoever produced it.
The defining constraint is the separation it refuses to collapse - the worker that built something
never grades its own output, and the orchestrator never counts a worker's own claim of "done" as
proof. Judgment work (decomposition, ambiguous design, the final synthesis) always stays in the
dispatching session's hands; only the bounded, closed-spec pieces go to workers.

## When to reach for it

| Situation | Route |
|---|---|
| Work is large, many-part, or splits into independent slices | here - fan out |
| A broad review or audit must not inherit your own assumptions | here - single worker or fan-out |
| One small edit finishable in a few tool calls | do it inline, skip the brief overhead |
| A feature or fix needs planning before any code | `/plan-grill` or `/diagnose` first - this skill runs underneath once work starts |
| An unattended run needs a surface the human can watch from outside | this skill's `observatory.md`, composed by `/gauntlet` or `/autonomous-loop` |

It also names the dispatch verb itself - the table below maps host and shape to the call:

| Host | Shape | Dispatch verb |
|---|---|---|
| Claude Code | One worker | `Task` |
| Claude Code | Fan-out or pipeline | `Workflow` |
| No subagent primitive | Either | in-session role-switch with an explicit context reset, reported as `degraded: in-session` |

## Where it fits

`/autonomous-loop` composes this skill as its outer layer rather than re-specifying dispatch, and
`/review` is the independent evaluator this skill always reaches for rather than letting a worker
grade itself. It is also how better-dev builds its own skills and docs - the practice is dogfooded,
not just prescribed.

## Common questions

**Does a worker I dispatch inherit my security rules automatically?** No. A fresh worker holds only
what its brief states - a brief that has a worker touch secrets or sensitive output has to carry the
file:line-only and data-not-instructions rules verbatim, or a found secret's value can end up quoted
straight back into the report.

**A worker's reply says "done" in prose but I don't see a clean status - can I count it?** Only a reply
ending in the report trailer is a report. Three confident paragraphs with no trailer, or a trailer
whose `STATUS` doesn't match the prose above it, gets re-dispatched rather than read for vibes - branch
on the trailer key, never the narrative around it.

**A cheap worker's output misses the bar - do I need approval to rerun it at a higher tier?** No. The
default tier is a starting point, not a ceiling; a below-bar result gets rerun immediately, judged
against the contract rather than the price. What does need a decision first is triage: a brief defect
gets a corrected brief at the same tier, a genuine capability shortfall earns the higher one - and
either way the choice gets named in the dispatch receipt, so a later run has a memory of which tier
this class of work actually needed.

**If the host lets me pass a model or tier per worker, what happens if I just don't pass it?** The
worker silently inherits the dispatching session's own model - usually the most expensive one - so
every unresolved fan-out quietly bills at the top rate even when every brief was written for a cheaper
tier. Omitting the parameter is a placement decision like any other; it's only correct when the stage
genuinely earned the orchestrator's own tier.

## It's working if

- A large or multi-part change lands as separate commits or diffs from distinct workers rather than
  one long inline session narrating its own progress.
- Every worker's reply carries a trailer with a `STATUS` line, and the next action taken visibly
  matches that value rather than a summary sentence above it.
- A result that misses its bar gets rerun right away - never stalled behind a question asking
  permission to spend more.
- Resuming after an interruption picks up only what is still pending, with nothing already recorded
  as done re-run from scratch.
- A large fan-out is preceded by one small pilot whose cost and result are visible before the rest of
  the batch is committed.
