# Tiering work by capability

`orchestrating-agents` "Right-size the worker" gives the rule and the three bands; this is the fuller
reference it points to - the worked placement, the routing question, and the anti-spin rules for a run
that keeps under-resourcing a class of work. All of it is advice on how to *place* work by the judgment it
demands. It names no model and wires no router: the host owns model choice.

## Name tiers by capability, never by vendor

"Top tier" is the most capable model you have on the day; "cheap tier" is the fastest and least costly.
The band is a role, not a product, so the advice reads correctly whether your top tier is a frontier
flagship or the only tier you have. Read `.better-dev/overrides.md` first: a repo may already pin which
tier it trusts for what.

## Capability is more than one axis

Capability is not a single ladder from cheap to smart. Two kinds of fitness pull apart: how hard a problem
a model handles unsupervised, and its *taste* - the judgment visible in an interface, an API's shape,
prose, and code a maintainer wants to keep. The model that reasons hardest is not always the one with the
best taste. Recognize when a work-item is taste-graded - anything a user reads or a developer lives with -
and where the host offers a choice, place it by taste. When the axes conflict on work that ships,
correctness leads, taste second, cost last: cost breaks a tie, it never overrides a quality bar.

## Which stage sits in which band

- **Top tier - judgment that cascades.** Decomposition and planning, grilling a plan against its
  done-contract, the adversarial evaluator's verdict, root-cause diagnosis, and the final synthesis across
  many workers' output. These are the calls that, made wrong, poison every stage downstream, so they hold
  the best model available - in your own hands when you are that tier, or bought as a consult (below)
  when you are not.
- **Mid tier - bounded building.** A closed-spec implementation slice, a mechanical refactor, test
  scaffolding, a documentation pass. This is the bulk of fan-out work: the spec is settled, one obvious
  approach remains, and a cheap check catches a miss - so a cheaper, faster tier carries it.
- **Cheap tier - mechanical and classifying.** Extraction, reformatting, a rote edit, and a grader or
  classifier worker checking one artifact against one rubric. High-volume, low-stakes, and independently
  checkable.

## Two directions, one economy

Tiering runs in two directions, and both bill most tokens at the cheap rate:

- **Delegate down (orchestrator).** The expensive context plans, dispatches cheaper workers against
  closed specs, and verifies. Everything else in this file is this direction. In it the orchestrator's
  own toolset stays minimal - the roster is its capability, and an orchestrator that starts doing the
  work itself has left the pattern.
- **Escalate up (consult).** A cheaper executor keeps the task and buys a bounded top-tier consult at
  fixed moments, then continues executing itself. The consult returns a short plan, a verdict, or a
  named risk - it never produces the deliverable; the executor does, at the executor's rate.

Reach for the consult direction when the session doing the work is not the top tier and a stage from
the top band arrives - a decomposition, a plan grill, a root-cause call. Consulting up at that moment
is the sanctioned move; making the call at your own tier because "planning stays in my hands" is the
failure this section exists to prevent. Rerunning the whole task at a higher tier remains the move for
a below-bar *deliverable*; the consult is for a *judgment point* inside a task that is otherwise going
fine.

A consult is bounded, and the bounds are checkable:

- **When:** once after orientation and before the first substantive write (reading files is
  orientation; writing, editing, or committing to an interpretation is substantive), once before
  settling done, and on a tripped stuck signal. A consult before any orientation reads is advice with
  no context - do the reads first.
- **Durable first:** before the settling-done consult, the deliverable is already on disk or
  committed - a consult that outlives the session must not take an unwritten result with it.
- **Output-capped:** the request names an explicit length bound for the answer (a short plan, not a
  comprehensive one) - the consult's output is its dominant cost.
- **Weight:** the advice is followed unless a step fails empirically or a primary source contradicts a
  specific claim; on a conflict between advice and evidence already in hand, spend one more consult
  naming both sides ("found X, advised Y - which constraint breaks the tie") rather than silently
  picking.

A cost comparison between tiers - a consult against a rerun, a cheap fan-out against expensive inline
work - is valid only at the same verification standard: a cheaper run held to a lower bar is a
different product, not a saving.

The host decides what answers a consult - a stronger pinned subagent, a host advisor facility, or the
human when no stronger tier exists. We advise the shape; the host owns the wiring.

## The routing question

For each unit of work, ask the cheapest tier you are about 90% confident will one-shot it - not the
cheapest that *might* manage it. Unsure between two tiers, take the higher. And if you can't write a crisp
envelope for the task - inputs enumerated, paths absolute, output shape deterministic, one obvious
approach - that uncertainty *is* the classification: the work still holds judgment, so it isn't delegable
downward yet.

Two gates have to clear before a subtask drops to the cheap tier:

- **Closed spec** - the task and its output can be written with no judgment left to the worker. If your
  draft brief still needs "investigate," "figure out," "as appropriate," or "clean up," the gate failed.
