---
name: overrides
description: Use when the user pushes back on a better-dev default mid-flow - "just push to the PR, don't open a worktree", "use feat/ not feature/", "skip the grill here", "we never instrument prod" - to honor the correction now and, with a light confirm, make it the standing default for this project. Also when a mid-loop instruction changes what is being built rather than how - a correction to a decision the work-item's contract pins - to route it to the right disposition instead of absorbing it. Also the read-first layer every skill consults before applying a default.
---

# overrides - the project's own opinions win

better-dev ships opinionated defaults, and a project is allowed to disagree with any of them. When
someone corrects a default in the middle of the work, that correction is the authority here - not the
skill that suggested otherwise. One job: honor the correction now, and offer to make it the standing
default, without ever rewriting the shared skill that carried the default.

A recorded override lives in your harness's durable memory - the store the host injects into a later
session on its own. That is the whole mechanism: nothing written into the repo, no block for a host to
discover, nothing to keep in sync. The section below names the surface per harness, and it is the only
place in this library that does; every other skill states the intent and points here. That surface
belongs to the main conversation: a worker neither reads nor writes it, and the rule for what a worker
does instead has its own section below.

The cost, stated where you meet it rather than in a footnote: every one of those stores is per-machine
and per-user. An override you record does not reach a colleague, and does not reach your own second
machine. Shared conventions are a separate unsolved problem. This skill does not solve it, and neither
did the file it replaces. Codex's own documentation draws the same line, verbatim: "Keep required team
guidance in AGENTS.md or checked-in documentation. Treat memories as a helpful recall layer, not as the
only source for rules that must always apply." Take that as the honest bound here. A convention that
must hold for everyone belongs in whatever file that team already checks in and reviews; an override is
this operator's preference on this machine. One partial exception, read out of the installed Claude
Code binary: its auto-memory store carries a `team/` subdirectory for memories shared across everyone
working in a repo. That is one host's answer, not a portable one, so do not build on it.

## Where a recorded decision lives

Four hosts, four surfaces, and they differ in ways that change what you can actually do. Every row
carries how it was established, because they are not equally strong - some cells were probed on this
machine, some come from a host's own shipped documentation, and one host rests on vendor documentation
alone. Trust each cell as far as its last column earns, no further. Every row describes the *main
conversation's* surface; in a worker none of these read or write paths exist, whatever the row says.

| Harness | Durable surface | On by default | Agent can write it | How established |
| --- | --- | --- | --- | --- |
| omp | `learn` writes a lesson, which is injected at the *next* session start. The store and the read-back both follow `memory.backend`: `local` writes `learned.md` under the agent dir keyed by cwd (read it with `read` on `memory://root/learned.md`), while `mnemopi` and `hindsight` store their own way and expose `recall`/`reflect` instead - which `local` does not have | **No** - `memory.backend` ships `off` | Only when registered, and registration needs `autolearn.enabled` (default `false`) **and** a backend other than `off`. Subagents never auto-receive `learn` even when both hold | Read omp's own documentation in this session (`omp://memory.md`, `omp://tools/learn.md`), and confirmed the subagent case by observation - this machine has `autolearn.enabled = true` and `memory.backend = mnemopi`, and this subagent still has no `learn` tool |
| Claude Code | "auto memory" - `~/.claude/projects/<project>/memory/`, a `MEMORY.md` plus topic files, loaded into every session beside `CLAUDE.md`; `<project>` derives from the git repo, so every worktree shares one store | Yes | Yes, Claude writes it mid-session, and "remember that X" routes here rather than to `CLAUDE.md` | Vendor docs, plus the store path, the `<auto-memory-index>` injection tag and `CLAUDE_CODE_DISABLE_AUTO_MEMORY` read out of the installed 2.1.233 binary on this machine |
| hermes | the built-in `memory` tool (`add`/`replace`/`remove`/`read`) over `~/.hermes/memories/MEMORY.md` and `USER.md`, injected as a frozen snapshot at session start | Yes | Yes, the `memory` tool | Ran `hermes memory status`, which reports built-in memory "always active", and read the installed `tools/memory_tool.py` |
| Codex | "memories" under `~/.codex/memories/`, injected into later sessions when `memories.use_memories` is set | **No** - needs `[features] memories = true` | **No, not at all.** The only producer is a background pass over idle prior chats. There is no agent-callable write, so an agent on Codex cannot record an override, period - not "with difficulty", not "indirectly" | Vendor documentation only, not probed; the local `memories_1.sqlite` holds an empty job queue, consistent with the feature being off |

