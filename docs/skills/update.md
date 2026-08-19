# /update

## What it does

Brings the better-dev tool and this repo's wiring current: pulls the one global clone every repo
shares, reconciles this repo's CLAUDE.md wiring against what the pull changed, sweeps
this repo's stale ledger rows, and stamps the repo's own record of which version it is wired to. It
never touches the clone beyond a fast-forward pull - a refused pull (local edits in the clone) or an
offline pull is reported and left alone, never merged, reset, or forced on the operator's behalf. And
it never sweeps ACROSS repos: a repo-surface change tops up the repo currently in front of it, not
every other repo wired on the same machine.

The ledger sweep lives here because this is the only verb an operator runs again in a repo they
already set up. A work-item's terminal state is written by the session that finishes it, so a session
that ended at the merge left its row reading `in-flight` with its branch long gone. `/update` closes
those from mechanical evidence only - the row's own `pr.md` names a PR, that PR's commit is in the
integration branch, and no recorded branch is still ahead. Never a judgment call, and it shows the
evidence rather than settling records nobody read.

## When to reach for it

- "update better-dev", "is there an update"
- After pulling the global clone by hand, to reconcile this repo's wiring

Near neighbours: a repo with no `.better-dev/` at all has never been wired - that is `/onboard`,
not `/update`. A host with no clone installed at all is a fresh install - that is
[BOOTSTRAP.md](../../BOOTSTRAP.md), not `/update`.

## Where it fits

Sits outside the plan-build-ship chain - it is upkeep, not a work-item. It runs standalone from a
direct ask, and on a repo-surface change it calls into `/onboard`'s top-up for the current repo only.

## Prerequisites

- This repo already wired (`.better-dev/` exists) - an unwired repo routes to `/onboard` instead.
- A better-dev clone installed on this host - see [BOOTSTRAP.md](../../BOOTSTRAP.md) if none resolves.

## Common questions

**Why did it only fix this repo and not the other repos I have wired on this machine?** Each wired
repo reaches `/update` on its own consent; a release that changes the repo surface tops up only the
repo currently running `/update`, never every repo on the
host. Sweeping the rest would apply a top-up nobody in those repos asked for.

**My `.better-dev/wired-version` doesn't match the clone's installed version - am I behind?** Not
necessarily. The stamp tracks which release last changed something inside the repo surface (a
`reonboard` flag); the clone's manifest version tracks the tool itself, and a pull-only release moves
the manifest without needing to move the stamp. The gap between the two numbers is not itself a
pending update - what matters is whether any release between the stamp and the manifest carries a
flag, and `/update` reads that, not the raw version difference.

## It's working if

- Repos you did not run `/update` in are untouched - no top-up landed anywhere but the current one.
- An opt-in capability the release added surfaces as one question, is applied only on a yes, and is
  never asked again in this repo after a no.
- Running `/update` again right after finishing reports nothing pending - it does not re-apply a
  flag already handled here, even if the clone's manifest version still reads ahead of this
  repo's own record.
- A ledger row whose PR is already in the integration branch reads a terminal state afterwards, with
  the PR named in its note - and a later `/update` no longer counts it as work in flight. A row it
  could not prove (no `pr.md`, an unmerged PR, a branch still ahead) is untouched and still in flight.
