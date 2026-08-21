---
name: brief-to-problem
description: Use when the words being acted on are somebody else's rather than an intent the operator owns - stakeholder or user feedback relayed into the session ("make it simpler", "this feels clunky", "people keep getting lost"), a ticket or a pasted message quoting a requester, a brief that names an artifact as if it were the requirement ("we need a chatbot", "add a dashboard") with no outcome named behind it, a bug report that arrives as an adjective with no event behind it ("it's slow", "it's flaky") whose event has to be recovered before /diagnose can pick a reproduction, or a direct ask for the problem statement and scope lines behind a request someone was handed. It ends at one measurable problem sentence, two scope lines, and the questions it could not close; /plan-grill owns the design, the grill, and the done-contract from there and takes this output as its input.
argument-hint: "[the brief, in the requester's words]"
---

# brief-to-problem - somebody else's words into one measurable problem

One job: decode a relayed brief into one measurable problem sentence, a line for what is in scope, a
line for what is not, and the questions the decode could not close. Nothing about the solution is
decided here. The moment the problem sentence is agreed the run is over and `/plan-grill` takes it as
its input - it ideates, grills, and writes the done-contract, and it needs no second decode because
this artifact is the one it would have produced.

Read `.better-dev/overrides.md` first - a project override, such as a house problem-statement template
or a standing definition of a recurring word, wins over anything below.

## The gate

Run this when the words on the table are not the operator's own: relayed feedback, a quoted ticket, a
pasted message, a user complaint, a request handed down. First-person intent skips it in one line -
an operator who says "I want to add X" already owns the problem, and interrogating their design is
`/plan-grill`'s job, not this one.

A brief that arrives as a link is not a brief until the link is captured: enter `/source-harvest` and
decode the captured text, never the page title or your memory of the post.

## The six moves

- **Quote before you tidy.** Copy the requester's words exactly, with who said them and when, and
  keep that quote at the head of everything downstream. If the first thing you wrote was a cleaned-up
  restatement, the evidence is already gone - open the original message and copy it. "Clunky" and
  "dated" are two different complaints pointing at two different anxieties, and only the untouched
  words tell you which one you are holding. Check: the artifact opens with a quoted brief and a named
  requester, or the decode has not started.
- **Ask what happened right before, not what they want.** An adjective is what is left after somebody
  compresses an event into a reaction: reverse the compression and you get a problem, keep the
  adjective and all you hold is their opinion about the fix. So the first question is what happened
  right before this was asked and what made it matter this week. When the requester is out of reach -
  most pastes into a session are - hypothesize two or three candidate triggers and carry each as a
  premise for `/plan-grill`'s baseline check rather than quietly picking the convenient one. Check:
  the artifact names one confirmed trigger with its source, or the candidate triggers as listed
  premises.
- **Fork every subjective word into two or three concrete readings.** A subjective word is a fork in
  the plan, not agreement: five people nod at "modern" and hear five projects. Write the readings down
  where they can be pointed at, as below. Each fork then gets a disposition before the run ends - the
  requester's pick, a recorded assumption, or one of the capped questions - and never a "maybe"
  carried forward. A fork whose readings all produce the same problem sentence is not a fork: collapse
  it and spend the question elsewhere, because being unable to name what changes when the reading
  changes is itself the answer.
- **Translate a named artifact back into its outcome.** The brief that sounds specific is the
  expensive one, because it looks like a decision somebody already made. "We need a chatbot" is a
  solution wearing a requirement's clothes. Write two or three outcomes the artifact could serve, each
  with the cheapest thing that would produce it on the same line: those outcomes are separate
  projects, each with its own cheapest fix, and the gap between the cheapest and the named artifact
  is routinely a fortnight against a quarter of engineering. The picked outcome is what gets planned;
  the named artifact goes into `/plan-grill`'s ideation as one option among the sketches, never as the
  pre-decided winner. Check: when the brief names an artifact, the problem sentence names an outcome
  and no artifact.