Two of those four ship the surface disabled, and one of those two cannot be written by an agent at all
however it is configured. So the fallback below is not a rare case for an exotic host. It is the
condition on half this list.

On Codex it is not a fallback but the permanent state. Tell the operator plainly that their correction
is honored now and will not persist, because nothing an agent can call writes that store. Leaving them
to discover it later - three sessions in, re-stating the same preference each time - is the failure
this costs the most.

**Verify the surface before you offer to record, not after.** The confirm is a promise, so do not make
one you cannot keep. On omp the failure mode is not an error, it is an *absence*: with `memory.backend`
off, or from any subagent, the `learn` tool is simply not registered, so there is no call to fail and
nothing to notice. That is the specific trap. An agent that reasons "I recorded the override" from
having reached the step, rather than from a write that returned, reports success for a write it never
attempted. Check that the surface exists and is yours to call; treat its absence as the answer.

**A write that fails or cannot be attempted is reported to the operator in the same turn, with what to
do about it.** Not a later summary, not a silent fallback, not "recorded" with a caveat buried below.
Say which of the three it was - the surface is off, this host has no agent-callable write, or you are a
worker rather than the agent holding the conversation - and give the operator the move: enable it
(`memory.backend` plus `autolearn.enabled` on omp, `[features] memories = true` on Codex), restate the
override at the start of each session, or put it in whatever file that host does load and read -
`CLAUDE.md` on Claude Code, `AGENTS.md` where the host reads one. Offering to enable it is the best
first move, since it is a one-line setting and it is what makes every later confirm mean anything.

Never report an override as recorded when the write had nowhere to go. A confirm followed by a silent
no-op is worse than never offering, because the operator stops repeating a preference they now believe
is held, and the override is lost precisely because they asked for it to stand.

## Only the agent talking to the operator records

Durable memory belongs to the main conversation, in both directions. A subagent that finds something
worth standing returns it as a finding; the parent offers the confirm and does the write. That is the
correct ownership before it is a workaround for anything: recording an override requires the operator's
yes, and the operator is in the main conversation, not in a worker's context. A worker that recorded a
standing project decision would be committing the project to something nobody approved. Two workers
recording the same key would race, which is the same reason one writer owns one key.

The read side has the same shape, and it was measured rather than assumed. In a default worker on omp
there is no read path at all: no `<memories>` injected, no `recall`, and `read memory://root` answers
`Unknown protocol: memory://`. omp's own documentation says why - a subagent aliases the parent's bank
for *explicit* `recall`/`retain`/`reflect` calls but "do[es] not run their own automatic recall or
retention", so the injection that makes the read free never happens and the explicit path needs a tool
the worker does not have. Claude Code lands in the same place by a different mechanism: its auto memory
is not inherited by subagents, which get their own store.

So the parent reads the recorded decisions and passes the relevant ones down in the brief, and a worker
honors what the brief carries. When you are a worker and a default is about to apply, the brief is your
record of this project's decisions; its silence is not evidence that nothing was recorded, so a
correction you would have persisted goes back up as a finding rather than dying with your context.

This is also what makes the verify-before-you-confirm rule above load-bearing rather than pedantic. A
worker cannot keep the promise a confirm makes. Check your own inventory, not the host's capability in
general.

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

On a yes, record it in your harness's durable memory as one standing line:

```
- review fixes push to the PR, no new worktree
```

Read what is already recorded before adding one: an override already held needs no second copy, and a
duplicate is the cheapest way to make the record untrustworthy. When the new line *supersedes* what the
record already says, replace it rather than adding beside it - two contradictory lines both sit in
force, and the next reader has no way to tell which is current. Replacing means the host's own edit
path for its store; where a store only appends, state the reversal in the new line's own text
("integration branch is `develop`, replacing `main`") so the newer line is legible as the current one
without depending on a reader noticing which came last. Phrase the line as a standing rule the next
session can act on cold ("integration branch is `develop`"), not as a note about this conversation
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
the loop and PR brief already recall, so the exception sits beside the baseline it bends and carries the
operator's own words as its provenance:

```
- safety-gate: payments waived (was human-gated) [operator: "yes, stop gating payments" 2026-08-05]
```

The `[operator: "<their words>" <date>]` marker is the difference between a waiver the operator granted
and one a session granted itself. Nothing mechanically refuses a safety-class line that lacks it, so the
discipline sits on both sides of the record: never write one without the marker, and the read-first test
below treats a markerless safety line as absent.

