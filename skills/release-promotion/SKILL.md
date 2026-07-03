---
name: release-promotion
description: Use when the integration branch looks ready to ship and someone wants to promote it to the release branch and tag a release — or when a production incident needs a hotfix landed correctly. For the hotfix path specifically, this skill's hotfix notes carry the both-branches detail.
allowed-tools:
  - Bash
  - Read
---

# Release promotion

One job: move the integration branch onto the release branch **only when it is genuinely
releasable**, tag that release, and — separately — run a hotfix so the fix reaches production
and never gets lost on the next promote.

Promotion is the one irreversible step in the branching model: once `main` moves and a tag is
pushed, users are getting that code. So this skill fails closed. Every check has to come back
green from git and CI directly; a check whose answer is *unknown* is not a passing check, and any
doubt stops the promote rather than shipping through it.

## Before anything: read the overrides

The branch names below are the model's defaults, not a mandate. A project may integrate on
`develop`, release from `master`, or prefix hotfixes `hf/`. Read what the repo actually does and let
it win:

```bash
.better-dev/bin/bd-mem read overrides 2>/dev/null
.better-dev/bin/bd-mem recall "release integration branch tag hotfix" 2>/dev/null
```

```bash
integration="staging"   # honor an override (e.g. develop)
release="main"          # honor an override (e.g. master)
```

## Verify the premise at the git level

A branch named in prose — or in `CLAUDE.md`, or in this file — isn't a branch until git shows it.
Confirm both ends are real before touching either (the same discipline `/onboard` uses):

```bash
git fetch origin --tags 2>/dev/null || true
git rev-parse --verify --quiet "origin/$integration" || git rev-parse --verify --quiet "$integration"
git rev-parse --verify --quiet "origin/$release"     || git rev-parse --verify --quiet "$release"
```

If either is missing, stop and report it — a promote with no real source or target is an onboarding
gap, not something to improvise.

## The release gate — all of it, or no promote

Check the head commit of the integration branch, not a stale local copy. Every gate has to hold:

- **CI is green on the integration head.** Read it from wherever the project's CI actually reports —
  a commit status (`gh api repos/{owner}/{repo}/commits/$sha/status`), the checks on the last PR
  into integration, or the dashboard the repo uses. A red run stops the promote. So does an
  *unknown* run: no status is not a green status.
- **No open blockers.** No open issue or PR marked as a release blocker for this cut. If the project
  has no blocker convention, say so and let the operator confirm rather than assuming zero.
- **It has soaked.** The integration head has sat stable for the agreed soak window since the last
  merge, with verification passing on it — not a commit that landed sixty seconds ago. Check the age
  of the head commit and confirm the window has elapsed.
- **Release contains everything already released.** `main` must be an ancestor of `staging`:

  ```bash
  git merge-base --is-ancestor "origin/$release" "origin/$integration" \
    && echo "release is contained" || echo "DIVERGED"
  ```

  A `DIVERGED` result means `main` holds a commit `staging` doesn't — almost always a hotfix that was
  never merged back. Reconcile that first (see the hotfix notes); promoting over it would drop the
  fix.

If a gate is red or its answer can't be established, this is a `BLOCKED` (a hard failure) or
`NEEDS_INPUT` (a convention the operator has to name) — report which gate and stop. Don't relax a
gate to get past it.

## Promote, then tag

With every gate green, move the release branch onto the integration head. Because the ancestor check
passed, this is a clean fast-forward; refusing anything that *isn't* a fast-forward keeps a stray
local commit from riding along:

```bash
git switch "$release" && git merge --ff-only "origin/$integration"
```

Then tag the release at that commit. Take the version from the project's scheme (a bumped
`package.json`, a `VERSION` file, the last tag's successor) — read it, don't invent one. If no scheme
is discoverable, that's a `NEEDS_INPUT`: ask for the version rather than guessing:

```bash
git tag -a "$version" -m "release $version" && git push origin "$release" "$version"
```

Record the promote so a later session can see what shipped:

```bash
printf 'released: %s\nfrom: %s@%s\nto: %s\n' \
  "$version" "$integration" "$(git rev-parse --short "origin/$integration")" "$release" \
  | .better-dev/bin/bd-mem ledger put "release-$version" release.md -
```

A normal push here, never `--force`: the release branch is protected, and a forced update to it is
the exact accident this skill exists to prevent.

## Hotfixes

A production hotfix branches off the release branch, not integration — and once it ships it has to
land on **both** branches, or the next promote silently reverts it. That both-sides discipline, the
back-merge, and the proof that the fix reached each branch live in `hotfix.md`; read it when an
incident needs a fix in production now. Create the branch itself through `/worktree-branching` (it
already bases `hotfix/<slug>` on `main`), drive the fix with `/autonomous-loop`, and run `/review`
before it merges — this skill owns only the promotion and back-merge shape, not the fixing.

## Where this sits

`/review` runs on the PR into integration; this skill runs *after* integration has soaked, to carry
it the last hop to release. It never merges feature work and never touches a feature branch — its
only writes are the fast-forward of the release branch, the tag, and (for a hotfix) the back-merge
into integration.
