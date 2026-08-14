# /design-brief

## What it does

Settles a visual direction and turns it into checkable done-criteria before any pixel gets painted -
it decides what "done" looks like and how the loop will prove it, never the pixels themselves. It
refuses to hardcode a stack, framework, or aesthetic: it composes whatever design skill the host or
the repo already carries, and only sources a new one on a genuine gap.

## When to reach for it

Reach here when a work item carries real visual intent and the direction is not yet settled - "make
it look good," a landing page or screen from scratch, picking a design system or aesthetic family,
or turning a vague "looks nice" into something the loop can grade. `/groundwork` composes it to pin
foundation tokens for a greenfield UI product; `/plan-grill` composes it for a single UI feature.

It is not an audit skill for UI that already ships: reviewing existing UI code against accessibility
or style-guideline rules is a host design-review skill (`/web-design-guidelines`) or `/review`.

## Where it fits

A front-end that `/groundwork` and `/plan-grill` compose, not one invoked standalone against a
finished build. It hands its output three ways: token set and named direction to
`/groundwork`'s frozen foundation, visual done-criteria into the `/plan-grill` contract, and the
tell audit plus trunk test to `/autonomous-loop` and `/browser-capability` as the check the loop
actually runs.

## Common questions

**Why does the slop audit need a clean-or-flagged mark on every tell, not a one-line "checked, none
found"?** A summary sentence can pass a page that fails on inspection - a violet-gradient hero over a
three-up icon grid can clear contrast and token checks while a screenshot still can't answer what page
it is. The per-item marks are the evidence the loop's verify step actually reads, and the trunk test
(does a first-time viewer of the screenshot know what product and page this is) outranks any polish
finding on the same page.

**A redesign claims five fixes - what proves they landed?** A before screenshot audited once, then one
after screenshot per claimed fix audited by the same checklist as its before. A claim accepted with no
captures can ship a silent regression inside a "fixed" report; the final pass re-runs the full audit
and any result worse than the baseline is named, not absorbed.

**The hero image doesn't exist yet - why won't it just drop in a stock gradient?** An unrequested
placeholder (stock gradient, lorem copy, a stand-in icon) is treated as a defect, not a stopgap. The
real asset gets generated or sourced now in its final format, or the design honestly omits the element
until one exists.

**The tell audit found nothing to flag on a dashboard - does that mean it passed?** No. A register with
no applicable seed tells (a tool surface has no hero to flag, for instance) gets that register's own
failure test instead - for a tool surface, whether a user fluent in the category's best tools would
pause at an off component. A zero-item walk that declares "slop-free" is treated as a vacuous audit,
not a pass.

**Does /design-brief itself approve or block a design?** No - a design's pass/fail verdict belongs to
`/review` and the loop, the same grammar every other work-item is judged by. This skill hands those
judges checkable criteria; it does not carry a second verdict system of its own.

**A direction consciously avoids the category's obvious default - does that make it original?** No.
The two-altitude guessability test flags "not the default" on its own as second-reflex guessable, not
as originality. A direction has to be re-derived from this product's own brief and audience, with that
derivation stated on the card before it gets pinned - avoiding the default is not a substitute for
deriving one.

**A toggle animation feels restrained and tasteful - does that clear the motion tell?** No. The audit
checks the trigger's frequency class first - a keyboard shortcut or command-palette toggle fired
dozens of times a day fails regardless of how subtle the transition looks. The criterion is "no
entrance or exit animation on this trigger class," never a judgment call on how the motion reads.

**A screenshot taken with `prefers-reduced-motion` set shows the modal already settled - does that
prove the animation is suppressed?** No. A single still can't tell "suppressed by design" from "hasn't
started or already finished" - both render the same final frame. Reduced-motion is proven from the
stylesheet (a `prefers-reduced-motion` media query or the equivalent JS branch that actually guards the
movement) or a repeated-trigger capture through `/browser-capability` showing the animation suppressed
across multiple fires - never from one PNG.

## It's working if

- A direction card exists naming the register (product-is-the-message vs. product-is-the-tool) and
  the four decisions (type, spacing, color, motion) as decisions, not adjectives like "clean and
  modern."
- The token set is recorded in the project's override record, and every color, spacing, and radius
  value in a later diff resolves to that token source rather than a raw hex or magic pixel value.
- The `/plan-grill` contract for the feature carries visual criteria phrased as observable checks
  (renders at target widths, matches the recorded token set, clears the tell audit and trunk test) -
  never "looks polished" standing alone.
- A redesign's report carries a before screenshot and a per-fix after screenshot, not a narrated list
  of what changed.
