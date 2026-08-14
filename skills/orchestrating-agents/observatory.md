# The run observatory

A run nobody sits inside still has to be readable from outside it. One emission contract serves that:
the run appends a record, and a page renders the record. Three skills compose the form here rather
than respecifying it - `/gauntlet` for a fresh-session run, `/autonomous-loop` for a long or
unattended work-item, `/pr-and-verify` for the landed evidence.

## The record

One append-only file, one block per round, written before the page is regenerated. A block carries the
round number, one state word per unit, the critic's named gap quoted rather than summarized, the
spend so far against the ceiling the stop condition named, and any proposed bar amendment with its
reason - the record is where an amendment waits for the human, never an edit to the bar itself. Earlier blocks are never rewritten: a
compaction then costs the page's markup and nothing else, and the finished run reads in order instead
of showing whatever the last round happened to overwrite.

One state word per unit, from exactly four:

- `BUILDING` - the unit's builder is working.
- `JUDGING` - the critic is holding the artifact against its bar row.
- `WAITING` - a question is parked for the human (below).
- `STUCK` - no move left the run can make itself.

A page that reads `BUILDING` for an hour is indistinguishable from a dead run, which is the failure the
word set exists to prevent.

Where graphify is wired - or one AST-only sync on the artifact is cheap - the round block also carries
the affected surface from `graphify-wrapper-query --affected`, so the round's blast radius is
structural rather than recalled.

## The page renders, it never records

The page is a renderer over the record: self-refreshing (a meta-refresh tag or a few lines of polling),
no framework, no server to babysit. Nothing appears on it that is not in the record first - a fact
worth showing is worth appending. Budget it at one append plus one regeneration per round; a round that
spent more on the surface than on the artifact is a defect the next round corrects.

## The question channel

A fork the house rules do not settle is not a place to pick a plausible default. The run writes that
unit's block `WAITING` with the question and two candidate answers, advances the other units, and reads
the answer file at each round boundary. One named file the human writes into, nothing else: the human
never types into the run's session, and the run has somewhere to put a question instead of a guess.
A run with no unit left to advance and an unanswered question is `STUCK`, and the record says so rather
than going quiet.

## Counters stay inside the run

Spend against the ceiling, the round count, how often a check failed across this run's rounds - each is
a series inside one run or one work-item, and it dies with that item. Nothing here is aggregated across
items or charted across time; a store that outlives the work-item is a trend DB, which the library
declines to keep.

## The atlas is a different surface

The RUN OBSERVATORY above renders a record that accumulates within one run. The CODEBASE ATLAS - the
rendered code-graph page `.better-dev/bin/bd-atlas` (dev: `better-dev/scripts/bd-atlas`) emits, and
graphify's own graph.html and callflow
pages - is a pure function of the graph and its commit and holds no history: delete it and rebuild it
losslessly. The two never share a store, a page, or the word "observatory." A fact about the run goes on
the record; a fact about the code is recomputed from the graph. This is the deletion test that keeps
rendered surfaces honest: if deleting a page loses a fact no query can recompute, that fact belonged on
the run's record, not on the atlas.

## The critic fence

The record and the page are surfaces the blind critic never reads. The critic receives the artifact and
its bar row, nothing else - a critic that can read the run's own account of itself grades the account.

## What each composer supplies

- `/gauntlet` - plain files in the run's own working directory (`gauntlet/RUN.md`, beside
  `gauntlet/PROMPT.md`), deliberately never `bd-mem`: a gauntlet run is a fresh session on a repo that
  may carry no better-dev wiring, so a `bd-mem` dependency would fail exactly where the record is
  needed most. A fresh session resumes from prompt plus record.
- `/autonomous-loop` - the ledger already is the record. `receipts.md` and `progress.md` carry the
  per-round facts, so a page for a long run is a renderer over them and nothing new gets recorded to
  put one up. Key it to the operator-set ceiling, since that is the number the page renders against.
- `/pr-and-verify` - the PR-side surface is that skill's `pr-evidence` block, one row per
  done-criterion. It owns the block's columns; reach for it by name rather than restating them.

## The two-sentence form for a handoff prompt

`/gauntlet`'s prompt carries the compressed version under its sentence budget. Copy these two sentences
rather than redrafting them:

> The run appends one block per round to a single run-local record file - round number, one state word
> per unit (BUILDING, JUDGING, WAITING, STUCK), the critic's named gap, spend so far against the
> ceiling - and the progress page is a self-refreshing renderer over that file, never a second memory.
> A fork the house rules do not settle writes that unit's block WAITING with the question and two
> candidate answers, advances the other units, and reads the answer file at each round boundary.
