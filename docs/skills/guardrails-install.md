# /guardrails-install

## What it does

Gives a repo the smallest set of guardrails that keep automated work honest - a pre-commit hook and a
CI check built from the repo's own real lint/typecheck/test commands, plus the blast-radius policy the
autonomous loop reads before it touches a high-consequence path (secrets, migrations, auth, payments,
infra, lockfiles). It never invents a command or a rule: every check it wires and every path it
denylists is detected from what the repo already is, reported at `file:line`, and confirmed with the
operator before anything is written. What it refuses to do is as central as what it does - it never
disables or rewrites a hook, config, or CI workflow the operator already owns; a re-run only fills what
is still missing.

## When to reach for it

| Situation | Route |
|---|---|
| A repo has no pre-commit hook, no lint/typecheck gate, or no CI workflow | here |
| The loop needs to know which paths to escalate on rather than auto-edit (denylist, human-gate classes, scope threshold) | here |
| A repo keeps recording `deploy-*`, `dev-run`, `seed-reset`, `ops-runner`, or `obs-*` as gaps every session re-asks | here |
| The operator keeps answering the same non-safety gate yes, run after run | here (it proposes the standing allowance the record earned) |
| A deploy surface needs to exist, not just be recorded | `/deploy-capability` first, then this skill records what it hands back |
| Production has no error tracker, alert channel, or health probe wired | `/observability-install` |
| Only the *why* behind a denylisted class (supply-chain risk, injection surface) is in question | `/security-pass` |

`/onboard` calls it automatically while bootstrapping the minimum base; it also runs standalone any
time a repo needs guardrails installed or its safety policy recorded after the fact. Operator-run
steps that run long take `/deploy-capability`'s payload fork: value-capture steps collapse into one
generated script traced statically, probeable end states stay block-by-block.

## Where it fits

It sits underneath the whole chain rather than on it: `/onboard` invokes it once at setup, and the
loop, `/review`, `/pr-and-verify`, and `/release-promotion` all recall what it records - verify
commands, the blast-radius policy, deploy and observability state - instead of re-detecting any of it.
A greenfield repo with no stack yet gets only the stack-agnostic secret scan, with everything else
deferred to a re-run once `/groundwork` lands a stack.

## Prerequisites

A repo with `.better-dev/` already scaffolded (the `/onboard` baseline) - the recording half of this
skill writes through `.better-dev/bin/bd-mem`, so a repo that has never been onboarded has nowhere to
record to.

## Common questions

**Why does the install end with three observations instead of just writing the hook and moving on?** A
gate that has never been seen refusing is a config, not a guardrail - a mis-shaped pattern (a grep that
cannot match the staged-diff format it runs against) can pass clean forever without catching anything.
The skill proves each local gate by watching it pass clean, refuse a planted violation shaped for that
exact gate, then pass clean again after the fix - and only records it as installed once all three have
been observed.

**Why didn't it just grant the auto-on-green permission itself after I approved it?** It can't - a
settings-class write (`.claude/settings.local.json`) is classifier-blocked in auto mode even
immediately after direct operator consent, at any turn adjacency. This is a known, unfixed edge: the
stopgap is that the skill always emits a paste-ready snippet (offered to the clipboard where the host
has one) for the operator to run themselves, and its close-out leads with the pending grant rather than
declaring the loop armed until that snippet has actually been run.

**Why does it record `obs-error-tracking: none` instead of just leaving the key blank?** A missing key
reads downstream as "not yet checked" and gets silently re-asked every session; a recorded `none` is a
fact `/observability-install` can act on. For a production repo, `obs-alert-channel: none` means
incidents are currently learned about from users, not the app - so that line leads the close-out
headline, never trails it as a footnote below a victory banner.

## It's working if

- A commit shaped like a credential is refused by the pre-commit hook, and the same commit passes clean
  once the secret is removed.
- The repo's real lint/typecheck/test commands - not a guessed or generic set - are what the pre-commit
  hook and the CI workflow both run.
- A loop edit that would touch a denylisted path - a secrets file, a migrations directory, an infra
  config - stops and asks instead of writing.
- The close-out message leads with any action still waiting on the operator - a permission grant,
  branch protection - rather than trailing it below a completion banner.
- A repo with no production deploy surface carries an explicit `deploy-surface: none`; a repo that ships
  carries real, operator-confirmed deploy and observability values instead of blank or guessed ones.
