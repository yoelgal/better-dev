---
name: session-review
description: Use when a session is finishing and what it learned has not been written down yet - a work-item just settled, a PR merged and no further build is planned, a compaction or a context reset is about to discard the transcript, or the operator says the session is over. Also use when a session spent real time fighting this repo's own instructions - a skill's wording, a stale doc, a default that pointed the wrong way - and that defect needs recording where the next session will meet it. Also use when the operator asks what this session learned, or to save the learnings before closing.
---

# Session review

Durable memory keeps a keyed lesson, the repo's trap record keeps a behavioural gap, and both sit
idle unless something reaches for them while the session still remembers what happened. This sweep is
that something. The whole job is routing what this session produced to the surface that will replay
it, so the tokens already spent pay a second time. Reviewing the code is `/review`; handing the work
to another machine or colleague is `/worktree-branching`; editing a skill is `/self-extension`.

## Run it at a terminal moment, never mid-work

Qualifying: the last work-item of the session has settled and no further build is planned; a PR merged
or closed; a compaction or a deliberate context reset is about to discard the transcript; the operator
says the session is over.

Not qualifying: between passes of the loop, with a red check open, or anywhere a work-item is still
live. A sweep there spends the context the work still needs and grades an unfinished story - land the
pass receipt and keep working. `/autonomous-loop` and `/pr-and-verify` each write their own item-level
lesson at their terminal state; this sweep runs over the whole session, so a lesson one of those
close-outs already wrote is cited here, never written twice.

## Four signals, three destinations

Walk the session's trail - what you retried, what surprised you, what you had to grep twice, what you
got wrong before you got it right - and route each finding by the row it matches:

| What the session produced | Where it goes | The test it has to pass |
|---|---|---|
| a cause, technique, or standing fact a future session would otherwise re-derive | durable memory, one insight per record, keyed (see `/overrides`) | the two close-out tests, named below |
| friction: a dead-end tool call, a broken doc link, a flaky command, output that lied | durable memory as well - what it cost and what to do instead, keyed so the next session meets it | it cost real time and nothing in the repo warned about it |
| a gap where a future agent following the instructions as written would fail the same way | the repo's trap record, as a rigged scenario with its pass line and fail line (better-dev's own is `docs/TRAPS.md`) | you can name the input that produces the wrong behaviour, and the observable that separates the pass from the fail |
| an instruction in this repo that sent the session the wrong way | the report, quoting the file and the exact sentence; the edit itself belongs to `/self-extension` or to the skill that owns the sentence | you can quote the sentence and say what it made you do |

Before writing any lesson, enter `/writing-skills` and read its close-out section: it owns the two
tests that gate the write and the negative-lesson filter, and this sweep applies them rather than
restating them. On the empty path there is nothing to gate, so skip the hop.

The last row is the highest-value output of the sweep and the one most often lost, because the pull at
this table is to file everything as a lesson - one call, and the finding is off your hands. Sort by
who the finding is for. Friction the next session would hit the same way is a lesson, keyed so it
surfaces there. A defect in a sentence the next agent will read is a correction, and a lesson about it
leaves the sentence itself in place for the next session to fight.

## Settle what earlier sessions left in flight

A session that ended at the merge usually left its ledger row reading in-flight, and nothing downstream
closes one: a repo here was found carrying twelve such rows, the oldest open thirteen days, with the work
in them long since shipped. The sweep belongs to this skill because this is the terminal moment, but it is
a judgement step and not a sweep-and-settle. Read the last line of each `.better-dev/ledger/*/progress.md`
that is not this session's own, and for each row still open ask the one question that matters - did that
item's work actually land - then answer it from the repo and never from the row's own claim: is the branch
recorded in its `worktree.md` merged into the integration branch, is its PR closed or merged, is its
worktree gone. Evidence that it landed settles the row with what actually happened; no evidence leaves it
open and names it in the report, because a row closed on a guess destroys the only standing signal that
the work was abandoned half-done. Resist mechanising this into a grep for one filename: the mechanised
version tried here decided from `pr.md`, which the branching path does not write - a work-item's branch
and base are recorded in `worktree.md` - so it settled nothing at all for any item tracked the normal way.
Prose that asks for evidence beats a match on one filename.

## The empty result is a correct result

A session that fixed a typo, or one that only applied lessons already in the store, has nothing durable
to add, and its correct output is an explicit `no durable lesson: <why>`. The pull here is to
manufacture one so the sweep looks diligent, and a manufactured lesson is worse than silence: it takes
up room in the store every session reads and returns nothing. The check before any such record is
whether you would want this line in front of the next session six weeks from now, ahead of a lesson
that would have paid off. An empty sweep still reports, though: one that found nothing and said nothing
is indistinguishable from one that never ran.

## The report

Five lines, each written explicitly, negative forms included:

```
session-review 2026-08-17
lessons: 2 - "a worktree session's edit tool resolves a relative path against the primary checkout, not the worktree; pass the absolute worktree path" (key worktree-edit-path, 0.9); "the skill lint exits 0 on a body that is one bare heading, so a green lint proves nothing about the body" (key skill-lint-blind-spot, 0.7)
traps: none - no behavioural gap this session; both findings were friction, recorded as lessons
instructions: 1 - skills/writing-skills/SKILL.md's close-out section states the bar and names no trigger, so every close-out depends on memory; carried to /self-extension as a library-defect candidate
prior lessons applied: release-tag-readback (confidence 0.8, from 2026-07-30)
stale rows: 2 - auth-refresh settled (its branch is merged into main and PR #214 is merged); csv-import left open (no merge, no PR, so it is genuinely still in flight)
```

An empty sweep writes the same five lines, with `no durable lesson: <why>` on the lessons line and
`stale rows: none` where no earlier session left one.
Where the session had a work-item, write the same block with the `write` tool to
`.better-dev/ledger/<work-item>/session-review.md` so the sweep travels with the work that earned it
rather than dying with the transcript.
