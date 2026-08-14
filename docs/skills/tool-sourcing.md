# /tool-sourcing

## What it does

When work stalls on a missing capability, this skill looks for an existing skill that already
solves it and installs that, instead of writing a new one. The defining constraint: creating a
skill from scratch is the fallback, never the first move - sourcing only hands off to
`/self-extension` once discovery has come up genuinely empty across every channel it checks, not
after one thin search.

## When to reach for it

Reach here the moment a capability gap surfaces mid-work - the agent needs a tool or skill it
doesn't have, or someone asks "is there a skill for X" / "find a tool that does X." It runs before
any code gets written for the gap.

| Situation | Route |
|---|---|
| Capability gap mid-work, nothing written yet for it | `/tool-sourcing` (here) |
| Sourcing came up empty across every channel | `/self-extension` |
| A proven, repeatable workflow worth capturing as new | `/self-extension` |
| A UI needs a browser or an iOS simulator to verify against | `/browser-capability` or `/ios-capability` (the worked examples of sourcing a tool on this exact gap) |

## Where it fits

Sits ahead of `/self-extension` in one ordered flow: source first, create only as the proven-empty
fallback. Any front-end or loop step that hits a capability gap - `/browser-capability` and
`/ios-capability` are its own worked examples - composes this skill rather than reaching for
`npx skills` directly.

## Common questions

**Why not just take the first hit from `npx skills find`?** The CLI's installer is hardened and
worth riding as-is, but its discovery is thin: it searches one central index, ranks purely by
install count, and returns an empty list on any error - so a rate limit or outage looks identical
to "no such skill exists." This is a known, unfixed limitation of the underlying index, not
something this skill patches. The stopgap is procedural: treat one empty or thin result as a
prompt to widen (reworded queries, a known owner's GitHub directly, a `.well-known/agent-skills`
lookup, a web search), and only a reproduced empty across every channel, retried once, justifies
calling it a real gap.

**Why does a web-search hit not count as a find on its own?** Search results now include templated
"X vs Y" comparison domains that mirror the same underlying data across many sites and read as
independent coverage when they aren't. A hit from web search is a lead until it resolves to a real
repo or a real `SKILL.md` that can be read directly - the same provenance check every other
candidate goes through before adoption.

## It's working if

- A capability gap gets named as one line - the missing behavior plus the check that would prove
  it filled - before any search runs.
- An empty first search is followed by widened queries or a direct-repo look, not treated as a
  verdict.
- Nothing is committed to the repo before the candidate has been run ephemerally against the
  gap's check.
- Installing a low-reputation or unfamiliar skill stops for an explicit human OK or a recorded
  risk-acceptance, rather than proceeding unattended.
- A sourced tool (or a reasoned rejection) ends up recorded, so the next run that hits the same
  gap reuses the decision instead of re-searching from zero.
