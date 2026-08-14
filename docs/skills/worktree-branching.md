# /worktree-branching

## What it does

Gives a work-item exactly one isolated git worktree on its own branch off the integration branch,
so parallel work never touches the primary checkout - and refuses to make a second worktree for a
work-item that already has one. It detects the repo's own branch prefix, integration branch, and
placement convention rather than imposing a house style, and it is the one place that sets the
mechanical edit boundary for the tree it just created; nothing downstream re-sets it.

## When to reach for it

Before planning, diagnosis, or the autonomous loop runs for a feature, fix, or chore work-item -
this is the step that gives that work a place to live. A same-work-item follow-up (a review fix, an
operator tweak) rides the existing worktree and branch rather than earning a new one; only a genuinely
new work-item does. It also answers "is this session already isolated" on a re-run, so a repeat call
is safe rather than a duplicate.

For removing a worktree once its PR has merged, this skill's own teardown notes apply, not a fresh
invocation. For moving a half-finished item to a colleague or another machine, its handoff notes
apply. Both live alongside SKILL.md in the skill's own directory.

## Where it fits

First link in the build-loop chain: it runs before `/plan-grill`, `/diagnose`, or `/autonomous-loop`,
and its Step 3 hands off directly to whichever of those the work-item needs. `/orchestrating-agents`
reads its live-lane output (`git worktree list`, the shared-datastore recording) before deciding
whether two lanes can truly run in parallel. `/autonomous-loop`'s restart path calls back into it
to remove and recreate a stuck work-item's tree off the same recorded base.

## Prerequisites

An integration branch that actually exists in git - a name recorded in prose (`CLAUDE.md`, an
override) is not enough; the skill verifies it with `git rev-parse --verify` before branching off it.
A missing integration branch is an onboarding gap this skill will not paper over by inventing one.

## Common questions

**Why won't it just pass `.worktrees/<slug>` to the native worktree tool?** Because that path is the
git fallback's own default directory, not an argument the native tool needs - handing it over anyway
trips the host's permission gate on a model-supplied location for zero benefit. The skill lets the
native tool place the tree in its own default directory and only reaches for the git fallback's path
when no native tool exists at all.

**A colleague's handoff bundle shows a criterion already green - can that be trusted?** No by default.
A green earned on the sender's machine can reflect an environment difference this machine doesn't
share. Pick-up re-runs the most recently recorded green before trusting it and resets the criterion to
unmet if it comes back red; the sender's approval is evidence of what was approved there, never a
substitute for this machine's own consent pin.

**Sharp edge - can parallel worktrees share one live datastore even with zero file overlap?** Yes.
Runtime config (`.env` and the like) is copied into each fresh worktree, and that config typically points every
lane at the same database, cache, or object store. Two lanes with disjoint branches can still interfere
through shared data, and a failure born in another lane's writes surfaces as unexplained flake rather
than a traceable diff. The stopgap: where the stack allows it, namespace the copy per lane (a suffixed
schema name, a per-lane SQLite file); where it doesn't, the coupling is recorded once
(`shared-runtime: serialize`) so downstream lane-parallelism checks treat those lanes as sequential
instead of silently racing them.

## It's working if

- A work-item's worktree appears in `git worktree list` on a branch named by the repo's own prefix
  convention, branched off the correct base - `main` for a hotfix, the integration branch otherwise.
- Re-running the skill on a work-item that already has a tree reports the existing worktree instead
  of creating a second one.
- A dev server or check started in the tree serves only that tree's code on its own port - the
  primary checkout's server keeps showing the old code until merge.
- The next skill in the chain (`/plan-grill`, `/diagnose`, or `/autonomous-loop`) picks up already
  scoped to the new tree, with no separate boundary-setting step of its own.
