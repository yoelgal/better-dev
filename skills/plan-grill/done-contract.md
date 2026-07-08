# The done-contract

Step 4 of plan-grill in full. This is the artifact the whole flow exists to produce: a synthesis of
the grilled conversation into something the autonomous loop can drive to and prove. No fresh
interview - write down what the grill already settled.

Its center of gravity is the **done-criteria**. Everything else frames them.

Beyond these per-feature criteria, every contract inherits the project's **standing definition of
done**: verified at runtime, not just compiled; new behavior covered by a test that fails without the
change; untrusted input reviewed; a rollback path for anything risky; the result reported honestly. If
the project keeps that bar in `.better-dev/` or a guardrails reference, point to it - don't restate it
here. (No standing bar yet is a `/guardrails-install` gap, not a plan-grill one.)

## Done-criteria - the observable part

Each criterion is a check that can run, not a sentence to nod at:

- a **runnable check** - a command or a test - that is **red now** and turns **green exactly when**
  the criterion is met,
- the **seam** it attaches to - the point in the system where the behavior is observed,
- the **observable it asserts** at that seam - the concrete thing the check turns on: the exact
  status code, the returned value, the row that must exist, the log or output line that must appear.
  A seam plus an adjective ("green when it works") is the gap a trivially-true check slips through.
  The loop still writes the test body, but it writes it to *your* asserted observable, not a
  stand-in it can wave green.

Rules for the seam:

- Prefer an existing seam to a new one; a feature that needs no new seam is the good case.
- Use the **highest** seam that still observes the behavior - an end-to-end or API-level check over a
  unit poke at internals, so the check survives refactors.
- Keep the count low; the ideal is one. More seams is more to maintain and more to go stale.
- Check the seams with the user before locking them - a seam mismatch here misdirects the loop.
- A seam is a **test anchor** named before code. Declaring where each check bites, up front, is what
  lets a check exist to go red before implementation makes it green; the loop writes its checks
  against these anchors first. Enumerating them is part of locking the contract, not the loop's job to
  discover later.
- The main goal carries at least one criterion a human could run unaided in under a minute - open
  the surface, take the action, see the result. If no criterion can be phrased that way, the seam
  is too low or the goal has no observable effect; either is a finding, not a formatting problem.

"Done" is a check going green. Never a claim, never "until it looks right." The loop reads these,
drives them red-to-green, and refuses to mark done what it can't prove. Each criterion's status is a
typed marker the loop flips - the checkbox carries met/unmet (`[ ]` -> `[x]`), a field a session sets,
never a prose sentence it re-interprets each pass.

Pinning the observable here is one layer of the self-authored-test defense: on creation the loop
claims each loop-authored test into its protect-set (`/autonomous-loop`), and the reviewer scans for
weakened or trivially-true tests (`/review`). Pin the observable so both have something concrete to
guard and to check against.

### Right-size the criteria

Aim for the smallest set that proves the goal - one per distinct property the goal claims, not a
coverage quota. Run one self-check on each candidate: *would removing this miss a property the goal
claims?* If no, drop it - it's redundant with another criterion or it's checking a path the goal never
promised.

An **absence or removal** criterion has no runtime observable, so its check is a source-level predicate,
and the craft is in the predicate. Negate a grep so success means the thing is gone -
`! grep -n '<symbol>' -- <touched dirs>`, exit 0 = no matches = satisfied. Scope the paths to the
directories the change touches, so an unrelated hit elsewhere doesn't fail the check. Keep it read-only;
a predicate observes, it never mutates. Name the symbol or path, not "cleaned up".

### How the criteria prove the goal

Under the criteria, write a ≤2-sentence line tying the set back to the goal's end-state - *these checks,
green, mean the goal holds because …*. It's the join between the criteria and the goal, not a
restatement of each check. Its real work is negative: a goal that no criterion covers surfaces here as a
sentence you find you can't honestly write.

## Goal shape

Give the feature's goal one clear phrasing so its proof is obvious:

- **Capability** - the system will support `<X>`.
- **End-state** - `<Y>` will be the new state of `<subsystem>`.
- **Invariant** - `<Z>` will always hold for `<entity>`.
- **Removal** - `<deprecated thing>` will no longer be reachable.

Not "refactor X" (a task), not "add tests" (a means), not "fix the bug" (no specificity). Behavioral
shapes prove out through runnable checks; a removal or a structural fact proves through a
source-level predicate (a `grep`, a build check).

### Scope cap - at most three committed goals

A contract commits to a small goal set: one main goal plus at most two secondary end-states, three in
all. Past that, the change is too large to review as one unit and its criteria sprawl beyond what a
reviewer can hold in their head. When the grill surfaces a fourth committed goal, halt *before any code*
and split into focused work items - each its own contract, worktree, and PR - rather than carrying a
contract nobody can review whole. Out-of-scope items don't count against the cap; they're the explicit
record of what this feature won't do.

### Boundaries bind only when co-located

