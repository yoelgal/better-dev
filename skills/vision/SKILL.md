---
name: vision
description: Use when an existing project's intent has to be recovered from its own evidence and written down as an acceptance policy - "what is this project actually for", "write a VISION.md", "we keep re-arguing the same scope question", a repo whose non-goals live only in one person's head - or when better-dev is being adopted in a repo that already has history. Also when a recorded vision needs checking against what has shipped since (drift), or rewriting rather than patching. For a project that does not exist yet, /groundwork settles intent forward; for structural orientation (callers, dependents, blast radius) /codebase-map; for one feature's plan, /plan-grill.
argument-hint: "[repo path or area, optional]"
---

# Recover a repo's intent from its own evidence

A codebase records what was built. It rarely records what the project is *for*, what it refuses to
be, or which promises hold whoever is editing - that lives in one person's head, and every agent
working the repo re-derives it from whatever files it happened to open. One job: **recover that
intent from evidence already in the repo, and record it as a repo-level acceptance policy a later
session can apply to a change nobody anticipated.**

The word is **vision**, and the artifact is a `VISION.md` at the repo root. It is an acceptance
policy: testable accept and resist criteria in declarative present tense, with explicit non-goals,
so a future reader - human or agent - can apply them to a concrete change. Readers reach for three
different names here (a constitution of invariants, a northstar agents cite in decisions, a
business-logic layer); this skill uses one term for one artifact, and the four things it is not
matter as much as what it is:

| Not this | Where that lives |
|---|---|
| A roadmap or feature list | The issue tracker and the ledger (`bd-mem ledger status`) |
| Coding standards or an agent guide | `AGENTS.md` / `CLAUDE.md`, and `.better-dev/overrides.md` for recorded per-repo rules |
| The domain or business-logic model - how the world works | A domain doc or glossary; a vision explaining entity relationships has absorbed it |
| One feature's plan | `/plan-grill`'s done-contract |

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`). A project may pin
where this artifact lives or that it is maintained by hand; that wins over anything below.

## 1. Pick the mode before drafting a line

Look for an existing `VISION.md` (or whatever an override pins) on the integration branch. If one
exists, this is a **delta**: treat it as the approved baseline, propose line-level candidate changes
from evidence newer than it, and never write a competing document beside it. If none exists, it is a
**from-scratch** pass. A rewrite is a third mode with its own trigger - section 7.

## 2. Mine the evidence - this is the whole value

Read backward through what the project already did. `/codebase-map` answers how the code is wired;
this pass answers what its history reveals about intent, so run it over the record, not the call
graph:

- **Identity claims** - the README, the docs front page, any existing `AGENTS.md`: what the project
  says it is, and any non-goal it already states.
- **History** - 50 to 100 commit titles on the integration branch, then 10 to 15 full messages
  spread across the range, not clustered at the tip. Where a GitHub-class CLI is available, merged
  PR bodies are richer than commit messages; where it is not, `git log` carries the same signal.
- **The refusals** - the richest seam and the one a generated document always skips: issues closed
  without a fix, features declined in review, PRs closed unmerged, and anything reverted. What a
  project would not accept is half of what it is.
- **The root-cause class** - which bugs got fixed at the seam rather than patched at the caller. That
  reveals which promises the maintainer treats as load-bearing, and those become the invariants.

Write the evidence sheet as you go, into `VISION-evidence.md` beside the artifact: one line per
recovered claim mapped to its receipts (commit sha, PR or issue number, `file:line`). That sheet, not
your memory of the reading, is the source of every drafted line, and it is what a later drift check
and rewrite read instead of mining again.

**A vision the agent invented is worse than none, because it will be cited.** Two counters at the
point where invention is tempting. When history is unreadable - a fresh import with a squashed
initial commit, no issues, no PR bodies - stop and say so rather than filling the shape from the
code's vibe; the honest output is "the evidence to recover intent is not here", plus what would
create it. And when the repo is small enough that you feel you already know what it is for, that
feeling is the training prior talking: a claim with no receipt on the sheet does not enter the draft,
however obviously true it reads. A repo under roughly 20 commits with no closed issues has not
revealed enough intent to mine, and that is `/groundwork`'s forward pass, not this one.

## 3. Draft the artifact

Four sections, 40 to 70 lines, declarative present tense, zero marketing, one sentence per line so a
later diff is reviewable. The invariants are stated from the *user's* side, because users do not care
what the code looks like, only that it does what they expect - and each carries a check, which is
what makes section 6 cheap. The shape, filled:

```markdown
# Vision

`tally` exists so that one person can see where their money went without handing a bank login to a third party.
It serves a single self-hosting user, and it turns exported statements and photographed receipts into a searchable ledger.
It owns exactly one thing: the ledger.

## Import is best-effort, the ledger is not

Any importer may fail on a row it cannot parse, and it says which row (PR 88, PR 104).
A parse failure never drops a row silently - the row lands as unreviewed (issue 61, fixed at the parser rather than the caller).

## The user's data outlives the app

Every view is reachable from one SQLite file with no server running (commit 4b1f0a2 moved reporting off the API on purpose).
Export is a supported path, not a debug tool.

## Invariants, from the user's side

| # | The user can count on | Check |
|---|---|---|
| 1 | A receipt they photographed is in the ledger or in the failures list, never neither | `just test tests/import_partition.rs` |
| 2 | Nothing leaves the machine unless they export it | `grep -rn "https\?://" src/` returns only the docs URL |
| 3 | Re-running an import over the same file doubles nothing | `just test tests/idempotent_import.rs` |

