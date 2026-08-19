---
name: worktree-branching
description: Use when a feature, fix, or chore work-item is about to start and needs its own isolated branch off the integration branch - before planning, diagnosis, or the autonomous loop runs - or when detecting whether such a worktree already exists. For removing one after merge, see this skill's teardown notes; for moving a half-finished item to a colleague or another machine, its handoff notes.
allowed-tools:
  - Bash
  - Read
---

# Worktree branching

One job: give a work-item exactly one isolated git worktree on its own `feature/`, `fix/`, or
`chore/` branch off the integration branch, so work runs in parallel without touching the primary
checkout. Detect an existing one before making a new one; never make two.

Native `git worktree` is the whole mechanism - no wrapper is added where git already does the job.

## Before anything: read the overrides

A project may already have opinions here - a different branch prefix (`feat/` not `feature/`), a
different integration branch (`develop` not `staging`), a different placement. Read them first and
let them win:

Read `.better-dev/overrides.md` and `.better-dev/rules.md` - two plain files, read with the `read`
tool. Where `.better-dev/` is kept out of git, a linked worktree has no copy of its own: read them
from the primary checkout, whose path Step 3 resolves.

Detect the layout, don't impose one. What the repo already does is the default.

## You are not the only actor here

This repo runs parallel worktrees, and other agents or the operator may be working in it while you
are. If you notice changes in the working tree or index you did not make, they are not yours to
undo - do not revert, stash, or "clean up" after another actor. Keep going if the changes don't
touch your files; if they do, or you cannot tell whose they are, surface exactly what you see and
ask before proceeding. `git checkout --`, `git reset --hard`, and `git clean` aimed at work you
didn't author are how a parallel model loses someone else's data.

## Step 0 - are you already isolated?

Before creating anything, check whether this session is already inside a linked worktree:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

If `GIT_DIR != GIT_COMMON` you are already in a worktree (or a submodule - the two look alike;
`edge-cases.md` has the one-line submodule guard). When the branch already matches this work-item,
this is a re-run: report the existing worktree and stop. Nothing to create. Hand straight to the
next skill.

If `GIT_DIR == GIT_COMMON` you are in the primary checkout - the place features branch *from*, not
*into*. Continue to Step 1.

A worktree is per work-item, never per change. A same-work-item follow-up - a review fix, an operator
tweak to an open item - rides the existing worktree and branch; only a new work-item earns a new one.
And a live operator instruction ("just push it to the PR branch") is honored immediately per
`/overrides`, never out-ritualed with fresh ceremony.

## Step 1 - resolve the branch and its base

A work-item is a **feature**, a **fix**, or a **chore**. The prefix decides the base branch:

| Work-item | Branch          | Base (unless overridden) |
|-----------|-----------------|--------------------------|
| feature   | `feature/<slug>` | integration (`staging`) |
| fix       | `fix/<slug>`     | integration (`staging`) |
| chore     | `chore/<slug>`   | integration (`staging`) |
| hotfix    | `hotfix/<slug>`  | `main`                  |

Apply any override from the read above (e.g. prefix `feat/`, integration `develop`) before building
the name. Derive the slug from the work-item title - lowercase, non-alphanumerics to single dashes,
trimmed:

```bash
slug=$(printf '%s' "$title" | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
branch="feature/$slug"        # or fix/ · chore/ · hotfix/ - honor the override prefix
base="staging"                # hotfix → main; honor the integration override
```

Confirm the base branch actually exists in git before branching off it - a base named in prose isn't
real until `git` shows it (`git rev-parse --verify "$base"` or `origin/$base`). A missing integration
branch is an onboarding gap, not something to invent here, and a recorded name git contradicts is
re-verified and rewritten (`/overrides`), never obeyed.

Before opening a second parallel worktree, read the live lanes: `git worktree list`, then per live
branch `git diff --name-only <base>...<branch>` - a path two lanes both touch makes the work
sequential, not parallel. So does a `shared-runtime: serialize` line in `.better-dev/rules.md`:
lanes coupled through one mutable datastore collide in data, not files - Step 2's datastore note
records that line.

## Step 2 - create the worktree