An out-of-scope line holds the loop only when it is explicit and sits beside the goal it borders. A
boundary left as a bare list at the foot of the file is one the loop fills in for itself - it reads
the unstated edge as license to tidy, refactor, or "while I was in there." State each boundary as a
positive-and-negative pair next to the goal it touches: what this work-item does, and the adjacent
thing it must not touch. "Adds the export endpoint; does not change the existing import path" holds; a
trailing "out of scope: imports" at the foot of the file does not.

### Scope tripwire

The **scope tripwire** is the halt condition the boundaries arm. The loop halts and reports - it does
not silently proceed - if it would edit a path in the forbidden set above, more than `<N>` files
change outside the owned set, or a test that was green goes red. Set `<N>` to the owned-file count
plus a small margin and name it in the contract. This file owns the term: the loop's scope-guard and
the review scope gate reference this tripwire by that name.

## Failure behavior - the pass agents skip

Done-criteria prove the goal *works*. They say nothing about what happens when it doesn't - and a spec
silent on failure doesn't make an agent stop to ask; it makes the agent pick something plausible and
ship it with full confidence: a log line, then full speed ahead. To close that gap, at contract seal
walk eight categories in this fixed order - the order matters because it surfaces the ones you
personally always skip:

**user types, contexts of use, unexpected inputs and system failures, user error, feature
interactions, load, security and privacy, accessibility.**

Most categories won't apply to a given feature, and that is expected - only a category that yields a
*load-bearing* scenario emits a row:

| Scenario | Expected behavior | What ships if we stay silent |
|---|---|---|
| <the off-happy-path case> | <the defined behavior, specific> | <the plausible-but-wrong default an agent picks> |

The third column is the honesty-forcing function: if you can't name a worse-than-nothing default the
loop would ship, the scenario probably doesn't apply - drop the row rather than pad the table. Any row
whose expected behavior is load-bearing (money, data integrity, auth, irreversibility) promotes to a
**done-criterion** with its own runnable check - a re-run that stays idempotent, a malformed input
that's rejected, a mid-run failure that leaves no half-state.

Where the foundation already settled a category's policy, inherit it - don't re-decide. groundwork's
cross-cutting policy fixes the reconciliation stance (what the system does when the money doesn't add
up), idempotency of anything re-runnable, units and currency, and the trust boundaries; this pass
cites that policy for those categories and spends its attention on the feature-specific scenarios the
foundation couldn't foresee. The security-and-privacy category, when the feature crosses a trust
boundary, gets its full treatment in the threat-surface pass below.

## Threat surface - name it before you build it

Gated: run this only when the feature reads something from outside its own trust boundary - HTTP
requests, form fields, file uploads, webhooks, third-party APIs, message queues, auth, money or PII, or
model output. A feature that touches no external input skips the section and says so in one line; if you
can't name the trust boundaries, the plan isn't ready to secure.

For each boundary the feature crosses, write one abuse case beside the use case ("an attacker sends X").
The strongest abuse cases become done-criteria directly - an abuse case is just a red-now check whose
green state is "the attack is refused": red now because the attack succeeds or the input is accepted,
green when it's rejected. Pull the matching rows from `/security-pass`'s per-vuln-class checklist (user
input, auth/session, payments, file upload, external fetch, LLM feature) as additional criteria rather
than re-deriving them, and let `/security-pass` own the depth.

## Template

