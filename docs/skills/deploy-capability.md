# /deploy-capability

## What it does

Stands up a deploy surface that does not exist yet - a platform project, the repo connected to it, a
domain answering, per-environment config uploaded - for a greenfield product with nowhere to land a
release. It creates; it never records what it created. Account creation, billing, and OAuth grants stay
the operator's own clicks - the skill emits paste-ready steps and premise-verifies each outcome, it
never clicks through them itself.

## When to reach for it

Reach here when "deploy this" or "get it live" hits a product with no platform project, repo
connection, domain, or per-environment config, or when `/release-promotion` finds no recorded deploy
rules and `/guardrails-install` has nothing to observe because nothing was ever created. Also the entry
point when a feature needs a product service provisioned - a database, an auth provider, transactional
email, a purchased domain.

Not every "nothing recorded" belongs here: a library or CLI that deliberately never deploys records
`deploy-surface: none` and stops - that is a `/guardrails-install` call, not this skill's. Which of the
two a repo is comes from the operator, asked before anything gets created, never guessed from the
absence alone.

| Situation | Route |
|---|---|
| Product should deploy, nothing exists yet | `/deploy-capability` |
| Product deliberately has no deploy surface (library, CLI) | `/guardrails-install` records `deploy-surface: none` |
| A surface already exists but its rules were never recorded | `/guardrails-install` |
| The surface exists and a release just needs to ship | `/release-promotion` |

## Where it fits

Sits upstream of `/guardrails-install`: this skill creates the surface and hands back what it observed,
`/guardrails-install` records it as `deploy-*` rules so `/release-promotion` finds them on its next run.
Composes whatever host deploy capability is already wired before falling back to an operator walkthrough,
and hands off to `/tool-sourcing` when even that stalls on a missing tool. Its walkthrough payload
fork - value-capture steps collapse into one generated script traced statically and never run,
probeable end states stay block-by-block - is the canonical form the other install-class skills
(`/observability-install`, `/guardrails-install`) point at from their own operator steps. A surface
that now exists is also now visible to `/observability-install` for the error tracking and alert
channel the first release will need.

## Common questions

**How does the skill decide whether my repo needs a surface or should just record `deploy-surface:
none`?** It doesn't decide - that call is the operator's, asked up front. Creating a surface nobody
wanted is as wrong as recording `none` on a product that ships, so the skill asks rather than guesses
from the absence of a recorded key.

**I ran through the walkthrough and the platform project exists - why doesn't `/release-promotion` see
it yet?** Nothing downstream reads a value this skill writes by hand. The last step hands the observed
platform, production URL, health probe, and preview resolution to `/guardrails-install`, which is what
actually records the `deploy-*` rules `/release-promotion` reads.

## It's working if

- The acceptance line named at the start (a URL, an expected response) resolves for real, not just
  according to a tool's own success message
- A pinned platform or a no-new-infra rule already on record is honored instead of overridden - the
  walkthrough opens with that check, not a fresh guess
- Env var values never pass through the agent - only their names do - the operator pastes values
  directly into the platform's own env surface
- A follow-up `/release-promotion` run finds recorded `deploy-*` rules instead of stopping to ask who
  should create them
