# /session-review

## What it does

Sweeps a finishing session for what it learned and routes each finding to the surface that will replay
it: a keyed lesson, a rigged scenario in the repo's trap record, or a quoted correction against an
instruction that pointed the run the wrong way. The memory store and the trap record both sit idle
unless something reaches for them while the session still remembers what happened, and this sweep is
that something. Its defining constraint is that an empty result is a correct result - a manufactured
lesson costs a read every time the store is consulted and returns nothing.

## When to reach for it

| Situation | Route |
|---|---|
| The last work-item settled and no further build is planned | `/session-review` |
| A PR merged or closed, and the session is ending | `/session-review` |
| A compaction or a deliberate context reset is about to discard the transcript | `/session-review` |
| The session fought this repo's own instructions and the defect needs recording | `/session-review` |
| Between passes of the loop, or with a red check still open | not yet - land the pass receipt and keep working |
| Reviewing the code itself | `/review` |
| Handing the work to another machine or colleague | `/worktree-branching` |
| Editing the skill whose wording misled the run | `/self-extension` |

A sweep run mid-work spends the context the work still needs and grades an unfinished story, which is
why the trigger is a terminal moment rather than a cadence.

## Where it fits

Last, and once per session. `/autonomous-loop` and `/pr-and-verify` each write their own item-level
lesson at their terminal state; this sweep runs over the whole session, so a lesson one of those
close-outs already wrote is cited here rather than written twice. It enters `/writing-skills` for the
two tests that gate a lesson write instead of restating them, and where the session had a work-item
the same report block goes into that item's ledger so the sweep travels with the work that earned it.

## Prerequisites

A session at a terminal moment that still holds its own trail - what was retried, what surprised it,
what had to be grepped twice. After a compaction the material is already gone, which is why the sweep
runs before the reset rather than after it.

## Common questions

**The loop already recorded a lesson for the work-item - is this a second copy?** No. The item-level
close-out covers the item; this sweep covers the session, and it cites the line the loop already wrote
rather than writing it again. What it adds is everything the item-level line does not carry: the run's
friction, its trap-worthy gaps, and any instruction that misled it.

**The session learned nothing durable - is a report still owed?** Yes, and it says so explicitly. A
sweep that found nothing and reported nothing is indistinguishable from one that never ran, so the
same five lines are written with the negative forms filled in ("no durable lesson", "traps: none")
rather than omitted.

**Everything I find looks like friction.** That is the pull the sweep is built against, because
friction asks nothing of you - no key, no score, no wording. Sort by who the finding is for: friction
that cost you time is a lesson, keyed so the next run reads it before paying the same cost, while a
defect in a sentence the next agent will read is a correction to that sentence, and filing it as a
lesson leaves the wrong sentence in place.

**When does something become a trap rather than a lesson?** When a future agent following the
instructions as written would fail the same way, and you can name the input that produces the wrong
behaviour plus the observable that separates a pass from a fail. Without both halves it is not yet a
rigged scenario, and it stays a lesson or a correction.

## It's working if

- A session that ends in a compaction or a reset leaves its findings behind in a form the next session
  can recall, instead of losing them with the transcript
- A wall you hit once gets recalled rather than re-derived weeks later
- A sweep that learned nothing durable says so in as many words, and no filler lesson appears in the
  lesson store ahead of one that would have paid off
- An instruction in this repo that sent the run the wrong way comes back as a quoted sentence with what
  it made the run do, not as a lesson that leaves the sentence unchanged
- Every report carries all its lines, negatives included, so a quiet session and a skipped sweep do not
  look the same
