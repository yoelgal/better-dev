---
name: release-promotion
description: Use when the integration branch looks ready to ship and someone wants to promote it to the release branch and tag a release, when a just-tagged release needs its deploy verified live and healthy ("did the deploy land", "is prod healthy after the release"), when a bad release needs rolling back ("roll back the release", "revert prod"), or when a production incident needs a hotfix landed correctly. For the hotfix path specifically, this skill's hotfix notes carry the both-branches detail.
allowed-tools:
  - Bash
  - Read
---

# Release promotion

One job: get the released head onto the release branch **only when it is genuinely releasable**, cut
the version and tag it, and - separately - run a hotfix that never gets lost on the next promote. On
a staged repo the first half is a promote; on a trunk repo the head is already there and the cut is
the whole job. Once the branch moves and the tag is pushed users have that code, so this skill fails
closed: every check comes back green from git and CI directly, and an *unknown* stops the release.

## Name the path before acting

Four shapes ship and two facts pick one, neither of them assumed. The branch names are defaults, not
a mandate - a project may integrate on `develop`, release from `master`, or prefix hotfixes `hf/` -
so start from what the repo records and let it win:

```bash
.better-dev/bin/bd-mem read overrides 2>/dev/null
.better-dev/bin/bd-mem recall "release integration branch tag hotfix" 2>/dev/null
.better-dev/bin/bd-mem recall "branch-model version-surface release-automation" 2>/dev/null
integration="staging"   # honor an override (e.g. develop)
release="main"          # honor an override (e.g. master)
```

**Branch model.** A branch named in prose - in `CLAUDE.md`, in a rule, or in this file - is not a
branch until git shows it, so resolve both ends first:

```bash
git fetch origin --tags 2>/dev/null || true
git rev-parse --verify --quiet "origin/$integration" || git rev-parse --verify --quiet "$integration"
git rev-parse --verify --quiet "origin/$release"     || git rev-parse --verify --quiet "$release"
```

One name for both, or two names on the same sha, is **trunk**; two refs that differ is **staged**; an
integration ref that resolves to nothing while the release ref is real is **trunk** as well - that is
exactly the shape `/onboard` records on a trunk repo, not a fault. Nothing recorded plus two real
branches defaults to staged.

Where a recorded `branch-model` and git disagree, **git wins**: state the resolved shape and the
disagreement in one line, release on git's shape, and leave the stale record for `/onboard` to
re-record - the run does not stop on it. One resolution does stop the run: a **release** ref that
resolves to nothing is an onboarding gap, because there is no branch to release onto and nothing here
may guess one.

**Name the released head once, here.** Every gate and flag diff below runs against `$released_head`,
never `HEAD`: work happens in `feat/*` worktrees, so a primary checkout's local integration branch is
routinely several merges behind the remote, and a diff against `HEAD` there comes back empty over a
range that really did carry a migration or add a skill dir.

```bash
released_head="$(git rev-parse "origin/$integration")"   # trunk path: git rev-parse HEAD
prev_tag="$(git describe --tags --abbrev=0 "$released_head" 2>/dev/null)"   # e.g. v0.12.1
prefix="${prev_tag%%[0-9]*}"   # everything before the first digit: `v`, `rel-`, or empty
```

The version commit lands on this head later and moves it, so it gets re-resolved twice below - **Move
the release branch** re-fetches, and **Tag the released head** re-reads it before the tag.

An empty `prev_tag` is a repo that has never tagged (`git describe` exits 128 there), and
`"$prev_tag".."$released_head"` is then a fatal ambiguous argument, not an empty diff. Read the range
as the whole history instead (`git log "$released_head"`, no `..`), take the version from what the
version surface already carries, and **ask** for the prefix - `v` is a convention, not a default.

**Release automation.** Wired when a repo rule names it (`release-automation: <tool>`) or its config
is in the tree: `release-please-config.json`, `.changeset/`, `.releaserc*`, a tag-cutting workflow. A
config nobody has run is not the mechanism, so present-but-unrecorded means ask once and record it.

