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
actions, and the final synthesis. Workers get the bounded pieces. (When a judgment stage sits above your
session's own band, "your own hands" means buying the bounded consult `tiers.md` defines - never making
the top-band call at a lower tier.)

Fan out from a clean slate. Parallel work never starts over an unfinished background operation - a
still-running worker, an unmerged lane, an unread report - because two actors over unknown state is how
one surface gets edited twice. State the current world first (what is running, what settled, what is
pending), then propose the fan-out.

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
   when they don't write the same files; parallel writers to one surface collide. Check that
   mechanically before dispatching, not by recall: `git worktree list`, then per live branch
   `git diff --name-only <base>...<branch>` - a path two lanes both touch makes those lanes
   sequential, and discovering the overlap at PR time buys a conflict-resolution round instead. A
   broad review fans out naturally: each worker takes a slice and none needs the others.
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
- **Verbalized candidates** - when a shape needs k genuinely different candidates (a judge panel's
  attempts, ideation options, design directions), don't collect them as k independent asks: an aligned
  model's independent answers collapse toward its one modal answer, and a plain "give me k options" list
  spreads only across that modal region. Ask one generator for k candidates *each with a stated
  probability*, and require at least one tail candidate (stated probability under ~0.10). Verbalizing
  the probabilities is the load-bearing part: it measurably recovers diversity that alignment suppressed,
  at equal quality, and stronger models gain more (Verbalized Sampling, arXiv 2510.01171). Compose with
  the judge panel - verbalized generation, then independent judges.
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

**Anchor the judges.** When a shape grades candidates - a judge panel picking a winner, a grader worker
checking an artifact against a rubric - a bare "score it 1-10" collapses to vibes, so hand every judge
the same anchored rubric: one anchor sentence per grade saying what an artifact at that grade concretely
looks like (a top grade "satisfies every stated criterion with a runnable check per claim", a floor grade
"misses the task or contradicts the brief"); a short list of named penalties, each subtracting a stated
amount (an unverified claim, a criterion with no check, an unrequested scope add); and a declared
tie-break cascade so near-ties resolve the same way across judges (say: correctness beats completeness
beats polish). Each judge returns its grade with the anchor sentence it matched, not a naked number. The
grades are advisory prose for picking a winner inside the shape - recorded nowhere - and a review verdict
is never one of them: `/review` stays severity-gated, never averaged.

**No silent caps.** When a shape bounds coverage - a top-N, a no-retry, a sample - record what it dropped
in the ledger. A silent truncation reads as "covered everything" when it didn't; that is a dishonest
report, not an efficient one. The same honesty covers a fan-out that came back with holes: report the
partial as partial, never a silent gap. And report status in units of the work, never units of the
workers: the coverage denominator is the findings, files, or criteria list, each item with its
disposition - "N agents running" answers a question nobody asked.

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
- **Report** - the worker writes its full report (steps taken, files changed, deviations, judgment
  calls, and the full line for each question it parked) to the report file named in the brief, and ends
  its reply with the **report trailer**: the last lines of the reply, one key per line, nothing after
  them.

  ```
  STATUS: <one of DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_INPUT | EXHAUSTED | NO_PROGRESS>
  VERIFY: <command> -> exit <code>   (or: not run - <one-line why>)
  COMMITS: <shas, or none>
  BLOCKER: <one line>                (required unless STATUS is DONE or DONE_WITH_CONCERNS)
  CONCERNS: <one line, or none>
  QUESTIONS: <count, or none>        (the question lines themselves live in the report file)
  ```

  The trailer is the control-flow interface between worker and orchestrator: branch on `STATUS` exactly
  as written and pass it to `bd-dispatch record` unedited - the script rejects anything off-vocabulary.
  The prose above the trailer is context, never the verdict; a status implied in a paragraph but absent
  from the trailer does not exist. A reply with no trailer is not a report - treat it as the
  worker-came-back-empty case and re-dispatch; don't reconstruct a status from the prose. A report
  covering a fan-out names the dispatch mode on its first line: `channels: fresh workers`, or
  `degraded: in-session (<reason>)` when the run fell back to the single-session role-switch. A silent
  degraded run is a reporting defect - the two modes carry different independence, and the report reads
  identically without the line. A review
  dispatched as a worker ends with this same trailer, its `STATUS` derived from its own counts block
  (`/review` owns that block; it is review's record, never a second trailer). Before writing the trailer,
  the worker audits every claim in the report file against a session tool result (`/pr-and-verify`
  verify-runtime owns this disposition) - an unverified claim says so plainly.
- **Review inputs** - the reviewer gets the same brief, the report file, a diff package, and the
  work-item slug, all as files or plain values, never the diff pasted into the prompt. The slug resolves
  the shared ledger, so the reviewer can read the work-item's `approvals.log`
  (`.better-dev/bin/bd-mem ledger read <work-item> approvals.log`) and tell an approved blast-radius edit
  from an unapproved one - hand over only the package and the reviewer can't confirm the gate at all.

For the discipline of writing a clean brief and a clean reviewer prompt - and the anti-patterns that
quietly bloat both - read `briefs-and-reviews.md`.

## Verify independently

Never grade your own work, and never let a worker grade its own. The generator and the evaluator are
separate fresh workers; a worker's "done" is a claim, not proof. The rule binds you one level up as well:
you wrote every brief, so measuring a result against your own brief only proves the brief was followed,
never that the brief was right. The reference a judge grades against must be authored outside the
goal-writer - the sealed contract, the spec's verbatim constraints (`briefs-and-reviews.md`) - because a
wrong assumption baked into every brief survives every worker-level check and scales into confident
wrongness fleet-wide.

- The evaluator distrusts the report: it reads the diff package read-only, checks each named risk once,
  and a stated rationale never downgrades a finding. Its verdict covers both spec compliance and quality.
  better-dev's independent evaluator is `/review`.
- On findings, dispatch one fix worker with the complete list - not one fixer per finding, since each
  rebuilds context and re-runs suites - then re-review until clean. When the implementing worker's
  session can still be continued, the fix worker *is* that worker: hand the findings back to it, since
  it already holds the files, the suite state, and its cache, and independence is a property the
  re-review needs, never the fixer - the maker fixing its own reviewed work is fine; the maker grading
  it is not. Dispatch a fresh fixer in two cases: the implementer's session is gone (then it is a
  relaunch - re-pin tier and constraints, `briefs-and-reviews.md`), or a finding shows the implementer
  defending the defect as by-design, where its context is the contamination a fresh reader avoids. A
  broad final review over the whole change closes the run.
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

