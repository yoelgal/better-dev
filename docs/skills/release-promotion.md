# /release-promotion

## What it does

Moves the integration branch onto the release branch and tags a release - but only once every gate
comes back green from git and CI directly. It fails closed: a check whose answer is unknown counts
the same as a check that failed, and no gate gets relaxed to let a promote through. The same skill
also verifies a fresh deploy is actually live and healthy, rolls a bad release back, and lands a
production hotfix on both branches so the next promote doesn't quietly undo it. What it refuses to
do: merge feature work, touch a feature branch, or treat a pushed tag as the finish line while the
deploy behind it is still unproven.

## When to reach for it

| Situation | Route |
|---|---|
| Integration branch looks ready to ship | This skill - the promote-and-tag path |
| A tag just went up, unclear if the deploy landed | This skill - "did the deploy land" / "is prod healthy" |
| A release is causing problems in production | This skill - the rollback path |
| Production is down and needs a fix now | This skill's hotfix notes - but diagnose the incident with `/diagnose` first |
| A feature or fix still needs building | `/autonomous-loop`, not this skill |
| The PR into integration hasn't merged yet | `/pr-and-verify` |

## Where it fits

Runs after `/pr-and-verify` merges a work-item into the integration branch and it has soaked - this
is the last hop from integration to release, not a step in the build loop itself.

| Recorded `release-cadence` | What happens |
|---|---|
| `per-merge` | `/pr-and-verify` chains straight into this skill in the same turn |
| `on-demand` (the default) | Waits for the operator to ask |

Once a release is unhealthy, the rollback path here hands back to `/diagnose` and
`/autonomous-loop` for the actual fix, then returns here to land it.

## Prerequisites

- A real integration branch and release branch, confirmed at the git level, not assumed from prose in
  `CLAUDE.md`.
- Recorded deploy conventions from `/guardrails-install` - the deploy surface, the migration-apply
  mechanism, and any env vars the promote range newly needs. Where these were never recorded, the
  skill stops and names `/guardrails-install` (or `/deploy-capability` for a product that has never
  shipped) rather than guessing a command or URL.

## Common questions

**Why didn't my clean, green PR ship on its own?** Two different consent points exist: `merge: auto` on
the work-item's contract lets `/pr-and-verify` merge into integration without asking again, but
promoting integration to release is a separate decision gated by `release-cadence`. Unrecorded or
`on-demand` means the promote waits for you to ask; only `per-merge` chains straight into it.

**The deploy workflow went green and the tag is up - why does the release still show `NEEDS_INPUT`?**
A pushed tag is not the release; the deploy has to be observed landing and the deployed surface has to
be driven and hold. A failed run, a spent wait budget, or a surface this skill can't reach (VPN-only,
missing credentials) all settle short of `DONE` rather than being rounded up to it.

**My feature is behind a flag - why did the release come back flagged even though every check
passed?** The verify pass reads the flag's actual state before driving anything. A flag that stayed
off after a release that expected it live is graded as a failed check, not a footnote, because the
deploy landed but the feature didn't.

**I need to roll back a release that already ran a migration - can I just `git revert`?** Not without
checking first. A revert walks back the migration file, never the schema already applied in
production; reverted code would then run against a schema it never saw, and re-verification on the
revert's own code wouldn't catch it. The range gets diffed against the migrations glob before any
revert executes, and a hit stops for you to choose a down migration, a roll-forward fix, or a snapshot
restore.

**Why does a renamed or removed skill directory need a `docs/RELEASES.md` line at all?** For a library
that ships by pull rather than push, that line is the only channel telling an already-wired machine
anything is owed - a re-run of the installer, a re-onboard, a one-time offer. A release that changes
the repo surface and ships with no line leaves every machine that already updated with no way to hear
about it later.

## It's working if

- A promote either lands a fast-forwarded release branch with a pushed tag, or stops naming the exact
  gate that held it - never a silent skip and never a vague "looks fine."
- The release receipt (`bd-mem ledger read release-<version>`) carries a typed `deploy:` verdict and
  settles a terminal ledger state instead of sitting open indefinitely.
- A hotfix's commit shows up as an ancestor of both the release and integration branches, not just
  the one it was merged into.
- A rollback produces a new forward tag, never a moved or force-pushed one, and the revert is
  back-merged into integration.
