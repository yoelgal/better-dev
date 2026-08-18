---
name: session-review
description: Use when a session is finishing and what it learned has not been written down yet - a work-item just settled, a PR merged and no further build is planned, a compaction or a context reset is about to discard the transcript, or the operator says the session is over. Also use when a session spent real time fighting this repo's own instructions - a skill's wording, a stale doc, a default that pointed the wrong way - and that defect needs recording where the next session will meet it. Also use when the operator asks what this session learned, or to save the learnings before closing.
---

# Session review

`bd-mem learn` keeps a keyed lesson, `bd-mem papercut add` keeps friction, the repo's trap record keeps
a behavioural gap, and all three sit idle unless something reaches for them while the session still
remembers what happened. This sweep is that something. The whole job is routing what this session
produced to the surface that will replay it, so the tokens already spent pay a second time. Reviewing
the code is `/review`; handing the work to another machine or colleague is `/worktree-branching`;
editing a skill is `/self-extension`.

## Run it at a terminal moment, never mid-work

Qualifying: the last work-item of the session has settled and no further build is planned; a PR merged
or closed; a compaction or a deliberate context reset is about to discard the transcript; the operator
says the session is over.

Not qualifying: between passes of the loop, with a red check open, or anywhere a work-item is still
live. A sweep there spends the context the work still needs and grades an unfinished story - land the
pass receipt and keep working. `/autonomous-loop` and `/pr-and-verify` each write their own item-level
lesson at their terminal state; this sweep runs over the whole session, so a lesson one of those
close-outs already wrote is cited here, never written twice.

## Four signals, four destinations

Walk the session's trail - what you retried, what surprised you, what you had to grep twice, what you
got wrong before you got it right - and route each finding by the row it matches:

| What the session produced | Where it goes | The test it has to pass |
|---|---|---|
| a cause, technique, or standing fact a future session would otherwise re-derive | `.better-dev/bin/bd-mem learn "<lesson>" <0..1> "<key>"` | the two close-out tests, named below |
| friction: a dead-end tool call, a broken doc link, a flaky command, output that lied | `.better-dev/bin/bd-mem papercut add "<what happened>" [context]` | it cost real time and nothing in the repo warned about it |
| a gap where a future agent following the instructions as written would fail the same way | the repo's trap record, as a rigged scenario with its pass line and fail line (better-dev's own is `docs/TRAPS.md`) | you can name the input that produces the wrong behaviour, and the observable that separates the pass from the fail |
| an instruction in this repo that sent the session the wrong way | the report, quoting the file and the exact sentence; the edit itself belongs to `/self-extension` or to the skill that owns the sentence | you can quote the sentence and say what it made you do |

Before writing any lesson, enter `/writing-skills` and read its close-out section: it owns the two
tests that gate the write and the negative-lesson filter, and this sweep applies them rather than
restating them. On the empty path there is nothing to gate, so skip the hop.

The last row is the highest-value output of the sweep and the one most often lost, because the pull at
this table is to file everything as a papercut - a papercut asks nothing of you, no key, no score, no
wording. Sort by who the finding is for. Friction that annoyed you is a papercut for the operator to
triage. A defect in a sentence the next agent will read is a correction, and filing it as a papercut
buries it in a queue.

## The empty result is a correct result

A session that fixed a typo, or one that only applied lessons already in the store, has nothing durable
to add, and its correct output is an explicit `no durable lesson: <why>`. The pull here is to
manufacture one so the sweep looks diligent, and a manufactured lesson is worse than silence: it costs
a read in every future recall it surfaces in and returns nothing. The check before any `learn` call is
whether you would want this line printed at the top of a recall six weeks from now, ahead of a lesson
that would have paid off. An empty sweep still reports, though: one that found nothing and said nothing
is indistinguishable from one that never ran.

## The report

Five lines, each written explicitly, negative forms included:

```
session-review 2026-08-17
lessons: 1 - learn "a worktree session calls bd-mem by its absolute primary-checkout path; .better-dev is gitignored, so the relative form fails" 0.9 "worktree-bd-mem-path"
papercuts: 2 - graphify status printed FRESH against a stale index; the skill lint exits 0 on a body that is one bare heading
traps: none - no behavioural gap this session, both failures were tool friction
instructions: 1 - skills/writing-skills/SKILL.md's close-out section states the bar and names no trigger, so every close-out depends on memory; carried to /self-extension as a library-defect candidate
prior lessons applied: worktree-bd-mem-path (confidence 0.9, from 2026-08-05)
```

An empty sweep writes the same five lines, with `no durable lesson: <why>` on the lessons line.
Where the session had a work-item, put the same block in its ledger
(`.better-dev/bin/bd-mem ledger put <work-item> session-review -`) so the sweep travels with the work
that earned it rather than dying with the transcript.