```markdown
# Done-contract - <work-item>

## Problem
<one measurable sentence - who experiences what, with baseline and target each a receipt or
TBD(<owner>); when the intent arrived as an external brief, the requester's verbatim words sit
above it in quotes, attributed>

## Solution
<the solution, from the user's perspective>

## Goal
The main goal in one shape (capability / end-state / invariant / removal), plus any secondary
committed end-states - at most three in all (see scope cap).

## User stories
A long, numbered list. Each: As a <actor>, I want <feature>, so that <benefit>.
Cover the feature's aspects extensively.

## Done-criteria
For each, a runnable check + its seam + the observable it asserts + red-now/green-when. The `[ ]`/`[x]`
box is the typed status the loop flips, not prose to re-read:
- [ ] <criterion> - check: `<command or test>` at seam `<where>`; asserts `<concrete observable>`;
  red now, green when <condition>.

How these prove the goal: <≤2 sentences tying the criteria set back to the goal's end-state>.

## Failure behavior
| Scenario | Expected behavior | What ships if silent |
|---|---|---|
| ... | ... | ... |
Rows with load-bearing behavior are promoted to done-criteria above. Categories the foundation
already settled (reconciliation stance, idempotency, units) are inherited, not re-decided.

## Threat surface
Trust boundaries crossed: <list, or "none - no external input">.
Abuse cases: <attacker action -> defined refusal>. Promoted checks: <which became done-criteria>.

## Implementation decisions
Modules touched, interfaces, schema/API contracts, architectural calls, clarifications from the
grill. No file paths or code snippets - they go stale. Exception: inline a small prototype-derived
type, schema, reducer, or state-machine when it pins a decision more precisely than prose; note it
came from a prototype and trim to the decision. Any preference question the user left unanswered is
recorded here as `Assumption: <chose X because Y>`, so the default is visible instead of buried.
Any new external dependency gets one line here: its purpose, why the existing stack can't cover it,
and the reimplementation test - a capability writable in roughly twenty lines is written, not added
as a dependency. Record the decision either way; a dependency with no line is a lens finding
(`lenses.md`, engineering).

## Out of scope
Each boundary as a positive-and-negative pair beside the goal it borders: <what this does> - does not
touch <the adjacent thing>. Not a bare trailing list; an unstated edge is one the loop fills in itself.
Each deferral also carries one sentence saying why it is not needed now, so a reviewer can diff the
diff against a list of chosen absences instead of guessing which gaps were decisions (`/review` owns
that drift diff). The common tempting-but-deferred set - auth, settings, admin surfaces, analytics -
is deferred by default unless it is the feature.

## Scope tripwire
Forbidden path set: <paths the loop must not edit>. N = <owned-file count + margin>. The loop halts
and reports if it would edit a forbidden path, more than N files change outside the owned set, or a
green test goes red.

## Stop conditions
<condition specific to this plan's real risk - "if X turns out to be load-bearing, stop and report">.
Named to this feature's actual failure modes, not boilerplate a reviewer can't tell from filler. When
reality doesn't match the plan, the loop stops here and reports rather than improvising a way through.

## Open concerns
Anything unresolved. If one blocks the plan, the state is NEEDS_INPUT - stop, don't guess.

## Merge
merge: <auto | hold> - <auto only where the repo records merge-policy: auto-on-green and the
user said auto for this item at seal; hold otherwise, including when no policy is recorded>

## Ground truth
Verdict from the baseline check + link to ground-truth.md.
```

## Pre-seal checklist

Before you pin the contract, each line reads yes or the contract isn't ready:

- A fresh context could execute this from the contract and the repo alone.
- Every done-criterion is a command with an expected result, not a judgment ("make sure it works").
- Every criterion names its concrete observable - a value, status, row, or output line.
- Every number in Problem and Goal carries a named source or a `TBD(<owner>)` marker - an unsourced
  number is an invented one.
- The Merge line reads `auto` or `hold` - `auto` only where the repo records
  `merge-policy: auto-on-green` AND the user chose auto for this item (asked at seal, never assumed).
- The stop conditions are specific to this plan's real risks, not boilerplate.
- No secret values appear anywhere - locations and credential types only.
- Every promoted objection and lens finding has its matching contract line - an open concern, an
  out-of-scope pair, or a criterion. A disposition with no line is unresolved - the same
  acceptance-without-the-edit failure `/review`'s accept-or-rebut pattern (reception.md) re-audits.
- The planned-at SHA is stamped.

The right-size self-check (would removing a criterion miss a property the goal claims?) and the grill's
predict-the-next-three-questions check already ran; this is the last read before the gate, not a re-run
of them.

## Approval is pinned to the contract's content

At the same confirmation, settle the Merge line. Where the repo records
`merge-policy: auto-on-green` (`.better-dev/bin/bd-mem recall "merge-policy"`), ask one question
beside the contract confirm: when the loop settles DONE and every gate passes - independent review,
CI, the driven done-criteria - merge into the integration branch automatically, or hold the green PR
for your look? Record the answer as the contract's `merge:` line. Where the policy is `human` or
nothing is recorded, skip the question and write `merge: hold` with the reason - the standing
allowance is `/guardrails-install`'s to grant, never this seal's to improvise.

When the user confirms the contract, pin the approval to its bytes with
`.better-dev/bin/bd-mem ledger approve <work-item>` - it records a content hash of `contract.md` beside
the ledger entry. The approval attaches to *that text*, not to the bare fact that an approval once
happened. Before it drives, the loop runs `.better-dev/bin/bd-mem ledger check-approval <work-item>`
(exit 0 = still approved). If the contract was later edited - a criterion reworded, a goal added, a seam
moved - the hash no longer matches, the check fails, and the approval gate re-opens: the loop reads the
plan as un-agreed again and waits for a fresh confirmation. So it never advances on a silently-changed,
stale sign-off.

Stamp the **planned-at** short SHA in the ledger beside that content hash at approval - the commit the
plan was written against. The content hash guards the contract text; the planned-at SHA guards the code
under it. At loop entry `/autonomous-loop` drift-checks the touched area against this SHA and
re-baselines before building if the code moved since the contract was sealed, rather than building on a
stale premise. The contract stays prose-only: the SHA lives in the ledger, not as inlined code excerpts
here.

## Optional: hand to a slice breakdown

At the planning/implementation boundary the plan can be cut into vertical-slice work-items - each a
thin path through every layer, demoable on its own, prefactoring first. If you do, present the slices
numbered with their blockers and the user stories each covers, and iterate until the user approves
the granularity and dependencies. This decomposition may equally belong to the implementation loop;
it's optional here, not part of locking the contract.
