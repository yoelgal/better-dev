# Carving the remainder into disjoint work-items

Step 4 of groundwork in full. The foundation is settled and about to land on staging; everything else
now has to be cut into work-items that N worktrees can build at the same time without colliding at
merge. A clean carve is the difference between real parallelism and N branches that all edit the same
three files and fight every merge.

## 1. List the candidate work-items

Write down every remaining piece of the idea as a candidate work-item - a feature or a fix. Right-size each
before carving further: break an item down when any of these is true: it would take more than one focused
loop session; you can't state its acceptance in three or fewer bullets; it touches two or more independent
subsystems; or its title needs an "and". An item that trips these is really several - split it now, while
splitting is cheap, not at merge time. Prefer vertical slices (one working path end to end) over horizontal
layers. This is the same right-sizing `/plan-grill` uses per feature.

## 2. Map what each owns and depends on

Ownership has two halves. **Owns** - the files, directories, and modules a work-item will create or edit.
**Depends-on** - the frozen foundation surface it imports but must not touch (groundwork step 2). List both.
Lean on the module boundaries drawn in the foundation: a work-item that lines up with one module owns that
module and little else, and depends on the shared types and interfaces it imports. A carve is clean when no
path is *owned* twice, and no item needs to edit another's owned paths or the frozen surface. An item that has
to edit the frozen surface is not a work-item yet - its need goes back down into the foundation.

## 3. Find the collisions

A path *owned* by two work-items is a collision - those two can't run in parallel as drawn, because their
worktrees will both edit it and fight at merge. A path one item owns and another only depends on is not a
collision: the frozen surface is read-only to its dependants. Group the ownership lists and look for any path
that appears in two *owns* sets. No overlaps → the carve is already clean; skip to step 5. For many items, run
the contention check as an `/orchestrating-agents` fan-out rather than by eye - one reader per ownership list,
synthesizing the duplicated paths.

## 4. Resolve each collision

Three moves, in preference order:

- **Push it down.** A thing two features both need is usually foundation. Move it into groundwork step 2,
  land it with the foundation, and both items just import it - the collision disappears. This is the
  common case, and the reason carving feeds back into the foundation design.
- **Sequence it.** When one item genuinely builds on another's output (not just a shared file), it runs
  in a *later wave*: after the item it depends on merges to staging, it bases off staging like any other
  work-item and inherits the dependency. No inter-feature branch juggling.
- **Redraw the boundary.** When two items overlap because the cut is wrong, re-cut them along a different
  axis so each owns a clean set of paths - split by layer, by entity, or by route instead of however
  they first fell out.

## 5. Order into waves

- **Wave 0** - the foundation. Lands on staging first (groundwork step 3).
- **Wave 1** - every work-item that bases off staging-with-foundation and depends on no other item.
  These run fully in parallel, one worktree each.
- **Later waves** - sequenced items, each starting once the item it depends on has merged to staging.

Each wave-1 item merges to staging on its own; a later-wave item bases off staging-*with-the-prior-merge*, so
it inherits integrated code, not a stale base. After a wave lands, re-verify the foundation's pipeline is
still green on staging before opening the next wave - an integrated foundation that no longer builds is the
fan-out's one shared failure. (`/pr-and-verify` verifies each item; groundwork only names the order and this
between-wave check.)

Most of the work should land in wave 1. A long tail of later waves means the items are more coupled than
the carve admits - revisit steps 2 and 4.

## When two items can't be made disjoint

Sometimes push-down, sequencing, and redrawing all fail - two pieces are genuinely one change. Say so,
and run them as **one** work-item in one worktree rather than faking a parallel split that will collide.
An honest single item beats two that merge-fight; the point of carving is real parallelism, not a larger
item count.

## Output

The parallel work-item list, one row each:

- **name** - the work-item slug,
- **owns** - the paths / modules it owns,
- **depends-on** - the frozen foundation surface it imports but must not touch,
- **base** - staging (wave 1) or the item it follows (later waves),
- **front-end** - `/plan-grill` (feature) or `/diagnose` (fix),
- **wave** - 0 / 1 / 2…

This list, plus the foundation contract, is the groundwork record written to the ledger (groundwork
step 5).
