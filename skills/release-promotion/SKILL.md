---
name: release-promotion
description: Use when the integration branch looks ready to ship and someone wants to promote it to the release branch and tag a release, when a just-tagged release needs its deploy verified live and healthy ("did the deploy land", "is prod healthy after the release"), when a bad release needs rolling back ("roll back the release", "revert prod"), or when a production incident needs a hotfix landed correctly. For the hotfix path specifically, this skill's hotfix notes carry the both-branches detail.
allowed-tools:
  - Bash
  - Read
---

# Release promotion

One job: move the integration branch onto the release branch **only when it is genuinely
releasable**, tag that release, and - separately - run a hotfix so the fix reaches production
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

A repo can run trunk-based - integration and release are the same branch (a recorded
`branch-model: trunk`; with nothing recorded, the staged two-branch shape below is the default).
The promote then degenerates on purpose: the ancestor gate and the fast-forward are no-ops on a
single branch, and the soak window collapses to the merge itself, because `/pr-and-verify`'s merge
into the trunk *is* the release. What still binds is everything after the merge: the version tag
at the released head and the deploy-verify pass in `post-deploy.md`, receipt and all. On a trunk
repo this skill reduces to tag-plus-verify - a smaller job, never a skipped one.

## Verify the premise at the git level

A branch named in prose - or in `CLAUDE.md`, or in this file - isn't a branch until git shows it.
Confirm both ends are real before touching either (the same discipline `/onboard` uses):

```bash
git fetch origin --tags 2>/dev/null || true
git rev-parse --verify --quiet "origin/$integration" || git rev-parse --verify --quiet "$integration"
git rev-parse --verify --quiet "origin/$release"     || git rev-parse --verify --quiet "$release"
```

If either is missing, stop and report it - a promote with no real source or target is an onboarding
gap, not something to improvise.

## The release gate - all of it, or no promote

Check the head commit of the integration branch, not a stale local copy. Every gate has to hold:

- **CI is green on the integration head.** Read it from wherever the project's CI actually reports -
  a commit status (`gh api repos/{owner}/{repo}/commits/$sha/status`), the checks on the last PR
  into integration, or the dashboard the repo uses. A red run stops the promote. So does an
  *unknown* run: no status is not a green status.
- **No open blockers.** No open issue or PR marked as a release blocker for this cut. If the project
  has no blocker convention, say so and let the operator confirm rather than assuming zero.
- **It has soaked.** Read the soak window from overrides (`bd-mem recall "soak window"`); with none
  set, default to 24h of wall-clock since the last merge, or one full green CI cycle where the repo
  runs no time-based window. "Stable" means a named verify-receipt in the ledger recorded against
  *this* integration head - the sha you're about to promote - not a general sense that things look
  fine (`bd-mem ledger read` the work-item that last shipped into integration, and confirm the
  receipt names this sha). Check the head commit's age against the window, then confirm the receipt.
  No receipt on the current head is a `NEEDS_INPUT`, not a pass; a receipt on an older sha with
  merges since means it hasn't soaked at this head.
- **Release contains everything already released.** `main` must be an ancestor of `staging`:

  ```bash
  git merge-base --is-ancestor "origin/$release" "origin/$integration" \
    && echo "release is contained" || echo "DIVERGED"
  ```

  A `DIVERGED` result means `main` holds a commit `staging` doesn't - almost always a hotfix that was
  never merged back. Reconcile that first (see the hotfix notes); promoting over it would drop the
  fix.

- **Migrations in the promote range have a run plan.** Diff the range against the recorded
  migrations glob (`git diff "$prev_tag"..origin/$integration --name-only`, grepped against the
  `safety-denylist` rule; recorded by `/guardrails-install` - run it if absent: a repo with a
  migrations directory and no recorded glob settles `NEEDS_INPUT` naming the recorder rather than
  passing this gate on an empty grep). A clean diff satisfies this gate silently.
  On a hit, run the migration gate in `migrations.md` before promoting - it confirms which mechanism
  applies the migration, fixes the apply order relative to the deploy, and takes a snapshot receipt
  before anything destructive. New code over an un-migrated production schema fails only after the
  tag, so this gate is the last place to catch it.

- **Newly required env vars exist in production.** When the promote range newly reads an env var,
  recall `"deploy-env"` (recorded by `/guardrails-install` - run it if absent) and confirm each new
  var is present in production before the tag. A missing var settles `NEEDS_INPUT` naming the var -
  a config-only release with a green build still ships the miss, so this gate never waits for
  something to go red first.

