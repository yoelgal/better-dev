---
name: observability-install
description: Use when a repo that deploys has no standing production observability - no error tracking wired, no health endpoint, no alert channel that reaches a human when prod fails - or when a recorded obs-* rule reads none and that gap should now be filled. The runtime sibling of /guardrails-install - commit-time gates catch a broken commit before it lands; this catches a broken prod before a user reports it.
---

# Install a repo's minimum production observability

One test decides everything here: **does a prod failure reach a human before a churned user's email
does?** A deploy can verify green and then break at 2am, days after `/release-promotion`'s bounded
watch ended - by design, since a standing cadence is the host's `/loop` or `/schedule` to own. What
stands between that failure and silence is not a cadence: it is error tracking that captures the
failure, a health endpoint that makes "up" checkable, and one alert channel that pages a person. Wire
those three, prove they fire, record them.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`) - a repo may already
name its monitoring stack, or hold "we never instrument prod" as a recorded decision; honor either.

## Detect what already observes this repo

Same discipline as `/guardrails-install`: detection is a premise, not a fact - report each as observed
value plus where, and add only what is missing.

- **Error tracking** - an error-tracking dependency in the manifest, its DSN-shaped env var named in
  the env template, the init call in the entry point. A dashboard mentioned in the README is a claim
  until the dependency and the init are seen.
- **Health endpoint** - the recorded `deploy-health` rule (`.better-dev/bin/bd-mem recall "deploy"`),
  or a health/status route in the code. Fetch it once and read the status.
- **Alert channel** - an alert rule in the tracker, an uptime probe pointed at prod, a deploy workflow
  that notifies on failure. The bar is "reaches a human": a rule posting to a channel nobody reads
  passes the grep and fails the test.

A repo with no deploy surface has nothing to observe yet - `/deploy-capability` creates the surface
first, and this skill runs after it.

## Wire the three, minimum

Add only the gaps; never replace monitoring the repo already runs.

1. **Error tracking.** Prefer what already exists at either end: the deploy platform's own error and
   log surface, where it ships one a human can be alerted from, else the stack's common tracker wired
   by SDK. Account creation is the operator's - paste-ready steps, one at a time, the same walkthrough
   discipline `/deploy-capability` holds. The DSN travels as an env var *name* into the deploy
   surface's per-environment config (the recorded `deploy-env` rule says where); its value goes
   operator-to-platform, never through you.
2. **A health endpoint.** One route that answers 200 only when the process is up and its critical
   dependency answers (a datastore ping, not a static string) - a health check that cannot fail cannot
   alert. This route is what the `deploy-health` rule points at; where none was recorded, hand the URL
   to `/guardrails-install` to record.
3. **One alert channel that reaches a human.** An alert rule on the tracker (a new error type, an
   error-rate spike) or an uptime probe on the health endpoint, delivering to a channel a named person
   actually receives - email, chat, a pager. One channel is the minimum and the point: more is the
   operator's later choice, zero is the gap this skill exists to close. A probe armed on the health
   endpoint doubles as the standing between-releases watcher the `obs-health` rule records - one wire,
   two keys; so does the host's own cadence primitive armed with the probe line `/release-promotion`
   offers on a `VERIFIED` settle.

## Prove it fires

Wiring unproven is the same silence with more config. Trigger the pipeline end to end once: raise a
synthetic error on the deployed surface (the tracker's own test-event command, or a throwing test
route removed afterward) and confirm the event lands *and the alert arrives* - the operator saying
"got the page" is the pass. A dashboard that merely looks delivered answers a different question than
the one this skill runs on.

## Record, absence as a named gap

```bash
.better-dev/bin/bd-mem remember "obs-error-tracking: <where prod errors aggregate, observed at file:line - or none>"
.better-dev/bin/bd-mem remember "obs-alert-channel: <what pages a human on a prod incident - or none>"
.better-dev/bin/bd-mem remember "obs-health: <the standing probe that watches prod between releases - or none>"
```

The key vocabulary is `/guardrails-install`'s - its prose defines what each key means, and it detects
and records the same family on a repo whose wiring predates it; this skill fills the gaps a recorded
`none` names. One split matters: `deploy-health` records the health *URL*; `obs-health` records that
something reads it when nobody is looking.

A piece the operator declines or defers is recorded as the explicit negative
(`obs-alert-channel: none`), the same shape as `deploy-surface: none`: a recorded no is a decision
`/release-promotion` and `/diagnose` read and settle on, where a missing key is a question every later
session pays to re-ask. An incident in a repo whose obs-* keys read `none` starts from "we chose not
to see this" - a very different diagnosis from "we forgot."

## Composability

Additive and idempotent: it never replaces installed monitoring, and a re-run fills only what is still
missing. The standing watch cadence stays the host's `/loop` or `/schedule` - this skill wires what
those cadences, `/release-promotion`'s post-deploy watch, and `/diagnose`'s incident path read.
`/groundwork` names this seam in a deploying product's foundation; `/guardrails-install` owns the
deploy-* records the health endpoint feeds. When revising this skill, follow `/writing-skills`.