State the resolved path in one line before the first write - `trunk, no automation: cut and tag at
the green head` - so a run that detected wrong is stopped before it writes anything.

| Path | The job here |
|---|---|
| trunk, no automation | The gate, then **Cut the version** and **Tag the released head**. No promote, no fast-forward, no ancestor gate, no soak beyond the merged PR's own CI. |
| trunk, automation | Drive that automation to its release, then read the result back from git. The cut section is what it must have done, not a second pass by hand. |
| staged, no automation | The full gate, the cut, the fast-forward promote, the tag - unchanged from what this skill has always done. The cut lands **before** the promote so the bump rides the released range. |
| staged, automation | The full gate and the promote; the automation bumps and tags once the release branch moves, and you verify that it did. |

Every path ends the same way: a tag at the released head, then `post-deploy.md`'s deploy-verify pass.

## The release gate - all of it, or nothing ships

Check `$released_head` - the head detection just named, never `HEAD` and never a stale local copy.
Every gate has to hold:

- **CI is green on that head.** Read it from wherever the project's CI actually reports: a commit
  status (`gh api repos/{owner}/{repo}/commits/$released_head/status`), the checks on the last PR
  merged into it, or the dashboard the repo uses. A red run stops the release, and so does an
  *unknown* one - no status is not a green status. On a trunk path this is the only gate between the
  head and the tag.
- **No open blockers.** No open issue or PR marked as a release blocker for this cut. If the project
  has no blocker convention, say so and let the operator confirm rather than assuming zero.
- **It has soaked - staged paths only.** Read the soak window from overrides
  (`bd-mem recall "soak window"`); with none set, default to 24h since the last merge, or one full
  green CI cycle where the repo runs no time-based window. "Stable" means a named verify-receipt in
  the ledger recorded against *this* head - `bd-mem ledger read` the work-item that last shipped in
  and confirm the receipt names this sha. No receipt on the head is a `NEEDS_INPUT`, not a pass; one
  on an older sha with merges since hasn't soaked here. A trunk path has no window to wait out -
  `/pr-and-verify`'s merge into the trunk *is* the release - but the receipt half binds all the same.
- **Release contains everything already released - staged paths only.** `main` must be an ancestor
  of `staging`:

  ```bash
  git merge-base --is-ancestor "origin/$release" "origin/$integration" \
    && echo "release is contained" || echo "DIVERGED"
  ```

  `DIVERGED` means `main` holds a commit `staging` doesn't - almost always a hotfix never merged
  back. Reconcile that first (see the hotfix notes); promoting over it would drop the fix. A branch
  cannot diverge from itself, so a trunk path skips this gate entirely.

- **Migrations and newly required env vars in the range are accounted for.** Diff the range against
  the recorded migrations glob (`git diff "$prev_tag".."$released_head" --name-only`, grepped against
  `safety-denylist`, recorded by `/guardrails-install`; a migrations directory with no recorded glob
  settles `NEEDS_INPUT` naming that recorder rather than passing on an empty grep). On a hit, run the
  migration gate in `migrations.md` first: it fixes the apply order relative to the deploy and
  snapshots before anything destructive, and new code over an un-migrated schema fails only *after*
  the tag. Where the range newly reads an env var, recall `"deploy-env"` and confirm each exists in
  production; a missing one settles `NEEDS_INPUT` naming the var, green build or not.

A gate that is red or unanswerable is a `BLOCKED` (hard failure) or a `NEEDS_INPUT` (a convention the
operator has to name) - report which gate and stop, never relax one to get past it.

## Cut the version

