# /plan-grill

## What it does

Turns a rough intent - a feature ask, somebody else's relayed feedback, or a chore like a
dependency bump - into a done-contract the autonomous loop can drive to and prove, with
observable done-criteria instead of a prose description of what "done" should feel like. The
defining constraint is what it refuses to do: it never writes code, and it never lets a plan lock
without the user reading and confirming the actual contract text - a summary line or a pointer to
the file on disk does not count as presenting it.

## When to reach for it

| Situation | Route |
|---|---|
| "I want to add X", "let's build a way to Y", a rough feature intent | here |
| Someone else's relayed words - a ticket, stakeholder feedback, "users say X feels slow" | here (step 0 decodes it first) |
| A dependency upgrade, a CVE the audit gate flagged, a behavior-preserving refactor | here, contract-lite path |
| A trivial one-to-two-step change | skip the grill, still its own worktree branch |
| A decision only a colleague or client can answer, hit from any flow | here (questionnaire unblock - drafts the doc, grills only the send) |
| "X is broken / failing / slow" | `/diagnose` |
| A whole new app or epic needing a shared foundation first | `/groundwork` |
| A work-item spanning two separate repositories | named on arrival, routed through `/orchestrating-agents`'s cross-repo coordination |

## Where it fits

It is the feature front-end of the chain: it hands its sealed, approved contract to
`/autonomous-loop`, which drives the done-criteria red to green and then hands off to
`/pr-and-verify`. Along the way it composes `/source-harvest` (when the brief points at an
external source), `/codebase-map` (baseline check), `/design-brief` (when the feature has UI
surface), and `/orchestrating-agents` (cross-repo work-items, background fact lookups during the
grill). `/groundwork` hands it carved work-items from an epic; a red dependency audit from
`/guardrails-install` arrives here as a chore.

## Prerequisites

The work-item's own worktree already exists - `/worktree-branching` sets it up before the grill
starts. `.better-dev/overrides.md` is read at the top of the flow; a project override on planning
style, spec location, or a skipped phase wins over anything the skill defaults to.

## Common questions

**Why does the contract use jargon like "human-gate" or "NEEDS_INPUT" for a tiny change?**
This was a real gap: an operator met four of these terms in a contract for a roughly 50-line
endpoint and answered "I just wanted 'here's what I'll build, ok?'". The fix keeps the typed
field names intact (scripts read `merge:` by that exact key) but glosses each one in plain words
on the line where the user meets it, so a small feature earns a short, readable contract rather
than a full-dress one wearing vocabulary built for the loop.

**Why did I get four questions at once instead of one at a time?**
The grill puts up everything it can actually ask right now - the decisions with nothing unresolved
underneath them - as one small round carrying a recommended pick per question, then recomputes once
your answers land; the serial interview it replaces spent a full round-trip per question. Past four
unblocked at once, the heaviest four go first and the rest ride the next round. Two guards keep it
from turning into a form: an irreversible decision (a schema fork, a trust-boundary call) arrives
alone, and a blanket "all fine" reply gets the two most consequential picks reflected back before
they lock.

**What happens if I don't have an answer to a question mid-grill?**
Depends on whether the decision is reversible. A two-way door (a later edit can undo it) proceeds
on the skill's own recommended default, recorded in the contract as a named assumption - nothing
stalls. A one-way door (a schema fork, a destructive action, a trust-boundary choice) never gets
an invented default: with no answer from you and no recorded override, it parks as `NEEDS_INPUT`
and the grill stops rather than guessing.

**Why does it sketch several options that all read like the same design?**
Distinct-sounding options that are really the default plus paraphrases of it don't teach you
anything. The skill places each sketched option on how likely a typical solution lands there and
keeps sketching until at least one sits clearly apart from the rest - so the choice you're handed
is a real trade-off, not the same answer worded three ways.

**Why did it stop and refuse to plan instead of just building what I asked?**
The baseline check (step 1) can return a stop verdict - the capability already exists under a
different surface, or the premise you're building on is observably false. Grilling a false
premise wastes the whole downstream loop, so a stop verdict reframes with you, pointing at the
evidence, rather than producing a contract for something that doesn't need building or won't work
as assumed.

**Why do I have to reconfirm the contract after a small edit?**
Your approval is pinned to the contract's exact content hash, not to the bare fact that you once
said yes. Any later edit - a reworded criterion, an added goal - changes the hash, and the loop's
pre-drive check reads that mismatch as "un-agreed again" rather than advancing on a stale
sign-off. The re-opened gate shows the diff since your last approved version, so re-confirming is
a judgment on what changed, not a re-read of the whole thing.

**Is the contract's `gated paths:` line - the record of which safety-gated paths and
out-of-worktree writes this item expects to touch - mechanically enforced?** No. `bd-mem
ledger approve` refuses to seal a contract missing its `merge:` line, but it does not check for
`gated paths:` at all; only the pre-seal checklist, read by whoever is sealing the contract,
catches its absence. A rushed seal can skip straight past it. The merge-time gate is the backstop
that still stops on any gated path the seal never named, so a missed line costs a later halt, not
a silent bypass - but the checklist stays the only thing standing between a rushed seal and a
missing line today.

## It's working if

- A rendered contract appears in the conversation before any confirmation is asked for - not a
  summary line, not a pointer to a file on disk.
- Every done-criterion in the contract reads as a command or test with a concrete expected result,
  never a phrase like "make sure it works."
- Questions arrive in small rounds with a recommended pick each, and an irreversible decision
  arrives alone - never seated inside a batch of preference calls.
- A question you left unanswered shows up in the contract as a named assumption (two-way door) or
  a `NEEDS_INPUT` entry with a who, a what, and a re-entry point (one-way door) - never silently
  dropped.
- The work-item's ledger holds a sealed contract your session can point back to, and the loop
  that picks it up drives its criteria red to green rather than inventing new ones.
