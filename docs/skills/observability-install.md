# /observability-install

## What it does

Wires the minimum a production repo needs before a failure reaches a human instead of only a
churned user: error tracking that captures the failure, a health endpoint that makes "up"
checkable, and one alert channel that pages a named person. It stops short of wiring anything
already there - detection is a premise the skill re-checks, not a fact it assumes - and it never
runs the pipeline unproven: the last step is triggering a synthetic failure and confirming the
alert actually arrives, not just that a dashboard would show it if someone looked. Account
creation on the tracker or alerting platform stays the operator's own action; a secret value never
passes through the skill, only its env var name.

## When to reach for it

Reach here when a repo that deploys has no standing production observability - no error tracker in
the manifest, no alert rule anywhere, no probe on a health endpoint - or when a recorded `obs-*`
key already reads `none` and that gap is now worth closing.

| Situation | Route |
|---|---|
| No deploy surface exists yet to observe | `/deploy-capability` first, this skill after |
| A broken commit before it lands | `/guardrails-install` (commit-time gates) |
| An incident already in progress | `/diagnose` |
| A standing recurring watch cadence | the host's `/loop` or `/schedule`, armed with the probe line this skill wires |

## Where it fits

The runtime sibling of `/guardrails-install`: that skill's gates catch a broken commit before it
lands, this one catches a broken prod before a user reports it. Long account-setup walkthroughs
borrow `/deploy-capability`'s payload fork - mostly-values steps become one generated script,
traced statically, never run end to end. It runs after `/deploy-capability` has created a deploy
surface, and its wiring feeds three downstream readers - `/release-promotion`'s post-deploy watch,
`/diagnose`'s incident path, and `/groundwork`, which names this seam when a deploying product's
foundation is first laid.

## Prerequisites

A deploy surface must already exist. A repo with nothing deployed has nothing to observe yet -
`/deploy-capability` stands the surface up first.

## Common questions

**Why does a probe that always reports green count as worse than no probe?** A check earns trust only
if its failure mode is visibly distinct from its success mode - a job that can only ever report "ran,"
never "ran correctly," trains a human to stop reading it. The skill designs each wire against that
honest-null rule rather than shipping a check that always passes.

**What if the repo genuinely has no error tracker or alert channel yet?** The gap is recorded as an
explicit `obs-alert-channel: none`, not skipped - a recorded `none` is a fact downstream sessions
settle on, while a silently missing key is a question every later session pays to re-ask. A repo
carrying that `none` learns of its own incidents from users, which is why it surfaces in the close-out
headline rather than sitting quietly below it.

## It's working if

- A synthetic error raised on the deployed surface produces both a captured event on the tracker
  and an alert a named person confirms actually arrived.
- The health endpoint returns success only when its critical dependency answers too, not a static
  string that can't reflect a real outage.
- A prod incident starts from a paging alert, not from a user's bug report.
