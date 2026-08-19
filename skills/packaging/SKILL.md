---
name: packaging
description: Use when installing better-dev on a machine, cutting a release, or validating the package before distribution - covers the global per-host install, the version manifest, and the release gate.
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Packaging & distribution

better-dev ships in two layers, and packaging owns getting both in cleanly and proving the package is
shippable before a release.

- **The tool - global, once per machine.** The skills and the four `scripts/bd-*` helpers live in one
  clone; `install.sh` links each skill into the host's global skills directory one level deep, one
  symlink per skill (`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, `~/.hermes/skills/<skill>`,
  `~/.omp/agent/skills/<skill>`): every repo on the machine shares one copy. Skills are the whole
  install - the host discovers and loads them itself, so nothing is registered in a host's own config.
  Nothing is ever vendored per repo; updating is a `git pull` in the clone.
- **A repo's `.better-dev/` - data only.** A project carries just its own data: `rules.md`,
  `overrides.md`, and a gitignored loop `ledger/`. No executables and no link back to the clone - a
  skill that needs a rule, an override, or a ledger file reads that file directly.

## One way in

**Installer (any host).** `install.sh` links the tool into each host's global skills directory, falling
back to a copy where symlinks aren't available. It's idempotent. Updating is a `git pull` in the clone. A
host whose skills-dir convention is not verified declines by design and says so; that is a named gap, not
a silent one.

better-dev used to also ship as a Claude Code plugin, added through a self-hosted marketplace manifest
at the monorepo root. Both are deleted (D32): the marketplace existed only because the monorepo
supplied a second consumer for it, and the extraction to its own repo removes that predicate.
`.claude-plugin/plugin.json` stays - it is the one place this repo's version lives - but it names no
install channel any more; better-dev is a clone-installed tool, full stop.

`/onboard` then writes a repo's `.better-dev/` data and its discovery block. The one-paste front door -
`BOOTSTRAP.md` - sequences the whole thing (install globally, onboard the repo) for a user who just
pastes a prompt.

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

`scripts/bd-package-check` validates the whole package: every skill lints (minimal frontmatter, `name`
matches its folder, a "Use when" description, no `@`-links, calm voice), every script passes its
`selftest`, the JSON manifests parse, and every backtick-wrapped `/skill` reference resolves to a shipped
skill or a known host-optional builtin. It exits non-zero on any failure. Run it before tagging a
release, in CI, and - via `/self-extension` - before promoting a freshly authored skill. A green check is
the definition of shippable.

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

`.claude-plugin/plugin.json` holds the one version this repo ships, and `/release-promotion` writes
it: the release step derives the bump from the commits since the last tag, edits the manifest, and
tags that commit - there is no separate bump to remember before a release. The gate also refuses an
empty manifest `version`, holds the no-em/en-dash rule over shipped text, and runs an
install/uninstall roundtrip in a throwaway `HOME` so a broken installer can't ship green.

Every version bump lands with a matching `docs/RELEASES.md` line declaring its needs flags -
`install` when the release added, removed, or renamed a skill dir, `reonboard` when it changed a
repo surface, `offer` when it added something opt-in the operator has to be asked about - and a
pull-only release needs no line at all. The line is derived at tag time, not remembered:
`/release-promotion` reads the commits since the last tag, judges the flags, and renders the exact
line for one operator confirmation - then commits it in the same commit as the manifest bump, since
the gate refuses a `docs/RELEASES.md` version the manifest has not reached. Nothing mechanical grades
those flags, so that one confirmation is all that stands between a mis-tiered line and every wired
repo silently reading the release as pull-only. What `bd-package-check` does check is the offer
tier's shape: that the tier stays documented, that `/update` still acts on it, and that no `offer`
line ships without `reonboard` beside it, since only the reonboard nudge fires and an unpaired offer
is one nobody is ever prompted to collect.

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
cleanly, not that any real host is actually linked - use `./install.sh --verify` for that. Nothing
watches the clone on your behalf, so noticing a stale install is a deliberate step: `/update` is the one
that pulls, reconciles the links, and reports what the release needed.

## Uninstalling

`/uninstall` removes better-dev cleanly: unwire this repo (optionally dropping the managed
`CLAUDE.md`/`AGENTS.md` block) or remove the global per-host install. It is dry-run by default and never
deletes a foreign same-named skill. Your `.better-dev/` data - `rules.md`, `overrides.md`, and the loop
`ledger/` - survives unless you pass `--purge-data`.

## Adding or removing a skill

Because skills are discovered by directory, adding one is just a new `skills/<name>/` that passes
`bd-package-check` - no manifest edit. A new `skills/<name>/` is only discovered on a machine that
re-runs `./install.sh`; until then its symlink doesn't exist there. Keep authoring on the
`/writing-skills` standard; let `/self-extension` handle the staged-and-tested path when the agent
writes one itself.

## Adding a host

A host is one row in the `BD_HOST_TABLE` that `install.sh` and `scripts/bd-uninstall` each carry:
pipe-separated, `name|display|skills dir under $HOME|dir policy`, no code. `install.sh` is the canonical
copy - edit it first - and `bd-uninstall` mirrors the table because it has to clean up without sourcing
the installer; `bd-package-check` gates that the two agree, so a row added to one and not the other
fails the gate rather than shipping a host that installs and never uninstalls. Set `dir policy` to
`create` only for a host whose skills-dir convention has been verified on a real install; everything else
stays `require-existing`, and `install.sh` then links only into a directory the host itself created - a
link into an invented path reports success and delivers nothing. The gate proves the rest: no host
collides with another's dir, and the pair round-trips install/uninstall in a throwaway `HOME`. Skills
themselves never change per host - one `SKILL.md` text ships to every host, which is why the table has no
transform, rewrite, or overlay field. Hosts whose conventions are still unverified (cursor and the rest)
are tracked in issue #9, not shipped as guesses.
