# /vision

## What it does

Recovers what an existing project is *for* from evidence already in the repo, and records it as a
repo-level acceptance policy: testable accept and resist criteria in declarative present tense,
invariants stated from the user's side with a command that checks each one, and explicit non-goals.
The defining constraint is the receipt - a claim with no commit, PR, issue, or `file:line` behind it
does not enter the draft, however obviously true it reads, because a vision the agent invented is
worse than none once later sessions start citing it. Where the history is unreadable the honest
output is that the evidence is not there, plus what would create it.

## When to reach for it

| Situation | Route |
|---|---|
| "What is this project actually for", "write a VISION.md" | `/vision` |
| The same scope question keeps getting re-argued | `/vision` |
| The non-goals live only in one person's head | `/vision` |
| better-dev is being adopted in a repo that already has history | `/vision`, before the first grill |
| A recorded vision needs checking against what has shipped since | `/vision`, drift-check mode |
| The project does not exist yet | `/groundwork` settles intent forward |
| Callers, dependents, blast radius | `/codebase-map` |
| One feature's plan | `/plan-grill` |

Four things it deliberately is not: a roadmap or feature list (the tracker and the ledger),
coding standards or an agent guide (`AGENTS.md` / `CLAUDE.md`, and recorded overrides), the domain or
business-logic model (a domain doc or glossary), and one feature's plan (`/plan-grill`'s
done-contract).

## Where it fits

The counterpart to `/groundwork` for a repo that already has a past: groundwork writes intent forward
for one epic that does not exist yet, this recovers intent backward at repo level from evidence.
`/onboard` names it as the step to run before the first grill when the repo is not greenfield.
`/plan-grill` reads the recorded policy as a premise before grilling and stops a feature its resist
test rejects, and `/review` runs the drift check when a change touches a named invariant. Both consume
the artifact; neither maintains it.

## Prerequisites

Enough history to mine. A repo under roughly 20 commits with no closed issues has not revealed enough
intent, and that is `/groundwork`'s forward pass instead. The evidence also has to be readable - a
fresh import with a squashed initial commit, no issues and no PR bodies is a stop, not a prompt to
fill the shape from the code's feel.

## Common questions

**This repo is small and it is obvious what it is for - why the mining pass?** Because that feeling is
the training prior talking, and it produces a document that reads right and cites nothing. The richest
seam is the one a generated version always skips: the refusals - issues closed without a fix, features
declined in review, PRs closed unmerged, anything reverted. What a project would not accept is half of
what it is.

**An invariant has drifted - does it fix the file?** No, and this is the point where an acceptance
policy usually dies. A drifted row has exactly two readings: the code is wrong, and it becomes a
work-item, or the vision is wrong, and it goes to a revision. Both readings are reported with their
evidence and the human picks. Editing the drifted line to match what shipped turns the policy into a
description of whatever happened, and at that point it can no longer resist anything.

**Why does it come back with six to ten change proposals nobody asked for?** Because evidence only says
what happened, and a future change will land on a boundary history never tested. Each proposal names
the principle it tests, quoted from the draft, steelmans both sides, and carries the answer the pass
would pick. Any proposal whose answer the pass can predict is deleted before it reaches you - a
predictable one is already answered by the draft.

**How does the file avoid becoming a document nobody opens?** The pointer is recorded in the memory
store when the artifact lands, so a later recall answers with it. Without that one line the policy
exists and nothing reaches for it.

## It's working if

- A scope question the team keeps re-arguing gets settled by a stated criterion with a receipt behind
  it, rather than by whoever happens to be in the room
- Every line in the policy traces to something the project actually did, and a generic engineering
  virtue with no receipt and no check is absent
- Each invariant carries a command you can run, so checking the policy costs minutes rather than a
  reading pass
- An invariant whose check no longer runs is reported as uncheckable, never quietly as holding
- A change nobody anticipated can be judged by a session that was not in the room when the policy was
  written
- A later session recalls the policy instead of re-deriving the project's intent from whatever files it
  happened to open
