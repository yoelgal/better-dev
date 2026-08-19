# /packaging

## What it does

Packaging owns getting both of better-dev's layers in cleanly - the global, once-per-machine tool
clone and a repo's own `.better-dev/` data - and proving the result is shippable before a release
goes out. Its defining constraint: nothing is ever vendored per repo, so the release gate it runs
only proves the package installs cleanly in a throwaway environment, never that any particular real
host is actually linked - that second, live check is a separate, explicit step.

## When to reach for it

- Installing better-dev on a machine for the first time, or reconciling an existing install after a
  pull.
- Cutting a release: bumping the version and passing the gate before tagging.
- Validating the package before distribution, including right before promoting a freshly authored
  skill.

Near neighbours:

| Situation | Route |
|---|---|
| Wiring a single repo's `.better-dev/` data once the tool itself is installed | `/onboard` |
| Tagging and promoting once the gate is green | `/release-promotion` |

## Where it fits

Meta and upkeep, alongside `/writing-skills`, `/overrides`, `/update`, and
`/uninstall`: packaging owns the install (global clone, plugin manifest as a version stamp) and the release
gate, not a step any of the build-loop or shipping skills wait on in normal use. `/release-promotion`
composes it at tag time to prove the package installs clean before a version ships, and `/update`
composes it after a pull to catch anything the new version broke. `/self-extension` also runs
packaging's gate before promoting a newly authored skill to the global tool.

## Common questions

**What happens when a skill's name collides with one I already have?** The shipped skill is skipped
rather than clobbering the existing one, and the install verification step fails on it so the
collision doesn't go unnoticed. This is a known, unfixed edge rather than a resolved one: generic
names carry real risk, since the name now resolves to the other skill for every chain reference that
names it, and there is no automatic reconciliation. The stopgap is manual - rename or move the
colliding skill, then reinstall.

## It's working if

- The release gate exits clean before a tag, and the same check shows green on every pull request.
- A skill removed from a newer version stops being offered by the host after the next install run,
  with nothing left dangling.
- Re-running the install on a machine that is already current reports nothing left to do, rather
  than relinking everything from scratch.
- A freshly authored skill that fails the gate is caught before it reaches the global tool, not
  after.
