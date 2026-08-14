---
name: ios-capability
description: Use when a work item's done-criteria need a real iOS device or simulator - verify a screen renders on hardware, drive a flow by touch, capture an on-device screenshot - and no on-device check is wired yet. The mobile sibling of /browser-capability: the same prove-done-against-the-running-surface practice.
---

# Wiring an iOS device so "done" is proven on the running app

Some done-criteria can't be asserted from code. "The onboarding flow completes on an iPhone,"
"the settings screen renders with the account name," "the gesture works on hardware" - a green
build or a passing unit test shows none of these. Proving them means driving the app on a real
device or simulator and observing what a user would see. When a contract carries a criterion
like that, the gap is a missing runtime check, not a missing line of code.

Read `.better-dev/overrides.md` first. A repo may already pin its own device harness (an XCUITest
suite, a device farm, a `test:device` script) - honor that and skip straight to wiring the check.

## 1. Name the gap as an observable check

Write the missing capability as the check it has to pass, naming a screen or flow, one on-screen
observable, and the target - hardware or simulator: "the onboarding flow completes on a
USB-connected iPhone and the welcome screen shows the account name." A criterion that says
"hardware" is not satisfied on a simulator; a criterion that doesn't say is settled at contract
time, not rounded at verify time.

## 2. Wire the tool

For a real device, the tool is `ios-qa/` in the better-dev install (better-dev's vendored cut of
gstack's MIT ios-qa; provenance in `ios-qa/UPSTREAM`) - a Mac-side daemon
that bridges USB to a Debug-only bridge compiled into the app's own build, exposing screenshot,
element-tree, state-snapshot, and touch endpoints. Wire it per `ios-qa/README.md`. Two facts
shape the adoption: it needs macOS, Xcode, and a paired USB iPhone to run at all; and its bridge
compiles into the app source, which creates the release-build obligation in step 4.

For a simulator-only criterion, `xcrun simctl` plus the host's screenshot or computer-use path
is often enough - reach for the daemon only when the contract says hardware.

If the vendored daemon can't fill the gap (non-Mac host, a device farm requirement, an
Android sibling), hand the step-1 gap line to `/tool-sourcing` and let it run its course;
sourcing owns the vetting judgment and the safety gate, and records the adopted tool in memory
so it stays swappable.

## 3. Wiring discipline

Request the lowest capability tier that can prove the criterion: a render or design check runs
at `observe`; a flow walk at `interact`; state writes (`mutate`, `restore`) only when the
contract names the state they set up. A token carrying more power than the criterion needs is
declined down, not accepted.

Acquire the tool's device session lock before acting and release it when the iteration ends -
two work items and one phone is the normal case, not the edge case.

When the run is a demonstration for a human, every step goes through the visible UI - taps,
swipes, typed keys. A state write that skips a step invalidates the demonstration, even though
it would pass the same check.

## 4. Feed it into done-criteria

An on-device criterion closes on a captured screenshot plus the observed on-screen state,
recorded in the ledger - a green build or a passing unit test is not the evidence. No device
connected is `NEEDS_INPUT` naming the hardware requirement, never a silent downgrade to
simulator or a criterion quietly dropped, and never a pass simulated from code that never
touched the device.

If the wired tool put a debug bridge into the app source, the work item is not done until a
release-configuration build proves the bridge absent: the dependency is gated to the Debug
configuration and `swift build -c release` compiles with no bridge symbols. `/pr-and-verify`
grades a bridge that survives release as `FAIL`, the same as any other criterion.

For a fix work-item, the reproducing evidence is a state snapshot plus screenshot captured
before any edit - that pair is the red signal `/diagnose` requires, and restoring the snapshot
after the fix is how the signal goes green.
