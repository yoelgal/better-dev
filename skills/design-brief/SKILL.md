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
component. Then state the direction in one line, as *decisions, not adjectives*: the type scale, the
spacing rhythm, the color stance, the motion stance, and whether the read maps to a real design system
or a named aesthetic family.

"Clean, minimal, modern" is not a direction - it is the template every model defaults to, and
defaulting is what produces the slop. "Just use a standard clean look" skips the one step that matters.
If you cannot name those four decisions for this product, you have not read the brief yet. When
proposing candidate directions to choose among, generate them as *verbalized candidates* - each with a
stated probability, at least one tail option under ~0.10 (the shape in `/orchestrating-agents`) - the
default-template pull is mode collapse, and asking for the distribution is what escapes it.

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
- No official package fits. Then you are choosing an aesthetic direction, not adopting a system. Name
  it, build it on the project's own stack, and say plainly in a comment what is borrowed inspiration
  versus real material.

Either way, record the choice so the next feature inherits it instead of reinventing it: the token set
and the named direction go into `.better-dev/overrides.md` (via `.better-dev/bin/bd-mem
persist-override "<line>"`). This is the frozen shared interface `/groundwork` pins for a UI product - a
design decided per-feature is two worktrees styling the same button differently.

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
guideline or contrast audit over a captured screenshot, matches the stated direction. Feed those into
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

## 5. Per-project tell-bans - derive them, don't inherit a list

An "AI tell" is a checkable ban, not a taste. The method: for this project, derive a short list of tells
to ban as things you can count or measure, not adjectives - "at most one uppercase-tracked eyebrow per
three sections," "the palette is the token set, no ad-hoc hex," not "avoid a generic look." The repo's
em-dash ban is already one such rule. Record the list in `.better-dev/overrides.md` so the audit in
step 4 checks the render against it. Don't bake a universal ban list into this skill - the specific
tells are per-project; only the method travels.

## 6. Redesign mode - audit against the brief, name what can't change silently

On an existing UI, classify the mode first: preserve the current direction or overhaul it.
Misreading that is the biggest source of a bad redesign. Then audit the render against the brief and
emit ranked violations - worst first, each naming the tell it breaks and the direction it should match -
not a flat "make it nicer."

Some things never change silently without an explicit decision: route slugs, primary nav labels, form
field names and their order, the brand wordmark, existing legal or consent copy. Changing one of those
is a contract question for `/plan-grill`, not a styling choice.

---

This skill settles direction and criteria and hands them off - to `/groundwork` as foundation tokens,
to `/plan-grill` as the design read and the visual done-criteria, to `/autonomous-loop` and
`/browser-capability` as the audit the loop runs. Ponytail throughout: it sets what to prove, not how to
paint.
