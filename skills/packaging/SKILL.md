---
name: packaging
description: Use when working in the better-dev repo itself on what the plugin ships or on cutting a release - proving the package shippable before a tag, adding a check to the release gate, or adding, renaming, or removing a skill or a rule.
allowed-tools:
  - Bash
  - Read
  - Edit
---

# Packaging the plugin

better-dev is a plugin, and this repo is the plugin. Nothing is built and nothing is installed from
here: a host takes this repo through its own marketplace channel and loads the content it finds inside.
So packaging owns two things - what this repo ships as plugin content, and proving that content
shippable before a version is tagged. Everything below runs from a checkout of this repo, and none of it
is reachable from a repo that merely uses better-dev.

## What ships

Plugin content is conventional directories, discovered by path. Two of them exist here:

- **`skills/<name>/SKILL.md`** - one directory per skill, frontmatter `name` matching the folder.
  Adding a skill is adding a directory; no manifest lists it.
- **`rules/<name>.md`** - a rule, whose full text the host injects into the system prompt when its
  frontmatter carries `alwaysApply: true`. That behaviour belongs to the rule pipeline and not to
  skills: a skill given the same frontmatter has its name discovered and its body left out of context,
  so anything that has to be in front of every turn ships as a rule rather than as a skill.
  `rules/comms.md` is the one this repo ships.

**`rules/` ships but does not currently load through the marketplace channel.** Probed on omp 17.3.8
against a marketplace install of this repo in an isolated `HOME`: the shipped skill was seen, the
shipped rule was not, while the identical file at `<project>/.omp/rules/comms.md` was. The artifact is
right and the channel is missing, so this is a named gap rather than a reason to reshape the file.

No hooks, commands, agents, tools, `.mcp.json`, or `package.json` ship today. A conventional directory
that does not exist is not a gap - add one when there is something real to put in it, not to fill the
shape.

The catalog ships twice, byte-identical: `.omp-plugin/marketplace.json`, which omp reads, and
`.claude-plugin/marketplace.json`, which Claude Code reads. Shipping both means neither host has to
fall back to the other's path. hermes takes the same repo through its own `plugins install` verb and
needs no manifest here. The catalog entry's `source` is `"./"` - the repo root is the plugin - which is
why `skills/` and `rules/` sit where they do and nothing has to move.

**One version, one place: `.claude-plugin/plugin.json`'s `version`.** That is the plugin manifest, and
it is the only one; omp looks for `.omp-plugin/plugin.json` first and falls back to the Claude path, so
the single file serves both hosts and a second copy would only add drift. The catalog entries carry no
`version` key on purpose - a host resolves an entry's version from the plugin manifest, verified live
on an install that reported 0.1.0 from a catalog naming none. The gate holds both directions: a catalog
entry that grows its own `version`, or whose `description`, `author`, `homepage`, `repository`,
`license` or `keywords` stop matching the plugin manifest, fails.

Plugin skills load through their own provider rather than the operator's personal skills folder, and
that settles the name-collision problem the old install channel could only report: a user's own skill
named `review` wins, and the shipped one loses the name rather than clobbering theirs. Nothing here has
to defend against it.

A skill authored inside some other project by `/self-extension` stays that project's own - it lands in
that repo's project skills directory and is discovered only there. Promoting one into this plugin is a
separate, deliberate step: a new `skills/<name>/` here, through the gate below.

## The release gate

`scripts/bd-package-check` validates the whole package: every skill lints (minimal frontmatter, `name`
matches its folder, a "Use when" description, no `@`-links, calm voice), every script passes its
`selftest`, the JSON manifests parse, and every backtick-wrapped `/skill` reference resolves to a
shipped skill or a known host-optional builtin. It exits non-zero on any failure. Run it from the repo
root before tagging a release, in CI, and before landing a skill authored elsewhere into `skills/`
here. A green check is the definition of shippable.

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
tags that commit - there is no separate bump to remember before a release. The gate refuses an empty
manifest `version` and holds the no-em/en-dash rule over shipped text.

`docs/RELEASES.md` owns its own release-line format and tier definitions, and `/release-promotion`
derives a release's line at tag time from the commits since the last tag. **Nothing mechanical grades
that line**, so read that file rather than a second copy of its rules here, and treat the one operator
confirmation at tag time as the only thing standing between a mis-tiered line and every reader of it.

A tagged version reaches a machine only when that machine updates the plugin through its host, and a
session already running keeps the text it loaded at start - only a fresh session sees new content. Each
host owns the verb for that update, and this repo does not: naming one host's spelling here would be
wrong on the others.

## Adding or removing a skill

Adding one is a new `skills/<name>/` that passes `bd-package-check`, plus its `docs/skills/<name>.md`
page - the gate maps the two one-for-one in both directions, so a skill with no page and a page with no
skill both fail. No manifest edit either way. Removing a skill deletes both halves. Keep authoring on
the `/writing-skills` standard, and let `/self-extension` handle the staged-and-tested path when the
agent writes one itself.
