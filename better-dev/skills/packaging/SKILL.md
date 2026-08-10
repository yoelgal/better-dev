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
  `hooks/hooks.json` by convention - no per-skill list to maintain in the manifest. Every skill this
  channel installs shows up host-namespaced there (`better-dev:review`, not `/review`), so a bare chain
  reference resolves there by description match rather than by name, and a foreign skill holding the
  same bare name wins it outright over ours; the installer above holds the bare names directly.

  The skill contract is identical across both paths; the update contract is not. The installer's clone
  is yours to read and patch, and `/update` brings it current with a `git pull`; the plugin is a managed
  checkout the host owns, refreshed through the host's own plugin update rather than a pull. Pick the
  clone when you want to read or patch the tool, the plugin when you want it to keep itself current.
- **Marketplace manifest (monorepo root).** The agent-tools monorepo root ships
  `.claude-plugin/marketplace.json` listing each tool as a plugin (`"source": "./better-dev"`); a Claude
  Code user adds the repo as a marketplace and installs from it. The plugin's own `plugin.json` stays the
  single source for name, version, and description - the marketplace entry carries only name and source,
  so the two manifests cannot drift.

**Both channels carry the hooks.** The plugin registers the SessionStart/SubagentStart awareness hooks
from `hooks/hooks.json`; the clone channel registers the same two events itself, through
`scripts/bd-hook-wire`, into each host's verified machine-global hook config (`bd_host_hook_settings`
in `hosts/<name>`). Keep them in step - the shipped `hooks.json` is the reference, and `bd-hook-wire`'s
`WANT` table mirrors its awareness half. It deliberately omits the `bd-guard` PreToolUse entries: those
enforce a *repo's* blast-radius policy and belong to `/guardrails-install`, not to a machine-global install.

Channel parity is a release-gate property, not a nicety. Until 0.10.1 only the plugin wired hooks, and
because an agent told "install better-dev" reads `BOOTSTRAP.md` and cannot drive an interactive plugin
installer, it always took the clone path - so the common install shipped no session hook in any repo
while `BOOTSTRAP.md` claimed the tool installs them. A host with no verified hook config (`codex`,
`hermes`) still declines by design and says so; that is a named gap, not a silent one.

Either way, `/onboard` then wires a repo's `.better-dev/` data and its `bin` symlink. The one-paste
front door - `BOOTSTRAP.md` - sequences the whole thing (detect host, install globally, onboard the
repo) for a user who just pastes a prompt.

`install.sh` also carries `--dry-run` (print the link/skip/prune plan), `--list` (current state per
host), and `--verify` (assert every better-dev link resolves and the package gate passes). A shipped
skill whose name a foreign skill already holds is skipped rather than clobbered, and `--verify` fails
on it: that name now resolves to the other skill, and every better-dev chain reference reaches it. The
generic names carry the risk - `/review` is the loop's merge gate, and a foreign skill passing a diff
there is a green better-dev never gave. Rename or move the other skill, then re-run `install.sh`.

Repo-authored skills stay out of the global tool: a skill minted by `/self-extension` is committed into
that repo's own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only
there. Promoting one to the global tool is a separate, deliberate step.

## The release gate

`.better-dev/bin/bd-package-check` (dev: `better-dev/scripts/bd-package-check`) validates the whole package: every
skill lints (minimal frontmatter, `name` matches its folder, a "Use when" description, no `@`-links, calm
voice), every helper and hook passes its `selftest`, the JSON manifests parse, and every backtick-wrapped
`/skill` reference resolves to a shipped skill or a known host-optional builtin. It exits non-zero on any
failure. Run it before tagging a release, in CI, and - via `/self-extension` - before promoting a freshly
authored skill. A green check is the definition of shippable.

**Adding a check to the gate.** `bd-package-check --prove-new [base] [root]` audits the checks a diff
adds: it runs the current script against the base tree and requires every added check to come back
red there. Green at base means the check was vacuous - it passed before the thing it guards existed,
so it proved nothing; absent at base means it silently skipped, which is no better. CI runs this on
every PR, and `bd-package-check selftest` carries the fixtures proving the audit itself
discriminates. Two things a new check needs to survive it: a label with a distinctive literal phrase
(an entirely interpolated label cannot be matched back to its printed line, and fails as `UNKNOWN`),
and a top-level call site (ok/bad inside a function body or a heredoc is not read as a check). A
check that legitimately holds at base - a regression guard for an invariant that already passes -
declares itself on the line with `# prove-new: regression-guard <why>` and is exempted by name.

Bump the `version` in `.claude-plugin/plugin.json` per release; tag through `/release-promotion`. The
gate also refuses an empty manifest `version`, holds the no-em/en-dash rule over shipped text, and runs an
install/uninstall roundtrip in a throwaway `HOME` so a broken installer can't ship green.

Every version bump lands with a matching `docs/RELEASES.md` line declaring its needs flags -
`install` when the release added, removed, or renamed a skill dir, `reonboard` when it changed a
repo surface, `offer` when it added something opt-in the operator has to be asked about - and a
pull-only release needs no line at all. Whether the line *exists* is a release-step requirement the
releaser confirms when tagging through `/release-promotion`, not a mechanical check, so a
missing-but-needed line silently downgrades the release to pull-only for every wired repo - a defect
to fix before tagging. What `bd-package-check` does check is the offer tier's shape: that the tier
stays documented, that `/update` still acts on it, and that no `offer` line ships without
`reonboard` beside it, since only the reonboard nudge fires and an unpaired offer is one nobody is
ever prompted to collect.

`offer` is the tier to reach for whenever a release adds a capability nobody has yet opted into. A
first install meets such a capability at its own front door (`BOOTSTRAP.md`), but an already-wired
machine never runs that again - so without the flag the capability ships visible to new installs
only. `docs/RELEASES.md` carries the full tier definition.

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
auto-detection), `bd_host_skills_dir` (the host's native global skills dir, under `$HOME`), and
`bd_host_global_entry` (the file this host loads into every session on the machine, which
`BOOTSTRAP.md` offers to write the comms block into). Set `bd_host_global_entry` empty when no such
path is verified for the host - empty declines the global option and names the gap, where an absent
field reads the same but only means nobody looked yet.
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