**Prefer a native tool.** If the harness offers one - a tool named like `EnterWorktree` /
`WorktreeCreate`, a `/worktree` command, or a `--worktree` flag - use it, skip the git commands,
and let it place the worktree in its own default directory. Name it with the resolved branch name
directly, `<prefix>/<slug>` (Claude Code's `EnterWorktree` `name` parameter accepts `/`-separated
segments, so `feat/my-slug` is a legal name). Never feed it the `.worktrees/` path below: that is
the *git fallback's* default, not an argument for the native tool, and a model-supplied path
outside the harness default buys a needless permission prompt.

Native creation typically branches off the repo's default branch, not the base from Step 1 - honor
the base afterward, in the fresh clean tree the native tool just created:

```bash
git fetch origin "$base"
git checkout -B "$branch" "origin/$base" 2>/dev/null || git checkout -B "$branch" "$base"
```

Do not use `git reset --hard` here - the repo's committed `.omp/config.yml` prompts on it as a
working-tree discard, and it is the wrong tool anyway. `checkout -B` moves the branch pointer and
re-checks-out the tree, and it
refuses rather than discards if the tree unexpectedly carries changes; a fresh worktree is clean,
so that refusal never fires in the normal case - a safety property of the command, not a
workaround for a problem this flow has. No host knob, no settings write, no
create-with-git-then-enter-natively hybrid, no relocation prompt. Running `git worktree add`
alongside a native *creation* leaves phantom state the harness can't see - only the fallback below
reaches for it. The git fallback remains only for a host with no native worktree tool at all.

**Git fallback.** Place worktrees under `.worktrees/` at the repo root (gitignored, discoverable);
a sibling `../<repo>-<slug>` layout is an override some repos prefer - see `edge-cases.md`. Guard the
placement, then branch off the *base*, not off HEAD:

```bash
git check-ignore -q .worktrees || { printf '.worktrees/\n' >> .gitignore && git add .gitignore; }
wt_path=".worktrees/$slug"
git worktree prune   # clear a stale registration if $wt_path was removed but still listed
git fetch origin "$base" 2>/dev/null || true
git worktree add -b "$branch" "$wt_path" "origin/$base" 2>/dev/null \
  || git worktree add -b "$branch" "$wt_path" "$base"
```

`git worktree prune` only clears entries whose directory is gone, so it's safe alongside a live
concurrent run - a worktree still in use keeps its directory and survives the prune.

If `$wt_path` already exists or the branch is already checked out somewhere, this is a re-detect: point
at the existing worktree rather than forcing a duplicate. If `git worktree add` fails on a sandbox
permission error, say so and work in place - `edge-cases.md` covers that fallback.

A fresh worktree also has none of the primary checkout's gitignored local state, and the two kinds
it needs go opposite ways.

**Runtime config is copied.** The `.env*` files and the like the app needs: copy that class from the
primary checkout at creation - copy, never symlink here: build tools reject symlinks and a symlink
turns teardown into a two-step dance - so the first dev-server run doesn't die mid-task on missing env.
It is personal, gitignored state, so the copies never enter a PR. Copy at creation, not lazily on
first failure: a fresh worktree whose first dev-server run dies on an absent `.env` is the tell this
step was skipped. Settings-class files - a `.claude/settings.local.json` allowlist, or the host's
equivalent - are operator-owned and never copied here: the agent never writes them, so there is
nothing of that class for this step to carry forward.

**`.better-dev/` is read where it lives, never copied.** Where the repo keeps that directory out of
git - a solo adoption does - the rules, the overrides, and the shared ledger exist only in the
primary checkout, so read them there by absolute path. A copy forks the one set of rules every lane
is meant to share, and the ledger in particular has to stay single or a resume reads a different
state depending on which tree it runs in.

That copied runtime config points every lane at the same mutable datastore - one `DATABASE_URL`, one
Redis, one object store - so when `git worktree list` shows another live lane, this lane's dev server
and checks write the data that lane reads, even with zero file overlap between the branches. Where the
stack supports it, namespace the copy per lane: suffix the schema or database name with the slug, or
point the copy at a separate ephemeral store (a per-lane SQLite file, a second local database), so one
lane's writes and resets never surface in another lane's verify. Where the stack offers no per-lane
split, record the coupling once as a `shared-runtime: serialize` line in `.better-dev/rules.md`, so
`/orchestrating-agents`' live-lanes check treats data-coupled lanes as sequential rather than parallel;
unrecorded, a failure born in another lane's data reads as flake, and no file diff explains it.

