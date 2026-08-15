# /ios-capability

## What it does

Wires a real iOS device or simulator into a work item so a done-criterion that can only be seen
on the running app - a screen renders, a gesture works, a flow completes - closes on what the
device actually showed, not on a green build standing in for it. It refuses to let a unit test,
a simulated pass, or a state write that skips the visible UI count as that evidence.

## When to reach for it

Reach for it when a contract carries a criterion phrased as something a person would check on a
phone: "the onboarding flow completes on an iPhone," "the settings screen shows the account
name," "the gesture works on hardware." A criterion that says hardware is not satisfied by a
simulator run - that distinction gets settled when the criterion is written, not rounded away at
verify time.

Near neighbours:

| Situation | Route |
|---|---|
| Same need, but the surface is a browser | `/browser-capability` |
| No on-device check needed, code-level assertion is enough | stays with the loop, this skill doesn't fire |
| Repo already pins its own device harness (XCUITest suite, device farm, `test:device` script) | honor `.better-dev/overrides.md`, skip straight to wiring the check |
| No Mac host, a device farm requirement, or an Android sibling | `/tool-sourcing` picks up the gap |

## Where it fits

The mobile sibling of `/browser-capability`: same prove-done-against-the-running-surface
practice, invoked mid-loop by `/autonomous-loop` or `/diagnose` when a contract's done-criteria
name an on-device check, and consumed by `/pr-and-verify`'s surface table when grading whether
that criterion actually closed.

## Prerequisites

A device check needs macOS and Xcode to run at all; a hardware criterion additionally needs a
paired USB iPhone. Wiring the vendored daemon (`ios-qa/`) follows `ios-qa/README.md`.

## Common questions

**No device is connected - can a unit test stand in for the criterion?** No. The item lands
`NEEDS_INPUT` naming the missing hardware. A unit test, a skipped surface, or a claim rounded to
done are all graded as the failure mode this skill exists to prevent.

**The daemon's bridge compiles into the app - does that ship?** It must not. The work item isn't
done until a release-configuration build (`swift build -c release`) proves the bridge absent -
`/pr-and-verify` grades a bridge symbol that survives release as FAIL, the same as any other
criterion. This is a known sharp edge: the tooling that makes the on-device loop possible adds a
Debug-only dependency to the app source, and the stopgap is a mandatory release-build check, not
a fix that removes the dependency.

**Someone wants a demonstration - can a state write jump past the login screen?** No. Every step
in a demonstration goes through the visible UI - taps, swipes, typed keys. A state write that
skips a step invalidates the demonstration even if the end state looks identical.

## It's working if

- An on-device criterion closes with a captured screenshot and the observed on-screen state
  recorded in the ledger, never a passing unit test alone.
- With no device connected, the item sits at `NEEDS_INPUT` naming the hardware gap instead of
  reporting done.
- A release-configuration build runs and shows no debug-bridge symbols before a device-backed
  work item is graded done.
