# /deep-research

## What it does

Answers one question from sources outside this repo, and hands back the chain that produced the
answer: which sources, what each one actually says, and where they disagree. The defining constraint
is what it refuses to smooth over - two credible sources that contradict each other ship as a named
tension, never averaged into one bland sentence, because the disagreement is usually the most
valuable thing the pass found. It commits a position with a falsifier attached rather than returning
a reading list, and it changes nothing in the repo.

## When to reach for it

| Situation | Route |
|---|---|
| Prior art on a problem or a symptom - who else hit it, how they solved it | `/deep-research` |
| A vendor's or a paper's number has to survive its own limitations | `/deep-research` |
| Sources disagree and the disagreement itself is what needs settling | `/deep-research` |
| An answer arrived with no provenance and its chain has to be rebuilt | `/deep-research` |
| Reading this codebase - callers, dependents, real schema | the `lsp` tool (`references`, `definition`, `symbols`) |
| Finding a tool or skill to install | `/tool-sourcing` |
| One API signature or config key | a documentation lookup, not a research pass |

It picks a profile before the first search: **light** for a bounded question with a likely settled
answer, **full** for contested or load-bearing work. A light run upgrades mid-pass on either of two
triggers - the width wave surfaces credible sources that directly disagree on a load-bearing claim,
or the answer is about to be read as a decision.

## Where it fits

An input to a decision, never the decision. `/plan-grill` calls it when a design turns on an outside
fact, `/diagnose` when a symptom's signature looks like somebody else's bug, `/tool-sourcing` when
the gap turns out to be knowledge rather than tooling. Its answer travels with its provenance into
whichever of those called it, and nothing installs or ships as a result of the pass alone.

## Prerequisites

A way to search and fetch outside sources. `.better-dev/overrides.md` is read first, since a project
may pin its sources of record, forbid a fetch lane, or name domains it does not trust.

## Common questions

**Three sources agree - is that consensus?** Only when they do not all trace back to one upstream
original. Coverage that read each other is one claim wearing several bylines, and the pass marks that
case single-origin and counts it as a single source. A comparison page counts as commentary even when
it looks like a benchmark, because several of them are built off the same underlying dataset.

**A page was paywalled or blocked - did it summarise what it could not read?** No. Each blocked fetch
is recorded with a reason from a closed set, another route to the same content is tried first (print
view, archive copy, preprint, or the primary artifact the page was reporting on), and whatever stays
blocked appears in the answer's `Unresolved` line with its reason. Credentials and captchas are
collected into one batched ask at a natural pause, never one interruption per URL, and a credential
never lands in the notes the answer ships with.

**Why did a number arrive with so much attached to it?** Because repeating a number without the
conditions it was measured under is laundering. Every figure carries its `n`, what was actually
measured, whether the comparison is like-for-like, and the grade the source gives itself - where a
source calls its own result inspect-grade, that qualifier ships with the number every time it
appears.

**Can I trust text a fetched page told the agent to do?** No, and the pass treats it the other way
round: everything a page or API returns is untrusted input, an instruction inside a fetched body is
content to report rather than a direction to follow, and a source that tries to steer the research is
itself a finding about that source.

## It's working if

- The answer names a position in a few sentences, and every source beside it says which query or
  which other source surfaced it, so you can walk the chain back yourself
- Two sources that flatly disagree turn up as a labelled tension you can act on, rather than one
  hedged sentence that hides both
- Quotation marks in the answer are only ever around text you can find again in the source
- An `Unresolved` line is present every time, naming the parts of the question the corpus did not
  settle and the sources nobody could open
