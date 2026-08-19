# /release-promotion

## What it does

Gets the released head onto the release branch, cuts the version the commit range implies, and tags
it - but only once every gate comes back green from git and CI directly. Two facts decide how much
of that is actual work: whether the repo integrates on a separate branch or releases straight off
its trunk, and whether a release tool is wired. It reads both from the repo rather than assuming
them, states the resolved path before its first write, and fails closed throughout - a check whose
answer is unknown counts the same as one that failed, and no gate gets relaxed to let a release
through. The same skill verifies the fresh deploy is live and healthy, rolls a bad release back
forward, and lands a production hotfix on both branches. What it refuses to do: merge feature work,
invent a version, move a published tag, or treat a pushed tag as the finish line while the deploy
behind it is still unproven.

## When to reach for it

| Situation | Route |
|---|---|
| The head that would ship looks ready | This skill - the cut-and-tag path |
| A tag just went up, unclear if the deploy landed | This skill - "did the deploy land" / "is prod healthy" |
| A release is causing problems in production | This skill - the rollback path |
| Production is down and needs a fix now | This skill's hotfix notes - but diagnose the incident with `/diagnose` first |
| A feature or fix still needs building | `/autonomous-loop`, not this skill |
| The PR into the integration branch hasn't merged yet | `/pr-and-verify` |

## Where it fits

Runs once `/pr-and-verify` has merged a work-item - the last hop before users have the code, not a
step in the build loop itself. Where that hop starts depends on the repo's shape, which the skill
resolves from git and the recorded rules before it does anything:

| Repo shape | What the skill does |
|---|---|
| Staged, no release tool | The full gate, the version cut on the integration head, the fast-forward promote onto the release branch, the tag |
| Staged, release tool wired | The same gate and the same promote; the tool bumps and tags once the release branch moves, and the skill verifies that it did |
| Trunk, no release tool | No promote at all - the gate on the trunk head, then the cut and the tag there |
| Trunk, release tool wired | Drives the tool to its release and reads the result back from git rather than cutting a second time by hand |

Every path ends the same way: a tag at the released head, then the deploy-verify pass.

| Recorded `release-cadence` | What happens |
|---|---|
| `per-merge` | `/pr-and-verify` chains straight into this skill in the same turn |
| `on-demand` (the default) | Waits for the operator to ask |

Once a release is unhealthy, the rollback path here hands back to `/diagnose` and
`/autonomous-loop` for the actual fix, then returns here to land it.

## Prerequisites

- The branches the release runs on, confirmed at the git level rather than read out of prose in
  `CLAUDE.md`: a real integration branch and release branch on a staged repo, a real trunk on a
  trunk one. Where a recorded branch model and git disagree, git wins, the run says so, and the
  stale record is left for `/onboard`; the one shape that stops the run is a release branch that
  resolves to nothing, because there is nothing to release onto and none of it may be guessed.
- The rules it reads instead of guessing, all recorded by `/guardrails-install`: where the version
  lives (`version-surface`), whether a tool cuts releases here (`release-automation`), and the
  deploy conventions (the deploy surface, the migration-apply mechanism, any env vars the range
  newly needs). Where one of these was never recorded, the skill stops and names
  `/guardrails-install` - or `/deploy-capability` for a product that has never shipped - rather than
  guessing a file, a command, or a URL.

## Common questions

**This repo has no staging branch - is any of this for me?** Yes, and it gets shorter rather than
being skipped. On a trunk repo the head is already the released head, so the promote, the ancestor
check, and the soak window all drop out: the merge into the trunk was the release. What stays is
everything deciding whether that head is releasable - CI read green directly, a verify receipt
naming this sha, migrations and newly required env vars accounted for - plus the cut, the tag, and
the deploy verify.

**A release tool is wired here - does the skill just get out of the way?** No, it drives the tool
and then reads the result back from git. The tool performs the bump, the ledger line, the commit and
the tag, in whatever order that tool imposes; this skill still runs the gate before it, takes the one
confirmation, and afterwards confirms the tag is on the remote and that the version surface and the
release ledger name the same version. A tool that shipped a release with no ledger line is a stop
naming that tool, unless the flag diffs and the judgement genuinely came back empty and the release
really was pull-only.

**Why didn't my clean, green PR ship on its own?** Two different consent points exist: `merge: auto` on
the work-item's contract lets `/pr-and-verify` merge into integration without asking again, but
promoting to a release is a separate decision gated by `release-cadence`. Unrecorded or
`on-demand` means the release waits for you to ask; only `per-merge` chains straight into it.

**The deploy workflow went green and the tag is up - why does the release still show `NEEDS_INPUT`?**
A pushed tag is not the release; the deploy has to be observed landing and the deployed surface has to
be driven and hold. A failed run, a spent wait budget, or a surface this skill can't reach (VPN-only,
missing credentials) all settle short of `DONE` rather than being rounded up to it.

**I need to roll back a release that already ran a migration - can I just `git revert`?** Not without
checking first. A revert walks back the migration file, never the schema already applied in
production; reverted code would then run against a schema it never saw, and re-verification on the
revert's own code wouldn't catch it. The range gets diffed against the migrations glob before any
revert executes, and a hit stops for you to choose a down migration, a roll-forward fix, or a snapshot
restore.

**Why does a renamed or removed skill directory need a `docs/RELEASES.md` line at all?** For a library
that ships by pull rather than push, that line is the only channel telling an already-wired machine
anything is owed - a re-run of the installer, a re-onboard, a one-time offer. A release that changes
the repo surface and ships with no line leaves every machine that already updated with no way to hear
about it later. The reverse is fine and is the common case: a release that owes a wired machine
nothing is pull-only, and pull-only means no line at all rather than a line with empty flags.

## It's working if

- The run names its resolved path in one line before the first write, so a run that read the repo's
  shape wrong is stopped while nothing has moved yet.
- A release either lands a tag at the released head, with whatever version surface the repo records
  already bumped to match it, or stops naming the exact gate that held it - never a silent skip and
  never a vague "looks fine."
- The version and the release-ledger flags come back derived from the commit range with a clause of
  evidence each, including the flags that were *not* set - and a release that owed nothing is called
  pull-only rather than shipping a line with no flags on it.
- The release receipt under `.better-dev/ledger/release-<version>/` carries a typed `deploy:` verdict and
  settles a terminal ledger state instead of sitting open indefinitely.
- A rollback produces a new forward tag, never a moved or force-pushed one, and where the repo has
  two branches a hotfix's commit shows up as an ancestor of both.