A fresh worktree has no installed deps, so run the project's setup and one baseline check here -
that way the loop's first verify measures your work, not a missing `node_modules` misread as a
failure. Prefer the project's own named setup entry point (a documented setup or bootstrap script
or task) over an ad-hoc install command composed here; a fixed, idempotent entry point is what a
later session or a restart re-runs without guessing which command you used. If none exists, record
it as a groundwork gap rather than papering over it with a one-off a future session can't find. The
`dev-run` line in `.better-dev/rules.md` is the command that stands this tree's app up when a check
needs it live - recorded once by `/guardrails-install`, read here instead of re-discovered per
worktree. If
this skill hands off immediately (the interlock in Step 3), `/autonomous-loop`'s ground-truth gate
covers the same baseline at the other end.

A fresh worktree shares git history but not installed deps or build output. An install-or-build
step needed only to make the tree runnable is expected setup, not a scope violation or a deviation;
a review that re-runs the done-criteria in a fresh worktree does not flag it as one.

## Step 3 - record it, then hand off

Write the worktree's location into the **primary checkout's** ledger directory, so a later session
or a restart in any worktree can find it:

```bash
primary=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
mkdir -p "$primary/.better-dev/ledger/$slug"
printf 'branch: %s\nbase: %s\nworktree: %s\n' "$branch" "$base" "$(cd "$wt_path" && pwd -P)" \
  > "$primary/.better-dev/ledger/$slug/worktree.md"
```

`git rev-parse --git-common-dir` resolves the primary checkout from any worktree, which is the whole
trick: one ledger directory serves every lane, so there is no per-worktree copy to reconcile later.

Now the interlock. When this skill **created** a new worktree, the work lives there. If the host
can switch the session into it natively (the same worktree tool entering by path, or creation
already moved the session), take that and continue as `handoff: no`. Otherwise the agent cannot
move its own harness session into that directory, so it hands off and stops rather than pretending
to continue:

```
handoff: yes
→ start a session rooted in <path> (branch <branch>), then run /plan-grill, /diagnose, or /autonomous-loop
```

A consumer that reads `handoff: yes` does not cross the worktree boundary on its own. When Step 0
found the session **already** in the right worktree, emit `handoff: no` instead and let the next
skill continue in place. The hand-off targets are `/plan-grill` (feature, or a chore on its
contract-lite path) or `/diagnose` (fix) for
the typed front-end, then `/autonomous-loop` to drive the work.

An isolated worktree means an isolated running app: a dev server started here serves this tree on
its own port, and the operator's habitual server keeps showing the old code until merge. When
verifying against a live surface, name the exact URL/port that shows the fix in the same message,
and give operator feedback that contradicts your verified state a stale-surface check first ("which
port/URL are you looking at?") before any re-diagnosis.

Bash cwd persists across tool calls, so a bare `cd` to the primary checkout silently re-points every
git command that follows it, in this call and every later one. Reach primary-checkout state without
moving: read and write it with `git -C "$primary" ...`, and reach its files by absolute path
(`"$primary"/.better-dev/...`, which from here is otherwise simply a missing file).
Where a session does cd out anyway - the merge `/pr-and-verify` runs from the primary checkout - cd
back to the worktree before any further git work, and re-read `git rev-parse --abbrev-ref HEAD` before
trusting a diff. Getting this wrong does not raise an error; it reports a false green, an empty diff
while HEAD reads the integration branch.

## Finishing up

Removing a worktree after its PR merges is a destructive operation with a strict safe order and a
fail-closed ownership check. Read `teardown.md` when the work-item is done - don't improvise a
`git worktree remove --force` or `rm -rf` from memory.

Handing a half-finished work-item to a colleague or another machine is its own procedure - the ledger
never travels with a push, so a bundle rides the branch and the receiving operator confirms the
contract themselves. Read `handoff.md` before handing one off or picking one up.

For the trickier detection cases - submodules, detached HEAD, native-tool phantom state, the sibling
placement override, the trunk-based branch profile, sandbox denial - read `edge-cases.md`.
