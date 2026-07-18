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
sits over it - it shapes the whole idea, builds the substrate, then hands each carved work-item down to
`/plan-grill` (feature) or `/diagnose` (fix). It runs after `/onboard` has wired the tool and the
branching base, and before any single feature is grilled.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`). A project's own stack,
architecture conventions, or a house way of slicing work wins over any default below.

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

Otherwise run a lean built-in grill, reusing `/plan-grill`'s discipline - including its
brief-decode step when the epic arrives as somebody else's words: one question at a time, each
carrying the answer you'd pick and why, exploring the codebase before spending the user's attention, and
confirming each decision as it locks. The lean grill stays human-in-the-loop - a grill that answers
its own questions inside groundwork has stopped being one (plan-grill's must-ask guard,
`skills/plan-grill/SKILL.md` step 3). A rich pasted brief doesn't waive that: the brief may *seed*
answers, but each seeded answer is recorded as decoded, quoting the brief line it decodes from, and
what no line supports stays a must-ask. The record never claims "stated knowingly" for what the user
said neither this session nor in the material - a knowing call is one the user made, not one made
quietly on their behalf. The aim is a shared understanding of the idea's shape - the
per-feature grilling happens later, in `/plan-grill`.

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

The foundation is ready to fan out on when three things hold: a fresh checkout builds and its pipeline runs
green, the frozen surface is named in the record, and an independent reader could rebuild the same substrate
from the record alone. Until all three hold, hold the wave - N loops on an unsettled foundation is N times the
rework, invented N different ways.

## 4. Carve the remainder into disjoint work-items

This is the distinctive output. With the foundation settled, cut everything else into work-items that N
worktrees can build in parallel without colliding. Each work-item gets a name and an explicit list of
the files, directories, or modules it **owns** - and the ownership sets should barely overlap. The less
two work-items share, the less their worktrees fight at merge time.

When two candidate items both want the same file, that shared thing is usually a signal it belonged in
the foundation - push it down into step 2 rather than letting both items edit it. What can't be pushed
down gets **sequenced**: the dependent item runs in a later wave, off staging, once the item it depends
on has merged. The output is a list of named work-items, each with its owned areas, its base, and
whether it's a feature (`/plan-grill`) or a fix (`/diagnose`). A product epic's list also carries a
distribution work-item - where this ships to real users, by when, shown to how many - tracked like any
other item. Deferring it is legitimate only as an explicit tracked deferral, never a silent omission: a
plan whose every item is build and none is reach is a build plan wearing a product plan's name. For the
fuller method - the file-ownership
map, the contention check across many items, the three ways to resolve a collision, and ordering items
into waves - read `carving.md`.

## 5. Hand off, and record the groundwork

Each carved work-item now goes down its own front-end - `/plan-grill` for a feature, `/diagnose` for a
fix - and then to `/autonomous-loop`. It does not arrive as if it were standalone: the front-end runs in
a fresh session where this discussion no longer exists, so the epic's ledger record is the context
transfer - the receiving front-end loads it and enters the epic's settled decisions as settled
(plan-grill's carved-item entry rule). Groundwork's job ends at the handoff; it doesn't grill each
feature itself, and mid-groundwork the pull to just start building one of the features is the signal the
carve's edge is reached: hand off, don't build.

Present the carve before recording it: the numbered work-item list, each with its owns, depends-on,
base, and wave - rendered in full as message text the user reads *before or alongside* the approval
ask. A one-line synopsis folded into a question prompt ("does the carve look right - foundation
first, then 5 items?") is not presentation, and neither is the list sitting in a file or ledger the
user hasn't opened; approval of an artifact the user never saw on screen is blind approval, not a
gate. Then ask three things - is the granularity right (too coarse / too fine); does each
dependency edge gate the item it blocks and nothing else; should any items merge or split? The carve
gate is its own ask: never batched into one prompt with preference questions (a provider choice, a
product name), and never with an "approve as-is" preselected beside unresolved design choices - a
gate bundled with preferences collects a reflex click, not a decision. Iterate
until the user approves; only the approved list goes to the ledger. A wrong carve costs N worktrees,
not one - it is the cheapest expensive thing in the epic to get confirmed.

Record the groundwork as the project's map so it survives a compaction and the fan-out stays
coordinated. Write the foundation contract (its substrate spec from step 2) and the parallel work-item
list into the ledger under the epic's name. Write it strong enough that an engineer who never saw the
discussion would rebuild the same substrate from it - the third condition of the ready-to-fan-out gate:

```bash
.better-dev/bin/bd-mem ledger put "<epic>" groundwork.md -   # stdin: foundation contract + carved work-item list
```

`bd-mem` resolves the primary checkout's ledger, so the record is visible from every worktree. Each
work-item still gets its own contract when its front-end runs; this record is the higher-level plan that
ties them together.

## Composability

Groundwork adds a front-end above `/plan-grill`; it never replaces it or the per-feature grilling. It
composes the PRD, design-vocabulary, and domain-modeling skills when they're installed and falls back to
a lean grill when they're not - additive either way. When you revise this skill, follow `/writing-skills`.