If a gate is red or its answer can't be established, this is a `BLOCKED` (a hard failure) or
`NEEDS_INPUT` (a convention the operator has to name) - report which gate and stop. Don't relax a
gate to get past it.

## Promote, then tag

With every gate green, move the release branch onto the integration head. Because the ancestor check
passed, this is a clean fast-forward; refusing anything that *isn't* a fast-forward keeps a stray
local commit from riding along:

```bash
git switch "$release" && git merge --ff-only "origin/$integration"
```

Then tag the release at that commit. Take the version from the project's scheme (a bumped
`package.json`, a `VERSION` file, the last tag's successor) - read it, don't invent one. If no scheme
is discoverable, that's a `NEEDS_INPUT`: ask for the version rather than guessing. Guard the tag
before creating it: an existing `$version` tag means this promote already ran, or the version was
never bumped - either way, stop and reconcile rather than moving or overwriting a published tag:

```bash
if git rev-parse -q --verify "refs/tags/$version" >/dev/null; then
  echo "tag $version already exists - promote already ran, or the version wasn't bumped; stop and reconcile"
else
  git tag -a "$version" -m "release $version" && git push origin "$release" "$version"
fi
```

Record the promote so a later session can see what shipped. The `deploy:` and `health:` values
come from the deploy-verify pass in the next section - write the receipt once that pass settles
its verdict:

```bash
printf 'released: %s\nfrom: %s@%s\nto: %s\ndeploy: %s\nhealth: %s\n' \
  "$version" "$integration" "$(git rev-parse --short "origin/$integration")" "$release" \
  "$deploy_verdict" "$health_summary" \
  | .better-dev/bin/bd-mem ledger put "release-$version" release.md -
# deploy: VERIFIED | DEGRADED | UNVERIFIED | REVERTED | NO_SURFACE   (typed marker, one of five)
# health: per-page "path: <load-ms>ms, <n> console errors", or "-"   (the next release's baseline)
```

Push normally here - never `--force`, and never `--no-verify` to slip past a failing hook. A
protected release branch that rejects your push is reporting that a gate failed, not inviting you to
force through it; bypassing a hook is the same mistake wearing a different flag. That holds past this
one push: before any force-push, history rewrite, branch delete, tag move, or `rm -rf` across the
release surface, state exactly what you're about to run and why and get confirmation for that
specific action - a yes to one destructive step doesn't carry to the next. And if you realize you've
already lost data or pushed the wrong sha, say so at once rather than quietly repairing it.

## After the tag: verify the deploy

A pushed tag starts the release; users have it only when the deploy lands and the deployed thing
runs. Recall the recorded deploy surface (`.better-dev/bin/bd-mem recall "deploy"`). Three recorded
answers, three paths:

- `deploy-surface: none` - nothing runs anywhere (a library, a CLI). Record `deploy: NO_SURFACE`
  in the release receipt; the release is done at the tag. Where the library ships by linked install
  (better-dev itself), the tag is not the end - propagation is the deploy: the primary checkout pulls,
  fresh sessions pick up the new text, and a release that added or removed skills names the
  `install.sh` re-run each consuming machine still owes. Record a propagation line in the release
  receipt.
- Deploy keys recorded - run the deploy-verify pass in `post-deploy.md`: wait out the deploy,
  drive the deployed surface, watch it hold. Its verdict lands in the receipt before the release
  settles.
- No deploy keys at all - a gap, not a license to guess: settle `NEEDS_INPUT` naming
  `/guardrails-install` as the recorder. A deploy command or a production URL is never invented
  here. For a product that has never shipped, the recorder will route to `/deploy-capability` to
  create the surface first - the stop names both so the operator is not sent in a circle.

A release whose deploy was not observed is `deploy: UNVERIFIED` in the receipt and settles
`NEEDS_INPUT` naming what has to run - the tag going up does not round it to done. The `deploy:`
and `health:` fields are typed receipt markers, never loop states; `post-deploy.md` carries the
mapping to the terminal states the release actually settles.

## Distill the loop's memory

Promotion is a natural threshold - a release cycle's worth of lessons has piled up, so this is where
the loop consolidates them instead of letting `rules.md` only ever grow. It runs at this checkpoint,
not on a clock. Do it as a review pass, not an edit: read the lessons against the current rules and
propose a diff for the operator to confirm.

```bash
.better-dev/bin/bd-mem read learnings   # the append-only lesson stream
.better-dev/bin/bd-mem read rules       # the promoted rules
```

Read one against the other and propose, per lesson or rule, one of four moves - the reconcile verbs
a memory-consolidation pass uses:

