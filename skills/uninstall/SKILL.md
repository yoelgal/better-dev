---
name: uninstall
description: Use when a person wants to remove better-dev - unwire a repo (drop the .better-dev/bin bridge and optionally the CLAUDE.md/AGENTS.md block) or remove the global per-host install. Never deletes your rules, overrides, or learnings unless you ask.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Uninstall better-dev

Removing better-dev is deliberate, so this skill is user-invoked. The work is one script,
`.better-dev/bin/bd-uninstall` (in the clone, `scripts/bd-uninstall`); it removes only what better-dev
installed and leaves everything else in place.

The safety default is dry-run: every command below first prints exactly what it would remove and changes
nothing. Read that plan, then re-run with `--yes` to act.

## Two things to remove

- **This repo's wiring** - the per-machine `.better-dev/bin` bridge, and (on request) the managed
  discovery block in `CLAUDE.md` / `AGENTS.md`:

  ```
  .better-dev/bin/bd-uninstall repo                # dry-run: show what would go
  .better-dev/bin/bd-uninstall repo --unblock --yes  # drop the bridge and the managed block
  ```

- **The global per-host install** - the per-skill links in each host's skills dir and the install marker:

  ```
  .better-dev/bin/bd-uninstall global              # dry-run across detected hosts
  .better-dev/bin/bd-uninstall global --yes        # remove better-dev's links; leave foreign skills
  ```

  A same-named skill that isn't better-dev's is never touched; the report names what it left and why.

## Your data survives

`bd-uninstall repo` leaves `.better-dev/rules.md`, `overrides.md`, `learnings.jsonl`, and the loop
`ledger/` in place. They are only removed when you add `--purge-data`, and the dry-run shows them before
anything is deleted. If you want a clean unwire but want to keep your project's learnings, that is the
default - just omit the flag.

The removal is script-driven; when in doubt, run the dry-run and read its report before adding `--yes`.
