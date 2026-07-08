---
name: worktree-branching
description: Use when a feature or fix work-item is about to start and needs its own isolated branch off the integration branch - before planning, diagnosis, or the autonomous loop runs - or when detecting whether such a worktree already exists. For removing one after merge, see this skill's teardown notes.
allowed-tools:
  - Bash
  - Read
---

# Worktree branching

One job: give a work-item exactly one isolated git worktree on its own `feature/` or `fix/`
branch off the integration branch, so work runs in parallel without touching the primary
checkout. Detect an existing one before making a new one; never make two.

Native `git worktree` is the whole mechanism - no wrapper is added where git already does the job.

## Before anything: read the overrides

A project may already have opinions here - a different branch prefix (`feat/` not `feature/`), a
different integration branch (`develop` not `staging`), a different placement. Read them first and
let them win:

```bash
.better-dev/bin/bd-mem read overrides 2>/dev/null
.better-dev/bin/bd-mem recall "branch prefix integration worktree" 2>/dev/null
```

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

## Step 1 - resolve the branch and its base

A work-item is a **feature** or a **fix**. The prefix decides the base branch:

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
branch is an onboarding gap, not something to invent here.

## Step 2 - create the worktree

**Prefer a native tool.** If the harness offers one - a tool named like `EnterWorktree` /
`WorktreeCreate`, a `/worktree` command, or a `--worktree` flag - use it and skip the git commands.
Running `git worktree add` alongside a native tool leaves phantom state the harness can't see. Only
fall through to git when there is no native tool.

**Git fallback.** Place worktrees under `.worktrees/` at the repo root (gitignored, discoverable);
a sibling `../<repo>-<slug>` layout is an override some repos prefer - see `edge-cases.md`. Guard the
placement, then branch off the *base*, not off HEAD:

```bash
git check-ignore -q .worktrees || { printf '.worktrees/\n' >> .gitignore && git add .gitignore; }
path=".worktrees/$slug"
git worktree prune   # clear a stale registration if $path was removed but still listed
git fetch origin "$base" 2>/dev/null || true
git worktree add -b "$branch" "$path" "origin/$base" 2>/dev/null \
  || git worktree add -b "$branch" "$path" "$base"
```

`git worktree prune` only clears entries whose directory is gone, so it's safe alongside a live
concurrent run - a worktree still in use keeps its directory and survives the prune.

If `$path` already exists or the branch is already checked out somewhere, this is a re-detect: point
at the existing worktree rather than forcing a duplicate. If `git worktree add` fails on a sandbox
permission error, say so and work in place - `edge-cases.md` covers that fallback.

A fresh worktree also has none of the primary checkout's gitignored local settings, so a session
rooted in it loses the operator's recorded permission grants (a `.claude/settings.local.json`
allowlist, or the host's equivalent) and falls back to prompting or a classifier on actions the
operator already approved. Mirror that file from the primary checkout into the new worktree when it
exists - it is personal, gitignored state, so the copy never enters a PR.

A fresh worktree has no installed deps, so run the project's setup and one baseline check here -
that way the loop's first verify measures your work, not a missing `node_modules` misread as a
failure. Prefer the project's own named setup entry point (a documented setup or bootstrap script
or task) over an ad-hoc install command composed here; a fixed, idempotent entry point is what a
later session or a restart re-runs without guessing which command you used. If none exists, record
it as a groundwork gap rather than papering over it with a one-off a future session can't find. If
this skill hands off immediately (the interlock in Step 3), `/autonomous-loop`'s ground-truth gate
covers the same baseline at the other end.

A fresh worktree shares git history but not installed deps or build output. An install-or-build
step needed only to make the tree runnable is expected setup, not a scope violation or a deviation;
a review that re-runs the done-criteria in a fresh worktree does not flag it as one.

## Step 3 - record it, then hand off

Write the worktree's location into the ledger in the **primary checkout** (shared across worktrees,
so a later session or a restart can find it):

```bash
printf 'branch: %s\nbase: %s\nworktree: %s\n' "$branch" "$base" "$(cd "$path" && pwd -P)" \
  | .better-dev/bin/bd-mem ledger put "$slug" worktree.md -
```
`bd-mem` resolves the primary checkout's ledger for you (the same path from any worktree), so there's
no hand-rolled `git-common-dir` math to get subtly wrong.

Then set the mechanical edit boundary. This skill is the boundary's one writer - it scopes the new
worktree at creation, and the loop only verifies the boundary is set, never re-sets it:

```bash
.better-dev/bin/bd-guard scope "$(cd "$path" && pwd -P)" --ttl 0
```

The state lives in the worktree's own git dir (`.git/worktrees/<name>/bd-scope`), which is what makes
the auto-activation survive the handoff interlock below: the boundary is per-target-worktree, not
per-session, so the session that picks up the handoff starts already bounded to its own tree, and
parallel worktrees never share a boundary. Where no enforcement hook is wired
(`.better-dev/bin/bd-mem recall "safety-enforcement"` says prose) the state is inert - write it anyway,
so a later hook install starts enforcing without a re-setup. If the boundary ever blocks legitimate
work, `.better-dev/bin/bd-guard off` lifts it in one command.

Now the interlock. When this skill **created** a new worktree, the work lives there - but the agent
cannot move its own harness session into that directory. So it hands off and stops rather than
pretending to continue:

```
handoff: yes
→ start a session rooted in <path> (branch <branch>), then run /plan-grill, /diagnose, or /autonomous-loop
```

A consumer that reads `handoff: yes` does not cross the worktree boundary on its own. When Step 0
found the session **already** in the right worktree, emit `handoff: no` instead and let the next
skill continue in place. The hand-off targets are `/plan-grill` (feature) or `/diagnose` (fix) for
the typed front-end, then `/autonomous-loop` to drive the work.

## Finishing up

Removing a worktree after its PR merges is a destructive operation with a strict safe order and a
fail-closed ownership check. Read `teardown.md` when the work-item is done - don't improvise a
`git worktree remove --force` or `rm -rf` from memory.

For the trickier detection cases - submodules, detached HEAD, native-tool phantom state, the sibling
placement override, sandbox denial - read `edge-cases.md`.