Run every step from here one command at a time, reading each result back from the authority
(`git log --oneline -1` for a branch head, `git status --porcelain` for a clean tree,
`git ls-remote --tags origin` for a pushed tag, `gh pr view <n> --json state,mergedAt` for a merge)
and never from a script's own echo. The clean-tree read is not ceremony here: this section **writes**
two files, so an unrelated edit already sitting in the tree rides into the version commit. Batched into
one `set -e` chain a failure that is not the last command of an `&&`/`||` list, or one inside a
pipeline without `pipefail`, is exempt from the abort, so a refused fast-forward or an unpushed tag
scrolls past under a final success line - on the one step that cannot be taken back.

The version commit lands on the branch **about to be** released, before the release branch moves, and
only the tag comes after. On a staged path that is the integration branch, where it rides the promote
range through the gates above and moves the head - so re-read the CI gate there, on the head actually
being promoted. Bumping after the promote instead leaves the tag naming a tree whose manifest is one
version behind, or makes the bump a direct commit on a protected branch. On a trunk path it is an
ordinary reviewed PR into the trunk, which takes no direct pushes (`/pr-and-verify` exempts a
release-internal version PR from the cadence, so this can't recurse).

That order is the by-hand one. **Where an automation is wired it owns the order** - a release-please
shaped tool bumps and tags *after* the release branch moves, which is what the path table's automation
rows say - so there the job is to drive it and read the result back, not to re-impose this sequence.

**Where the version lives is recorded, not guessed.** The `version-surface` rule from the recall
above names the file and the field (`version-surface: .claude-plugin/plugin.json at $.version`). With
nothing recorded, sweep for candidates (`package.json`, `pyproject.toml`, `Cargo.toml`, a plugin
manifest, a `VERSION` file): exactly one found is proposed by name and recorded through
`/guardrails-install` before use; none or several is a `NEEDS_INPUT` naming that recorder. Tag
succession alone is not the scheme while a version-bearing file exists - each tag cut over a stale
manifest widens the lag its consumers read - but a repo that genuinely has no such file records
`version-surface: none`, and there tag succession *is* the scheme.

**The next version comes from the commit log, not from judgement.**

```bash
git log --format='%s' "$prev_tag".."$released_head"   # every subject in the range, from detection
```

Any `!` or `BREAKING CHANGE` bumps the **minor** while the major is 0 (the major once it is 1 or
more); any `feat`/`feature` bumps the **minor**; everything else bumps the **patch**. A subject that
is not conventional counts as a patch and is listed under its own heading in the render below, never
silently absorbed. Keep the forms apart: `version` is what the surface and the ledger carry
(`0.13.0`), `tag` is `version` under the prefix detection derived - compose it, never assume a `v`:

```bash
tag="$prefix$version"   # v0.13.0 where prev_tag was v0.12.1; 0.13.0 where the repo tags bare
```

**The release ledger's flags come from three diffs and one judgement.** For a library whose consumers
update by pulling, the ledger (better-dev's is `docs/RELEASES.md`) is the only channel that tells an
already-wired machine to do anything, and absence there is not neutral: a version with no line is
pull-only by contract, so a release that owed a flag and shipped without its line tells every wired
machine that nothing is owed, and no later edit reaches the operators who already updated past it.
The ledger is not a changelog and is never generated. Derive the flags, evidence first:

```bash
R="$prev_tag..$released_head"
git diff --diff-filter=ADR --name-only $R -- 'skills/*/SKILL.md'      # install, half 1
git diff --name-only $R -- install.sh scripts/bd-hook-wire hooks/     # install, half 2
git diff --name-only $R -- skills/onboard/ scripts/ hooks/            # reonboard candidates
```

- `install` - **either half**. Half 1 is mechanical: a skill dir added, removed, or renamed, where a
  hit is the flag. Half 2 is `install.sh` itself changing what a *run* of it does - hook wiring, link
  layout - and a hit there forces a stated judgement about whether an already-installed machine owes a
  re-run. Half 2 is not optional padding: 0.11.0 added zero skill dirs and correctly shipped
  `install,reonboard`, because `install.sh` had learned to wire the session hooks, and on half 1 alone
  no wired machine would ever have re-run it. `/update` re-derives half 1 from that identical diff at
  its own step 2, so this flag exists for what that diff cannot see.
- `reonboard` - a repo surface changed: anything `/onboard` writes into a wired repo (the discovery
  block, the `.better-dev` scaffold, the bin bridge). The third diff lists *candidates* only, and
  each hit forces a stated judgement about whether a wired repo has anything to re-run - a prose-only
  edit under `skills/onboard/` changes no repo surface, and a nudge that fires for nothing is ignored.
- `offer` - judgement, with no mechanical signal behind it: the release added something opt-in. An
  `offer` always carries `reonboard`, because only the reonboard nudge fires.
- **All three empty is a pull-only release, and pull-only means NO LINE AT ALL.** Flags are never
  empty in the ledger and the package gate refuses a version line carrying none, so do not render a
  flagless line - say "pull-only, no ledger line" in the confirmation below and commit the version
  surface on its own.

Render the line and take **one** confirmation before anything is written - the exact line, plus a
clause of evidence per flag, including the flags you did *not* set. It is operator-facing text
shipped to every user, and `offer` is a one-way door the `wired-version` stamp closes for good:

```
0.13.0 install,reonboard - <one-paragraph summary, operator-facing>
  install:   skills/<new>/SKILL.md added (diff 1); install.sh unchanged (diff 2)
  reonboard: skills/onboard/SKILL.md rewrote the discovery block (diff 3)
  offer:     not set - nothing opt-in shipped
```

**Write the version surface and the ledger line in ONE commit**, which that same yes covers - nothing
here asks twice. The ordering is load-bearing, not tidiness: the package gate fails when a ledger
version runs *ahead* of the version surface, because `/update` would collect that line's flags and
then stamp the lower version, re-firing the nudge and any offer every session forever. Two commits
leave the tree failing that gate in between; one commit cannot. A version surface found lagging
*after* the tag is fixed forward, never by moving the tag.

```bash
# edit the version surface, then prepend the ledger line, then:
git add "$version_surface" "$release_ledger"   # here: .claude-plugin/plugin.json docs/RELEASES.md
git commit -m "chore(release): $version"       # pull-only release: the surface alone, no ledger path
scripts/bd-package-check     # this repo's own gate on that invariant (a consumer repo has its own
                             # equivalent, or none) - run it before the PR where it exists
# then open the PR, let CI go green, merge it - /pr-and-verify's mechanics, nothing special here
```

**Where a release automation is wired it performs this whole section** - bump, line, commit, tag - so
the job here is the confirmation it asks for plus the read-back after: the tag is on the remote, the
surface and the ledger name the same version, the package gate is green on the released head. An
automation that produced no ledger line is a `NEEDS_INPUT` naming it, not a pull-only release, unless
the three diffs and the judgement genuinely came back empty.

## Move the release branch - staged paths only

With every gate green and the version commit landed, fast-forward the release branch onto the
integration head; refusing anything that *isn't* one keeps a stray local commit from riding along:

```bash
git fetch origin --tags       # the version PR merged since detection's fetch - origin/$integration
                              # is the PRE-BUMP sha until this runs
git switch "$release"
git merge --ff-only "origin/$integration"
released_head="$(git rev-parse HEAD)"   # re-resolved: the promoted head, version commit included
git log --oneline -1          # the release head must now BE the integration head
```

The fetch is the load-bearing line, not the fast-forward: detection fetched before the version PR
existed, so a fast-forward onto the ref it left behind lands the tag on the pre-bump head - and the
read-back agrees, because the local ref and the head it moved to are the same stale sha.

A trunk path has nothing to promote: the head CI just proved green is the head that gets tagged.

## Tag the released head

**One check comes before the tag on every path: the head being tagged must name the version being
tagged.** Read the version out of the version surface *at that head* - not out of the working tree,
which can be a branch behind or a branch ahead of it:

```bash
git switch "$release"
git pull --ff-only
released_head="$(git rev-parse HEAD)"            # both paths: the head the tag will name
git show "$released_head:$version_surface"       # the surface AS IT IS on that head
```

It must carry `$version`. Anything else is a **STOP**, not a fix-forward: the bump is not in the
released range, so the tag would name a tree whose manifest is a version behind and whose ledger has
no line for it - and no gate above catches that, because the ahead-check passes when *both* surfaces
are old. Reconcile the missing bump onto the head first, then come back. (A repo recorded
`version-surface: none` has nothing to read, so name that skip out loud rather than passing silently;
there the last tag is the surface and succession is the whole check.)

Then guard the tag itself: an existing one means the release already ran or the version was never
bumped, and either way that is a stop-and-reconcile, never a moved or overwritten published tag:

```bash
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "tag $tag already exists - the release already ran, or the version wasn't bumped; reconcile"
else
  git tag -a "$tag" -m "release $version"
  git push origin "$release"           # staged paths only - on trunk the head arrived by merged PR
  git push origin "$tag"
  git ls-remote --tags origin "$tag"   # the authority: the tag is pushed only if this prints it
fi
```

**Staged paths only**: put the checkout back before the receipt, not after - a `NEEDS_INPUT` in any
section below should not be what strands it on the release branch with a stale `$integration` ref.

```bash
git switch "$integration"
git pull --ff-only
git status -sb         # the authority: names the branch AND its ahead/behind, which git log -1 can't
```

Record what shipped, once the next section settles its `deploy:` and `health:` verdict:

```bash
printf 'released: %s\ntag: %s\nhead: %s\ndeploy: %s\nhealth: %s\n' \
  "$version" "$tag" "$(git rev-parse --short "$release")" "$deploy_verdict" "$health_summary" \
  | .better-dev/bin/bd-mem ledger put "release-$version" release.md -
# deploy: VERIFIED | DEGRADED | UNVERIFIED | REVERTED | NO_SURFACE  (typed marker, one of five)
# health: per-page "path: <load-ms>ms, <n> console errors", or "-"  (the next release's baseline)
```

The receipt is not the settle: `ledger put` creates the entry dir on its own, so one that only ever
receives `release.md` has no `progress.md` and reads `in-flight` forever. Close it with the one verb
that records a terminal state, keyed to the receipt's own verdict:

```bash
.better-dev/bin/bd-mem ledger settle "release-$version" DONE "tagged at $(git rev-parse --short "$release"), deploy $deploy_verdict"
```

`DONE` only when the deploy verdict settled `VERIFIED` or `NO_SURFACE`; `UNVERIFIED` or `DEGRADED`
settles the state its own section names (`NEEDS_INPUT`), so ledger and receipt never disagree about
whether the release finished. Never `--force`, never `--no-verify`: a protected branch that rejects
your push is reporting a failed gate, not inviting you through it. A pre-execution guard hook stops
most of this where one is wired - and a host without one, which is every host `/guardrails-install`
writes no hook into by design, has only you: before any force-push, history rewrite, branch delete,
tag move, or `rm -rf` across the release surface, state exactly what you are about to run and why and
take confirmation for **that specific action** - a yes to one destructive step never carries to the
next. If you realize you have pushed a wrong sha or lost data, say so at once rather than quietly
repairing it.

## After the tag: verify the deploy

A pushed tag starts the release; users have it only when the deploy lands and the deployed thing
runs. Recall the recorded deploy surface (`.better-dev/bin/bd-mem recall "deploy"`). Three recorded
answers, three paths:

- `deploy-surface: none` - nothing runs anywhere (a library, a CLI). Record `deploy: NO_SURFACE` and
  the release is done at the tag. Where the library ships by linked install (better-dev itself) or a
  host's plugin channel, propagation *is* the deploy and none of it happens at the tag: name in the
  receipt which channels it covers and what each machine still owes (an `install.sh` re-run, a pull),
  since a right tag over right content still reaches nobody whose channel has not moved.
- Deploy keys recorded - run the deploy-verify pass in `post-deploy.md`: wait out the deploy, drive
  the deployed surface, watch it hold. Its verdict lands in the receipt before the release settles.
- No deploy keys at all - a gap, not a license to guess: settle `NEEDS_INPUT` naming
  `/guardrails-install` as the recorder, which routes to `/deploy-capability` where the product has
  never shipped. A deploy command or a production URL is never invented here.

A release whose deploy was not observed is `deploy: UNVERIFIED` and settles `NEEDS_INPUT` naming what
has to run - the tag going up does not round it to done. Those two fields are typed receipt markers,
never loop states; `post-deploy.md` maps them to the terminal states.

## Distill the loop's memory

A release is where a cycle's lessons get consolidated rather than letting `rules.md` only ever grow.
That whole pass - reconcile verbs, library-defect fork, the one sanctioned `bd-mem prune` - is in
`distill.md`; read it once the release has settled.

## If a release goes bad

What users already pulled is out, but the release branch itself is recoverable - so recover it
forward, never by force-resetting a pushed branch.

One check comes before any revert executes: diff the revert range against the recorded migrations
glob (`git diff --name-only "<prev-tag>..<release>"`, grepped against `safety-denylist`). A hit means
the bad range carried a migration that already ran on production, and `git revert` walks back the
migration *file*, never the applied schema - so reverted code runs against a schema it never saw,
while the re-verify, running on the revert's own code, catches nothing. That is a `NEEDS_INPUT`
naming the applied-schema hazard, with three ways out for the operator: the down migration
(`migrations.md`), a roll-forward fix, or restoring the snapshot the migration gate receipted. Record
the choice (`rollback-schema: down-migrated | rolled-forward | restored <ref>`); a clean diff reverts
without ceremony.

Revert on the release branch - `git switch "$release"` first, since a release in this same session
has already put the checkout back on integration and an unswitched revert would walk back integration
instead. A fast-forward promote carried a range, so revert the range (`git revert --no-commit
<prev-tag>..<release>`, or `git revert <bad-sha>` for a single culprit); a merge-commit promote or a
hotfix merge is `git revert -m 1 <merge-sha>`. Re-run verification, tag it as a new patch release,
and push - a new tag forward, never a moved or deleted one. Then back-merge the revert into
integration (`git switch "$integration"` first, where the checkout belongs when this is over), the
same both-branches discipline a hotfix uses; skip it and the next promote re-ships the bad commit. On
a trunk path there is no second branch to reconcile, so the revert is done once tagged and
re-verified - that back-merge is a no-op there, not a skipped step. If the release sits behind a
feature flag, killing the flag is the faster rollback: record its path in the receipt.

## Hotfixes

A production hotfix branches off the release branch, not integration - and once it ships it has to
land on **both** branches, or the next promote silently reverts it. That both-sides discipline, the
back-merge, and the proof that the fix reached each branch live in `hotfix.md`; read it when an
incident needs a fix in production now. On a trunk path there is no both-branches problem at all: the
hotfix goes straight onto the trunk, so `hotfix.md`'s back-merge reads as already satisfied while the
rest of its shape, contract included, still applies. Create the branch through `/worktree-branching`
(it already bases `hotfix/<slug>` on the release branch), diagnose with `/diagnose` first - it
stabilizes production before root-causing and writes the fix-contract the loop's entry gates check -
then drive the fix with `/autonomous-loop` and run `/review` before it merges.

## Where this sits

`/review` runs on the PR into integration; this skill runs *after* that head is releasable. Where
branch protection forces the promote through a PR, that PR carries already-reviewed content, so
`/review` derives its verdict from the recorded constituent verdicts rather than re-reviewing them.
Its only writes are the version commit, the fast-forward, the tag, and a hotfix's back-merge.
