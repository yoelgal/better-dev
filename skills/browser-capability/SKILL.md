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
hand-roll it. Needing a browser for web QA is the same shape as needing an on-device iOS harness for a mobile
app (`/ios-capability` is that instance) or a load generator for a perf check - name the gap, source a tool that fills it, vet it, and wire a small
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

## 2. Wire a browser, in this order

1. **The repo already settled it** - `.better-dev/overrides.md` or an existing e2e harness (Playwright or
   Cypress with a `test:e2e` script) pins the tool. Use that and skip to step 3; never wire a second browser
   beside one the project already runs.
2. **The owned daemon** - `browse/` in the better-dev install (better-dev's vendored cut of gstack's MIT
   browser; provenance in `browse/UPSTREAM`). If its binary or a running daemon exists, use it. If not and
   the machine can take it (bun installable, network available, user not declining), compile it on first
   need: `bun install && bun run build` inside `browse/` yields `browse/dist/browse` (~55MB, self-contained);
   `bun run src/cli.ts` works uncompiled while iterating. A Chromium must exist too - a detected Chrome, or
   `bunx playwright install chromium` (~170MB) once. First call starts the per-workspace daemon (~3s); every
   call after runs in ~100-200ms with cookies, tabs, and logins persisting across the whole check. Record
   the adoption in memory like any sourced tool.

   One hard rule rides with it: **cookie import needs explicit first-use approval.** Before the first
   `cookie-import-browser` in a project, ask the user - it decrypts their real browser's cookies via the
   macOS Keychain, which is a trust decision, not a convenience default. Ask once, record the answer, and
   never run it unprompted.
3. **Source a fallback** - hand the gap line to `/tool-sourcing` when the owned daemon cannot install or run
   here (no bun, no network, non-macOS cookie needs, or the user declines). It runs its course - discover,
   vet, try ephemerally, risk-gate, adopt - and a CDP CLI such as `agent-browser` (Apache-2.0) or the repo's
   own Playwright harness fills the same shape. Don't reimplement sourcing's judgment or safety gate here.

Whichever rung won, record it once ("wired `<tool>` for browser QA"); a later run reads that record and
reuses the same tool instead of re-deciding, and swapping tools is a one-line memory update, not a rewrite
of every check.

## 3. Wire the check the loop will run

Whichever tool is adopted, the browser it drives is its own dedicated window and session - never the user's
working browser or live profile - named per agent session so re-runs and later commands reuse the one live
window instead of spawning more, and parallel sessions don't clobber each other. Auth for a logged-in page
is copied in (a cookie import or a read-only profile snapshot), not borrowed by driving the user's window.

With a tool in hand, turn the step-1 line into a runnable check: launch the app (or point at the deploy URL),
drive the browser to the state under test, and assert the observable - text present, element visible, a
screenshot captured for a human or a visual diff, a URL reached. Keep it to the checks the contract named -
one observable for a leaf criterion, or the branch-walk when the contract carries a scenario table - never a
full regression suite the loop re-runs.

For the concrete command surface of a CDP CLI - snapshot-then-act by ref, screenshotting, reading rendered
text, waiting on state, batching steps, reading the console clean, walking the contract's scenario branches,
the headless / real-profile / cloud modes, and how the owned daemon behaves operationally - read
`browser-checks.md` in this folder.
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
