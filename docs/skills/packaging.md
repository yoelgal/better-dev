# /packaging

## What it does

Owns what the better-dev repo ships as plugin content and proves that content shippable before a
version is tagged. Its defining constraint is where it applies: this is maintainer work inside the
better-dev repo itself, run from a checkout, and none of it is reachable from or aimed at a repo that
merely uses better-dev. It builds nothing and installs nothing - a host takes the repo through its own
marketplace channel, so the package is the repo, and packaging's job is to keep that repo honest.

## When to reach for it

- Cutting a release: the gate has to pass before the tag, and the version lives in exactly one file.
- Adding a check to the release gate, which has its own audit for whether the new check proves anything.
- Adding, renaming, or removing a skill or a rule, including promoting one a `/self-extension` run
  authored elsewhere.

Near neighbours:

| Situation | Route |
|---|---|
| Wiring a single repo's `.better-dev/` data and discovery block | `/onboard` |
| Tagging, promoting, and verifying the release once the gate is green | `/release-promotion` |
| Authoring or revising the text of a skill | `/writing-skills` |

## Where it fits

Meta and upkeep, alongside `/writing-skills` and `/overrides`: packaging owns the shipped surface and
the release gate, not a step any build-loop or shipping skill waits on in normal use.
`/release-promotion` composes it at tag time to prove the package is clean before a version ships. A
skill `/self-extension` authored inside some other project never passes through here; only one being
landed into this repo's own `skills/` does.

## Prerequisites

A checkout of the better-dev repo, with `jq` and a POSIX shell on PATH for the gate.

## Common questions

**What happens when a shipped skill's name collides with a skill I already have?** Yours wins, and
nothing is clobbered. Plugin skills load through a separate provider from your own skills, so the
precedence question has an answer rather than a race: your `review` stays your `review`, and the shipped
one loses the name. Chain references inside better-dev that name that skill then reach yours, which is
worth knowing for a generic name, but the failure mode is a practice you did not get rather than a file
you lost.

**Why does the same catalog ship twice?** omp reads `.omp-plugin/marketplace.json` and Claude Code
reads `.claude-plugin/marketplace.json`. Each host finds its own path and neither has to fall back to
the other's. The plugin manifest is a different file and ships once, at
`.claude-plugin/plugin.json`: omp looks for an omp-path manifest first and falls back to that one, so a
second copy would buy nothing and drift. That single file also holds the version, which the catalogs
deliberately omit so there is one place a release bump edits.

**Why is the always-on communication style a rule rather than a skill?** Because `alwaysApply: true` is
honoured for rules, not for skills. A skill carrying it has its name discovered and its body left out of
context, which reads as working right up until you check whether the text was ever in front of the
model. Anything that has to bind every turn ships as `rules/<name>.md`.

**Is the shipped rule actually loading?** Not through the marketplace channel on omp 17.3.8, which is a
known and unfixed edge. A marketplace install of this repo delivers the skills and does not deliver
`rules/`; the same rule file placed at `<project>/.omp/rules/comms.md` loads fine, so the artifact is
correct and the channel is the gap. The skills all arrive normally, so what you lose is the style rule
alone. The stopgap belongs in your own repo, not in this one: a project that wants the style binding
today keeps its own copy under its `.omp/rules/`. This repo holds the body to exactly one home and the
gate enforces that, so a second copy here is the drift the check exists to catch.

## It's working if

- The gate exits clean before a tag, and the same check shows green on every pull request.
- A new check added to the gate comes back red against the tree that predates the thing it guards,
  rather than passing there and proving nothing.
- A release announces a version the shipped manifest has actually reached, so nothing downstream reads
  the release as older or newer than it is.
- A skill added or removed arrives with its human page added or removed in the same change, rather than
  leaving a page naming something that no longer ships.