The default tier is a starting point, not a ceiling. When a worker's output misses the bar, rerun it
changed straight away - don't stop to ask permission to spend more, but don't reflex-escalate either:
triage the miss per the terminal-state table (`briefs-and-reviews.md`) - a brief defect gets a corrected
brief at the same tier, a genuine capability shortfall gets the higher tier. An escalation is your
recorded decision, never a silent retry default: name the tier in the dispatch receipt's note, so the
no-re-descend rule (`tiers.md`) has a memory to read. Pausing a run to approve a cost is itself a cost,
and a mediocre result is the expensive outcome. Judge the output against the contract, not against what
the worker cost. The two-failures rule above still bounds this, and `tiers.md`'s no-re-descend rule is
its memory - once a class needs the higher tier, keep it there for the run.

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

- Record each dispatch as a ledger receipt: `.better-dev/bin/bd-dispatch record <work-item> <role> <state> [note]`, where
  `<state>` is the reply's trailer `STATUS`, passed through unedited. The ledger lives in the primary
  checkout's `.better-dev/ledger/<work-item>/`, shared across worktrees; `bd-dispatch` pins it there so a
  worker in a feature worktree records to the same place. After a compaction, `.better-dev/bin/bd-dispatch pending <work-item>` lists what isn't finished - resume those,
  re-dispatch nothing already done.
- You own the progress surface; isolated workers can't touch your todo list. Flip a task to in-progress
  before you spawn, and to done only after the result is measured, not merely claimed: a trailer's
  `DONE` counts once you have run the brief's named check yourself - the same cheap mechanical check
  that justified delegating (`tiers.md`) - or, for judgment-graded output, once its verdict lands.
  Record the trailer's `STATUS` either way; counting is separate from recording. An unmeasured result
  never becomes another stage's brief - that is how one bad output poisons a pipeline. Exactly one
  in-progress at a time.
- Report on milestones, with the artifact. When the human names a milestone ("when all three merge",
  "when the page renders"), the report at that milestone carries the artifact itself - the URL, the
  screenshot, the merged-PR list - never a status sentence about it, and visual work reports with the
  visual without being asked. Between named milestones, silence; a human who has to poll is a
  reporting failure.
- Run continuously between tasks - no "should I continue?" check-ins. Stop only at a genuine terminal
  state: a `BLOCKED` you can't resolve, `NEEDS_INPUT`, or all tasks done. An error or an exhausted budget
  is never a success.

## Handing off

Workers that write files run in isolated worktrees - see `/worktree-branching` - and a finished run hands
off to the PR-into-staging gate. `/autonomous-loop` composes this skill as its outer layer: it reaches
for the dispatch verb here rather than re-specifying it. Durable rules and lessons still go through the
memory contract (`.better-dev/bin/bd-mem`), and any project override in `.better-dev/overrides.md` wins
over these defaults - read it first. When you revise this skill, follow `/writing-skills`.
