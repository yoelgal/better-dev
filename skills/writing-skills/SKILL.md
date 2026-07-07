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

## Encode the judgment at the decision point

A skill's process gates only bite if the executor can't rationalize around them. Wherever a skill has a
point where a model under pressure will declare victory early - a check that "basically" passes, a guess
standing in for a missing fact, a green signal read as "it works" - inline the one-line counter *at that
point*. The counter lives in the body, never in a shared file, because it has to survive the skill being
copied to another host alone.

Where a single decision point draws a whole family of excuses - the core loop skills do - give the skill a
sibling `rationalizations.md`: a two-column table of the excuse and its counter, plus a short Red-Flags
list, reached by a prose pointer ("before settling a pass as done, read `rationalizations.md`"). The
sibling travels with the folder, so it survives isolation too, and progressive disclosure keeps it out of
context until a pass is about to declare done. Add the table only where it earns its keep - most skills
need two or three inline counters, not a table.

Write done-criteria as **checkable criteria, not adjectives**. "Share the same understanding" and
"watertight" are destinations an executor reads generously; give it the test that it arrived. "Can I
predict the user's reaction to the next three questions I'd ask?" is a check; "shared understanding" is a
vibe. "For any percentage, find both endpoints and divide, because that's where a flipped sign hides" is a
procedure a model can run; "check your work" is not.

### The disposition menu

These are the reflexes Fable-5 execution runs at each decision point. They are a menu, not a list to paste
whole: inline the two to four a given skill's decision points actually need, in that skill's voice, at the
exact spot the excuse shows up.

| Disposition | The move | The failure it prevents |
|---|---|---|
| Check, don't recall | Read the file before any claim about it; phrase it "I checked X, it says Y", never "probably Y". | A confident answer from training-shaped memory that the file contradicts. |
| Read the real ask | Restate the request in one sentence and surface your assumptions before building. | Building the literal words and missing the intent. |
| Decompose into checkable pieces | Split the problem so each piece has its own runnable check; done-criteria are per-property. | One monolithic "looks done" that hides a wrong piece. |
| Spend effort where the risk lives | Take the narrowest check that changes your confidence: a one-liner goes inline, a money or auth path gets review, verify, and a regression test. | Over-orchestrating trivia; under-verifying a load-bearing change. |
| Verify by re-deriving, behavior not the green | Re-compute the claim yourself and drive the running surface; don't stop at "exit 0". | Passing a smooth-sounding wrong number; "compiled, ship it". |
| Separate known from guessed | Mark anything unverified `UNVERIFIED:`; a missing fact is a question, not a default. | A silent guess baked into the contract and then driven green. |
| Attack your own conclusion | Hand the finding you're surest of to an independent refuter; pass the artifact, never your conclusion. | A plausible-but-wrong result surviving because the reviewer only saw the claim. |
| Root cause at the choke point | grep every caller before editing; one guard in the shared function beats a guard per caller. | Patching the named path and leaving sibling callers broken. |
| Question whether it should exist | Ask whether the thing needs to exist before improving it; deletion over migration, applied to your own prior proposal too. | Polishing something whose right answer was deletion. |
| Change your mind out loud | Concede explicitly when out-argued, then generalize the insight; name the concrete downside, not a vague one. | A yes-machine implementing a bad idea; consistency chosen over correctness. |
| Answer first, report honestly | Lead with the outcome; if a step was skipped or a check failed, say so with the output. | A buried finding, a manufactured green, a hedged non-report. |
| Name the mistakes that look like competence | The rationalization table itself: name the specific excuse that skips a gate under pressure. | The gate that never bit because its excuse went unnamed. |

## Composability & overrides

- A skill **adds**; it never disables or replaces what the project already has installed.
- Read `.better-dev/overrides.md` first and honor any project override before applying a default.
- Record durable rules and lessons through the memory contract (`.better-dev/bin/bd-mem`), never by
  hand-writing state files. A lesson is one atomic insight with a recall key on the front, not a
  paragraph of narrative - one insight per `learn` call. The long write-up belongs in the ledger
  receipt; the reusable line belongs in `learnings.jsonl`, keyed so a future `recall` finds it.

## How this standard reaches skills

better-dev writes a new skill only as a **fallback**: on a capability gap it first tries to *source* an
existing skill with `/tool-sourcing`, and only when nothing adequate turns up does
**`/self-extension`** draft one - read state, draft a `SKILL.md` in a staged dir, test it, then promote. No engine. That flow -
and the `review` skill - **apply this standard by referencing this file**, never by inlining a copy of its
rules (one source of truth). This skill is model-invoked only so the agent *also* reaches it when it edits
or refactors a skill outside that flow.

## Proving a skill works

Lint proves a skill is well-formed. It does not prove the skill works. Three cheap checks close the gap -
no harness, no fixtures, one manual run each - and the last two are what `/self-extension` runs before it
promotes:

- **Well-formed** - `bd-skill-stage lint` passes: valid frontmatter, a kebab name matching the folder, a
  description that states its trigger, no `@`-links or stray keys.
- **It fires** - write one realistic prompt that should route here and one near-neighbor prompt that
  should route to a *different* skill; confirm the description carries the first without over-claiming the
  second. A skill that won't trigger has a wrong description, not a wrong body - fix the description, not
  the prose.
- **It changes behavior** - run one realistic input with the skill loaded and confirm the agent does what
  the skill promises, judged on what it *did* (the tool calls, the diff), not what it narrated. For a
  fragile or judgment-heavy skill, use a trap: an input a skill-less agent gets wrong (the rigged scenarios
  in `docs/TRAPS.md` are built for exactly this). If the skill doesn't catch it, the body was too vague -
  make that step procedural and re-run.

A skill is done when it passes all three and composes cleanly with whatever else is installed: an agent
decides whether to run it from the `description` alone, the body does exactly one job, and every path has
what it needs inline or a prose pointer to it.
