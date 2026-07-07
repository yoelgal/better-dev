---
name: browser-capability
description: Use when a work item's done-criteria need a real browser - verify a page actually renders, run an end-to-end or visual check against the running UI, screenshot or inspect the live DOM - and no browser tool is wired yet. The worked example of sourcing a tool on a capability gap.
---

# Wiring a browser so "done" is proven against the running UI

Some done-criteria can't be asserted from code. "The dashboard renders," "the sign-in flow reaches the
account page," "the layout doesn't break on mobile" - a passing unit test doesn't show any of these. Proving
them means driving a real browser against the running app and observing what a user would see. When a work
item's contract carries a criterion like that and the agent has no browser to drive, the gap is a missing
*tool*, not a missing line of code.

This skill is one concrete instance of a general practice: on a capability gap, source the tool rather than
hand-roll it. Needing a browser for web QA is the same shape as needing an iOS-simulator harness for a mobile
app or a load generator for a perf check - name the gap, source a tool that fills it, vet it, and wire a small
how-to so the loop can run the check. The practice ships; the specific tool stays swappable.

Read `.better-dev/overrides.md` first. A repo often already settles this - it may pin Playwright, a
`test:e2e` script, or a particular browser skill for the job. Honor that and skip straight to wiring the
check; don't source a second tool alongside one the project already runs.

## 1. Name the browser gap as an observable check

Write the missing capability as the check it has to pass, in the running app's terms: "loads
`/dashboard` on the dev server and the account name is visible," "screenshots the checkout page at 375px
wide," "the form submit lands on `**/success`." That line is both the search query for sourcing and the
done-criterion the work item is graded against later - so it names a URL, an element or text, and what a pass
looks like, not just "test the page."

## 2. Source a browser tool through `/tool-sourcing`

Hand that gap line to `/tool-sourcing` and let it run its course - discover, vet, try ephemerally, risk-gate,
adopt. Don't reimplement any of that here; sourcing owns the judgment and the safety gate.

Two shapes of tool fill this gap well, and the project's stack usually decides between them:

- A **CDP browser CLI** such as `agent-browser` (Apache-2.0) - a self-contained command that opens a page,
  snapshots the accessibility tree, clicks and fills by ref, screenshots, and reads the rendered DOM, with no
  test framework to stand up. Good when there's no existing e2e harness and you want a check the loop can run
  in a few commands. It runs headless by default, can drive real Chrome with a logged-in profile for
  authenticated pages, and can use cloud remote browsers for parallel or sandboxed runs.
- A **Playwright- or Cypress-based skill** - the better fit when the repo already has that framework and a
  `test:e2e` script; the browser check then rides the harness the project already trusts.

Prefer the one that matches what's installed. Once `/tool-sourcing` adopts a tool, it records the choice in
memory; that record is what keeps the tool swappable - a later run reads "sourced `<tool>` for browser QA"
and reuses it instead of re-sourcing, and swapping tools is a one-line memory update, not a rewrite of every
check.

## 3. Wire the check the loop will run

With a tool in hand, turn the step-1 line into a runnable check: launch the app (or point at the deploy URL),
drive the browser to the state under test, and assert the observable - text present, element visible, a
screenshot captured for a human or a visual diff, a URL reached. Keep it to the checks the contract named -
one observable for a leaf criterion, or the branch-walk when the contract carries a scenario table - never a
full regression suite the loop re-runs.

For the concrete command surface of a CDP CLI like `agent-browser` - snapshot-then-act by ref, screenshotting,
reading rendered text, waiting on state, batching steps, reading the console clean, walking the contract's
scenario branches, and the headless / real-profile / cloud modes - read `browser-checks.md` in this folder.
For a framework-based tool, the check is just its own run command (`npx playwright test <file>`), so nothing
extra is needed here.

## 4. Feed it into done-criteria

The point of wiring the check is that the loop can grade against it. Record it as part of the work item's
observable done-criteria so `/autonomous-loop` treats a proven browser pass - not a claim - as what closes the
item, and so `/pr-and-verify` drives the same check against the running UI end-to-end before the PR is
considered verified. Exit 0 on the check is the working signal; runtime observation is the acceptance - the
full runtime rubric (surface, adversarial probe, verdict) lives in `/pr-and-verify` (`verify-runtime.md`),
and this skill owns the browser-specific method.

Done means the page was seen rendering and the flow walked - not asserted from code that never touched a
browser. A visual criterion asks for one thing more: the screenshot is the artifact, not the verdict, so it
is proven by the capture plus a pass over what it shows - a guideline / contrast / anti-slop audit
(`web-design-guidelines` if wired, else sourced via `/tool-sourcing`). A PNG nobody audited is not a pass.

If the browser check can't run yet (no dev server, no deploy URL, missing credentials for an authenticated
page), that's a `NEEDS_INPUT` or `BLOCKED` state to surface, not a criterion to quietly drop. A done-criterion
the loop can't exercise isn't done.
