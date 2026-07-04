---
name: orchestrating-agents
description: Use when development work is large, parallelizable, or benefits from fresh-context isolation - a broad review or audit, a migration, building or changing many components, or anything better split across fresh workers than done inline; also when an orchestrator needs the agent-agnostic verb for dispatching a fresh worker.
---

# Orchestrating development with subagents and workflows

Non-trivial development is decomposed and run through the host's subagent and workflow primitives, not
done inline. One job: split the work, dispatch fresh-context workers with file briefs, and verify their
output independently of whoever produced it. This is also how better-dev builds itself.

## When to reach for this

- **Large or many-part** - a migration, building several components, a repo-wide change.
- **Parallelizable** - independent slices that don't touch the same files.
- **Fresh-context isolation helps** - a broad review or audit that must not inherit your assumptions; a
  task whose details would otherwise clutter the context you need for coordination.

If the task is one small edit you can finish in a few tool calls, do it inline - wrapping it in a brief
costs more than the work. Orchestrate when the work outgrows one worker's clean context, or when
independence buys correctness.

## Decompose first

Break the work into subtasks that are each self-contained: one clear task, enumerated inputs, a
deterministic output shape, one obvious approach. If a subtask still needs "investigate," "figure out,"
or "as appropriate," it isn't decomposed yet - that ambiguity is yours to resolve, not a worker's. Keep
the judgment work in your own hands: decomposition, ambiguous design, user interaction, destructive
actions, and the final synthesis. Workers get the bounded pieces.

## The dispatch verb (agent-agnostic)

Dispatch means: hand a fresh, isolated-context worker a file brief and let it run. It never inherits
your session history - you construct exactly what it needs. That preserves your context for coordination
and keeps the worker focused on its one task.

- Use the host's primitive. On Claude Code that is `Task` for a single fresh worker and `Workflow` for a
  deterministic fan-out or pipeline. Other hosts have equivalents (a subagent or spawn tool); name them
  where they exist.
- No subagent primitive at all? Fall back to a single-session role-switch with an explicit context
  reset - state that you are now a fresh worker holding only the brief, set prior reasoning aside, and
  produce the brief's output. The role separation is the point; the mechanism is whatever the host offers.
- A bash script can't spawn the host's agent, so the dispatch itself is prose you execute. The dispatch
  helper (`.better-dev/bin/bd-dispatch`) only prepares the brief file and records the receipt - the
  bookkeeping around a dispatch, never the dispatch.

## Three shapes

1. **Single worker** (`Task`) - isolate one self-contained slice, or any task whose detail would bloat
   your coordination context.
2. **Fan-out** (`Workflow`, or several `Task` calls in one turn) - independent subtasks at once. Only
   when they don't write the same files; parallel writers to one surface collide. A broad review fans out
   naturally: each worker takes a slice and none needs the others.
3. **Pipeline** (`Workflow`) - dependent stages, each a fresh worker, where one stage's output file
   becomes the next stage's brief. A drive-to-green loop is itself a pipelineable stage: hand it a verify
   command and a protect-set, consume its terminal verdict, and don't micromanage its iterations.

Fan-out doesn't nest - a worker shouldn't fan out again beneath you. Keep orchestration one level deep;
if a stage genuinely needs its own fan-out, run it inside that dedicated stage.

## File handoffs

Everything you paste into a dispatch, and everything a worker prints back, stays resident in your context
and is re-read every turn. Move artifacts as files instead:

- **Brief** - one task, written for a zero-context worker: absolute paths, inline excerpts for anything
  it can't re-derive, an explicit output spec, and - when the worker will write files - the repo's
  high-consequence denylist with the standing instruction to escalate rather than edit those paths (settle
  `NEEDS_INPUT`), so a fresh worker doesn't discover the rule only at review. Not your session history.
  `.better-dev/bin/bd-dispatch brief <work-item> <role>` writes a skeleton into the shared ledger and prints its path.
- **Report** - the worker writes its full report to a file and returns only its terminal state, commits,
  a one-line verify summary, and concerns. Name the report file in the brief.
