---
name: overrides
description: Use when the user pushes back on a better-dev default mid-flow - "just push to the PR, don't open a worktree", "use feat/ not feature/", "skip the grill here", "we never instrument prod" - to honor the correction now and, with a light confirm, make it the standing default for this project. Also the read-first layer every skill consults before applying a default.
---

# overrides - the project's own opinions win

better-dev ships opinionated defaults, and a project is allowed to disagree with any of them. When
someone corrects a default in the middle of the work, that correction is the authority here - not the
skill that suggested otherwise. One job: honor the correction now, and offer to make it the standing
default, without ever rewriting the shared skill that carried the default.

The overrides live in `.better-dev/overrides.md`, a managed block the host agent already ingests. They
are read first by every skill and beat anything a default would have done.

## When the user pushes back

Someone steers away from what a skill was about to do - a different branch prefix, a spec that lands
somewhere else, a phase they want skipped, a house rule the default didn't know about. Two things
follow, in order:

**1. Honor it now.** Apply the correction to the work in front of you immediately. This one is settled
the moment they say it; nothing below gates the current work.

**2. Offer to make it stand.** Once the immediate work is unblocked, ask one light question:

> Make this the default here - `use feat/ not feature/` - or just this once?

One question, their exact intent phrased back as a durable one-liner, and a real one-off option. A
correction meant for this moment stays a one-off; you don't persist it, and you don't ask twice. Only a
"yes, make it the default" writes anything.

## Persisting an accepted override

On a yes, write it as a single durable line through the memory contract:

```bash
.better-dev/bin/bd-mem persist-override "review fixes push to the PR, no new worktree"
```

That lands the line inside the managed block in `.better-dev/overrides.md`. It is idempotent - the same
override twice changes nothing - so re-persisting is always safe. Phrase the line as a standing rule the
next session can act on cold ("integration branch is `develop`"), not as a note about this conversation
("user said develop just now").

## The read-first side

Every skill reads the overrides before it applies a default, so an accepted override quietly wins from
then on:

```bash
.better-dev/bin/bd-mem read overrides 2>/dev/null
```

That is why encoding a project preference by editing a shared `SKILL.md` is the wrong move - a skill is
the same across every project, and a preference belongs to this one. The overrides layer exists so the
default stays general and the project keeps its own opinion beside it. When a correction touches
something a specific skill owns - a branch prefix for `/worktree-branching`, a repro convention for
`/diagnose` - the override captures it; the skill stays untouched and simply reads it next time.

## What counts as an override versus a lesson

An override is a *preference*: a way this project wants the work done, standing until changed. Something
the work *taught* you - a flaky test, a build quirk, a fact about the codebase - is a lesson, and belongs
in `bd-mem remember`/`learn`, not here. If you're unsure, ask which one the user means before persisting.
