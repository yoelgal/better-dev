# /graphify-wrapper-setup

## What it does

Makes a repo ready for graphify-wrapper: ensures the `graphify` CLI is on the machine at a
safe version, seeds this repo's per-repo registry, and picks a semantic backend. It is a
one-time, idempotent step - safe to re-run - and it never builds an index itself; that is
`/graphify-wrapper-index` and `/graphify-wrapper-sync`'s job, not this one's.

## When to reach for it

Reach here the first time a repo or machine needs graphify wired up, before any mapping or
indexing is possible - "set up graphify" or the first run of `/graphify-wrapper-map`,
`/graphify-wrapper-query`, or `/graphify-wrapper-sync` hitting a repo with no registry yet.
Not for choosing what to index (`/graphify-wrapper-map`), registering a specific domain
(`/graphify-wrapper-index`), building or refreshing a graph (`/graphify-wrapper-sync`), or
asking a question against one (`/graphify-wrapper-query`) - all of those assume setup already
ran. Only `/graphify-wrapper-query` heals a missing registry on its own; `/graphify-wrapper-map`,
`/graphify-wrapper-index`, and `/graphify-wrapper-sync` stop and point back here instead.

## Where it fits

The one-time prerequisite underneath the whole graphify-wrapper family: `/graphify-wrapper-map`,
`/graphify-wrapper-index`, `/graphify-wrapper-sync`, `/graphify-wrapper-query`, and
`/graphify-wrapper-status` all assume it has already run on this machine and repo. Nothing
composes it in turn - it sits at the bottom of that chain.

## Common questions

**Does the version pin actually stop an untrusted package index from running here?** No. The
`--default-index` pin is best-effort and bounds nothing: it only sets uv's lowest-priority
index, so a `UV_INDEX` or `UV_EXTRA_INDEX_URL` already in the environment is searched first and
still decides whose build backend runs the install. The version floor itself is real (below it,
graph writes are non-atomic - see the version floor the skill pins) - it is only the index pin
that does not bound what runs under the operator's account.

**Is the CLI install and registry write really something the agent can do on its own,
unannounced?** It is agent-run, but never silent: the install (`uv tool install`/`upgrade
graphifyy`) and the registry directory it seeds under `~/.claude/graphify/<repo key>/` are a
closed, named exception to the rule that machine-global writes stay operator-run (D26). Each one
is reversible with one command and carries no credential, and the skill's step 4 names every
write it actually made, with its undo, in the recap - never a bullet for a write it didn't make.

**A machine ran an old setup before graphs moved out of the tree - is there leftover residue?**
Yes, on any machine that ran setup before the 0.9.7 relocation: a global-gitignore line and a
git `core.excludesfile` pointer from the old in-tree guard, now retired but not auto-reversed.
The stopgap is an explicit three-step offer (delete stray in-tree `graphify-out/` dirs, drop the
gitignore line, unset the excludesfile pointer only where better-dev set it) - run in that order,
since the ignore line is what hides step 1's leftovers until it's removed last.

## It's working if

- `graphify --version` resolves on the machine and is at or above the pinned floor
- A registry seeded once for this repo is shared by every worktree of it, not re-seeded per
  worktree
- `/graphify-wrapper-index` and `/graphify-wrapper-sync` run against this repo without first
  hitting a missing-registry error
