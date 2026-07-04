---
name: writing-skills
description: Use when authoring, reviewing, or refactoring any better-dev skill - writing or editing a SKILL.md, including when the self-extension flow generates a new one.
---

# Writing better-dev skills

Every better-dev practice ships as a `SKILL.md` on the agentskills.io standard, so one skill runs
unchanged across Claude Code, Codex, pi, and hermes. This is the bar to author against.

## Frontmatter - minimal on purpose

Required - two keys, nothing else load-bearing:

- `name` - kebab-case, ≤ 64 chars, matches the folder name.
- `description` - the *only* text an agent reads before deciding whether to load the body. Write it as
  **triggering conditions**, third person, starting "Use when …". Do **not** summarize the workflow
  here: a description that reads like a summary tempts the agent to act on it and skip the body.

Optional - add only when a skill actually needs it:

- `disable-model-invocation: true` - makes the skill **user-invoked** (`/name` only), with zero standing
  context cost. Use it *only* when a skill should fire at a human's deliberate command: destructive or
  expensive actions, or a reference a person pulls up by hand. Do **not** use it for disciplines the
  *agent* must apply on its own - like this authoring standard, which the self-extension flow needs when it
  writes a skill. Those stay **model-invoked** so the agent can reach them. Omit the key to auto-fire.
- `argument-hint` - e.g. `[feature-slug]`, shown at the `/name` prompt.
- `allowed-tools` - narrow the tools the skill may reach for.

Never put `version`, `license`, or prose in frontmatter.

## Body - one job, disclosed progressively

- **One skill, one job.** If a second job creeps in, split the skill.
- Keep the body to what **every** run needs. Push the rest into sibling `.md` files reached by a **prose
  pointer** ("for the tricky cases, read `edge-cases.md`") - never an `@`-link or import, which force-load
  the file and spend context on every run whether it's needed or not.
- Depend on another skill by **naming it in prose** ("run `/grill` first"), never by reaching into its
  files. Shared knowledge lives inside the skill that owns it and is reached by invoking that skill.
- Plain, calm voice. No "MUST / ALWAYS / CRITICAL" shouting - an always-blocking tone fights better-dev's
  never-blocking principle. State the rule once; trust the reader.

## Composability & overrides

- A skill **adds**; it never disables or replaces what the project already has installed.
- Read `.better-dev/overrides.md` first and honor any project override before applying a default.
- Record durable rules and lessons through the memory contract (`.better-dev/bin/bd-mem`), never by
  hand-writing state files.

## How this standard reaches skills

better-dev writes a new skill only as a **fallback**: on a capability gap it first tries to *source* an
existing skill with `/tool-sourcing`, and only when nothing adequate turns up does
**`/self-extension`** draft one - read state, draft a `SKILL.md` in a staged dir, test it, then promote. No engine. That flow -
and the `review` skill - **apply this standard by referencing this file**, never by inlining a copy of its
rules (one source of truth). This skill is model-invoked only so the agent *also* reaches it when it edits
or refactors a skill outside that flow.

## Completion criterion

A skill is done when: an agent can decide whether to run it from the `description` alone; the body does
exactly one job; every path either has what it needs inline or a prose pointer to it; and it composes
cleanly with whatever else is installed.