- **Cheap mechanical verification** - a check the dispatching side can run without redoing the work: a
  test passes, a grep count matches, a diff has the expected shape, a schema validates. Unverifiable
  output never goes to a cheap tier.

## Resolving a band at the dispatch call

A band is only real once it reaches the host's dispatch mechanism. Where that mechanism takes a
per-worker model or tier parameter, silence is not neutrality: an omitted parameter inherits the
orchestrator's own model, so every worker of an unresolved fan-out runs at the dispatching session's
tier - usually the top - and the economy this file builds quietly vanishes. Omitting the parameter is
itself a placement decision, and it is only the right one when the stage genuinely earned the
orchestrator's own tier.

The library still names no model; the concrete names are repo-recorded config. Resolve a band through
the recorded tier map - `.better-dev/bin/bd-mem recall "tier-map"` - which binds each band to the
host's own dispatch vocabulary (`tier-map: top=<name or session-inherit>, mid=<name>, cheap=<name>`).
No recorded map at the moment of a fan-out means recording one is part of that fan-out: read the
host's available model names from its dispatch parameter, propose the mapping to the operator in one
line, and `remember` it - it then holds for every later run, and `.better-dev/overrides.md` wins over
it as always. A dispatch receipt already names its tier (the no-re-descend rule needs that memory);
with a map recorded, the named tier and the passed parameter can no longer drift apart.

Two host quirks ride this rule. A taste-graded stage may earn the top name even when its spec is
closed (the capability-axes section above). And a host's resume or continue path may silently drop a
per-dispatch pin - when the pin matters, relaunch fresh with the tier restated rather than resuming a
worker whose override is gone.

## Sizing the reasoning knob

Separate from *which* model is *how much reasoning* you ask of it. The maximum is not the best: past a
point, more reasoning second-guesses a sound answer into a worse one while costing more - a loss on both
axes at once. A run that finishes correctly but takes far longer than the task warranted is the tell that
the knob is set too high for that class of work; turn it down there. We advise the knob; the host owns the
setting.

Default the knob to the band, not to the maximum: cheap-band mechanical work runs at low effort, and the
top of the knob is reserved the way the top tier is - for the judgment that cascades. Tier and effort are
two separate economy axes; on a host with capped usage, the effort knob is the lever that stretches a
fixed budget across the week, independent of which tier answers. Raise it back where a class of work
starts missing, exactly as the calibration rules above move a tier. We advise the default; the host owns
the setting, and no cross-model quality claim about a given effort level is citable without a benchmark
run here.

## One vocabulary, three scales

These scales stay distinct. `/review`'s light/standard/deep scales review *breadth* - how much of the
change gets independently examined. The reasoning knob above scales one worker's reasoning *depth*. Neither
is a coverage quota, and better-dev pins no fixed subagent-count table: the scale of a fan-out is picked
per run by the pilot rule below, not read off a chart.

## Why the line sits where it does

The cost of misjudging is not symmetric. Over-resourcing wastes a bounded, known amount of cheap worker
tokens. Under-resourcing wastes the expensive part: your coordination context reads the failed output,
re-diagnoses, re-specs, and re-dispatches, and that context grows permanently - a failed cheap attempt
costs more in coordination than it ever saved, and an undetected bad result poisons every stage that
consumes it. That asymmetry is why "unsure, take the higher" is the safe default, and why verification
never runs below the tier that produced the work.

## When a tier keeps missing a class

- **Two failures is a spec problem, not a capability one.** After a second failure on the same subtask,
  don't escalate the model a third time - pull the task back into your own hands and re-examine the
  decomposition and the envelope. Capability is rarely the issue twice; the spec usually is.
- **No re-descend.** Once a tier fails a task *class* in this run, route similar tasks one tier higher for
  the rest of the run. The ledger's `failed` and `partial` lines are that memory - read them before you
  classify the next similar task, rather than re-deriving the same optimistic guess. That memory only
  exists if receipts carry the tier - name the dispatched tier in each `bd-dispatch record` note.
- **Calibrate on the receipts.** If more than about one dispatch in ten at a tier comes back failed or
  partial, the triage is too aggressive for this work - shift that class up a tier. The ledger receipts
  are the signal; a rising failed-or-partial rate is the number to watch.

## Pilot before a large run

A fan-out or a discovery loop can spawn dozens of workers before you see a single result. Before you
commit that scale, pilot it: dispatch one worker over a small, representative slice, read what it actually
costs and returns, then scale only the pattern that worked. A pilot that comes back wrong or expensive is
a cheap correction; the same mistake multiplied across a large pool is not. Weigh what a worker *writes*
more heavily than what it reads: output is the larger share of a run's cost, so a tight output spec moves
the bill more than trimming the brief does.

## The guard this reference sits behind

Everything here advises how to shape and place work by the judgment it demands. It hardcodes no model
name, no price, and no router: better-dev advises tiering, and the host owns which model answers a
dispatch. When you revise this reference, follow `/writing-skills`.
