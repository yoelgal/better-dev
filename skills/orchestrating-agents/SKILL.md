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

A fan-out or a discovery loop can spawn dozens of workers and a large token bill, so the scale is
something you pick deliberately, not a default the work infers for you: match the finder pool and the vote
count to what the task asks for, and request that scale rather than assume it. Before committing a large
run, pilot it - dispatch one worker over a small representative slice, read what it costs and returns, then
scale the pattern that worked (`tiers.md`).

1. **Single worker** (`Task`) - isolate one self-contained slice, or any task whose detail would bloat
   your coordination context.
2. **Fan-out** (`Workflow`, or several `Task` calls in one turn) - independent subtasks at once. Only
   when they don't write the same files; parallel writers to one surface collide. A broad review fans out
   naturally: each worker takes a slice and none needs the others.
3. **Pipeline** (`Workflow`) - dependent stages, each a fresh worker, where one stage's output file
   becomes the next stage's brief. A drive-to-green loop is itself a pipelineable stage: hand it a verify
   command and a protect-set, consume its terminal verdict, and don't micromanage its iterations.

Fan-out doesn't nest - a worker shouldn't fan out again beneath you. Keep orchestration one level deep;
if a stage genuinely needs its own fan-out, run it inside that dedicated stage. A debate among hypotheses
is still yours to run, one level deep: the shapes below compose *at* your level, never by a worker
spawning its own workers.

## Composing the shapes

The three primitives compose into a handful of named shapes worth reaching for by name. Each is the same
dispatch verb arranged for a job, not a new mechanism:

- **Adversarial verify** - the refuter from "Verify independently" scaled to a panel: per finding,
  dispatch several independent skeptics, each told to *refute* it, and keep it only if a majority fail to.
  One refuter is a spot-check; a panel is closer to proof.
- **Perspective-diverse verify** - when a finding can fail more than one way, give each verifier a distinct
  lens (correctness, security, performance, does-it-reproduce) instead of identical refuters. Diversity
  catches failure modes that redundancy just repeats past.
- **Judge panel** - for a wide-open design or fix, generate a few independent attempts from different
  angles, score them with parallel judges, and synthesize from the winner while grafting the best of the
  rest. Beats one attempt iterated when the solution space is broad.
- **Loop-until-dry** - for discovery of unknown size (bugs, edge cases, dead code), keep spawning finders
  until K consecutive rounds surface nothing new. A fixed count (`while found < N`) stops before the tail
  and reports a partial sweep as complete. Dedup each round against everything *seen*, not against what's
  been *confirmed* - dedup against confirmed lets a judge-rejected finding reappear every round, and the
  loop never converges.
- **Completeness critic** - close a broad sweep with one worker whose only job is "what's missing - an
  angle not run, a claim unverified, a file unread?" What it surfaces is the next round.
- **Competing hypotheses** - for a diagnosis with several mutually-exclusive root causes, dispatch one
  investigator per hypothesis, each trying to *disprove* the others; the one that survives is the likely
  cause. On a host whose workers can message each other this runs as a live debate; on a subagent-only
  host it degrades to sequential dispatch, where you carry each investigator's counter-evidence into the
  next brief. Either way the point holds: one agent picks the first plausible theory and stops - several
  arguing don't.

**No silent caps.** When a shape bounds coverage - a top-N, a no-retry, a sample - record what it dropped
in the ledger. A silent truncation reads as "covered everything" when it didn't; that is a dishonest
report, not an efficient one. The same honesty covers a fan-out that came back with holes: report the
partial as partial, never a silent gap.

**Vet before presenting.** Before you present or act on fan-out findings, confirm each at its cited
location yourself - a worker's `file:line` is a lead, not a fact. Collapse duplicates across workers, and
downgrade behavior a worker flagged that is by-design. Subagents over-report; the cheap pass that re-reads
each surfaced finding at the source is what keeps a merged answer trustworthy.

## File handoffs

Everything you paste into a dispatch, and everything a worker prints back, stays resident in your context
and is re-read every turn. Move artifacts as files instead:

- **Brief** - one task, written for a zero-context worker: absolute paths, inline excerpts for anything
  it can't re-derive, an explicit output spec, and - when the worker will write files - the repo's
  high-consequence denylist with the standing instruction to escalate rather than edit those paths (settle
  `NEEDS_INPUT`), so a fresh worker doesn't discover the rule only at review. Not your session history.
  `.better-dev/bin/bd-dispatch brief <work-item> <role>` writes a skeleton into the shared ledger and prints its path.
- **Report** - the worker writes its full report to a file and returns a compact filled skeleton, not
  prose:
  - **STATUS** - one of the terminal states (`DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_INPUT`,
    `EXHAUSTED`, `NO_PROGRESS`).
  - **STEPS** - per step: done or skipped, plus the check's result.
  - **STOPPED BECAUSE** - if not `DONE`: which stop condition, and what was observed.
  - **FILES CHANGED** - the list.
  - **NOTES** - deviations, surprises, judgment calls.

  Name the report file in the brief. Before returning, the worker audits every claim in the report against
  a session tool result (`/pr-and-verify` verify-runtime owns this disposition) - an unverified claim says
  so plainly.
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

The default tier is a starting point, not a ceiling. When a worker's output misses the bar, rerun it at a
higher tier straight away - don't stop to ask permission to spend more. Pausing a run to approve a cost is
itself a cost, and a mediocre result is the expensive outcome. Judge the output against the contract, not
against what the worker cost. The two-failures rule above still bounds this, and `tiers.md`'s no-re-descend
rule is its memory - once a class needs the higher tier, keep it there for the run.

That rule sizes one worker for one subtask; a stage-to-tier band places whole stages. Name the bands by
capability, never by vendor - "top tier" is the most capable model you have, which on a given day may be
your only frontier tier:

- **Top tier - judgment that cascades.** Planning and grilling a plan, the adversarial evaluator's
  verdict, root-cause diagnosis, and the final synthesis across many workers' output. A wrong call here
  poisons every downstream stage, so it earns the best model available.
- **Mid tier - bounded building.** A closed-spec implementation slice, a mechanical refactor, test
  scaffolding, a doc pass - the bulk of fan-out work, where the spec is settled and a cheap check catches
  a miss.
- **Cheap tier - mechanical and classifying.** Extraction, formatting, and a grader or classifier worker
  checking one artifact against one rubric. High-volume, low-stakes, independently checkable.

A verifier is the exception to "more-capable-is-safer": what an independent grader buys is *independence*,
not raw power. A worker grading its own output sees its own reasoning and favors the conclusion it already
reached; a separate worker sees only the artifact and the criterion. So a cheap independent grader can
settle a deterministic check - a test passes, a score clears a threshold - even below the maker's tier;
keep "at or above the tier that did the work" for judgment-heavy verification, where capability itself is
doing the work.

The full stage table, the confidence-envelope routing question, the pilot-small-then-scale rule, and the
no-re-descend and calibration rules for a tier that keeps missing a task class live in `tiers.md`.

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
