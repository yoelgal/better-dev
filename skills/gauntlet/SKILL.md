---
name: gauntlet
description: Use when the deliverable is a Gauntlet Loop prompt - "gauntlet this", "one-shot the whole thing", "write me a prompt that builds X in a fresh session against a real bar", or a front-end offered the gauntlet route on a greenfield ask and the user took it. The output is one handoff prompt for a fresh agentic session; the build itself never runs here. For a feature in an existing codebase reach for /plan-grill; for an epic that needs a shared foundation and parallelizable work-items, /groundwork.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Gauntlet - grill the idea, hand off one loop prompt

A Gauntlet Loop is a way to run one long autonomous build: hand the lead agent a destination
plus a reference artifact worth beating, then let builder-critic loops chase that reference
until the human calls the run (step 3 owns the operative mechanics). The method comes from Matt
Shumer's Claude-of-Duty run (credited in `NOTICE`); it generalizes past games to any software
the loop can inspect: a web app, a CLI, a design system, an API.

This skill's whole job is the prompt. It grills the idea until the prompt can be written, writes
it, and hands it to the user to paste into a **fresh** session - fresh because the run wants its
entire context budget, and because this conversation's history would leak your framing into
decompositions the lead agent should own. When the conversation drifts toward building the thing
here, hand the prompt over instead - a gauntlet run inside a half-spent session is the method minus
its advantage.

Read `.better-dev/overrides.md` first when a repo is wired; a project override wins over any
default below.

## 1. Grill until the slots are settled

Seven slots decide the prompt. Batch the questions the conversation has not already answered; propose
a default wherever one is sensible and let the user correct it - the grill is done when every slot
is either filled or deliberately delegated to the run, not when the user stops answering.

| Slot | What settles it |
|---|---|
| Goal | The destination in one or two sentences - what exists when the run is over, for whom. |
| Bars | One row per axis the artifact is graded on, each row naming three things: its kind (visual, behavioral, data-correctness, performance, security or failure-recovery), the reference or measurement the critic holds the artifact against, and where any number in it came from - a measured baseline, a real comp's measured behavior, or the user's own target stated this session (step 2). An axis the user declines is written `none, deliberate`, so an ungraded axis is a visible choice rather than an omission. One row under a full-stack app is the tell that the backend went ungraded. |
| House rules | The handful of always-true fences (stack constraints, "no hard-coded special cases", licensing) - an empty list is a valid, deliberate answer. Asset provenance belongs here whenever the artifact has assets: nobody is around to fetch a mesh or hand over a logo, so default to generating them - textures, meshes, and sounds for a game, logo and icons for an app, real copy over lorem - and name the few the run may fetch instead. |
| Harness | Which agentic harness runs it, and whether subagents and looping are available there - the prompt leans on both. A plain chat window fails this slot - the run needs an agent that can open files, run code, render output, and spawn workers - so when the user has only a chat surface, name a harness they could run it in and hold the prompt until one is settled. |
| Stop condition | Who stops the run and on what: a spend ceiling, a wall-clock bound, or "user stops it when satisfied". The loop never decides it is finished. |
| Progress surface | Where the human watches without interrupting, and where a question parks: an append-only run record plus a self-refreshing page that renders it, the form `/orchestrating-agents` carries in its observatory notes. "Live" is the word the drafting most often under-delivers: a static page the agent rewrites is a file, not a surface, because the human only sees the rewrite if they happen to hit reload. A running markdown doc is the fallback where the harness renders one live. |
| Blast radius | What live or shared systems, paths, and credentials are in the run's reach: the directory it builds in, whether a credential is reachable from it, and whether any deployed environment, shared database, or paid API is. The default where none of that is in reach, and the answer when the user has no preference: a fresh directory, no credentials, no calls to a system the operator did not name. An unnamed environment is not a permissive one. |

Predict the user's answer before asking a slot's question; ask only where the prediction is
genuinely uncertain. Seven questions fired as a form is a worse grill than two aimed ones.

Three slots prediction never satisfies: the bars, the stop condition, and the blast radius wherever a
live or shared system is in reach. Each of those traces to a user message in this conversation or to a
quoted recorded override - a slot the same session both asked and answered is a broken grill rather
than a fast one, and a bar the session invented is the model's private sense of sufficient wearing the
user's authority.

## 2. Pin a real bar

