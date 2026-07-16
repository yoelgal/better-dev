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
sequential, not parallel. So does a recorded `shared-runtime: serialize`
(`.better-dev/bin/bd-mem recall "shared-runtime"`): lanes coupled through one mutable datastore
collide in data, not files - Step 2's datastore note records that key.

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

Do not use `git reset --hard` here - `bd-guard` flags it as a working-tree discard, and it is the
wrong tool anyway. `checkout -B` moves the branch pointer and re-checks-out the tree, and it
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

A fresh worktree also has none of the primary checkout's gitignored local state - the runtime
config the app needs (`.env*` files and the like). Copy that class from the primary
checkout at creation - copy, never symlink: build tools reject symlinks and a symlink turns
teardown into a two-step dance - so the first dev-server run doesn't die mid-task on missing env. It
is personal, gitignored state, so the copies never enter a PR. The copy happens at creation, not
lazily on first failure: a fresh worktree whose first `bd-mem` or dev-server call dies on missing
gitignored state (a missing bin bridge, an absent `.env`) is the tell this step was skipped.
Settings-class files - a `.claude/settings.local.json` allowlist, or the host's equivalent - are
operator-owned and never copied here: the agent never writes them, so there is nothing of that
class for this step to carry forward. Where a noisier fresh worktree keeps re-prompting on actions
the operator already approved elsewhere, `/guardrails-install`'s grant step hands the operator a
paste-ready copy command instead.

That copied runtime config points every lane at the same mutable datastore - one `DATABASE_URL`, one
Redis, one object store - so when `git worktree list` shows another live lane, this lane's dev server
and checks write the data that lane reads, even with zero file overlap between the branches. Where the
stack supports it, namespace the copy per lane: suffix the schema or database name with the slug, or
point the copy at a separate ephemeral store (a per-lane SQLite file, a second local database), so one
lane's writes and resets never surface in another lane's verify. Where the stack offers no per-lane
split, record the coupling once - `.better-dev/bin/bd-mem remember "shared-runtime: serialize"` - so
`/orchestrating-agents`' live-lanes check treats data-coupled lanes as sequential rather than parallel;
unrecorded, a failure born in another lane's data reads as flake, and no file diff explains it.

A fresh worktree has no installed deps, so run the project's setup and one baseline check here -
that way the loop's first verify measures your work, not a missing `node_modules` misread as a
failure. Prefer the project's own named setup entry point (a documented setup or bootstrap script
or task) over an ad-hoc install command composed here; a fixed, idempotent entry point is what a
later session or a restart re-runs without guessing which command you used. If none exists, record
it as a groundwork gap rather than papering over it with a one-off a future session can't find. The
recorded `dev-run` key (`.better-dev/bin/bd-mem recall "dev-run"`) is the command that stands this
tree's app up when a check needs it live - recorded once by `/guardrails-install`, recalled here
instead of re-discovered per worktree. If
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

## Finishing up

Removing a worktree after its PR merges is a destructive operation with a strict safe order and a
fail-closed ownership check. Read `teardown.md` when the work-item is done - don't improvise a
`git worktree remove --force` or `rm -rf` from memory.

Handing a half-finished work-item to a colleague or another machine is its own procedure - the ledger's
consent gates are per-machine and gitignored, so a bundle travels on the branch and the receiving side
re-pins consent. Read `handoff.md` before handing one off or picking one up.

For the trickier detection cases - submodules, detached HEAD, native-tool phantom state, the sibling
placement override, the trunk-based branch profile, sandbox denial - read `edge-cases.md`.
