---
name: overrides
description: Use when the user pushes back on a better-dev default mid-flow - "just push to the PR, don't open a worktree", "use feat/ not feature/", "skip the grill here", "we never instrument prod" - to honor the correction now and, with a light confirm, make it the standing default for this project. Also when a mid-loop instruction changes what is being built rather than how - a correction to a decision the work-item's contract pins - to route it to the right disposition instead of absorbing it. Also the read-first layer every skill consults before applying a default.
---

# overrides - the project's own opinions win

better-dev ships opinionated defaults, and a project is allowed to disagree with any of them. When
someone corrects a default in the middle of the work, that correction is the authority here - not the
skill that suggested otherwise. One job: honor the correction now, and offer to make it the standing
default, without ever rewriting the shared skill that carried the default.

The overrides live in `.better-dev/overrides.md`, a managed block the host agent already ingests. They
are read first by every skill and beat anything a default would have done.

## When the user pushes back

Someone steers away from what a skill was about to do - a different branch prefix, a spec that lands
somewhere else, a phase they want skipped, a house rule the default didn't know about. Pushback also
arrives as a wish rather than a complaint - "just handle it yourself", "stop asking me", said at a
gate, a hold, or a question moment - and that is a correction to that moment's default, owed the same
honor-now / offer-to-stand treatment; when the standing form is an allowance another skill records
(auto-merge is `/guardrails-install`'s merge-policy; per-item consent stays the contract's `merge:`
line and is never skipped - silence is never consent), route the persist there instead of writing a
generic override line. Two things follow, in order:

**1. Honor it now.** Apply the correction to the work in front of you immediately. This one is settled
the moment they say it; nothing below gates the current work.

**2. Offer to make it stand.** Once the immediate work is unblocked, ask one light question:

> Make this the default here - `use feat/ not feature/` - or just this once?

One question, their exact intent phrased back as a durable one-liner, and a real one-off option. A
correction meant for this moment stays a one-off; you don't persist it, and you don't ask twice. Only a
"yes, make it the default" writes anything.

## Persisting an accepted override

On a yes, write it as a single durable line through the memory contract:

```bash
.better-dev/bin/bd-mem persist-override "review fixes push to the PR, no new worktree"
```

That lands the line inside the managed block in `.better-dev/overrides.md`. It is idempotent - the same
override twice changes nothing - so re-persisting is always safe. Phrase the line as a standing rule the
next session can act on cold ("integration branch is `develop`"), not as a note about this conversation
("user said develop just now"). A keyed line records the stable option key, not the display label a
question happened to use - phrasings shown to the user change between sessions, and the recorded
preference has to survive the rewording.

## When the override waives a safety gate

Most overrides are preferences - a branch prefix, where a spec lands, a phase to skip - and the light
confirm above fits them. One class is different: an override that *waives or weakens a recorded safety gate* -
a denylist path, a human-gate class (auth, payments/PII, infra, dependency bumps), or the scope threshold
`/guardrails-install` recorded. Honor the immediate work the same way, but a persisted waiver drops a guard
on every future run, so before making it *stand*, name plainly what it weakens and confirm the operator wants
that standing, not just here:

> This makes auth changes auto-proceed with no human gate, on every future run - persist that, or keep the
> gate and just proceed this once?

A one-off past a safety gate is a loop approval: it persists nothing, the same way "just proceed this once"
never should. Only an explicit yes to the *standing* change writes anything, and it writes as a keyed line
the loop and PR brief already recall, so the exception sits beside the baseline it bends and carries its own
provenance:

```bash
.better-dev/bin/bd-mem persist-override "safety-gate: payments waived (was human-gated)"
```

`/guardrails-install` writes the baseline (`safety-gate:` / `safety-scope:` / `safety-denylist:`); a waiver
writes a matching keyed line here; the loop reads this overrides layer first. Watch the pressure tell: a
safety gate waived to get past a moment of frustration is a different bar for the same code - if the reason
is deadline rather than a real change of policy, keep the gate and take the one-off.

## The read-first side

Every skill reads the overrides before it applies a default, so an accepted override quietly wins from
then on:

```bash
.better-dev/bin/bd-mem read overrides 2>/dev/null
```

That is why encoding a project preference by editing a shared `SKILL.md` is the wrong move - a skill is
the same across every project, and a preference belongs to this one. The overrides layer exists so the
default stays general and the project keeps its own opinion beside it. When a correction touches
something a specific skill owns - a branch prefix for `/worktree-branching`, a repro convention for
`/diagnose` - the override captures it; the skill stays untouched and simply reads it next time.

A recorded line that git or file reality contradicts - an integration branch the record names that
`git branch` no longer lists, a command that no longer exists - is a stale premise, not an
instruction. Re-verify against reality, apply what is real now, and offer the one-line rewrite of the
record (the same light confirm this skill already owns). Obeying the stale line, or stopping without
offering the rewrite, both leave the next session to hit it again.

## When the correction changes the product, not the practice

Mid-loop, an instruction can change *what* is being built rather than how better-dev works - "stop,
use Postgres, not SQLite" against a contract that pinned SQLite. That is never an override line: an
override records how this project wants the work done, and a product decision lives in the work-item's
sealed contract - recording it here leaves the contract asserting the old decision while the code
diverges, and `/review`'s spec channel later re-litigates the operator's own instruction as a finding.
Route it instead. The test is the sealed contract, read now rather than remembered, and it picks one of
three dispositions:

- **It contradicts a line the contract pins** - a done-criterion, a pinned decision, the scope. That is
  a contract amendment: amend `contract.md`, which re-opens the approval pin
  (`.better-dev/bin/bd-mem ledger check-approval` now fails), and the re-confirm judges the printed
  delta - `/plan-grill`'s seal owns the mechanics. Driving resumes only against the re-pinned contract;
  changing the code first leaves the contract asserting a decision the operator already reversed.
- **It names a deliverable no criterion covers** - not a change to this item but a second item. That is
  a new work-item with its own worktree and contract (`/worktree-branching`), never a rider smuggled
  into the running loop's diff.
- **It fits inside what the approved contract leaves open** - a detail no line pins either way. That is
  an in-scope one-off: apply it now, no re-approval, one receipt line recording the instruction and
  where it landed.

When two readings survive the test, ask the operator which they meant - one question is cheaper than an
amendment that re-opens approval for a detail that was always in scope, or a one-off that quietly
rewrites a pinned decision.

## What counts as an override versus a lesson

An override is a *preference*: a way this project wants the work done, standing until changed. Something
the work *taught* you - a flaky test, a build quirk, a fact about the codebase - is a lesson, and belongs
in `bd-mem remember`/`learn`, not here. If you're unsure, ask which one the user means before persisting.
