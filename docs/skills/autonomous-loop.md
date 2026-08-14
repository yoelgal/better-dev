# /autonomous-loop

## What it does

Carries one work-item that already has a contract - the done-criteria a `/plan-grill` or `/diagnose`
front-end already settled - through verify/pick/implement/re-verify passes until it reaches a state
that is proven, not asserted: a real check went green, someone captured the exit code, not a claim
that it would. The defining constraint is what it refuses to start from: no red-capable signal already
run once, no loop - a work-item with nothing that can fail never enters, because "green" against
nothing is unfalsifiable. It also refuses to grade its own work - the loop's own passing check is a
working signal, never the acceptance verdict, which comes from an independent reviewer and runtime
observation downstream.

## When to reach for it

Reach here to build a work-item, resume it after an interruption, or restart it after it stalls. The
near neighbours:

| Situation | Route |
|---|---|
| The feature or fix isn't scoped yet | `/plan-grill` (feature) or `/diagnose` (fix) |
| The loop settled `DONE` / `DONE_WITH_CONCERNS` and needs to land | `/pr-and-verify` |
| A stuck-check confirmed `NO_PROGRESS` | this skill's own `restart.md`, not a fresh loop |
| Recurring or unattended cadence work with no human triggering each run | not built - this loop only starts on a human-initiated work-item |

## Where it fits

The middle of the chain: a front-end (`/plan-grill`, `/diagnose`) hands this skill a contract in its
own worktree (`/worktree-branching`), it dispatches fresh workers per step through
`/orchestrating-agents`, and a settled `DONE` or `DONE_WITH_CONCERNS` hands off to `/pr-and-verify`.
It leans on `/review` for the independent verdict it deliberately doesn't self-grade, and reads
`.better-dev/overrides.md` before applying any default of its own.

## Prerequisites

A work-item with its contract already sealed - the done-criteria a `/plan-grill` or `/diagnose`
front-end already settled - sitting inside its own worktree already created by `/worktree-branching`.
Without both, there is nothing for the loop to drive toward.

## Common questions

**Does this loop run unattended, on a schedule, or overnight without anyone watching?** No - and this
is a deliberate, currently unbuilt gap rather than an oversight. The loop is a bounded goal-runner: a
human starts one work-item and the loop drives that item to done. Recurring or scheduled cadence work
is a separate, opt-in layer better-dev hasn't built yet. The one thing that does change loop behavior
is an operator-set turn or wall-clock ceiling - without one, the loop stops on no measurable progress
rather than grinding forever; with one, it carries a hard budget so it can't bill without limit. There
is deliberately no field anywhere - contract, ledger, or override - that lets the loop itself declare
"this may proceed unattended"; that signal is set by hand or it doesn't exist.

**What happens when nobody is awake to answer a mid-run question?** Under an operator-set ceiling, the
loop splits on reversibility rather than idling until morning: a two-way door (a nullable column's
default, something a later change can walk back) takes the conservative option and carries it into the
PR as a named concern; a one-way door (a schema fork, a destructive action, a credential, a paid
external call the contract never authorized) still settles `NEEDS_INPUT`, dark hour or not. Two
consecutive passes deviating on the same contract line trip the stuck signal, so this isn't a way to
keep deferring the same decision indefinitely. Without an operator-set ceiling, both cases settle
`NEEDS_INPUT` - the split only exists because nobody being awake changes what's affordable to defer,
never whether a one-way door gets a human.

**A recorded green from a previous session - can it be trusted on resume?** No by default. A crash or
compaction can truncate the ledger mid-write, so on resume the loop re-runs the acceptance check for
the most recently settled criterion before taking on new work. If it comes back red, that criterion
resets to unmet and the loop's own commit that claimed it gets reverted (never a concurrent actor's
diff) before anything new is picked up. This re-check only fires on resume, not every pass - a green
earned mid-loop is still fresh.

**The model running this loop isn't the one the safety gates were calibrated on - does the loop
notice?** It checks a recorded fingerprint against the running model at loop setup. A mismatch doesn't
hard-stop the run: it surfaces once, points at the revalidation ritual, and the run continues with the
staleness named rather than silently inherited or silently ignored.

**A fix keeps landing outside the scope the diagnosis named - what then?** The contract's fix-scope
line is read before every dispatch, and a diff that lands outside it is re-picked smaller rather than
shipped as-is. A fix that genuinely can't fit inside the declared scope settles `NEEDS_INPUT` naming
the file and the scope, on the read that a fix outgrowing its diagnosed scope usually means the root
cause sits at a different layer - not permission to widen the diff.

## It's working if

- Each pass lands one commit named `<work-item>: <step>`, never `git add -A`, and a pass that changed
  nothing is a logged no-op rather than a silent skip.
- The work-item's ledger grows a line per settled step as the loop runs, not in one batch near
  the end.
- The loop stops at exactly one of six terminal states - never a claimed success with no captured exit
  code behind it - and a `BLOCKED` or `NEEDS_INPUT` stop names the one concrete thing that has to
  change.
- On first green, the diff shows a cleanup pass (dead code and narrating comments stripped) and any
  documentation the diff falsified updated in the same commit range - not left for someone else to
  notice.
- A `DONE` or `DONE_WITH_CONCERNS` hands off carrying a real command and its exit-0 output as evidence,
  and the edit boundary (`bd-guard`) is lifted from the tree only on those two states, still standing
  on every other stop.