`/guardrails-install` writes the baseline (`safety-gate:` / `safety-scope:` / `safety-denylist:`); a waiver
writes a matching keyed line here; the loop reads this overrides layer first. Watch the pressure tell: a
safety gate waived to get past a moment of frustration is a different bar for the same code - if the reason
is deadline rather than a real change of policy, keep the gate and take the one-off.

Matching that key replaces the whole baseline entry, so write the override you actually mean. The
baseline commonly holds several distinct gates under one key - `safety-gate:` typically names both the
change classes and the specific paths that gate a human - and a general override written against that
key does not sit beside them, it stands in for all of them. "The agent merges its own green PR without
a human click" reads as a statement about the ordinary case and silently cancels the path-scoped gate
on machine-touching code that the same key was carrying. An override meant to narrow rather than waive
has to say what survives it, in its own text: name the exception ("except the recorded machine-touching
paths, which keep their gate") rather than trusting a reader to infer that a broad line was meant
narrowly. The tell that this went wrong is a gate nobody remembers retiring - still recorded in the
baseline, still quoted in reviews, and dead on paper for weeks.

## The read-first side

This is the protocol every other skill points at. These are the two sentences they quote:

> Honor this project's recorded decisions - from your harness's durable memory where you have it,
> otherwise from the brief you were given.

> Record it in your harness's durable memory.

The read sentence names two sources on purpose, because a reader may only have the second. In the main
conversation the store is already in context, injected at session start, so the read costs nothing at
the moment you need it - that is the point of using it. In a worker there is no store, so the brief is
the record. Either way what the protocol asks for is the *check*: before applying a shipped default,
look at what this project has already decided and let that win.

The write sentence names one source because only one agent writes. A worker returns the finding; the
parent confirms and records.

That is why encoding a project preference by editing a shared `SKILL.md` is the wrong move - a skill is
the same across every project, and a preference belongs to this one. The overrides layer exists so the
default stays general and the project keeps its own opinion beside it. When a correction touches
something a specific skill owns - a branch prefix for `/worktree-branching`, a repro convention for
`/diagnose` - the override captures it; the skill stays untouched and simply reads it next time.

A recorded line that git or file reality contradicts - an integration branch the record names that
`git branch` no longer lists, a command that no longer exists - is a stale premise, not an
instruction. Re-verify against reality, apply what is real now, and offer the one-line rewrite of the
record (the same light confirm this skill already owns). On a yes, that rewrite replaces the stale line
rather than joining it, so the true value lands and the stale one goes in the same movement - never an
addition that leaves both standing. Obeying the stale line, or stopping without offering the rewrite,
both leave the next session to hit it again.

One class does not win on sight. A `safety-gate:` / `safety-scope:` / `safety-denylist:` line without
its `[operator: "<words>" <date>]` marker reads as absent - the recorded baseline gate stands, and the
waiver is put to the operator again before anything proceeds past it. The agent is the constrained
party under a safety gate and can write to that store, so the reader tests for the marker rather than
trusting that the confirm above happened.

## When the correction changes the product, not the practice

Mid-loop, an instruction can change *what* is being built rather than how better-dev works - "stop,
use Postgres, not SQLite" against a contract that pinned SQLite. That is never an override line: an
override records how this project wants the work done, and a product decision lives in the work-item's
sealed contract - recording it here leaves the contract asserting the old decision while the code
diverges, and `/review`'s spec channel later re-litigates the operator's own instruction as a finding.
Route it instead. The test is the sealed contract, read now rather than remembered, and it picks one of
three dispositions:

- **It contradicts a line the contract pins** - a done-criterion, a pinned decision, the scope. That is
  a contract amendment: amend `contract.md`, which invalidates the operator's approval of it - the
  amended contract needs a fresh explicit yes, and the re-confirm judges the printed delta;
  `/plan-grill`'s seal owns the mechanics. Driving resumes only against the re-approved contract;
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

An override is a *preference*: a way this project wants the work done, standing until changed. It beats
a shipped default because the project outranks the tool. Something the work *taught* you - a flaky
test, a build quirk, a fact about the codebase - is a lesson, and a lesson is a different kind of claim.
A lesson is true or false about the world; an override is neither, it is simply wanted. Both end up in
the same durable memory on most hosts, so the distinction is no longer about where each is written - it
is about how the next session treats them. A lesson gets re-verified against the code and dropped when
reality has moved on. An override stands until the operator changes it, and code disagreeing with a
preference does not refute it (a preference whose *subject* has vanished is the stale-premise case
above, which is a different thing). A correction meant only for the moment is neither: it stays a
one-off and gets recorded nowhere. If you're unsure which of the three the user means, ask before
persisting.