- **ADD** - a lesson that recurred across two or more work-items, or that a verified fix confirmed,
  has earned a rule: `bd-mem remember "<rule>"`. The negative-lesson filter still binds - promote the
  durable cause-and-fix, never a transient "X is broken" (a one-off timeout, a flake, a
  machine-specific path).
- **UPDATE** - a rule a later lesson refined; propose the sharper wording.
- **DELETE** - a rule no recall has matched across the last several work-items is stale; surface it
  for the operator to retire. The sweep anchors here and carries a between-release trigger: once
  the store passes its threshold, `ledger init` on a new work-item nudges the operator to run this
  full distill pass - the lessons prune *and* this rule disuse sweep, never compaction alone - while
  `prune --apply` stays a release-checkpoint move. So a repo that rarely promotes accumulates
  neither stale lessons nor never-matched rules silently waiting for one.
- **NOOP** - most lessons; leave them where they are.

One class of lesson leaves the learnings-and-rules plane entirely: a recurring lesson whose cause
is the shipped skill text itself - a default that misled every run it touched, a step executors
keep rationalizing around - is a library-defect candidate, not a house rule. Surface it to the
operator to carry upstream (`/self-extension`'s recent-sessions clustering mines exactly this
shape); a local override would bury a defect every adopter still hits.

Two things keep this honest. Present the moves as a reviewable diff and light-confirm before applying
any of them - propose, never auto-edit someone's memory. And never rewrite `learnings.jsonl` in
place: it's append-only, so consolidation happens by promoting into `rules.md` and retiring stale
rules there, not by editing the lesson stream. The one sanctioned shrink of `learnings.jsonl` is
`.better-dev/bin/bd-mem prune` at exactly this checkpoint: preview first, and `prune --apply` only
on the operator's confirmation - nowhere else, and never unattended. Nothing recurred or went
stale? That's a clean NOOP - the pass isn't obliged to change anything.

## If a release goes bad

What users already pulled is out, but the release branch itself is recoverable - so recover it
forward, never by force-resetting a pushed branch.

One check comes before any revert executes: diff the revert range against the recorded migrations
glob (`git diff --name-only "<prev-tag>..<release>"`, grepped against the `safety-denylist` rule).
A hit means the bad range carried a migration that already ran on production - and `git revert`
walks back the migration *file*, never the applied schema, so reverted code would run against a
schema it never saw, while the re-verify, running on the revert's own code, catches nothing. That
is a `NEEDS_INPUT` naming the applied-schema hazard, with three ways out for the operator to
choose: run the down migration (`migrations.md` carries the discipline), roll forward with a fix
instead of reverting, or restore the snapshot the migration gate receipted. Record the choice in
the release receipt (`rollback-schema: down-migrated | rolled-forward | restored <ref>`). A clean
diff reverts without ceremony.

Revert the commits that shipped: a fast-forward promote carried a range, so revert that range
(`git revert --no-commit <prev-tag>..<release>`, or `git revert <bad-sha>` for a single culprit);
a merge-commit promote or a hotfix merge is `git revert -m 1 <merge-sha>`. Re-run verification on
the revert, tag it as a new patch release, and push - a new tag forward, never a moved or deleted
one. Then back-merge the revert into integration so the two histories stay reconciled, the same
both-branches discipline a hotfix uses; skip that and the next promote silently re-ships the bad
commit. If the release sits behind a feature flag, killing the flag is the faster rollback -
record the flag's path in the release receipt so the next operator finds it without spelunking.

## Hotfixes

A production hotfix branches off the release branch, not integration - and once it ships it has to
land on **both** branches, or the next promote silently reverts it. That both-sides discipline, the
back-merge, and the proof that the fix reached each branch live in `hotfix.md`; read it when an
incident needs a fix in production now. Create the branch itself through `/worktree-branching` (it
already bases `hotfix/<slug>` on `main`), diagnose the incident with `/diagnose` first - its
production path stabilizes before root-causing and writes the fix-contract the loop's entry gates
check - then drive the fix with `/autonomous-loop`, and run `/review` before it merges. This skill
owns only the promotion and back-merge shape, not the diagnosing or the fixing.

## Where this sits

`/review` runs on the PR into integration; this skill runs *after* integration has soaked, to carry
it the last hop to release. When branch protection forces the promote through a PR, that PR is a
promotion PR of already-reviewed content - `/review` derives its verdict from the constituent recorded
verdicts rather than re-reviewing what already carries one. It never merges feature work and never touches a feature branch - its
only writes are the fast-forward of the release branch, the tag, and (for a hotfix) the back-merge
into integration.
