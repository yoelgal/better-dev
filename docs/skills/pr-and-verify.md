# /pr-and-verify

## What it does

Takes a work-item that already settled `DONE` or `DONE_WITH_CONCERNS` in its loop and drives its PR to a
green that is proven, not asserted: opens or refreshes the PR, reads CI truthfully across three probes
instead of trusting one, then drives the contract's done-criteria on a running surface and captures what
it actually saw. It never runs review itself and never opens a PR on an unreviewed change - the clean
verdict has to already be on record before this skill touches anything. When something comes back red, it
hands the failure to `/autonomous-loop` rather than patching it in place; the thing that writes a fix is
never the thing that grades it green.

## When to reach for it

"Ship it", "open a PR", "let's merge this", or the loop just settled `DONE` / `DONE_WITH_CONCERNS` on a
work-item. A red CI check or a failed done-criterion routes back to `/autonomous-loop` as a fix pass;
this skill decides *when* the change isn't green yet, it doesn't fix anything itself.

## Where it fits

The hand-off point between the build loop and shipping: `/autonomous-loop` settles a work-item, this skill
opens and proves its PR, and a green mergeable PR hands to `/release-promotion` for the tag. It leans on
`/review`'s recorded verdict, the contract in the work-item's ledger, and the host's monitor primitive for
watching CI and reviewer activity rather than polling.

## Prerequisites

The loop has already settled `DONE` or `DONE_WITH_CONCERNS` on the work-item, with a clean,
HEAD-current review verdict already in the ledger. If the loop hasn't produced one yet, that's
`/autonomous-loop` still running, not this skill.

## Common questions

**Green CI means it's safe to merge, right?** No - CI proves the suite ran, not that the change is
correct. Step 3 is a separate runtime pass: drive the change on the surface a user meets it and read
what actually happened, because a dashboard that renders a confidently wrong number can sit behind an
all-green check run.

**Will it merge automatically once everything's green?** Only when two things both say so: the repo has
a recorded `merge-policy: auto-on-green`, and this specific work-item's contract carries `merge: auto`.
A missing merge-policy, a missing `merge:` line, or a contract that says `hold` all hold the PR the same
way - green and mergeable, with the operator named as the merger. Silence is never read as consent, and
the reverse also holds: once both are recorded, the skill doesn't stop to ask again - that consent was
already given at contract seal.

**Does it fix a red check or a failing criterion itself?** No. The genuine / flake / infra
classification of a red belongs to `/autonomous-loop` - this skill only routes on that verdict, and
either hands a genuine failure back to `/autonomous-loop` with the run id and first failure line, or
arms a bounded wait for something external clearing on its own. A fix that lands here still gets
re-reviewed and re-recorded to the ledger before it pushes, so the PR never merges on an unreviewed diff.

**It named `/release-promotion` in its report but didn't actually promote anything - is that a bug?**
Only if the repo records `release-cadence: per-merge` and nothing gated it - in that case the skill is
expected to continue into the promote in the same turn and report what it settled. A closing line that
merely names the next skill without having run it is the failure mode the library specifically calls out:
the operator reads "next, run X" as work still owed. On the default `on-demand` cadence, naming it and
stopping is correct.

**A bad change made it through review and CI and turned out wrong anyway - now what?** It doesn't get
fixed forward in place. The response is containment first: pause new merges, revert the offending range
(after checking it isn't a schema migration, which routes to `/release-promotion`'s own down-migration
path instead), record the incident as a lesson, and only then re-enter the loop against a tightened
contract.

## It's working if

- The PR opens ready for review (never a draft), and its body carries a brief plus a per-criterion evidence
  table where every row has a real observation or the literal word `unverified` - never a blank cell.
- A red check or failed criterion comes back with a named cause, not a bare "fixed" - the report explains
  why the signal was red before claiming the re-run green.
- The PR only merges when the contract's `merge:` line and the repo's recorded merge-policy both say so;
  otherwise it sits green and mergeable with the operator named as the one who merges it.
- The terminal report leads with one line naming the state, the PR URL, and whether it merged - and the
  line after it describes what the operator can now do, not a list of files touched.
- Closing a merged PR always deposits a six-line ledger record (lesson, shared-behavior change, originating
  report, parked follow-ups, worktree disposition, release) - never a subset, and a `no <x>` line stands in
  wherever a category doesn't apply rather than being left out.