## Non-goals

It is not a bank aggregator, and it never asks for a credential to a third-party service (declined in issue 45, issue 92).
It is not multi-user, and it grows no accounts, roles, or sharing (declined in issue 71).
It is not a budgeting or forecasting tool - it records what happened (README, since the first commit).
It does not become a hosted service (issue 45).

A change aligns when it makes a real statement or receipt land correctly with less user attention, or makes the ledger easier to read, export, or recover.
A change should be resisted when it adds a network dependency the user did not ask for, adds a second user, trades a silent drop for a faster import, or turns the ledger into a forecast.
```

Every line above carries a receipt or a check. A generic engineering virtue ("we value quality") has
no receipt and no check, so it does not belong in the file. A delta pass instead yields the baseline
unchanged plus a numbered list of candidate edits, each with its own evidence, each independently
acceptable or rejectable.

## 4. Stress-test what the evidence left open

Evidence says what happened. It does not settle a boundary history never tested, and those are
exactly the boundaries a future change will land on. Put 6 to 10 concrete change proposals to the
human - proposals nobody made, aimed at the draft's fault lines: a tempting off-mission feature the
project will plausibly be asked for, a collision between two of its own principles, a slippery slope
where one reasonable step normalizes the next, a scope expansion (a second user, a new host, a
team), and an identity question the draft leaves open. Each one names the principle it tests, quoted
from the draft, and steelmans both sides.

The gate that makes these worth the human's attention: **delete and replace any proposal whose
answer you can predict.** A proposal you can call is a proposal the draft already answers, and asking
it spends the one resource this skill is trying to conserve.

Ask in batches, each question carrying the answer you would pick and why. The human owns the vision:
fold in their verdicts, never approve on their behalf, never read silence as approval, and never
fold in a principle they neither stated nor demonstrated. Every verdict maps to one named edit, so
they can see how their answer changed the text. Where the host ships an interactive review surface,
present the draft and the proposals there rather than in chat - detect it by what it does, and fall
back to batched questions, which are sufficient.

## 5. Land it and make it findable

Write `VISION.md` (or the override's path) and `VISION-evidence.md` beside it, then record the
pointer so a later session finds the policy instead of re-deriving it:

```bash
.better-dev/bin/bd-mem remember "vision: VISION.md is this repo's acceptance policy; drift-checked <date>"
```

That one rule is what makes `recall "vision"` answer for `/plan-grill` and `/review`. Without it the
file is a document nobody opens.

## 6. The drift check - the reason the file stays honest

A vision written once and never checked becomes a confidently-cited fiction. The check is deliberately
cheap, which is why the invariants carry their own commands: read `VISION.md`, run each invariant's
check, and read the resist test against the changes merged since the last check (or, mid-review,
against the diff in hand). One typed status per line, into `VISION-evidence.md` under a dated
heading, with the evidence in the row:

```markdown
| # | Invariant | Status | Evidence |
|---|---|---|---|
| 2 | Nothing leaves the machine unless they export it | drifted | `src/sync.rs:14` posts to an update endpoint (added 2026-07-11) |
```

`Status` is one of `holds`, `drifted`, `uncheckable` - an invariant whose check no longer runs is
`uncheckable`, never quietly `holds`. Run it when a change touches a named invariant (`/review`'s
gate is the natural moment) and once at each release.

A `drifted` row has exactly two dispositions, and this skill picks neither: **the code is wrong**, and
it becomes a work-item, or **the vision is wrong**, and it goes to section 7. Report both readings
with the evidence and let the human choose. Editing the drifted line to match what shipped is how an
acceptance policy quietly becomes a description of whatever happened, and at that point it can no
longer resist anything.

## 7. Revision cadence - patch or rewrite

Patch by default, through section 1's delta mode. Rewrite from a fresh mining pass only on these
signals:

| Signal | Disposition |
|---|---|
| New evidence adds a criterion nothing in the file contradicts | Patch - one delta line, with its receipt |
| One approved change that the resist test rejects | Patch that line, citing the human's verdict as the evidence |
| Two or more approved changes the resist test rejects | Rewrite - the tests are behind the project, not ahead of it |
| The identity opener is false - a different user, or it no longer owns exactly one thing | Rewrite |
| Three or more invariants sit `drifted` and the drift was intentional | Rewrite |
| A year of active development with none of the above | One mining pass over evidence since the last one, then patch |

A rewrite re-runs sections 2 through 4 and keeps the old file's text in the evidence sheet under its
end date, so what the project used to believe stays readable. A vision that turns out wrong is not a
failure of the practice - it is the practice working, one release later than the code.

Close out with the single durable lesson this pass earned
(`.better-dev/bin/bd-mem learn "<lesson>" <0..1> "<key>"`), or an explicit `no durable lesson` line
saying why. The vision's content is not the lesson; what the mining pass revealed about this repo is.

## Composability

This adds an artifact and never disables anything. `/groundwork` writes intent forward for something
that does not exist yet, and pins its one differentiating idea inside one epic; this recovers intent
backward for something that does, at repo level, from evidence. `/codebase-map` answers how the code
is wired, which is the other half of an orientation. `/plan-grill` and `/review` consume the artifact;
neither maintains it. When revising this skill, follow `/writing-skills`.
