---
name: design-brief
description: Use when a work item has real UI surface and its visual direction isn't settled - a request to make something look good, design a landing page or a screen, pick an aesthetic or a design system, fix a UI that reads as generic AI slop, or turn a vague "looks nice" into visual done-criteria the loop can verify. This is the design front-end `/groundwork` composes to settle foundation tokens and `/plan-grill` composes for a UI feature. Composes the host's design skill and sources one on a gap; hardcodes no aesthetic or stack. Not for auditing existing UI code against accessibility or style guidelines - that is a host design-review skill (`/web-design-guidelines`) or `/review`.
---

# Set a design direction before any pixel

When a request carries visual intent, the model's default reach is a generic template - and a generic
template is exactly what reads as "AI slop." This skill sets the direction and the criteria so the loop
has something to build toward and grade against. It does not paint the pixels; it decides what "done"
looks like and how you will know.

## 1. Read the brief, state the direction as decisions

The brief is the product's audience, its tone, and its constraints - read those before opening a
component. On an existing codebase, also read the token source and at least one representative
component before stating any direction: a direction stated over an unread codebase is a reinvention,
and reinventing what the repo already settles is a finding.

Decide the register next: this surface either *is* the product (marketing, landing, portfolio - the
design is the message) or *serves* the product (app UI, dashboard, settings - the design is the tool).
The registers carry opposite defaults for type, color, and motion, and opposite failure tests - a face
surface fails when its look is guessable from the product category alone (the same test
`slop-and-checks.md` runs as the guessability test's first altitude - one check, cleared once); a tool surface fails when a
user fluent in the category's best tools would pause at an off component. Record the register on the
direction card; the tell audit in step 5 filters by it.

Then state the direction in one line, as *decisions, not adjectives*: the type scale, the
spacing rhythm, the color stance, the motion stance, and whether the read maps to a real design system
or a named aesthetic family.

"Clean, minimal, modern" is not a direction - it is the template every model defaults to, and
defaulting is what produces the slop. "Just use a standard clean look" skips the one step that matters.
If you cannot name those four decisions for this product, you have not read the brief yet. Avoiding
the default is not a pass either - the standard escape aesthetic is itself a tell; run the two-altitude
guessability test in `slop-and-checks.md` before pinning the direction. When
proposing candidate directions to choose among, generate them as *verbalized candidates* - each with a
stated probability, at least one tail option under ~0.10 (the shape in `/orchestrating-agents`) - the
default-template pull is mode collapse, and asking for the distribution is what escapes it. Label each
candidate with one concrete noun; two candidates sharing a label, or one label that fits them all, is a
rework signal, not a style note.

When the read is blank, or an existing render reads as generic, don't reason from an empty page:
source a specific admired reference - a real product this brief's audience would call premium - and
diff against it. Adopt its layout, structure, and information hierarchy; re-skin them in this
project's own palette and assets. Steal the structure and twist the skin - never clone the surface,
never invent the structure from nothing.

## 2. A real system, or an honestly-labeled direction

There are two honest states. Pick one and be plain about which:

- The read maps to a system with an official package (Material, Radix, shadcn, a GOV.UK or USWDS
  obligation). Install and use that package. Don't hand-recreate its CSS, don't import its tokens then
  override most of them, don't restyle its primitives ad hoc. One system per project.
- No official package fits. Then you are choosing an aesthetic direction, not adopting a system.
  Record it as a direction card, three parts: the name, the three-to-five principles the direction
  commits to, and what its audit prioritizes - the two or three questions a reviewer of this direction
  asks first. "Matches the stated direction" is checkable only against this card; a bare label is a
  vibe with a name. Build it on the project's own stack, and say plainly in a comment what is borrowed
  inspiration versus real material.

Either way, record the choice so the next feature inherits it instead of reinventing it: the token set
and the named direction go into `.better-dev/overrides.md` (via `.better-dev/bin/bd-mem
persist-override "<line>"`). This is the frozen shared interface `/groundwork` pins for a UI product - a
design decided per-feature is two worktrees styling the same button differently.

The recorded token set names one token source in the repo - CSS custom properties, a Tailwind theme, a
tokens module - and that file is the visual contract. The loop inherits one deviation criterion from
it: every color, spacing, and radius value in the diff resolves to the token source, and a raw hex or
magic pixel value outside it is a finding, greppable, not a taste call. The override line points at
the token source; the contract lives in code, where it cannot drift from what ships.

A token set is pinned when the token source defines a value for each slot: the font or fonts and the
weights in use, a type scale with a named base size, color roles named by function (such as subtle /
default / strong / border / selected-background), the spacing scale, the radius values, and the icon
set with its stroke width. A slot with no value is an
open decision the next feature will improvise - walk the slots when recording the set, and an empty
slot is a finding, not a default. A pinned font or icon set also names its license, and the license
permits the deployment target; an asset whose license forbids the target is a finding at pin time,
not at ship time.

An iteration request - bolder, quieter, more premium - never expands the token set silently. A new
color, radius, shadow, or font is a change to the frozen foundation surface: name it and confirm
before adding, exactly as any other frozen-interface change (`/groundwork`). When a diff deviates,
classify the deviation - a missing token, a one-off where a shared component exists, or a conceptual
misalignment - the fix differs by class, and the class rides with the finding.

## 3. Compose the host's design skill; source one on a gap

Read `.better-dev/overrides.md` first - a repo often already settles taste. A host may ship
`/frontend-design` for direction or `/web-design-guidelines` for the accessibility and UX audit, or pin
its own design skill. Name-check what is wired at runtime and use it. If nothing is, hand the gap to
`/tool-sourcing` - discover, vet, try, adopt - and record the choice so it stays swappable, exactly as
`/browser-capability` sources a browser tool. Never hardcode a stack, framework, or aesthetic here; this
skill ships the practice, not a taste.

## 4. Hand plan-grill checkable visual done-criteria

A visual property becomes a done-criterion only when it names something observable: renders at the
target widths without overflow, uses the recorded token set rather than ad-hoc values, passes a
guideline or contrast audit over a captured screenshot, matches the stated direction per its card,
and comes up clean on the tell audit and trunk test in `slop-and-checks.md`. Feed those into
the contract as first-class done-criteria (`/plan-grill` step 4).

"Looks polished" is not a criterion, and "it looks good to me" is a self-report, not a check. A
screenshot is the artifact, not the verdict - a captured PNG nobody audited is not a pass. A visual
criterion is proven the same way any end-to-end criterion is: the render is driven and audited via
`/browser-capability`, never asserted from the author's eye.

Four method rules travel to any aesthetic, and each enters the contract as a checkable criterion,
not advice:

- **Real assets or none.** An unrequested placeholder - a stock gradient, lorem copy, a stand-in
  icon or hero - is a defect, not a stopgap. Generate or source the real asset now, in its final
  format and aspect ratio, or design honestly for its absence.
- **Art is never distorted.** The container adapts to the asset, never the asset to the container -
  no cropped or stretched hero. A loading transition is invisible, or the element is absent until
  ready; nothing beats a flicker.
- **Mobile is a dedicated pass, not a resize check.** Every visual criterion carries a
  mobile-viewport twin, driven and captured like its desktop one; on mobile, omitting a heavy
  ornament entirely beats degrading it.
- **Motion is earned and bounded.** An animation signals a state change, plays once, and stays
  subtle; motion with no state to signal is decoration the criterion refuses.

## 5. Tell-bans - seed list plus per-project additions

An "AI tell" is a checkable ban, not a taste. The seed tells - the model-default patterns every
unguided generation reaches for - ship with this skill; the full list, the clean-or-flag audit form,
and the trunk test live in `slop-and-checks.md` beside this file. Per project: add tells you can
count or measure ("the palette is the token set, no ad-hoc hex" - the repo's em-dash ban is the same
species) and filter seed items by the register on the direction card, recording additions in
`.better-dev/overrides.md`. The list is never filtered to empty - the rule for that case is in
`slop-and-checks.md`. The audit in step 4 checks the render against the combined list, item by item.

## 6. Redesign mode - audit against the brief, name what can't change silently

On an existing UI, classify the mode first: preserve the current direction or overhaul it.
Misreading that is the biggest source of a bad redesign. In preserve mode, write the surface's
identity in one sentence before proposing anything; every proposal must read as the same product when
rendered beside the original, and the noun-label check from step 1 runs on the variants - variation
within identity, not selection between identities. Then audit the render against the brief and
emit ranked violations - worst first, each naming the tell it breaks and the direction it should match -
not a flat "make it nicer."

Redesign mode captures a baseline before any fix: screenshot the affected pages and run the step-4
audit once - the ranked violations are readings against that baseline. Every claimed fix is proven by
an after screenshot audited by the same checklist as its before, and the final pass re-runs the full
audit; a final result worse than the baseline is a named regression in the report, never absorbed. The
ranked violations close with a gap statement: one paragraph naming what the top of the scale looks
like for this product, specific enough that a worker could aim at it.

Some things never change silently without an explicit decision: route slugs, primary nav labels, form
field names and their order, the brand wordmark, existing legal or consent copy. Changing one of those
is a contract question for `/plan-grill`, not a styling choice.

---

This skill settles direction and criteria and hands them off - to `/groundwork` as foundation tokens,
to `/plan-grill` as the design read and the visual done-criteria, to `/autonomous-loop` and
`/browser-capability` as the audit the loop runs. Ponytail throughout: it sets what to prove, not how to
paint.
