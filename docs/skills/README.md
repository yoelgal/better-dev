# Skill pages - the human surface

One page per shipped skill. `SKILL.md` is the agent surface; these pages are for the person
deciding whether to trust a practice before an agent runs it - what it does, when it fires,
what they will see when it is working, and where its known sharp edges are. The roster in
`../../skills/` is the count of record: every skill directory has exactly one page here,
`docs/skills/<name>.md`, and the package gate (`bd-package-check`) enforces the mapping both
ways, so a rename or removal that leaves a stale page fails the gate instead of shipping.

## The page shape

Sections, in this order. The first two orient; the last two answer the reader's own
situation. A page that clears neither of the last two is unfinished, not finished-and-short.

```
# /<name>

## What it does
One short paragraph, plain prose, stating the job and its defining constraint - the thing
this skill refuses to do or hand over is as load-bearing as what it performs.

## When to reach for it
The trigger boundary: the situations that route here, and the near-neighbour that routes
elsewhere ("for a bug, /diagnose"). Invocation mode where it matters.

## Where it fits
One or two lines placing it on the chain (front-end -> loop -> PR -> release), what it
composes, and what composes it.

## Prerequisites
Only where one exists (a wired repo, a recorded key, an installed capability, a hard
entry state like a sealed contract or a clean review verdict). A hard precondition
lives here, not inside "When to reach for it". Absent otherwise - an empty section is
noise.

## Common questions
Sourced, never invented - see the evidence rule below. Each entry is a bold question
line ("**Question?**") followed by its answer as prose, a blank line between entries -
never a bullet list of questions.

## It's working if
A few bullets naming what the reader sees when the skill is doing its job - see the bar
below.
```

## The rules a page is written under

- **Common questions is evidence-gated.** Hunt before writing any: `docs/TRAPS.md` entries
  naming the skill, `DECISIONS.md` rulings that touch it, `docs/RELEASES.md` lines that
  changed it, its own `rationalizations.md` sidecar where one exists. A question filed as a
  trap is a question the page owes an answer to. Where the hunt runs thin the section may
  carry a question a reader would plainly ask, but the count stays honest to the evidence -
  a heavily-run skill earns five, a quiet one earns one or none. An invented question
  teaches the reader nothing.
- **It's working if is checkable without opening SKILL.md.** Every bullet is a signal in the
  reader's own repo or trace - a red check that goes green exactly at done, a PR that opens
  already carrying its review verdict. A compliance check on the skill's internals wearing
  this section's name is the failure. The capability bar binds each bullet: no file paths,
  no counts of files, no first-person verbs about a session's own work.
- **A known unfixed sharp edge is stated plainly**, with its stopgap, in Common questions -
  never omitted and never claimed fixed. The trap record is the library's own memory; the
  page is where a user meets the edge before it meets them.
- **No page writes an install command.** Installation has one canonical story,
  `BOOTSTRAP.md` - link it as a real relative link (`[BOOTSTRAP.md](../../BOOTSTRAP.md)`).
  Two copies of an install command is drift waiting to happen.
- **No page restates what one file or one command answers.** A `--help` surface, a
  frontmatter description, a recorded key's value - name the lookup, don't cache the value.
  A page carries what the reader cannot get by looking: the reason behind a choice, the
  boundary, the gotcha no config confesses.
- **Branches go in a table or a list, never a paragraph** - a reader arrives knowing their
  situation and is scanning for the row that matches it.
- **A behaviour change lands with its page re-synced in the same commit.** The mapping gate
  catches a missing or orphaned page; only this rule catches a stale one, and the review
  pass reads the page diff beside the skill diff.
- House style: calm voice, no em or en dashes (spaced hyphen instead), no MUST/STOP tone.

## Index

Entry and planning: [onboard](onboard.md) · [groundwork](groundwork.md) ·
[plan-grill](plan-grill.md) · [diagnose](diagnose.md) · [gauntlet](gauntlet.md) ·
[design-brief](design-brief.md) · [codebase-audit](codebase-audit.md)

The build loop: [worktree-branching](worktree-branching.md) ·
[autonomous-loop](autonomous-loop.md) · [orchestrating-agents](orchestrating-agents.md) ·
[review](review.md) · [security-pass](security-pass.md)

Shipping: [pr-and-verify](pr-and-verify.md) · [release-promotion](release-promotion.md) ·
[deploy-capability](deploy-capability.md) · [observability-install](observability-install.md) ·
[guardrails-install](guardrails-install.md)

Repo understanding: [codebase-map](codebase-map.md) · [graphify-wrapper-map](graphify-wrapper-map.md) ·
[graphify-wrapper-query](graphify-wrapper-query.md) · [graphify-wrapper-sync](graphify-wrapper-sync.md) ·
[graphify-wrapper-index](graphify-wrapper-index.md) · [graphify-wrapper-status](graphify-wrapper-status.md) ·
[graphify-wrapper-setup](graphify-wrapper-setup.md)

Capabilities: [browser-capability](browser-capability.md) · [ios-capability](ios-capability.md) ·
[tool-sourcing](tool-sourcing.md) · [self-extension](self-extension.md) ·
[source-harvest](source-harvest.md)

Meta and upkeep: [writing-skills](writing-skills.md) · [overrides](overrides.md) ·
[wait-what](wait-what.md) · [bootstrap-hooks](bootstrap-hooks.md) · [packaging](packaging.md) ·
[update](update.md) · [uninstall](uninstall.md)
