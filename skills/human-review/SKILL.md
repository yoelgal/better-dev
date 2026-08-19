---
name: human-review
description: Use when a human's markup on a rendered artifact has to land - the operator wants to comment on a rendered spec, plan, report, newsletter, or page instead of typing prose corrections; or has already hand-edited the rendered thing and those edits must reach the source; or a feedback batch from a review surface is waiting and its comments and edits need applying and reporting per item. Not for judging a diff (`/review`) or for deciding visual direction (`/design-brief`).
---

# Apply a human's markup on a rendered artifact

A human reading a rendered artifact marks it up two different ways at once, and the two carry
different authority. Collapsing them into one comment box loses the half that matters more: the
most-reported failure of the surface this contract comes from is an agent treating a change the human
already made as a suggestion, and reverting it.

## The two channels

A review surface splits its rail for this reason, one section labelled `FEEDBACK` and one `YOUR EDITS`.

| Channel | What arrives | Its authority |
|---|---|---|
| **Comments** | A note anchored to a text span or a whole block. The human says what should change. | An instruction to judge. The agent decides how to act, and may decline with a stated reason. |
| **Edits** | A change the human already applied in the rendered view. | A fact. `after` is their exact wording: carry it across verbatim and never revert it. |

Nothing in the edits channel is a proposal, so nothing in it gets weighed. An edit the agent believes
is wrong is a conflict to surface, not a change to undo.

## The batch is a file on disk before anything is applied

Feedback that lives only in a browser tab is lost work - three tab crashes across one three-hour
review sent an upstream reviewer back to plain chat. So the batch is written under
`.better-dev/review/feedback-<slug>-<n>.json` and read from there, and clearing it is a separate step
from reading it: a half-applied batch is then recoverable rather than gone, and a session that dies
mid-apply resumes from the file instead of asking the human to mark the artifact up again.

The shape, which is the contract a sourced surface has to emit:

```json
{
  "status": "feedback",
  "pages": [
    {
      "file": "/abs/path/to/plan.md",
      "comments": [
        { "id": "c_1", "kind": "selection", "quote": "the exact text they selected",
          "anchor": { "prefix": "32 chars before it", "quote": "the exact text they selected",
                      "suffix": "32 chars after it" },
          "feedback": "what they want changed" }
      ],
      "edits": [
        { "id": "e_1", "label": "Problem body", "kind": "edited",
          "before": "the original wording",
          "after": "their exact new wording",
          "after_html": "their exact new wording with <strong>formatting</strong>" }
      ]
    }
  ],
  "overall_note": "feedback not tied to any one page"
}
```

Each field carries a failure it prevents:

- `anchor` is quote-plus-context, roughly 32 characters each side, re-found by best scored match. That
  is what lets a comment survive the file changing under it, so a batch stays applicable after the
  agent has already written to the target. Find each comment by its `quote`; that exact string is in
  the file.
- `kind: "element"` points at a whole block, so its `quote` is the block's label, not body text -
  searching the body for it finds nothing.
- `kind: "moved"` on an edit means the human relocated that block. Reposition it without rewriting its
  content.
- `after_html` present means formatting changed, not only words. Translate it into the target's own
  syntax (`<strong>` becomes `**` in Markdown), or the human's bold disappears.
- A page keyed to a served route names a route, not a writable file. Find the project source behind it
  and apply there; writing the rendered response back into the app loses the change on the next build.
- Markdown opens rendered, so its quotes and edits reference rendered text. Apply every change to the
  Markdown source, keeping its formatting syntax.

## Apply the batch as a set, on a freshly read target

The send button reads `Send 3 to agent`: feedback arrives as a batch, and the whole batch is what gets
addressed. Every item, and every page in `pages`, not just the first - acting on the first item and
dropping the rest is the common shape of losing a human's review.

Read the target from disk immediately before applying, and apply targeted edits to the anchored spans.
The reverting failure is not a stale write: it is an agent re-emitting the whole file from the copy it
has been holding in context, which is current and wrong at the same time, and takes the human's hand
edits out with it. A version-gated targeted edit closes that; a stronger instruction to be careful
does not.

Then verify the batch landed, per item: each edit's `after` string is present in the source, and each
comment acted on has a changed span at its anchor. The surface this contract comes from ships no such
check, and its field reports are exactly that gap - a delivered batch read as an applied one.

## Conflicts surface; they are never silently settled

| Collision | The move |
|---|---|
| A comment asks for something an edit already decided | Report both, quoted, and ask. The edit stays in place while the question is open. |
| An edit contradicts the agent's plan or a contract done-criterion | Report both, quoted, and ask. The edit stays in place while the question is open. |
| Two edits touch the same span | Apply neither half; quote both and ask which wins. |

Picking a side quietly is the same defect as reverting: the human learns their edit did not survive by
noticing it missing later.

## Report per item, with a typed disposition

One row per item in the batch, and the disposition is a token, not prose:

| Item | Channel | Disposition | Evidence |
|---|---|---|---|
| `c_1` | comment | applied | lead sentence rewritten, `plan.md:12` |
| `c_2` | comment | declined: the wording it asks for contradicts the contract's latency criterion | both quoted, question raised |
| `e_1` | edit | carried verbatim | `after` present at `plan.md:41` |
| `e_2` | edit | conflict: `c_1` asks for the sentence this edit deleted | both quoted, unresolved |

The four dispositions are `applied`, `carried verbatim`, `declined: <reason>`, and
`conflict: <what collides>`. An item with no row is an item lost, which is what the human will find
first.

## What this covers

Rendered HTML, Markdown opened rendered, and a locally served page - artifacts a human reads, not code
a reviewer grades. A diff needs `/review`, which judges a change against a contract and has no
rendered surface to anchor to. Deciding what a UI should look like is `/design-brief`; this skill only
carries a human's markup on the rendered result into the source.

## When no review surface is wired

Hand the gap to `/tool-sourcing` - discover, vet, try, adopt - and record the adoption once so a later
run reuses it. Four vetting criteria come from this contract: the surface writes the batch to disk
before the agent reads it, keeps the two channels separate in what it emits, anchors a comment by
quote-plus-context rather than a DOM path or a line number, and stays single-operator and local
(loopback plus a token). No hosting, no multiplayer, and no accounts is a scope choice worth keeping
rather than a gap to fill. One real gap to state up front instead of discovering it in use: these
surfaces are contenteditable plus a comment rail, and they ship no accessibility story.
