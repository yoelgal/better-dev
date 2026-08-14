# /browser-capability

## What it does

Wires a real browser so a "done" claim about the running UI is proven by driving one, not asserted
from code that never touched a page. It is the worked example of a general practice - on a
capability gap, source a tool rather than hand-roll one - applied to the browser gap specifically:
name the missing check as an observable ("the dashboard renders and the account name is visible"),
wire a tool to drive it, and feed the result into a work item's done-criteria so the loop grades a
proven pass, not a screenshot nobody looked at.

## When to reach for it

Fires when a work item's done-criteria need something only a running browser can show - a page
that actually renders, an end-to-end flow reaching its destination, a layout at a given viewport,
the live DOM or console. It does not fire for anything a unit test already proves, and it hands off
rather than duplicates work in two directions: `/ios-capability` is the same practice for a native
iOS surface, and `/tool-sourcing` is what this skill calls into when its own preferred tool can't
install or run here.

## Where it fits

Sits inside a work item's loop as the step that turns a UI or visual done-criterion into a runnable
check; `/autonomous-loop` treats the check's pass as the closing signal, and `/pr-and-verify` reruns
the same check against the running UI before a PR counts as verified. It composes `/tool-sourcing`
for its fallback path and defers to whatever `.better-dev/overrides.md` or an existing e2e harness
already pins.

## Prerequisites

None to reach the skill itself - the gap is exactly what it's for. Its preferred tool (the owned
browser daemon) needs a one-time compile step and a Chromium install before first use; both are
network-touching and the skill never runs them unprompted, so they land as paste-ready commands for
the operator to run once, not as an automatic install path.

## Common questions

**A screenshot with `prefers-reduced-motion` set looks static - does that prove the motion rule is
respected?** No. A single still can't tell "animation suppressed by design" from "animation hasn't
started or already finished" - either way the captured frame looks the same. Prove a motion criterion
from the stylesheet (a `prefers-reduced-motion` media query or its JS equivalent that actually guards
the movement rule) or from a repeated-trigger capture that shows the animation suppressed across
multiple fires with the preference set - never from one PNG.

## It's working if

- A done-criterion that names a page, flow, or visual state closes only once a check actually
  drove a browser to it - not on a claim in a report.
- A screenshot captured for a visual criterion carries an audit of what it shows alongside it
  (a guideline, contrast, or anti-slop pass), not just the image on its own.
- A browser check that can't run yet (no dev server, no deploy URL, missing credentials) shows up
  as a surfaced `NEEDS_INPUT` or `BLOCKED` state, never as a silently dropped criterion.
- Re-running a check in the same repo reuses the tool already wired for it instead of re-deciding
  or re-sourcing from scratch.
