# Slop and checks - the seed tells, the guessability test, the audit form, the trunk test

Reference for `design-brief` steps 1, 4, and 5. Everything here is phrased so a reviewer can answer it
from a captured screenshot or the stylesheet - no taste calls.

## The seed tells - detectable, not adjectives

These are the model-default patterns that read as "generated, not designed." They are per-model, not
per-project, so the seed list ships with the skill; the project derives additions and filters the
list by the register on the direction card (a tool surface has no hero to flag). The list is never
filtered to empty: a register with no applicable seed tells gets its register's failure test (step 1)
as the audit question instead - a zero-item walk that declares slop-free is a vacuous audit, not a
pass. Each tell is something a screenshot or the markup can answer:

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
11. A warm cream-to-beige page background reached for as the default "tasteful" surface.
12. Gradient-filled text - a gradient clipped to the letterforms.
13. Blur-and-transparency glass cards used decoratively by default.
14. The big-number hero-metric block as a template section.
15. Bounce or elastic easing on UI motion.
16. Numbered section markers (01 / 02 / 03) as scaffolding.
17. Whimsical machine-generated microcopy in loading and empty states.
18. A decorative CSS panel standing where the brief implies real imagery, and any image URL that
    does not resolve at render time.

Imagery is also a criterion, not only a tell: when the brief implies imagery, imagery ships - zero
images is a bug, not a design choice - and every referenced image URL resolves at render time; a
guessed ID that 404s ships as a broken placeholder.

## The guessability test - two altitudes, both fail

Run the pinned direction through two questions. First altitude: could someone guess the theme and
palette from the product category alone? Then it is the first training-data reflex. Second altitude:
could someone guess the aesthetic family from the category plus "not the default" - the standard
escape aesthetic of the moment? Then it is the trap one tier deeper: the first reflex avoided, the
second taken. Both fail. A direction passes when it is derived from this product's brief and
audience, and the derivation is stated on the direction card.

## The audit form - clean or flagged, every item, every time

The audit walks the full list (seed plus the project's additions) and marks each tell `clean` or
`flagged`; every flag carries a replacement spec naming what goes there instead. A flag without a
replacement is a complaint, not a finding, and a one-line "no slop found" fails the audit's form -
the per-item marks are the evidence the loop's verify step reads.

When a deterministic design detector is wired (sourced via `/tool-sourcing`, recorded in overrides),
run it before the manual walk and fold its hits into the flagged items. A clean detector run is
evidence, never the verdict - the per-item walk and the trunk test still run.

## The trunk test - orientation outranks polish

From a screenshot of any page, with no prior context, answer six things: what product this is, which
page this is, what the major sections are, what actions are available here, where this page sits in
the whole, and how to search (when search exists). All six clear is a pass; three or fewer is a fail,
and a fail outranks any polish finding on the same page. (The check is the classic trunk test from
usability practice, reimplemented; the point is that it runs over a capture, not over an opinion.)
