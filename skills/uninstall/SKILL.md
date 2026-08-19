---
name: uninstall
description: Use when a person wants to remove better-dev - drop the managed CLAUDE.md/AGENTS.md discovery block from a repo, or remove the global per-host skill install. Never deletes your rules, overrides, or ledger unless you ask.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# Uninstall better-dev

Removing better-dev is deliberate, so this skill is user-invoked. The work is one script in the clone,
`scripts/bd-uninstall`; it removes only what better-dev installed and leaves everything else in place.
Resolve the clone the way `/update` step 1 does - read any installed skill link
(`readlink "$HOME/.claude/skills/onboard"` and the other hosts' dirs) and strip the
`/skills/onboard` suffix off its target - then run `"$clone"/scripts/bd-uninstall`.

The safety default is dry-run: every command below first prints exactly what it would remove and changes
nothing. Read that plan, then re-run with `--yes` to act.

## Two things to remove

- **This repo's wiring** - the managed discovery block in `CLAUDE.md` / `AGENTS.md`:

  ```
  "$clone"/scripts/bd-uninstall repo                 # dry-run: show what would go
  "$clone"/scripts/bd-uninstall repo --unblock --yes # drop the managed block
  ```

- **The global per-host install** - the per-skill links in each host's skills dir and the install marker:

  ```
  "$clone"/scripts/bd-uninstall global               # dry-run across detected hosts
  "$clone"/scripts/bd-uninstall global --yes         # remove better-dev's links; leave foreign skills
  ```

  A same-named skill that isn't better-dev's is never touched; the report names what it left and why.

## Your data survives

`bd-uninstall repo` leaves `.better-dev/rules.md`, `overrides.md`, and the loop `ledger/` in place. They
are only removed when you add `--purge-data`, and the dry-run shows them before anything is deleted. If
you want a clean unwire but want to keep your project's records, that is the default - just omit the flag.

The removal is script-driven; when in doubt, run the dry-run and read its report before adding `--yes`.
