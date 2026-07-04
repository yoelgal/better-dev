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
git fetch origin "$base" 2>/dev/null || true
git worktree add -b "$branch" "$path" "origin/$base" 2>/dev/null \
  || git worktree add -b "$branch" "$path" "$base"
```

If `$path` already exists or the branch is already checked out somewhere, this is a re-detect: point
at the existing worktree rather than forcing a duplicate. If `git worktree add` fails on a sandbox
permission error, say so and work in place - `edge-cases.md` covers that fallback.

## Step 3 - record it, then hand off

Write the worktree's location into the ledger in the **primary checkout** (shared across worktrees,
so a later session or a restart can find it):

```bash
printf 'branch: %s\nbase: %s\nworktree: %s\n' "$branch" "$base" "$(cd "$path" && pwd -P)" \
  | .better-dev/bin/bd-mem ledger put "$slug" worktree.md -
```
`bd-mem` resolves the primary checkout's ledger for you (the same path from any worktree), so there's
no hand-rolled `git-common-dir` math to get subtly wrong.

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
