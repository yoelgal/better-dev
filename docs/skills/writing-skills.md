# /writing-skills

## What it does

This is the authoring standard every better-dev `SKILL.md` is written and reviewed against - the
shared bar that keeps a skill agent-agnostic (unchanged across hosts), lean on every load, and
honest about where it hands off to another skill instead of quietly re-teaching that skill's rules.
Its defining constraint: it never inlines its own copy into another skill's text. `/self-extension`
and `/review` apply it by referencing this file, so a rule changed here changes for every skill at
once - the alternative, a rule copied into each skill body, is the thing this standard exists to
prevent.

## When to reach for it

Reach for it when writing, reviewing, or refactoring any `SKILL.md` in this library - a new skill,
an edit to an existing one, or the moment `/self-extension` drafts one on a capability gap. It also
covers editing any always-loaded block the library ships outside a skill folder: a discovery block,
the comms block, a routing table - the same leanness and deletion-test rules bind there too, and
the sibling reference files a skill body sends the agent off to read sit under the same bar.

It is not where you go to run a workflow. If the task is "build the thing," the front-end for that
work (`/plan-grill`, `/diagnose`, and the rest) is the entry point; this skill only governs the text
those skills are written in.

## Where it fits

Meta and upkeep, off the build chain: nothing routes through it toward a PR. `/self-extension` enters
it as the last resort after `/tool-sourcing` finds no existing skill to reuse, and `/review` enters it
whenever a diff touches a `SKILL.md`. It is model-invoked (not user-only) precisely so both of those
flows can reach it without a person typing `/writing-skills` first.

## Common questions

**Why does a gate have to sound calm instead of using MUST/ALWAYS/CRITICAL?** A trap in the record
(`docs/TRAPS.md` #15) caught an author asked to "keep it gentle" writing a hedge instead of a real
gate - and a paired trap (#85) caught the opposite failure, a bare negation with no positive behavior
stated anywhere nearby. The standard's fix is one voice: a calm declarative that names the
consequence and the move to make instead, never a shout and never a hedge.

**Can I just restate a value from another file so the skill reads standalone?** Only if the lookup is
genuinely expensive or unwritten elsewhere. A recorded trap (`docs/TRAPS.md` #147) shows why not by
default: a skill body once copied in a verify command that a manifest already named, passed the
"does this change what the reader does" deletion test, and then went stale six weeks later when the
project switched test runners. The standard treats that as a second, separate filter - the cache rule -
that a sentence has to clear even after it clears the deletion test.

**Does a five-line skill that just lists an existing flow's steps deserve its own file?** Only if
people invoke it by name repeatedly (`docs/TRAPS.md` #86) - a flow that is only ever read for
reference belongs in a routing table row instead. Length is not the bar; reach is.

## It's working if

- A skill you read passes `bd-skill-stage lint` clean and its frontmatter `description` alone tells
  you when it fires, with no need to open the body to guess.
- A cross-skill reference in any skill body is a bare name, an imperative enter-step, or an inlined
  rule with attribution kept - never a citation-plus-paraphrase that only sounds like it carries the
  rule.
- A gate you hit while running a skill reads as one calm sentence naming a consequence and the move
  to make instead, not a wall of caps-locked warnings and not an optional-sounding hedge.
- A value repeated across two files traces back to one canonical source with the others pointing at
  it, not three independently-drifting copies.
