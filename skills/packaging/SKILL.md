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

- **The tool - global, once per machine.** The skills and `bd-*` helpers live in one clone; `install.sh`
  links each skill into the host's global skills directory one level deep, one symlink per skill
  (`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, `~/.hermes/skills/<skill>` - one adapter file
  per host under `hosts/`), gstack-style: every repo on the machine shares one copy. The awareness hooks ship in the same clone but the installer does not wire them
  (see the hook caveat below).
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

**Hook caveat.** The SessionStart/SubagentStart awareness hooks are wired only by the Claude Code plugin
(via `hooks/hooks.json`). `install.sh` links skills, not hooks, so a clone install gets the practices but
not the session nudge; wire hooks with the plugin or the `/bootstrap-hooks` skill when you want them.

Either way, `/onboard` then wires a repo's `.better-dev/` data and its `bin` symlink. The one-paste
front door - `BOOTSTRAP.md` - sequences the whole thing (detect host, install globally, onboard the
repo) for a user who just pastes a prompt.

`install.sh` also carries `--dry-run` (print the link/skip/prune plan), `--list` (current state per
host), and `--verify` (assert every better-dev link resolves and the package gate passes).

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

Bump the `version` in `.claude-plugin/plugin.json` per release; tag through `/release-promotion`. The
gate also refuses an empty manifest `version`, holds the no-em/en-dash rule over shipped text, and runs an
install/uninstall roundtrip in a throwaway `HOME` so a broken installer can't ship green.

Every version bump lands with a matching `docs/RELEASES.md` line declaring its needs flags -
`install` when the release added, removed, or renamed a skill dir, `reonboard` when it changed a
repo surface - and a pull-only release needs no line at all. That line is a release-step
requirement the releaser confirms when tagging through `/release-promotion`, not a mechanical
check: `bd-package-check` does not read `RELEASES.md`, and the session-start nudge and `/update`
do, so a missing-but-needed line silently downgrades the release to pull-only for every wired
repo - a defect to fix before tagging.

## Updating and breaking changes

`git pull` in the clone is the update, but a running session keeps the text it loaded at start - only a
fresh session sees the pulled text. Re-running `install.sh` reconciles the links: it links a brand-new
skill (the most common reason to re-run), prunes a skill removed upstream, and reclaims a moved clone's
stale links, so a pull that renames or drops a skill leaves no orphan. There is no per-skill version
pinning - latest wins - so a `bd-package-check` after a pull is the safety net that catches a skill a new
version broke. `bd-package-check` runs hermetically (a throwaway `HOME`) and proves the package installs
cleanly, not that any real host is actually linked - use `./install.sh --verify` for that. The
session-start hook is the mechanical catch in between: it nudges when the clone is behind upstream, and
also when a pulled clone holds a skill the host never linked.

## Uninstalling

`/uninstall` removes better-dev cleanly: unwire this repo (drop the `.better-dev/bin` bridge, optionally
the managed `CLAUDE.md`/`AGENTS.md` block) or remove the global per-host install. It is dry-run by default
and never deletes a foreign same-named skill. Your `.better-dev/` data - `rules.md`, `overrides.md`,
`learnings.jsonl`, and the loop `ledger/` - survives unless you pass `--purge-data`.

## Adding or removing a skill

Because skills are discovered by directory, adding one is just a new `skills/<name>/` that passes
`bd-package-check` - no manifest edit. A new `skills/<name>/` is only discovered on a machine that
re-runs `./install.sh`; until then its symlink doesn't exist there. Keep authoring on the
`/writing-skills` standard; let `/self-extension` handle the staged-and-tested path when the agent
writes one itself.

## Adding a host

A host is one file: `hosts/<name>`, shell-sourceable KEY=value pairs, no code. Required:
`bd_host_name` (equals the filename), `bd_host_display`, `bd_host_cli` (the binary probed for
auto-detection), and `bd_host_skills_dir` (the host's native global skills dir, under `$HOME`).
Optional: `bd_host_dir_policy` - `create` only for a host whose skills-dir convention has been
verified on a real install; everything else stays the default `require-existing`, and `install.sh`
then links only into a directory the host itself created - a link into an invented path reports
success and delivers nothing. `install.sh`, `bd-uninstall`, and the package gate all enumerate
`hosts/`, so dropping the file is the whole change, and `bd-package-check` proves it: the new adapter
sources cleanly, carries every required field, collides with no other host's dir, and round-trips
install/uninstall in a throwaway `HOME`. Skills themselves never change per host - one `SKILL.md`
text ships to every host, which is why no adapter has a transform, rewrite, or overlay field. Hosts
whose conventions are still unverified (cursor and the rest) are tracked in issue #9, not shipped as
guesses.