- **Review inputs** - the reviewer gets the same brief, the report file, a diff package, and the
  work-item slug, all as files or plain values, never the diff pasted into the prompt. The slug resolves
  the shared ledger, so the reviewer can read the work-item's `approvals.log`
  (`.better-dev/bin/bd-mem ledger read <work-item> approvals.log`) and tell an approved blast-radius edit
  from an unapproved one - hand over only the package and the reviewer can't confirm the gate at all.

For the discipline of writing a clean brief and a clean reviewer prompt - and the anti-patterns that
quietly bloat both - read `briefs-and-reviews.md`.

## Verify independently

Never grade your own work, and never let a worker grade its own. The generator and the evaluator are
separate fresh workers; a worker's "done" is a claim, not proof.

- The evaluator distrusts the report: it reads the diff package read-only, checks each named risk once,
  and a stated rationale never downgrades a finding. Its verdict covers both spec compliance and quality.
  better-dev's independent evaluator is `/review`.
- On findings, dispatch one fix worker with the complete list - not one fixer per finding, since each
  rebuilds context and re-runs suites - then re-review until clean. A broad final review over the whole
  change closes the run.
- Verify at or above the tier that did the work, never below it. An undetected bad result poisons every
  downstream stage.

For a claim no runnable check can settle - a concept fully removed, no caller left depending on the old
behavior, an invariant that lives in prose - reach for **adversarial refutation**. Dispatch an
independent worker whose one job is to *refute* the claim: hunt the surviving reference, the caller that
still breaks, the symbol renamed-not-deleted, the case the summary glossed. Instruct it to default to
"refuted" whenever it's uncertain, so the burden sits on the claim rather than on the doubt. The claim
holds only if that refutation fails to land, with cited counter-evidence when it does. A single
self-graded read is never proof - this is the strongest move against a worker (or you) believing its own
report. `/review` runs this as its refuter channel.

## Right-size the worker

Give each subtask to the least-capable worker you're confident will one-shot it; unsure between two, take
the higher. Under-resourcing is the expensive mistake - a failed cheap worker burns your costly
coordination context on re-diagnosing and re-dispatching, far past what it saved. Only hand a subtask
down when both hold: the spec is closed (zero judgment left to the worker) and a cheap mechanical check
exists for the result. Two failures on a subtask means the spec is wrong, not the worker - pull it back
and re-decompose rather than escalating the model a third time.

better-dev advises how to shape and place work; it doesn't route models - the host owns model choice, so
wire no router.

## Track and resume

Conversation memory doesn't survive compaction, and a controller that loses its place re-dispatches
finished work - the most expensive failure there is.

- Record each dispatch as a ledger receipt: `.better-dev/bin/bd-dispatch record <work-item> <role> <state> [note]`, using
  the canonical terminal states - `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_INPUT`, `EXHAUSTED`,
  `NO_PROGRESS`. The ledger lives in the primary checkout's `.better-dev/ledger/<work-item>/`, shared
  across worktrees; `bd-dispatch` pins it there so a worker in a feature worktree records to the same
  place. After a compaction, `.better-dev/bin/bd-dispatch pending <work-item>` lists what isn't finished - resume those,
  re-dispatch nothing already done.
- You own the progress surface; isolated workers can't touch your todo list. Flip a task to in-progress
  before you spawn, and to done the moment you parse its receipt. Exactly one in-progress at a time.
- Run continuously between tasks - no "should I continue?" check-ins. Stop only at a genuine terminal
  state: a `BLOCKED` you can't resolve, `NEEDS_INPUT`, or all tasks done. An error or an exhausted budget
  is never a success.

## Handing off

Workers that write files run in isolated worktrees - see `/worktree-branching` - and a finished run hands
off to the PR-into-staging gate. `/autonomous-loop` composes this skill as its outer layer: it reaches
for the dispatch verb here rather than re-specifying it. Durable rules and lessons still go through the
memory contract (`.better-dev/bin/bd-mem`), and any project override in `.better-dev/overrides.md` wins
over these defaults - read it first. When you revise this skill, follow `/writing-skills`.
