---
name: deploy-capability
description: Use when a product needs a live deploy surface that does not exist yet - "deploy this" or "get it live" on a greenfield product with no platform project, repo connection, domain, or per-environment config - when /release-promotion finds no recorded deploy rules and /guardrails-install has nothing to observe because nothing was ever created, or when a feature needs a product service provisioned (a database, an auth provider, transactional email, a domain). The deploy-surface sibling of /browser-capability - the same source-a-capability-on-a-gap practice.
---

# Creating the deploy surface so a release has somewhere to land

Every deployment-adjacent skill reads a deploy surface; none of them creates one. `/guardrails-install`
records only what it can observe, and `/release-promotion` with no recorded rules settles `NEEDS_INPUT`
naming the recorder - which, on a greenfield product, observes nothing and sends the question straight
back. The circle breaks only when someone creates the surface: a platform project, the repo connected
to it, a domain answering, the environment config uploaded. That is a capability gap, not a missing
line of code, and it fills the way `/browser-capability` fills a missing browser: compose what the host
already wires, walk the operator through what only they can create, source a tool for the rest.

One distinction runs first. `deploy-surface: none` is the correct record for a library or a CLI - a
deliberate no, settled once. This skill is for the other case: a product that should deploy and has no
surface yet. Unsure which this repo is? That is the operator's question, asked before anything is
created - creating a surface nobody wanted is as wrong as recording `none` on a product that ships.

Read `.better-dev/overrides.md` first. A repo may already pin its platform, forbid new infrastructure,
or name the team that owns provisioning - honor that before any rung below.

## 1. Name the gap as an observable check

Write the missing surface as the probe it has to pass: "the app answers 200 at a public URL," "a push
to the integration branch produces a deployment," "`https://<domain>` serves the landing page." That
line is the acceptance test for whichever rung fills the gap, and later the premise-verify
`/guardrails-install` runs before recording - so it names a URL and an expected response, not "set up
hosting."

## 2. Create the surface, in this order

1. **A wired host deploy capability.** Detect by capability, never by assuming a vendor: a deploy
   skill the host ships, a platform CLI that is installed and already authenticated (its `whoami`
   answers). Where one exists, compose it - it creates the project, connects the repo, and returns the
   URLs this skill needs. Its output is a premise to verify, not a fact: fetch the URL it reports and
   read the status yourself.
2. **The operator walkthrough.** Account creation, billing, org membership, and OAuth grants are the
   operator's to perform - an agent cannot and should not click through them. Emit the steps as short
   paste-ready blocks (offered to the clipboard where the host has one), one decision at a time:
   create the platform project, connect the repo so pushes deploy, point the domain, upload the
   environment variables. Env var *names* travel through you; values never do - the operator pastes
   values into the platform's own env surface, and you verify presence by name afterward. After each
   step the operator runs, premise-verify the outcome (the project lists, the deploy triggered, the
   URL answers) before moving to the next - a walkthrough graded on the operator's "done" instead of
   an observed probe inherits every typo.
3. **Source a fallback.** When the host wires nothing and the walkthrough stalls on a missing tool (no
   CLI for the chosen platform, an API-only step), hand the step-1 gap line to `/tool-sourcing` and
   let it run its course - discover, vet, try ephemerally, risk-gate, adopt. Don't reimplement its
   judgment or safety gate here.

## 3. Hand the observed values to the recorder

A created surface the rest of better-dev cannot see is the same dead-end one step later. On success,
run `/guardrails-install` with what was just observed - the platform, the production URL, the health
probe, how previews resolve - so it premise-verifies and records the `deploy-*` rules exactly as it
would on a repo where the surface predated it. This skill creates; the recorder records; nothing
downstream ever reads a value this skill wrote by hand. `/release-promotion`'s next run then finds
recorded rules where its dead-end used to be. And a surface that now exists can now be seen -
`/observability-install` wires the error tracking and alert channel the first release will need.

## Product infrastructure

A deploy surface is rarely the only thing a greenfield product has to provision. A database, an auth
provider, transactional email whose deliverability actually holds, a purchased domain and its DNS -
each is the same three-rung shape, per service. The per-service specifics - connection-string handoff,
SPF/DKIM checks, DNS verification - live in `provisioning.md`; read it when the gap is a service
rather than the surface itself.