The bar is the load-bearing slot. An adjective is not a bar - "amazing", "production-ready", and
"AAA quality" each let the run coast to the model's private sense of sufficient, which sits
below the user's. A bar passes one test: could a fresh critic, given only the bar and the
artifact, decide which is better without asking a question? Screenshots of the market leader,
a set of reference sites, paragraphs at the clarity the writing should reach, a test suite plus
a latency target - all pass. The bar may be unreachable on purpose: it exists to give the loop a
direction and to keep it
from settling the moment the result is merely impressive for a machine, not to be met. That reading
licenses the run never stopping for having met the bar, and nothing else - a single gap the run
believes it cannot close stays open and reported, never marked out of scope by the run.

When the user has no bar, offer the two honest moves: pick a comp together now, or open the
prompt with a bar-finding task - the run locates a real-world reference its critic can inspect,
states in one sentence why that reference deserves to be the bar, and holds every round against
it. The same fallback covers a non-visual row: the run can be tasked to locate a security checklist
or a failure-recovery scenario set exactly as it locates a comp. Writing the prompt around an
adjective because the user shrugged is the one failure this skill exists to prevent.

When the bar is a comp the artifact is *meant* to deviate from, write it as **comp plus deltas**: the
comp, the axes it is the bar for, and one line per deliberate difference naming what grades that
difference instead. Blind comparison is scoped by axis, and a named delta axis is exempt from the
biggest-gap report - the critic grades that delta against its own written behavior list, never
against the comp. A critic told "which is better" with an intended delta in front of it reports the
delta as the biggest gap, and the run spends real rounds deleting the reason the product exists. A
visual row cites the `/design-brief` contract where the repo has one, and a deliberate visual delta
is design direction: route it through `/design-brief` before it becomes a bar row, or, in an unwired
fresh session, let the row carry the delta list itself.

A unit with no visible comp - a schema, an API surface, an importer, a queue worker - is graded
against a **written behavior list**: the behaviors it must exhibit and the failure cases it must
survive, one line each, authored before implementation starts by an agent that will not implement
that unit. Rows may grow and never shrink, and the critic diffs the list against its original text
each round, so a weakened assertion is visible rather than absorbed. "A test suite you write first"
with one agent doing both is the builder grading its own homework in test form.

The bars are the human's, exactly as the stop condition is. The run never edits a bar row in place: a
row it judges wrong is written to the run record with the reason and the change it would make, and
grading continues against the row as written until the human replaces it.

## 3. Write the prompt - goal and bar, never the route

Keep the ratio of the original: everything about the quality process is present, everything
specific to the artifact's construction is absent. The prompt names the goal, the bar, the fences,
and the loop mechanics - and leaves architecture, decomposition, and ordering to the lead agent.
Every step you dictate replaces the run's judgment with this conversation's, and this conversation
has not seen the artifact; a gauntlet prompt that has grown past roughly a dozen sentences is
prescribing, so move the detail into a house rule or delete it.

The mechanics the prompt must carry, in whatever words fit: the lead agent carves the goal into the
smallest units the loop can better and grade on their own, naming for each unit at least one bar row
that grades it - a row may grade several units, naming them, and a unit no row reaches is a bar gap
the lead closes before that unit is built; it **fans those units out to subagents** - one builder and
one separate fresh-context critic each - rather than working them itself; the critic inspects the real
artifact - rendered pixels, a running binary, actual test output - never the builder's summary, and
tries to prove the artifact fails its bar row, blind against the comp on the axes the comp is the bar
for; loop with no fixed round count; keep the record and its page current (below); optionally, one
fresh smoothing agent per major wave to make separately improved pieces feel like one thing.

