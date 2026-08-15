# Terminal states - the one taxonomy

Every loop settles in exactly one of six states. The harvested loops each shipped their own
vocabulary; this is the single set they all map onto, so a verdict means the same thing wherever it
came from. The loop records the settled state as the last line of `progress.md`.

| State | Meaning | Loop's next move |
|---|---|---|
| `DONE` | Proven against the done-criteria - a real check went green, not a claim. | Hand off to the PR-into-staging gate (`/pr-and-verify`). |
| `DONE_WITH_CONCERNS` | Proven, with residue no fix pass can retire: reviewer-accepted rebuttals, unresolved cannot-verify items, judgment-call doc concerns. A fixable finding of any severity never rides here. | Hand off; carry the flags into the PR body. |
| `BLOCKED` | An external blocker - something outside the loop must move first (red base, infra, a dependency). | An infra red first gets a recovery-signature recall and one retry (see the loop's "Triage the red"); if still red, surface the blocker, wait it out or route it, then resume. |
| `NEEDS_INPUT` | A human decision, missing context, or an approval is required. | Ask the one question; resume once answered. |
| `EXHAUSTED` | A budget or iteration limit was reached - the operator's, or the hard turn/wall-clock ceiling an unattended or scheduled run carries so it can't bill without limit. | Report honestly; the operator raises the budget or narrows scope. |
| `NO_PROGRESS` | Stagnated - a stuck-check `confirmed` it. | Restart-from-contract (read `restart.md`). |

## The hard rule

An error, a red check, a caught exception, or an exhausted budget never becomes `DONE` or
`DONE_WITH_CONCERNS`. Exhaustion is `EXHAUSTED`. A failure is `BLOCKED`, `NEEDS_INPUT`, or
`NO_PROGRESS` - whichever is true. A loop that reports success it can't prove is the failure mode this
whole taxonomy exists to prevent.

## Mapping - every source's verdict onto ours

| Source verdict | → | Ours | Note |
|---|---|---|---|
| grind `SUCCESS` | → | `DONE` | verify exits 0 |
| grind `BUDGET_EXHAUSTED` | → | `EXHAUSTED` | never `DONE` |
| grind `BLOCKED` - protected-path / broken verify | → | `BLOCKED` | the fix needs a surface the loop may not touch |
| grind `BLOCKED` - 3 identical failures, no learning | → | `NO_PROGRESS` | this is the stuck case, not an external block |
| loopy `success` / `clean no-op` | → | `DONE` | already-satisfied is a clean `DONE`, not a skip |
| loopy `blocked` | → | `BLOCKED` | |
| loopy `approval-required` | → | `NEEDS_INPUT` | |
| loopy `exhausted` | → | `EXHAUSTED` | |
| loopy `stagnated` / `no progress` | → | `NO_PROGRESS` | |
| SDD implementer `DONE` | → | `DONE` | |
| SDD implementer `DONE_WITH_CONCERNS` | → | `DONE_WITH_CONCERNS` | |
| SDD implementer `NEEDS_CONTEXT` | → | `NEEDS_INPUT` | |
| SDD implementer `BLOCKED` | → | `BLOCKED` or `NEEDS_INPUT` | context/reasoning gap → `NEEDS_INPUT`; external → `BLOCKED` |
| forge-ground `BASELINE_MAPPED` / `DEVIATION_CONFIRMED` | → | (gate pass) | premise holds - the loop proceeds; not a terminal state |
| forge-ground `EVIDENCE_LIMITED` | → | (gate pass) or `NEEDS_INPUT` | proceed on code evidence and record the limit, or ask |
| forge-ground `NOT_REPRODUCED` / `EXPECTATION_SUSPECT` / `ALREADY_SUPPORTED` | → | `NEEDS_INPUT` | premise is wrong - pushback, don't build |
| forge chain `BLOCKED_CONTRACT` (only a protected spec surface would clear it) | → | `NEEDS_INPUT` | the contract itself needs the owner's call - see `restart.md` |

The two-way splits are the reconciliation the sources never did. grind's single `BLOCKED` covers both a
genuine external block and a stuck loop; keep them apart, because they call for opposite responses -
one waits, the other restarts. SDD's `BLOCKED` splits the same way on whether the missing thing is
outside the loop (wait) or a decision only the human holds (ask).

The blast-radius stops land on the ask side of that same split: a step that would edit a high-consequence
denylist path, or a diff in a human-gate change class (security/auth, payments/PII/money,
infra/Terraform/prod config, a dependency bump, or anything a `git revert` wouldn't walk back - a
deletion, a destructive migration, a deploy) or past the scope-creep threshold, settles `NEEDS_INPUT` -
a human's call, not an external blocker, so never `BLOCKED`. `/autonomous-loop` defines the denylist
and the classes.

## Where each state comes to rest

`DONE` and `DONE_WITH_CONCERNS` are the only exits that flow forward into a PR. The other four are
honest stops: each names the one thing that has to change - an external event, a human answer, a bigger
budget, or a rebuild - and the loop holds there rather than manufacturing a green.
