# Runtime observation - the portable verify rubric

The acceptance check for a done-criterion is what the change *does* when it runs, observed directly. This
is the discipline `/pr-and-verify` step 3 runs - against the PR's preview deployment where the repo
records one - that `/autonomous-loop` points at for its end-to-end
handoff, that a GUI check narrows onto its own surface, and that `/release-promotion`'s deploy-verify
pass runs against the deployed surface. Where the host ships `/verify`, compose it as
the executor; where it doesn't (Codex, pi, a bare host), this is the rubric to run inline. Same standard
either way. Runtime and UI verification benefit from a context separate from the one that produced the
diff - the maker's context inherits the maker's blind spots.

## Observe the runtime, don't re-run the suite

Re-running the tests or the typechecker proves the suite still runs, not that the change works - spend that
time driving the app instead. A suite the author wrote is their evidence: read it to learn what to check,
then go exercise the real path yourself. If your whole plan is build / typecheck / run-the-test-file,
you've planned a CI rerun, not a verification.

## Find the surface

The change surfaces somewhere a user or caller meets it. Follow it there and observe it on that surface -
an internal function is not a surface, so trace its caller out to one of these rows:

| Change | Surface | Drive it, then look |
|---|---|---|
| CLI / TUI | the terminal | type the command, capture the pane |
| Server / API | the socket | send the request, read the response body |
| GUI | the pixels | drive it under Playwright / computer-use, screenshot and actually look |
| Mobile app | the device or simulator screen | install the build, drive the flow by touch, screenshot and actually look |
| Library | the public export | exercise the package boundary, never `import ./src/...` |
| Migration / data | the store | run it, read the rows and the resulting schema back |
| Prompt / agent config | the agent | run it and capture what it does |

Through the real interface: if a user clicks a button, click the button, don't curl the API underneath it.
Tests in the diff are the author's evidence, not a surface - on a mixed src+tests change, verify the src
and ignore the test files. Operator feedback that contradicts a verified state triggers a
which-surface-are-you-looking-at check before any re-diagnosis: a worktree's server shows this tree, while
the habitual dev server shows stale code until the merge lands.

## Probe past the happy path

Confirming the happy path is the first half, not the job. Try to break your own change at the same surface
with at least one adversarial input: an empty value, the same action fired twice, a conflicting option, a
malformed body, a missing required field, a concurrent edit, an empty state, a re-run over stale state. A
probe that finds nothing is still a recorded step - `--from '' → clean error: --from requires a value,
exit 2` is a result worth writing down. Where the contract carries a scenario table, that table is the
walk-list; drive each branch a user could take, not just the golden one, because an agent-written unit
test overfits the golden path and the skipped branch is exactly where the bug lives.

## Verdict

Settle each criterion at one of four:

- **PASS** - driven on its surface, observed doing the right thing, and it survived at least one probe.
- **FAIL** - it did the wrong thing, threw, or a probe broke it.
- **BLOCKED** - something outside the change stopped the check from running (a missing credential, an
  environment that won't stand up). Name what blocked it.
- **SKIP** - no runtime surface at all (docs-only, a type-only change with no emit). Report `SKIP - no
  runtime surface: <reason>`, and don't run the suite to fill the space.

No partial pass: "3 of 4 scenarios passed" is FAIL until the fourth passes or is explained away. Ambiguous
output is FAIL with the raw capture attached - don't interpret it into a pass. When in doubt, FAIL: a false
PASS ships broken code, a false FAIL costs one more look. The observation is the evidence; a criterion with
no capture behind it is unproven, not passed.

## Every claim points to a tool result

The SKIP rule keeps one claim honest; this holds the whole report to the same line. Before handing back any
status - a verdict, a progress note, a PR brief - audit each claim in it against a tool result from this
session. Report only what you can point at: a command and its exit code, a captured output tail, a runtime
behavior you observed. A claim with no session evidence behind it is marked unverified in the same breath -
not dropped, not dressed up as done. A check that failed is stated with its output; a step that was skipped
is said to be skipped. A plausible summary with nothing behind it is the fabricated status this gate exists
to catch.

## Destructive paths and shared state

If the change deletes, publishes, sends, or writes outside the workspace and there is no dry-run, don't
drive it live - verify what you safely can around it and say plainly which path you left unexercised and
why. Isolate any shared process state so a check can't corrupt the host: a scratch directory, a named
socket, a free port, a disposable fixture. A verification that damages the machine it runs on is not a
verification.

## Scale to the blast radius

Take the narrowest observation that would change your confidence, and widen it with the reach of the
change. A one-line typo needs a glance; a localized change needs its own surface driven; a shared function
a dozen callers reach needs each of those surfaces driven, since the break shows up at the caller, not at
the edit. If a criterion genuinely can't be driven from here, say so and name what has to run - an
unproven criterion is never rounded up to green.
