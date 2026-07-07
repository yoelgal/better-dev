# Slop and checks - the seed tells, the audit form, the trunk test

Reference for `design-brief` steps 4 and 5. Everything here is phrased so a reviewer can answer it
from a captured screenshot or the stylesheet - no taste calls.

## The seed tells - detectable, not adjectives

These are the model-default patterns that read as "generated, not designed." They are per-model, not
per-project, so the seed list ships with the skill; the project derives additions and prunes items
that genuinely do not apply (a docs site has no hero to flag). Each tell is something a screenshot or
the markup can answer:

1. A saturated violet-or-indigo gradient as a hero or section background.
2. The three-up feature grid - icon, title, two-line blurb, times three.
3. Icons floated in tinted circles that communicate nothing the icon alone would not.
4. Centered text as the default - more than one in five text blocks center-aligned.
5. One border radius on everything - inputs, cards, and modals all sharing the same rounding.
6. Decorative blobs, floating shapes, or wavy section dividers.
7. Emoji doing a design element's job in a heading, button, or card.
8. A colored accent stripe down the card edge that encodes nothing.
9. Hero copy that survives swapping in a different product's name ("Welcome to X", "Unlock ...").
10. The stock section march: hero, three features, testimonials, `CTA` - structure matching the
    template regardless of content.

## The audit form - clean or flagged, every item, every time

The audit walks the full list (seed plus the project's additions) and marks each tell `clean` or
`flagged`; every flag carries a replacement spec naming what goes there instead. A flag without a
replacement is a complaint, not a finding, and a one-line "no slop found" fails the audit's form -
the per-item marks are the evidence the loop's verify step reads.

## The trunk test - orientation outranks polish

From a screenshot of any page, with no prior context, answer six things: what product this is, which
page this is, what the major sections are, what actions are available here, where this page sits in
the whole, and how to search (when search exists). All six clear is a pass; three or fewer is a fail,
and a fail outranks any polish finding on the same page. (The check is the classic trunk test from
usability practice, reimplemented; the point is that it runs over a capture, not over an opinion.)