- **Every number is a receipt or a TBD.** A number carries its source inline - a command and its
  output, a dashboard, a document - or it is written `TBD(<owner>)`. The dangerous case is the
  plausible one you produced yourself, because it reads exactly like a measured number and becomes a
  planning fact the first time somebody quotes it back at the team. Name the gap and the number's
  owner joins the conversation; invent it and nobody ever checks. Check: no bare number anywhere
  in the artifact without a source beside it or a `TBD(` marker.
- **One batch, at most five questions, each pinned to a named gap.** Firing back fourteen questions
  looks thorough and does the opposite - it hands the ambiguity back to the person you were supposed
  to decode it for. Send at most five, each naming the TBD or the reading fork it closes, beside the
  draft problem sentence, so the requester is correcting a draft rather than staring at a blank
  field. A question that names neither a TBD nor a fork is cut. A question you can settle by reading
  the repo is yours to settle, not theirs to answer; and a question about what the requester meant is
  not closed by the session answering it on their behalf - that one waits or becomes a recorded
  assumption, labelled as one.

## One adjective, three projects

The fork move, filled in. Brief: "the onboarding flow feels clunky and people give up".

| "Clunky" could mean | Then the problem is | Cheapest fix if it is this one |
|---|---|---|
| Too many steps before the first win | nine screens stand between a new workspace and a first green build | collapse steps 3-6 into defaults |
| Every step is slow | a 28s median wait on the workspace scan alone | cache the workspace scan |
| The steps are fine, the wording is not | people pick the wrong option and start over | rewrite two labels |

Three readings, three different projects. Ask the requester to point at one; if they are unreachable,
carry the two you cannot separate as premises and let the baseline check kill one.

## The artifact

Small enough to send back whole - it is a message, not a document. When the decode leads into a build,
it rides into the work-item's contract unchanged: the quote above `## Problem`, the sentence as the
problem, the scope lines as Goal and Out-of-scope.

> **Brief, verbatim:** "the onboarding flow feels clunky and people give up" - Dana, design partner,
> 2026-08-14 standup.
> **Trigger:** three of five pilot teams stalled at the workspace-scan step last week (source: pilot
> log, 2026-08-13).
> **Problem:** a new workspace takes a median 9 steps and 4m12s to reach a first green build (source:
> `bd-onboard --timings`, 2026-08-15); target under 2 minutes by the end of the pilot without dropping
> the safety-policy prompt.
> **In scope:** first-run onboarding up to the first green build.
> **Out of scope:** returning-user setup, CI onboarding, the docs site.
> **Questions (3):** 1. Is time the target, or was it the step count Dana reacted to? [fork: reading 1
> vs reading 2] 2. Can the safety-policy prompt move after the first green build? [fork: reading 3]
> 3. Who owns the pilot-completion number, so the baseline is not mine? [TBD: baseline owner]

The problem sentence holds a shape: *<who> hits <condition with a baseline>; target <value> by <when>
without <constraint>*. The baseline slot and the target slot are each a receipt or a TBD, and the
out-of-scope line is what stops "the onboarding flow" from becoming a rewrite of the product by the
second sprint.

## Where the decode goes next

| What the decode landed on | Where it goes |
|---|---|
| A problem worth building against | `/plan-grill`, carrying the quote and the artifact; its own decode gate is satisfied by this run |
| A trigger that is a defect - something that used to work, or a concretely wrong output | `/diagnose`, with the trigger event as the symptom |
| More than one work-item, or a foundation nothing can be built on yet | `/groundwork` |
| A cheapest fix that is a one-to-two-step change | Make it, on its own branch (`/worktree-branching`); the problem sentence is the whole plan it needed |
| No problem anyone can state yet | Stop at the artifact and send it - a decode that ends in a draft sentence and five honest questions is a finished run, not a failed one, and inventing a problem to look finished is the failure this skill exists to prevent |

A decode that settles something standing - what a particular requester's recurring word turns out to
mean, which metric a team actually reacts to - closes with one `learn` tool call; one that settled
nothing durable writes an explicit `no durable lesson` line saying why. `/writing-skills` carries the
full close-out form.
