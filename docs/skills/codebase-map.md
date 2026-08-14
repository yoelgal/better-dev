# /codebase-map

## What it does

Gets structural orientation - callers, dependents, real schema, blast radius - from the best map
available in the repo, and refuses to block when there isn't one. It ships no code-graph engine and
keeps no index of its own: the structural tool underneath is always someone else's, swappable, and a
missing one falls back to disciplined grep rather than stalling the work.

## When to reach for it

Reach here before scoping, diagnosing, or reviewing an unfamiliar area - "who calls this", "what
depends on this", "what would this change break", or "what's the real schema of this table". Not a
destination on its own: it feeds the baseline check in `/plan-grill`, the root-cause seam in
`/diagnose`, and the blast-radius read in `/review`, and returns to whichever of those called it.

| Situation | Route |
|---|---|
| Need callers, dependents, or blast radius before acting | `/codebase-map` |
| A code-graph tool is already wired in this repo | this skill uses it, doesn't replace it |
| Nothing structural installed and the area is large or recurring | this skill sources one via `/tool-sourcing` |
| One-off, no tool worth the setup cost | this skill's own fallback: grep every caller, trace imports in and out |

## Where it fits

Composes whatever structural tool the repo already has - better-dev's own `/graphify-wrapper-query`
(with `/graphify-wrapper-sync` for freshness, `/graphify-wrapper-status` for staleness) is one
instance of that class, not the only one it will use. Called by `/plan-grill`, `/diagnose`, and
`/review` rather than invoked as its own front-end; `.better-dev/overrides.md` is read first in case
the project already pins a different code-graph skill or convention.

## Common questions

**The map gave me an answer that looks stale or a symbol looks moved - do I trust it?** No - a
structural map reflects its last build, not the live working tree. Run `/graphify-wrapper-status`
first: fresh means proceed, stale means sync the affected domain before trusting the answer, absent
means build one or say why not. Carry every answer to a `file:line` receipt at the source rather than
citing the map alone.

## It's working if

- A caller/dependent/blast-radius question gets answered with `file:line` receipts instead of a raw
  grep dump
- A repo with no structural tool installed still gets an answer - via disciplined search - rather than
  the calling skill stalling on "nothing to query"
- A repo that already runs its own code-graph or LSP setup gets that tool used, not a second one
  sourced alongside it
