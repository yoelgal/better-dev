---
name: groundwork
description: Use when a greenfield project or a large new area/epic is starting and needs a shared foundation before feature work can safely fan out in parallel - the step above /plan-grill, which grills a single feature. For one feature reach for /plan-grill; for a bug, /diagnose.
argument-hint: "[project idea or epic name]"
---

# groundwork - from idea to a parallelizable foundation

Take a project idea or a large new area/epic to the point where parallel feature work can safely
begin. One job: design the **minimum shared foundation** the first wave of features would collide on,
land it first, and **carve the rest into disjoint work-items** that N worktrees can build at once
without stepping on each other.

This is the step above `/plan-grill`. `/plan-grill` grills one feature into a done-contract; groundwork
sits over it - it shapes the whole idea, builds the substrate, then hands each carved work-item down
to the front-end its type names (step 4's table). It runs after `/onboard` has wired the tool and the
branching base, and before any single feature is grilled.
Groundwork settles intent forward for something that does not exist yet; where the project already
exists and its intent was never written down, `/vision` recovers it backward from the repo's own
history. Where a vision is already recorded, read it before shaping
(`VISION.md`) - its acceptance policy is a premise this pass inherits
rather than re-derives.

Honor this project's recorded decisions - from your harness's durable memory where you have it,
otherwise from the brief you were given (see `/overrides`). A project's own stack, architecture
conventions, or a house way of slicing work wins over any default below.

**One fork after that read, before shaping starts, on every greenfield build ask.** Two routes reach a
built product and they spend the user's own attention very differently: this skill's - a shared
foundation, then carved work-items each grilled, reviewed, and merged with the user at every gate - or
`/gauntlet`'s, a single loop prompt handed to a fresh session that then builds against a concrete bar
for hours with almost no interaction. Put it to the user in one question, described in those terms
rather than by skill name. A recorded override settles the route without asking, and so does a user who
named one themselves - `/gauntlet` reached directly is not re-litigated here.

One question means one question. The shape, whatever the epic's size:

> Two ways to build this. **Steered** - I land the foundation, then carve the rest into items you
> review one at a time; you're in it throughout. **One-shot** - we settle what "done" means up front,
> then it builds for hours unattended. Which?

Everything the reader needs is in those three lines: both routes in their own terms, and the cost to
them in attention. Expanding it into labelled option blocks, effort tables and a paragraph of framing
turns a fork into a consultation - observed 2026-08-04, an operator answered a 200-word version of
this with "A, and stop asking me to pick things". Judging the size and skipping the ask is still the
worse failure.

The fork fires before shaping, so no work-item count exists yet to quote - a touchpoint number here
would be invented, and it is the number the user weighs the routes on. Where the establishing read
already turned up a real size fact - an existing epic's item count, a scope the user stated - one
clause of it belongs inside the question; otherwise the three lines stand as they are.

Ask the fork rather than judging it. Firing it only where the ask already carries a nameable external
bar and a visible appetite for one long autonomous run puts the choice behind a judgement the user
never sees made, and a user who does not know the word "gauntlet" cannot correct it. A missing bar is
not a disqualification either: `/gauntlet` can open its prompt with a bar-finding task, so "I have no
reference in mind" is an input to that route, not a reason to withhold it. When the user wants
incremental, reviewable work-items here, this skill proceeds.

Locate the repo's contribution guide in the same establishing read: an override may pin its path; else
look for `CONTRIBUTING.md` or a coding-standards file at the root, under `docs/`, or under `.github/`.
When one exists it shapes the whole epic - documented test requirements feed every carved item's
done-criteria, PR-size and process rules shape how the carve slices, and branch/commit conventions are
foundation facts the work-item briefs inherit. The groundwork record carries one census line -
"contribution guide: `CONTRIBUTING.md`" or "no contribution guide found" - and shaping proceeds either
way.

## 1. Shape the idea

The cheapest questions come before any design, and they are about the problem, not the solution.
Put the idea's premise on trial first, in two lines: the outcome the epic serves and whether this
build is the most direct path to it, and what it costs to build nothing - an epic that fails either
line reframes with the user before any foundation is designed. For a greenfield product, two
reality questions run beside that trial: has the user personally felt this problem, recently - and
who is the second user? Thin answers to both get said out loud before the foundation is built, not
discovered hundreds of prompts in; proceeding is still the user's call, made knowingly. In the same
pass, pin the one differentiating idea in a sentence - the bet everything else orbits, the thing
later features get weighed against - and when the project exists to accelerate other work (tooling,
a harness, a meta-layer), name the concrete product work it accelerates; a product that doesn't
exist yet is the finding, not a footnote.

Then settle the *what* and the broad shape before the substrate: the stack, the broad architecture, and
the core domain model - enough to know what the foundation has to hold, not the full design.

If `/to-prd`, `/codebase-design`, or `/domain-modeling` are installed, compose them rather than
re-deriving: `/to-prd` synthesizes the problem, solution, and user stories; `/codebase-design` gives the
module/interface/seam/depth vocabulary for the boundaries you'll draw in step 2; `/domain-modeling` pins
the glossary and any hard-to-reverse decision as it crystallizes. A clear gap one of them would fill is
a `/tool-sourcing` candidate - never a blocker.

Otherwise run a lean built-in grill, reusing `/plan-grill`'s discipline - entering
`/brief-to-problem` first where the epic arrives as somebody else's words: questions batched by settled
prerequisites into small rounds, each carrying the answer you'd pick and why, exploring the
codebase before spending the user's attention, and confirming each decision as it locks. The lean
grill stays human-in-the-loop - a grill that answers its own questions inside groundwork has
stopped being one (plan-grill's must-ask guard, `skills/plan-grill/SKILL.md` step 3). A rich pasted
brief doesn't waive that: the brief may *seed* answers, but each seeded answer is recorded as
decoded, quoting the brief line it decodes from, and what no line supports stays a must-ask. The
record never claims "stated knowingly" for what the user said neither this session nor in the
material - a knowing call is one the user made, not one made quietly on their behalf. The aim is a
shared understanding of the idea's shape - the per-feature grilling happens later, in
`/plan-grill`.

Shaping an epic can outgrow one sitting, and one blocked question must not halt the rest. When a
question blocks and others don't, park it as a `NEEDS_INPUT` record - plan-grill's four-field handoff
(the question, who answers it, what unblocks it, the re-entry point) - and keep shaping the rest. A
question earns a parked line only when you can state it precisely now, even if you can't answer it
now (the fog test); anything dimmer stays a one-line signpost, not pre-sliced into questions. Shaping
is done when the parked list is empty; it hands off with lines still open only if none of them changes
the foundation.

If shaping surfaces no epic - one feature, a foundation already standing - say so and drop down to
`/plan-grill` directly; groundwork over a single work-item is ceremony.

## 2. Design the minimum shared foundation

The foundation is the substrate later features would collide on. Design that, and stop there:

- schema, shared types, and dependencies,
- module boundaries and the interfaces/contracts between areas,
- the auth and routing skeleton,
- the build / test / deploy pipeline, named as fixed idempotent entry points (setup, test,
  seed/reset - the project's own named scripts or tasks, the recorded `seed-reset` key among
  them) so later sessions and worktrees re-run them without guessing;
  don't invent a new entry-point name when the repo already has one,
- for a product that deploys, the deploy surface and the observability spine (error tracking, a health
  endpoint, an alert channel that reaches a human) are foundation seams too - create them with
  `/deploy-capability` and `/observability-install`, or record an explicit tracked deferral, never a
  silent omission; a first release with nowhere to land, or a prod nobody can see, is a foundation gap
  discovered at the worst moment,
- naming and domain vocabulary.

The depth boundary is a bright line, and it runs the opposite way from a waterfall: design **only what
the first wave of parallel features would fight over** - not an up-front architecture for the whole
system. The test for every candidate piece is one question: *would two parallel features collide on
this?* Yes → it's foundation, settle it now. No → leave it; the loops discover it feature by feature. A
shared `User` type two features both import is foundation; the internals of one feature's cache are not.
Designing past the collision line is the waterfall this skill exists to avoid - the loops are better at
the rest than a design done before any code exists.

A foundation piece can sit inside the collision line and still have several viable shapes - two schema
shapes, two boundary splits, two auth models - that argue to a draw on paper. Enter `/prototype` and
settle it against a throwaway artifact before the shape is frozen: a frozen interface is the most
expensive thing in this skill to get wrong, because every work-item in the wave imports it.

**Freeze the shared surface.** The types, schema, and cross-area interfaces that features import are the
fan-out's real contract: once the foundation merges, they hold still under a running wave. Name them in the
groundwork record as do-not-modify, so every work-item brief carries them as frozen. A feature that finds it
*needs* to change a frozen interface is the signal to pause the wave and revise the foundation, not to widen
it inside one worktree - there it breaks every sibling silently, with no file collision to catch it.

**Decide the cross-cutting policy once, here.** Some choices are foundation because every feature inherits
them, and left unstated each loop invents its own - or ships the happy path silently. Settle them now: the
trust boundaries and auth model, the stance when an invariant fails (what the system does when the money
doesn't add up, not just when it does), idempotency of anything re-runnable, units and currency, and the
logging shape. Once settled here, the per-feature failure-behavior pass in `/plan-grill` inherits this policy
instead of re-deciding it. If a threat-model or security skill is installed (`/security-pass`, or the host's
`/security-review`), compose it to map the trust boundaries at design time; a foundation whose trust
boundaries you can't name isn't ready to fan out on.

**If the product has a UI, its design tokens are foundation.** Aesthetic direction and the token set are
imported by every parallel UI feature, and two features styling the same primitive differently is the
collision this skill exists to prevent. Pin them here - compose `/design-brief` (better-dev's design
front-end), or reach for `/tool-sourcing` to find the installed design skill if it is absent - and freeze the
token set like any other shared interface. groundwork marks this seam; it does not do design.

## 3. Land the foundation first

The foundation is itself the first work-item, and it lands on the integration branch before anything
fans out. Take it through the normal pipeline - its own worktree off staging (`/worktree-branching`),
grilled by `/plan-grill`, driven by `/autonomous-loop`, merged to staging - *before* any parallel work
starts. Every carved work-item then bases off staging-with-foundation, so the shared substrate exists
once, in one place, instead of being invented N different ways in N worktrees. This is the
foundation-first order the branching model already anticipates (`/worktree-branching`).

**Once the foundation lands, re-run `/guardrails-install`.** On a greenfield repo that skill installed
its stack-agnostic half only and recorded one deferred line, because at `/onboard` time there was no
stack to detect: no verify command, no `dev-run` or `seed-reset`, no real denylist. The foundation is
what makes them detectable, and this is the named trigger the deferred record itself points at
(the recorded guardrail keys). Skipping it fans N work-items out onto a loop whose verify command is
unrecorded and whose blast-radius policy is empty - every item then re-guesses both, differently. Do it
before the wave, not after: it is one run, and it is the difference between N loops that grade against
a recorded bar and N that invent one.

The foundation is ready to fan out on when four things hold: a fresh checkout builds and its pipeline runs
green, the frozen surface is named in the record, an independent reader could rebuild the same substrate
from the record alone, and the deferred guardrails are recorded against the stack that now exists. Until all
four hold, hold the wave - N loops on an unsettled foundation is N times the rework, invented N different ways.

## 4. Carve the remainder into disjoint work-items

This is the distinctive output. With the foundation settled, cut everything else into work-items that N
worktrees can build in parallel without colliding. Each work-item gets a name and an explicit list of
the files, directories, or modules it **owns** - and the ownership sets should barely overlap. The less
two work-items share, the less their worktrees fight at merge time.

Disjointness is a structural claim, so check it structurally rather than by eye. For each candidate
item's owned surface, the `lsp` tool's `references` action returns what
depends on it; two items whose affected sets intersect will collide at merge even when their file
lists look clean, because the collision is through an import, not a path. That is the failure mode
the carve is most likely to miss and most expensive to discover - a wrong carve costs N worktrees.

When two candidate items both want the same file, that shared thing is usually a signal it belonged in
the foundation - push it down into step 2 rather than letting both items edit it. What can't be pushed
down gets **sequenced**: the dependent item runs in a later wave, off staging, once the item it depends
on has merged. The output is a list of work-items, each with its title, its owned areas, its base,
and its **type**. The type fixes the front-end, and with it who answers the work-item's open
questions:

| Type | Front-end | Who answers its open questions |
|---|---|---|
| feature | `/plan-grill` | the user, by construction (plan-grill's must-ask guard) |
| fix | `/diagnose` | the evidence, then the user on a one-way door |
| chore | `/plan-grill`'s contract-lite path | nobody - the end-state is the spec |
| unblock | none; it is worked, not grilled | the human where the agent cannot act, otherwise the agent |

The human-in-the-loop axis is a property of the type, read off the row above, and never a field a
session writes: a per-work-item marker an agent authors saying who is watching reads as permission to
run unattended, and the unattended signal stays the operator-set turn or wall-clock ceiling
`/autonomous-loop` requires.

An `unblock` earns its row by clearing a decision's blocker rather than by delivering any part of the
epic; one that ships user-visible behavior was mis-typed and is a feature. Write it as the same
four-field `NEEDS_INPUT` handoff step 1 parks a blocked question with, settle it when the work is
done, and record the facts the work-items downstream of it need - where the credential landed, the
new URL, the row count. It usually produces no diff, so it takes no branch and no worktree, which is
why `/worktree-branching`'s prefix table has no `unblock` row.

A product epic's list also carries a distribution work-item - where this ships to real users, by
when, shown to how many - tracked like any other work-item. Deferring it is legitimate only as an
explicit tracked deferral, never a silent omission: a plan whose every work-item is build and none is
reach is a build plan wearing a product plan's name. For the fuller method - the file-ownership map,
the contention check across many work-items, the three ways to resolve a collision, and ordering
work-items into waves - read `carving.md`.

## 5. Hand off, and record the groundwork

Each carved work-item now goes down the front-end its type names in step 4's table, and then to
`/autonomous-loop`; an `unblock` goes down neither, and settles when the facts it was carved to
return are recorded. A work-item does not arrive as if it were standalone: the front-end runs in
a fresh session where this discussion no longer exists, so the epic's ledger record is the context
transfer - the receiving front-end loads it and enters the epic's settled decisions as settled
(plan-grill's carved-item entry rule). Groundwork's job ends at the handoff; it doesn't grill each
feature itself, and mid-groundwork the pull to just start building one of the features is the signal the
carve's edge is reached: hand off, don't build.

Present the carve before recording it, in **two separate turns, in this order**:

1. **Render the table, and stop.** One message whose content is the numbered work-item list - a row
   per work-item in `carving.md`'s row shape, leading with the title - and no question. End the turn
   there. The table is the deliverable of this step; a turn that renders it has done its job.
2. **Then ask, in the next turn.** Three things: is the granularity right (too coarse / too fine);
   does each dependency edge gate the item it blocks and nothing else; should any items merge or
   split?

The split is the mechanism, and it is not stylistic. Rendering and asking in one turn reliably
collapses into the ask alone: the question is a tool call whose natural shape is short options, so the
table gets compressed into its own prompt ("does the carve look right - foundation first, then 5
items?") and the user approves a summary of a list they never saw. Observed in a real run, 2026-08.
Two turns cannot collapse that way - the table exists on screen before a question is available to
answer. So: no synopsis standing in for the list, no list that lives only in a file or ledger the user
hasn't opened, and no question in the turn that renders. Approval of an artifact the user never saw on
screen is blind approval, not a gate.

The carve gate is also its own ask: never batched into one prompt with preference questions (a
provider choice, a product name), and never with an "approve as-is" preselected beside unresolved
design choices - a gate bundled with preferences collects a reflex click, not a decision. Iterate
until the user approves, re-rendering the table on each revision so what they approve is always
what is on screen; only the approved list goes to the ledger. A wrong carve costs N worktrees,
not one - it is the cheapest expensive thing in the epic to get confirmed.

If the carve is large or the dependency edges are what the user has to judge, draw it as well as
tabulate it - a wave-by-wave diagram of items and the edges between them, per `wait-what`'s `visuals.md`. The table
is what they approve; the picture is what makes a wrong edge visible.

Record the groundwork so it survives a compaction and the fan-out stays coordinated. Write it to the
ledger under the epic's name, strong enough that an engineer who never saw the discussion would
rebuild the same substrate from it - the third condition of the ready-to-fan-out gate. Six sections,
in this order; a seventh heading is content that belonged in one of the six, filed where the next
session will not look for it:

```markdown
## Differentiating idea
<the bet everything else orbits, from step 1, in one or two lines>

## Foundation contract
<the substrate spec from step 2: the named do-not-modify frozen surface, the cross-cutting policy>

## Notes
<the domain; the skills every session on this epic should consult; the epic's standing preferences
and any epic-wide settled decision that is not substrate; the contribution-guide census line>

## Work-items
| Work-item | Owns | Depends-on | Base | Type | Wave |
|---|---|---|---|---|---|
| Wayfinder artifact typing (`wayfinder-artifact-typing`) | `skills/groundwork/` | the ledger record shape | staging | feature | 1 |

## Not yet specified
<one line per fog signpost: in scope, and not yet statable>

## Out of scope
<one line per ruled-out work-item: the gist, and why it is out of scope>
```

```bash
primary=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
mkdir -p "$primary/.better-dev/ledger/<epic>"   # the six sections above go in groundwork.md here
```

The ledger lives in the primary checkout, so the record is visible from every worktree. Each
work-item still gets its own contract when its front-end runs; this record is the higher-level plan that
ties them together.

**The record is the plan, and it holds no state.** Its `## Work-items` rows say what each work-item
is. A work-item's state keeps one canonical home, the last line of its own
`.better-dev/ledger/<slug>/progress.md`; a state column authored into the record is a snapshot, and
it is wrong from the first merge onward. When the two disagree about which work-items exist, the
record is authoritative about the plan and the progress files about what happened to it, and the
disagreement is itself the finding to report.

**Re-entered on an epic that already has a record, groundwork reports before it reshapes.** Read the
record back (`.better-dev/ledger/<epic>/groundwork.md`) alongside each work-item's progress line, and
open with one line per carved work-item - before anything
else. Lead with the title and let the slug ride inside it, because a column of bare slugs is decoded
where titles read at a glance:

> Wayfinder artifact typing (`wayfinder-artifact-typing`) - in-flight, 2d, feat/wayfinder-artifact-typing

Then exactly one of three moves: graduate a fog signpost the finished wave has made statable into a
new carved work-item, through the carve gate asked again for the new work-items only; rule a signpost
or work-item that now sits past the epic's differentiating idea out-of-scope, recorded in the
record's `## Out of scope` section with its one-line why; or state that the list is complete and name
the next wave's base. A second run that reports the epic already finished while the progress files show
unstarted work-items is the failure this clause prevents.

Two of those moves run on different axes, and only one of them reverses. Graduating is a sharpness
move: a signpost becomes a work-item once the wave makes it statable, and it can go back. Ruling
something out-of-scope is a scope move and it is one-way - it returns only by redrawing the epic's
differentiating idea with the user, as a fresh epic rather than a resumption of this one. Scope, not
sharpness, decides which: what you cannot yet phrase is fog, and what sits past the differentiating
idea is out-of-scope however sharply you can phrase it. Quietly re-graduating an out-of-scope line is
how an epic's scope grows with nobody approving the growth, and the carve gate never sees it because
no new work-item was carved.

## Composability

Groundwork adds a front-end above `/plan-grill`; it never replaces it or the per-feature grilling. It
composes the PRD, design-vocabulary, and domain-modeling skills when they're installed and falls back to
a lean grill when they're not - additive either way. When you revise this skill, follow `/writing-skills`.
