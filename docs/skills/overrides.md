# /overrides

## What it does

Lets a project disagree with a better-dev default without editing the shared skill that carries it.
When someone pushes back mid-flow - a different branch prefix, a phase to skip, a house rule no
default knew about - the correction is honored immediately, and only on a separate "make this the
default here?" yes does it get written down as a standing project preference. It never rewrites a
`SKILL.md`, and it never lets a correction that changes the *product* being built pass as a workflow
preference - that kind is routed to the sealed contract instead.

## When to reach for it

| Situation | Route |
|---|---|
| "just push to the PR", "use feat/ not feature/", "skip the grill here" | Honor now, offer to persist |
| "stop asking me", said at a gate or hold | Same honor-now/offer-to-stand treatment, not silence |
| "use Postgres, not SQLite" against a contract that pinned SQLite | Not an override - a contract amendment |
| "also build X" with no criterion covering it | Not an override - a new work-item |
| An override that waives a recorded safety gate (denylist path, human-gate class, scope threshold) | Same honor-now, but the persist confirm names plainly what it weakens |
| Any skill about to apply a default | Reads the overrides layer first, silently, before this skill is ever invoked directly |

## Where it fits

It is the read-first layer every other skill consults before applying its own default, not a step in
the feature -> loop -> PR -> release chain. `/guardrails-install` writes the safety baseline this
layer can waive; `/autonomous-loop` and `/pr-and-verify` both read it before acting.

## Common questions

**A correction changes what's being built, not how better-dev works - does it still go here?**
No. The test is the sealed contract, read now:

| The instruction... | Is a... | Which does... |
|---|---|---|
| Contradicts a pinned line | Contract amendment | Re-opens the approval pin |
| Names a deliverable no criterion covers | New work-item | Starts fresh, doesn't bend the current one |
| Only touches a detail the contract leaves open | In-scope one-off | Handled inline, no contract change |

Writing "use Postgres" into `overrides.md` leaves the contract asserting the old decision while the
code diverges, and review later re-litigates the operator's own instruction as a finding.

**Can an override waive a safety gate quietly?**
No - a `safety-gate:`/`safety-scope:`/`safety-denylist:` line without an
`[operator: "<their words>" <date>]` marker reads as absent. The recorded baseline gate stands and the
waiver is put to the operator again before anything proceeds. `bd-mem persist-override` refuses to
write a safety-class line missing that marker.

**If I override one gate, can it silently cancel a different one?**
Yes, and this is a known unfixed edge, not a hypothetical: a same-key override replaces the *whole*
baseline entry, not just the part meant to change. One recorded incident - a general "the agent merges
its own green PR" override, persisted under the same `safety-gate` key as a path-scoped `hooks/**`
gate, silently cancelled that path-scoped gate, and it stayed cancelled for weeks because agents read
the baseline text and skipped the precedence rule. Nothing mechanically stops this; the stopgap is
discipline, not enforcement - an override meant to narrow rather than waive has to say what survives it
in its own text ("except the recorded machine-touching paths, which keep their gate"), because a reader
is never expected to infer a broad line was meant narrowly.

## It's working if

- A pushed-back correction is visible in the work done immediately, with no separate confirm step
  blocking it.
- A standing project preference is recorded only after an explicit "yes, make it the default" -
  never after the correction alone.
- A recorded safety-class waiver always carries an `[operator: "..." <date>]` marker; one without it
  is treated as if it were not there.
- A correction that actually changes the product shows up as a contract amendment or a new work-item,
  never as a persisted workflow preference.