The run's account of itself is the observatory form `/orchestrating-agents` carries: one append-only
record file the page renders, one state word per unit, a fork the house rules do not settle parked as
a question instead of guessed. Copy its two-sentence version into the prompt rather than redrafting
it, and keep the fence around the critic - it receives the artifact and its bar row, never the record
or the page (the sidecar carries the fence's reasoning). The
run's last act, once the human stops it, is the return report: two paragraphs saying what they now
have and what it cannot do yet, then one line per unit naming the bar row it was held against and the
round its last gap closed - about the thing, not the activity.

**Two things the prompt does not get to leave out: subagents and the harness's heavy mode.** Neither
is decoration on the method; the method is built out of them. Subagents are the only way a critic gets
a context that never saw the builder's reasoning - a prompt that omits them describes a builder grading
itself in one long window, which is precisely the failure the separate-critic rule exists to prevent,
and the resulting run will look like it is following the method while doing the one thing the method
forbids. And a gauntlet run is exactly the large, multi-agent case the heavy mode is for, so name it
outright - "use ultracode", or the named harness's equivalent - rather than leaving the operator to
find the setting after the run is already spent. It does cost materially more; that is the operator's
call to make knowingly at handoff (step 4's run notes), not a default quietly dropped from the prompt
on their behalf.

Check the drafted prompt for both words before handing it over. They are the two the drafting most
often loses, because the prose reads complete without them.

**Open the block with a line that names what it is**, before the goal sentence: a Gauntlet Loop
prompt, to be executed in this session, not routed through a planning front-end. Everything else in
this step keeps the route out of the prompt, and this line is not an exception to that - it is a
dispatch guard, not build guidance. Without it the prompt is a bare greenfield build ask, and a
practices-wired repo reads it exactly that way: the paste lands in a fresh session whose own routing
hands it to a planning skill, which then offers the one-shot route back to `/gauntlet` for a prompt
the user is already holding. The line costs a sentence and closes that loop.

One filled example - a non-game, mixed visual and mechanical bar:

> This is a Gauntlet Loop prompt - run it here, directly; do not route it into a planning or
> foundation skill, the method it needs is below.
>
> Build a local-first personal-finance dashboard: CSV import from any bank export, monthly
> spending breakdowns, and budget alerts, as a web app I run on my own machine. Three bar rows,
> graded separately: visual - the attached Copilot Money screenshots, except the budget-alert panel,
> which is a deliberate delta and grades against the acceptance line in deltas.txt;
> data-correctness - the five bank-export formats in samples/, malformed ones included, against the
> behavior list in bars/importer.md, which you may extend and never shrink; performance - a
> 50k-row import under the 4.2s I measured on the comp. House rules: TypeScript, no cloud calls,
> data stays in one local SQLite file, and every icon, chart style, and bit of copy is generated by
> you - no stock imagery, no lorem. Work only inside ./finance-dash: no credentials, no deploys, no
> calls to any system I have not named here. Carve the work into the smallest units you can improve
> and grade independently - the split is yours, and each unit names the bar row it answers to. Fan
> them out to subagents: one builder and one critic per unit, the critic starting from a clean
> context with the artifact and that unit's bar row and nothing else, trying to prove the artifact
> fails that row - side by side and blind where the row is the comp, never on the delta. Keep
> looping - there is no final round; I stop the run. Use ultracode. The run appends one block per
> round to a single run-local record file - round number, one state word per unit (BUILDING,
> JUDGING, WAITING, STUCK), the critic's named gap, spend so far against the ceiling - and the
> progress page is a self-refreshing renderer over that file, never a second memory. A fork the
> house rules do not settle writes that unit's block WAITING with the question and two candidate
> answers, advances the other units, and reads the answer file at each round boundary. When I stop
> the run, your last act is the return report: two paragraphs on what I now have and what it cannot
> do yet, then one line per unit naming its bar row and the round its last gap closed.

## 4. Hand it off

The grill's last move before the handoff is one batch: the decisions the run is likely to hit while
nobody is awake - the one-way doors in the goal, a schema fork, a paid or destructive call, an
addition to the goal set - each carrying your recommended answer, and each answer landing in the
prompt as a house rule. A question answered before the run starts is not a question that strands it
at 3am.

Deliver the prompt as one paste-ready block, save it beside the run as a file rather than only on the
clipboard, and put it on the clipboard too where the host offers a clipboard command. With it, four
run notes: paste into a fresh session of the named harness, not
into this one and not into a plain chat; turn the harness's heavy mode on in that session *before*
pasting (Claude Code: `/effort`, select ultracode) - the prompt asks for it, but the setting is the
operator's to flip and it costs materially more; monitoring happens on the record's page, so resist
interrupting the run for status - writing an answer into the question file is not interrupting, it is
the run asking; stopping is the user's move, per the stop-condition slot.

A dead run resumes in a fresh session from the saved prompt plus the record: paste the prompt with
one line added, read the record and continue. Where graphify is wired, or one AST-only sync on the
artifact is cheap, have the run carry `graphify-wrapper-query --affected` output in each round block
(the observatory sidecar carries why). The first work-item on the artifact
after the run is a review pass over what landed, not a feature - the run stops holding thousands of
lines of unreviewed machine-written code - and the bar rows seed that item's done-criteria, each row
becoming a criterion with a runnable check or an explicitly dropped line.

The skill's terminal state is the handoff - a run started, watched, or debugged afterwards is its own
new work, and a wired repo's loop items still route through `/plan-grill` and `/autonomous-loop`.

Close out in one line: record the keyed lesson if the grill taught one
(`.better-dev/bin/bd-mem learn "<lesson>" <0..1> "<key>"` where a repo is wired), else say
`no durable lesson` and why.
