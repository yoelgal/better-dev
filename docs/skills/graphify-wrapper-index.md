# /graphify-wrapper-index

## What it does

Edits the registry entry for one named domain index by hand - register a `name` + repo-relative
`path` pair (optionally marked `--semantic`), or remove one. It never builds a graph itself and
never decides what domains a repo should have; it only maintains the JSON registry that
`/graphify-wrapper-sync` later reads to know what to build.

## When to reach for it

You already know the domain name and path and just want it registered ("add an index for
services/backend") or dropped ("drop that domain"). If you don't know how to carve up the repo
yet, reach for `/graphify-wrapper-map` instead - it analyzes the repo, proposes a domain set,
refines it with you, and calls this skill to register the ones you keep. Once a domain is
registered, building or refreshing its actual graph is `/graphify-wrapper-sync`, not this skill.

## Where it fits

Sits between `/graphify-wrapper-map` (which calls it to register the domains it proposes) and
`/graphify-wrapper-sync` (which reads the registry this skill maintains to know what to build) and
`/graphify-wrapper-status` (which reports on the same registry). It depends on
`/graphify-wrapper-setup` having already run for this repo and machine - it refuses to proceed
without a registry file already in place.

## Prerequisites

graphify wired for this repo and machine via `/graphify-wrapper-setup` - registering or removing
a domain exits immediately with "run /graphify-wrapper-setup first" if that registry file isn't
found.

## Common questions

**Why not just hand-edit the registry JSON instead of going through this skill?** Because
registration and removal both run the same name validator the rest of graphify's path helpers
use, plus a check that the path actually exists in the repo before it's accepted. A hand-edited
entry skips both checks and can point sync at a domain that was never a real subtree.

## It's working if

- Registering a domain that already exists updates its path or `--semantic` flag in place rather
  than adding a second entry for the same name.
- `/graphify-wrapper-sync` builds exactly the domains this registry lists - nothing extra, nothing
  missing.
- Removing a domain deletes its built graph output for this worktree in the same step, so there's
  no leftover graph directory to notice later.
- Registering a bad name or a path that doesn't exist in the repo fails immediately with a clear
  message, instead of leaving a broken entry behind.
