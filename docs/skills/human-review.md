# /human-review

## What it does

Carries a human's markup on a rendered artifact - a spec, a plan, a report, a page - back into the
source it came from, keeping the two channels of that markup apart. A comment is an instruction to
judge, and may be declined with a stated reason. An edit the human already applied in the rendered view
is a fact: its wording is carried across verbatim and never reverted. The defining constraint is that
collapsing the two loses the half that matters more, and the most-reported failure of this kind of
surface is exactly that - an agent treating a change the human already made as a suggestion, and taking
it back out.

## When to reach for it

| Situation | Route |
|---|---|
| You want to mark up a rendered artifact instead of typing prose corrections | `/human-review` |
| You already hand-edited the rendered thing and those edits have to reach the source | `/human-review` |
| A feedback batch is waiting and its comments and edits need applying and reporting per item | `/human-review` |
| Judging a diff against a contract | `/review` - it grades a change, and has no rendered surface to anchor to |
| Deciding what a UI should look like | `/design-brief` |
| No review surface is wired at all | `/tool-sourcing`, the same way a browser gets sourced |

## Where it fits

Beside the artifact, not on the build chain: it carries a human's markup on rendered output into the
source, wherever that output came from. `/review` is the counterpart for code, and `/design-brief` owns
visual direction. Where the host ships no review surface, the gap goes to `/tool-sourcing` with four
vetting criteria this practice defines - the surface writes its batch to disk before the agent reads it,
keeps comments and edits separate in what it emits, anchors a comment by quote-plus-context rather than a
DOM path or a line number, and stays single-operator and local.

## Prerequisites

A feedback batch on disk in the shape this practice pins, and a writable source behind whatever was
rendered. A page served by an app names a route, not a file: the change has to land in the project source
behind it, since writing the rendered response back is lost on the next build.

## Common questions

**Why does the batch have to be a file first?** Because feedback that lives only in a browser tab is
lost work - three tab crashes across one three-hour review sent an upstream reviewer back to plain chat.
Reading the batch and clearing it are separate steps, so a half-applied batch is recoverable and a
session that dies mid-apply resumes from the file rather than asking you to mark the artifact up again.

**What actually causes the reverting failure, if not a stale read?** Re-emitting the whole file from the
copy the agent has been holding in context. That copy is current and wrong at the same time, and
rewriting the file from it takes your hand edits out with it. The fix is a targeted edit against a
freshly read target, not a stronger instruction to be careful.

**My bold formatting disappeared after a previous round - is that expected?** It is the known shape of
this failure: an edit can change formatting rather than only words, and the HTML form of your edit has to
be translated into the target's own syntax before it lands. Markdown is the common case, since it opens
rendered and every quote refers to rendered text while every write goes to the source.

**A comment and an edit contradict each other - which wins?** Neither, silently. Both get quoted back to
you as a question, and the edit stays in place while it is open. Two edits touching the same span are the
same move: apply neither half, quote both, ask which wins. Picking a side quietly is the same defect as
reverting, because you find out by noticing something missing later.

**Is the sourced surface itself accessible?** No, and that is stated up front rather than discovered in
use: these surfaces are a contenteditable view plus a comment rail, and they ship no accessibility story.

## It's working if

- Every item in the batch comes back with a typed disposition - applied, carried verbatim, declined with
  its reason, or a named conflict - and no item is missing a row
- A change you made yourself in the rendered view appears word for word in the source, including its
  formatting
- A comment still lands on the right span after the file has already changed underneath it
- A batch you sent as three items gets addressed as three, rather than the first one acted on and the
  rest dropped
- A collision between what you asked for and what you already changed arrives as a question with both
  sides quoted, never as a quiet decision
