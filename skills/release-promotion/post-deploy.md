# After the tag - the deploy verify and the post-deploy watch

The tag starts the release; users have it only when the deploy lands and the deployed thing runs.
This is the full form of the main body's "After the tag" section: wait out the deploy, drive the
deployed surface at a depth keyed to what the release changed, watch it hold briefly, and write a
typed verdict into the release receipt. The `deploy:` and `health:` fields this pass writes are
receipt markers, never loop states - the release itself settles the usual terminal states, mapped
at the end of this file.

## Everything here comes from recorded rules

Every command and URL in this pass comes from the recorded `deploy-*` rules
(`.better-dev/bin/bd-mem recall "deploy"`), written once by `/guardrails-install` - detected,
premise-verified, never guessed. A value that isn't recorded is a `NEEDS_INPUT` naming
`/guardrails-install` as the recorder, not a guess. The same rule the main body holds for branches
holds here: a deploy target named in prose - a README's "deployed on Vercel", a stale doc's URL -
is not a deploy target until a recorded, premise-verified rule says so.

## Wait for the deploy, bounded

Find the deploy run at the release sha, or run the recorded `deploy-status` command:

```bash
gh run list --commit "$(git rev-parse "origin/$release")" --json status,conclusion,workflowName
```

A push-deploy platform with neither gets one fixed propagation wait (60s) before probing. Wait on
the host's monitor primitive, not a tight poll, with a 20-minute default budget
(`bd-mem recall "deploy-budget"` for a recorded override; the default holds when none is set). Two exits here are not green:

- A run that concludes `failure` goes straight to the rollback section - there is nothing to
  verify yet.
- A spent budget means the deploy state is *unknown*, and unknown never equals green: record
  `deploy: UNVERIFIED` and settle `NEEDS_INPUT` naming what has to run.

## Verify, depth keyed to what the release changed

Where anything shows the release is flag-gated - the contract, the PR body, the diff, or a
recorded `deploy-flag` rule - the flag state is part of the verify: read the flag's actual state
before driving any surface, and drive the surface in the state users get. Record
`flag: <name>=<state>` in the receipt. A release whose contract expected activation but whose flag
reads off is a finding at the same severity as a failed check - the deploy landed, the feature
didn't. A flag nobody recorded is never assumed: grade the surface's observed behavior against what
the flag state predicts, or settle `NEEDS_INPUT` naming the flag.

Classify `git diff "$prev_tag"..origin/$release --name-only` and take the first matching row:

| Release diff | Verify depth |
|---|---|
| docs only | smoke: fetch the recorded health URL, read the status code - the pipeline can break on any release, so the smoke fetch never drops to zero |
| config only | smoke, plus read the deploy run's conclusion |
| backend code | smoke, plus drive one changed API surface and read the response body |
| frontend code | full: drive the changed pages on the real browser surface, read the console, capture a screenshot as evidence |
| mixed | full |

Driving a surface here is `/pr-and-verify`'s `verify-runtime.md` rubric run against production -
same surface table, same probe-past-the-happy-path, same every-claim-points-to-a-tool-result.
Two differences only: the target is the deployed artifact, not the worktree (env, build step, and
CDN all differ, so a green worktree proves nothing about the deploy), and destructive probes stay
off a live system - read paths and idempotent writes only.

## The bounded post-deploy watch

Five checks at 60-second intervals (defaults; `bd-mem recall "deploy-watch"` for a recorded override).
Each check: fetch the probed pages, read the console errors, read the load time.

Grade each check against the **baseline** - the previous release receipt's `health:` line. With a
baseline, one rule keeps the watch honest: **grade the change, not the absolute**. A page that
carried three console errors in the last release and carries the same three now is clean; one
*new* error is a finding; load time over 2x baseline is a concern. With no prior baseline (the
first release under this discipline), grade absolutes: a non-200 or a blank/error screen is
critical, a console error (`Error`, `Uncaught`, `TypeError`, `ReferenceError`, `Failed to load` -
warnings ignored) is high, load over 10 seconds is a concern. Either way, record the observed
numbers in this release's `health:` line - it is the next release's baseline.

In both modes: **one blip is not a finding**. A finding counts only when it persists across two
consecutive checks; a single 500 with clean checks either side is noted in the receipt and
discarded, not rolled back over.

Exits - exactly one:

- Every check clean - `deploy: VERIFIED`.
- A critical or high finding persisting two consecutive checks - the rollback section; the
  receipt records `REVERTED`.
- Checks spent with only concerns - `deploy: DEGRADED`, each concern named in the receipt.

The watch is bounded the same way `/pr-and-verify`'s wait-for gate is: a fixed check budget,
terminal exits, self-terminates. A standing "keep an eye on prod" is the host's `/loop` or
`/schedule` to own - on a `VERIFIED` settle, offer the operator the exact probe line ready to hand
to it, and record `standing-watch: offered | armed | declined` in the receipt; this skill never
becomes a cadence.

## Rollback

A `REVERTED` verdict is executed by the main body's "If a release goes bad" section - revert
forward, re-verify, tag the patch, back-merge. Then this pass runs again on the revert, because a
rollback is itself a deploy.

## Settle

The receipt fields are the record; these are the states the release settles:

- `VERIFIED` - the release settles `DONE`.
- `DEGRADED` - `DONE_WITH_CONCERNS`, findings named.
- `UNVERIFIED` - the deploy state is unknown, or the surface can't be driven from here (VPN-only,
  a missing credential): `NEEDS_INPUT` naming exactly what has to run.
- `REVERTED` - the receipt says so, and the cause goes to `bd-mem learn` so the next planning
  pass sees it.

Neither a spent wait budget nor an unreachable probe is ever a success state.
