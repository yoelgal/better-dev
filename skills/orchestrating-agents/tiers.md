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

## Which stage sits in which band

- **Top tier - judgment that cascades.** Decomposition and planning, grilling a plan against its
  done-contract, the adversarial evaluator's verdict, root-cause diagnosis, and the final synthesis across
  many workers' output. These are the calls that, made wrong, poison every stage downstream, so they hold
  the best model available and stay in your own hands rather than being delegated.
- **Mid tier - bounded building.** A closed-spec implementation slice, a mechanical refactor, test
  scaffolding, a documentation pass. This is the bulk of fan-out work: the spec is settled, one obvious
  approach remains, and a cheap check catches a miss - so a cheaper, faster tier carries it.
- **Cheap tier - mechanical and classifying.** Extraction, reformatting, a rote edit, and a grader or
  classifier worker checking one artifact against one rubric. High-volume, low-stakes, and independently
  checkable.

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
  classify the next similar task, rather than re-deriving the same optimistic guess.
- **Calibrate on the receipts.** If more than about one dispatch in ten at a tier comes back failed or
  partial, the triage is too aggressive for this work - shift that class up a tier. The ledger receipts
  are the signal; a rising failed-or-partial rate is the number to watch.

## Pilot before a large run

A fan-out or a discovery loop can spawn dozens of workers before you see a single result. Before you
commit that scale, pilot it: dispatch one worker over a small, representative slice, read what it actually
costs and returns, then scale only the pattern that worked. A pilot that comes back wrong or expensive is
a cheap correction; the same mistake multiplied across a large pool is not.

## The guard this reference sits behind

Everything here advises how to shape and place work by the judgment it demands. It hardcodes no model
name, no price, and no router: better-dev advises tiering, and the host owns which model answers a
dispatch. When you revise this reference, follow `/writing-skills`.
