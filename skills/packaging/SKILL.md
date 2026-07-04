---
name: packaging
description: Use when installing better-dev on a machine, cutting a release, or validating the package before distribution - covers the global per-host install, the Claude Code plugin manifest, and the release gate.
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Packaging & distribution

better-dev ships in two layers, and packaging owns getting both in cleanly and proving the package is
shippable before a release.

- **The tool - global, once per machine.** The skills, `bd-*` helpers, and hooks live in one clone and
  link into the host's global skills directory one level deep, one symlink per skill
  (`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, and so on), gstack-style: every repo on the
  machine shares one copy.
  Nothing is ever vendored per repo; updating is a `git pull` in the clone.
- **A repo's `.better-dev/` - data only.** A project carries just its own data (`rules.md`,
  `overrides.md`, `learnings.jsonl`, and a gitignored loop `ledger/`) plus `.better-dev/bin`, a
  per-machine symlink back to the global tool. Skills keep referencing helpers at `.better-dev/bin/bd-mem`
  unchanged, and that path resolves through the symlink.

## Two ways in

- **Installer (any host).** `install.sh` links the tool into the host's global skills directory, falling
  back to a copy where symlinks aren't available. It's idempotent.
- **Claude Code plugin (convenience).** `.claude-plugin/plugin.json` lets a Claude Code user install the
  same skills and `hooks/hooks.json` as a plugin. Skills are discovered from `skills/` and hooks from
  `hooks/hooks.json` by convention - no per-skill list to maintain in the manifest.

Either way, `/onboard` then wires a repo's `.better-dev/` data and its `bin` symlink. The one-paste
front door - `BOOTSTRAP.md` - sequences the whole thing (detect host, install globally, onboard the
repo) for a user who just pastes a prompt.

Repo-authored skills stay out of the global tool: a skill minted by `/self-extension` is committed into
that repo's own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only
there. Promoting one to the global tool is a separate, deliberate step.

## The release gate

`.better-dev/bin/bd-package-check` (dev: `scripts/bd-package-check`) validates the whole package: every
skill lints (minimal frontmatter, `name` matches its folder, a "Use when" description, no `@`-links, calm
voice), every helper and hook passes its `selftest`, the JSON manifests parse, and every backtick-wrapped
`/skill` reference resolves to a shipped skill or a known host-optional builtin. It exits non-zero on any
failure. Run it before tagging a release, in CI, and - via `/self-extension` - before promoting a freshly
authored skill. A green check is the definition of shippable.

Bump the `version` in `.claude-plugin/plugin.json` per release; tag through `/release-promotion`.

## Adding or removing a skill

Because skills are discovered by directory, adding one is just a new `skills/<name>/` that passes
`bd-package-check` - no manifest edit. Keep authoring on the `/writing-skills` standard; let
`/self-extension` handle the staged-and-tested path when the agent writes one itself.
