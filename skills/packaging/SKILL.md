---
name: packaging
description: Use when installing better-dev into a repo, cutting a release, or validating the package before distribution — covers the vendored install, the Claude Code plugin manifest, and the release gate.
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Packaging & distribution

better-dev ships as a **vendored, agent-agnostic** layer, not a host-specific plugin: the practices live
in the repo so any agent — Claude Code, Codex, pi, hermes — and every collaborator picks them up. One job
here: get the package into a repo cleanly, and prove it's shippable before a release.

## Two ways in

- **Vendored install (primary, any agent).** `./install.sh [target-repo]` copies the `bd-*` helpers into
  the target's `.better-dev/bin/`, the skills into `.better-dev/skills/`, and the hooks into
  `.better-dev/hooks/`; when a `.claude/` directory is present it also links the skills into
  `.claude/skills/` so Claude Code discovers them. It's idempotent. Afterwards, `/onboard` wires the
  project (memory backend, branching, the discovery block).
- **Claude Code plugin (convenience).** `.claude-plugin/plugin.json` lets a Claude Code user install the
  skills and `hooks/hooks.json` globally. The skill contract is unchanged: skills still resolve their
  helpers at `.better-dev/bin/`, which `/onboard` (or `install.sh`) populates per repo. Skills are
  discovered from `skills/` and hooks from `hooks/hooks.json` by convention — there's no per-skill list to
  maintain in the manifest.

The vendored path is the source of truth; the plugin is a thin front door for one host. A non-Claude user
never needs the plugin.

## The release gate

`.better-dev/bin/bd-package-check` (dev: `scripts/bd-package-check`) validates the whole package: every
skill lints (minimal frontmatter, `name` matches its folder, a "Use when" description, no `@`-links, calm
voice), every helper and hook passes its `selftest`, the JSON manifests parse, and every backtick-wrapped
`/skill` reference resolves to a shipped skill or a known host-optional builtin. It exits non-zero on any
failure. Run it before tagging a release, in CI, and — via `/self-extension` — before promoting a freshly
authored skill. A green check is the definition of shippable.

Bump the `version` in `.claude-plugin/plugin.json` per release; tag through `/release-promotion`.

## Adding or removing a skill

Because skills are discovered by directory, adding one is just a new `skills/<name>/` that passes
`bd-package-check` — no manifest edit. Keep authoring on the `/writing-skills` standard; let
`/self-extension` handle the staged-and-tested path when the agent writes one itself.
