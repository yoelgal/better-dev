---
name: guardrails-install
description: Use when a repo needs its guardrails installed or recorded - a missing commit-time or CI gate (no pre-commit hook, no lint/typecheck gate, no CI workflow), the autonomous loop's blast-radius policy (the high-consequence paths it should escalate rather than auto-edit, the change classes that gate a human, the scope threshold), the enforcement wiring that mechanically checks that policy (bd-guard hooks, recorded as safety-enforcement), or the recorded rules downstream skills recall - deploy-* (including deploy-migrate and deploy-env, or deploy-surface: none), dev-run, seed-reset, ops-runner, and obs-* with absence as a named gap. Invoked by /onboard while bootstrapping the minimum base, run directly to fill a guardrail gap or record the safety policy without touching what the repo already has, or when the operator keeps answering the same non-safety gate yes run after run - a re-run then proposes the standing allowance the kept record has earned.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Install a repo's minimum guardrails

Give this repo the smallest set of guardrails that keep its automated work honest - a pre-commit hook and
a CI check that catch a broken commit before it lands, plus the **blast-radius policy** the autonomous loop
reads before it acts - all built from what the repo *already* is, not rules invented for it. One job:
**give this repo its guardrails, and leave everything already there alone.**

`/onboard` calls this while setting up the minimum base; it also runs on its own when a repo needs
guardrails wired after the fact.

## Agent contract

**Detect → report at `file:line` → confirm → add.** Two rules carry the skill:

- **Detection is a premise, not a fact.** A `lint` script named in `package.json` prose is a lint gate
  only once you have seen it there - report the observed value and where you read it. A CI badge in the
  README proves nothing until a workflow file backs it.
- **Never guess a command.** The pre-commit hook and the CI check run the repo's *real* lint, typecheck,
  and test commands - the ones you detected. An unmapped check is a gap to report and ask about, not a
  command to invent. Silence beats a wrong guess, the same discipline `/onboard` uses.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`) - if the project has
already recorded a guardrail preference, honor it before applying any default here.

You cannot drive an interactive installer. When one is needed (a package manager add, `husky init`),
emit a paste-ready command block and let the operator run it (`! <cmd>` runs it in-session); do the
file writes yourself after confirming.

## Detect what already guards this repo

A read-only sweep. Report each as *observed value + where*, then move on:

```bash
ls .pre-commit-config.yaml .husky/pre-commit .git/hooks/pre-commit lefthook.yml 2>/dev/null   # existing hook?
ls -d .github/workflows .gitlab-ci.yml .circleci 2>/dev/null                                   # existing CI?
```

Then read the repo's own definition of its checks - never assume them:

- **The real check commands.** `package.json` `scripts` (`lint`, `typecheck`, `test`), a `Makefile`'s
  targets, `pyproject.toml` tool config, `go.mod` / `Cargo.toml` conventions. `stacks.md` in this skill's
  folder lists the per-stack signals and the hook recipe for each - read it when you reach a stack you
  want the exact commands for.
- **What a hook would already fire.** If `.husky/pre-commit`, `.pre-commit-config.yaml`, or a native
  `.git/hooks/pre-commit` exists, read it and note which checks it runs. That set is off-limits - you add
  only what is missing from it.

An unmapped check (no lint script, no typecheck anywhere) is a **gap**: name it, and either offer to add
the tooling or leave it out of the hook. Do not wire a hook to a command the repo does not have.

## Detect the repo's high-consequence surface

The guardrails above catch a broken commit. The autonomous loop needs a second map: **where this repo keeps
what is costly to get wrong**, so it escalates instead of auto-editing there, and stops for a human on the
change classes that warrant one. The canonical defaults below are the starting point; the same
premise-not-fact discipline applies - locate each at `file:`level from the repo's real layout, and record a
class as absent rather than guessing a home for it.

**High-consequence path denylist** - a loop edit that would touch one of these settles `NEEDS_INPUT` with
the evidence instead of writing:

- **Secrets & credentials** - `.env*`, `**/secrets/**`, key/credential files (`*.pem`, `*.key`, `id_rsa*`,
  service-account JSON). A pattern gate - it holds for a file not yet committed.
- **DB migrations** - the repo's real migrations dir (`**/migrations/**`, or a framework form like
  `prisma/migrations/`, `alembic/versions/`, `db/migrate/`, `supabase/migrations/`).
- **Auth / authz code** - where sign-in, sessions, permissions, and access policy actually live.
- **Payments / billing / PII** - payment, billing, checkout, subscription, or personal-data handling.
- **Infrastructure & prod config** - `*.tf` / `*.tfvars`, `k8s/**/production/**`, and deploy config
  (Dockerfile, compose, deploy workflows, `vercel.json`, and the like).
- **Dependency manifests + lockfiles** - `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`,
  `go.sum`, `poetry.lock`, and their manifests - from the ones the repo actually has.

**Human-gate change classes** - a change landing in one of these is a `NEEDS_INPUT` for a human even on a
green, clean check: security/auth, payments/PII/money, infra/Terraform/prod config, and dependency/version
bumps. Record which have a real surface here; a class the repo has no code for needs no gate. A new or bumped
dependency is also a typosquat/postinstall check, not just a version diff - `/security-pass`'s supply-chain
row is what a human weighs there.

**Scope-creep gate** - a diff touching more than ~10 files stops for a human rather than auto-proceeding.
Ten is the default; record the repo's own number where its norms differ.

These **extend** the loop's existing protect-set - the tests and contract artifacts it may never edit, which
keep it from moving its own goalposts - rather than replacing it. A denylist path or a gated class means
escalate, not edit-or-merge past it. None of it is a permanent block; each is an ask a human answers.

A read-only sweep to locate them - report the observed path and move on, then read the hits to confirm a
match is real (a `payments.md` doc is not the payments surface; an `auth-header.test.ts` is not the auth code):

```bash
git ls-files | grep -iE '(^|/)(migrations|migrate|alembic/versions)/'                  # DB migrations
git ls-files | grep -iE '(^|/)(auth|authz|session|login|rbac|permission|guard)'        # auth / authz
git ls-files | grep -iE '(^|/)(payment|billing|checkout|subscription|invoice|refund)'  # payments / billing
git ls-files | grep -iE '\.tf$|\.tfvars$|k8s/.*/production/|(^|/)(deploy|helm)/'        # infra / prod config
git ls-files | grep -iE '(^|/)secrets/|(^|/)\.env|\.pem$|\.key$|credential'            # secrets / credentials
ls package-lock.json yarn.lock pnpm-lock.yaml Cargo.lock go.sum poetry.lock 2>/dev/null # dependency lockfiles
```

## Install the minimum where it is absent

Add only the gaps. Never overwrite or disable an existing hook, config, or workflow - an installed check
stays exactly as the operator wrote it.

- **Pre-commit hook** (absent) - a hook that runs the repo's detected checks: format the staged files,
  then the real `lint` / `typecheck`. Omit any check the repo does not have (report it as a gap rather
  than inventing one). Adapt the mechanism to the stack - Husky + lint-staged for a Node repo, the
  `pre-commit` framework for Python, a plain `.git/hooks/pre-commit` elsewhere. `stacks.md` holds the
  concrete recipe per stack; keep the hook to detected commands.
- **CI check** (absent) - one workflow that runs the same real commands on push / PR, so the gate holds
  even for a commit made with the hook bypassed. Match the host: a `.github/workflows/` file for GitHub,
  the equivalent where the remote lives. Keep it to the checks you detected.
- **Secret-content scan** (a gate in its own right, distinct from the denylist above) - the denylist stops a
  *loop edit* from touching `.env`; nothing there stops any commit from *introducing* a live key pasted into
  a normal source file. Every pre-commit hook - Node, Python, or the native fallback - gets one stack-agnostic
  line that needs no tooling: a scan of the staged diff that refuses a commit shaped like a credential.
  Prefer a real scanner the repo already carries (`gitleaks`, `trufflehog`, `detect-secrets`); otherwise a
  pattern grep over the staged diff for high-signal shapes, blocking with a one-line message naming the file.
  This is the one check even the "anything else" native hook always gets. `stacks.md` holds the grep recipe.
- **Supply-chain gate** (CI) - commit the lockfile, and have CI install with the frozen-lockfile form
  (`npm ci`, `pnpm i --frozen-lockfile`, `poetry install --sync`, `cargo build --locked`) so a run cannot
  silently resolve a different tree, then run the ecosystem audit as its own gate (`npm audit --omit=dev`,
  `pip-audit`, `cargo audit`). A red audit becomes a chore work-item through `/plan-grill`'s
  contract-lite path; a deferred advisory is documented with a reason and a review date, not
  silently ignored. Detected-command discipline still applies - report a gap rather than inventing a command.

Full commit-time coverage costs the least when the hook stays fast: format only the staged files, run
lint / typecheck / a quick test. Leave a slow full test suite to CI unless the operator asks otherwise.

## Confirm, then record

Show the operator what you propose to write - the hook body, the CI file - before writing it. One
decision at a time, not a wall of questions. Their answer becomes the default here; if it diverges from a
better-dev default, offer to persist it (`.better-dev/bin/bd-mem persist-override "<line>"`) so later runs
honor it.

After wiring, record each check you mapped as a durable rule so the rest of better-dev knows the repo's
*real* verify commands rather than re-detecting them:

```bash
.better-dev/bin/bd-mem remember "verify lint: <detected lint command>"
.better-dev/bin/bd-mem remember "verify typecheck: <detected typecheck command>"
.better-dev/bin/bd-mem remember "verify test: <detected test command>"
```

The autonomous loop and `/pr-and-verify` recall these to run the same checks the hook and CI enforce -
one detection, reused everywhere, no guessing downstream.

**Record the deploy surface.** Deploy commands travel exactly like the verify commands above - detected
once, premise-verified, recorded, never guessed downstream. Detect the platform from files that exist
(`fly.toml`, `render.yaml`, `vercel.json` / `.vercel/`, `netlify.toml`, `Procfile`, `railway.json` /
`railway.toml`) and a deploy workflow from `.github/workflows/*` whose name or triggers match deploy /
release / production. Verify each value before recording it: fetch the health URL once and read the
status code; run the status command once and read its exit code. A probe that fails is recorded as a
gap with what you observed, not written as a fact - a README claiming "deployed on Vercel" with no
`vercel.json` and no `.vercel/` is a claim that failed premise-verify, not a platform.

```bash
.better-dev/bin/bd-mem remember "deploy-platform: <platform or workflow file, observed at file:line>"
.better-dev/bin/bd-mem remember "deploy-url: <production URL, operator-confirmed>"
.better-dev/bin/bd-mem remember "deploy-status: <status command, or 'http'>"
.better-dev/bin/bd-mem remember "deploy-health: <health URL or command>"
.better-dev/bin/bd-mem remember "deploy-preview: <how a PR's preview URL resolves - deployments API | bot comment | command>"
.better-dev/bin/bd-mem remember "deploy-migrate: <command | platform-auto | release-step | manual | none>"
.better-dev/bin/bd-mem remember "deploy-env: <where per-environment config lives + how to enumerate its required var names>"
```

Two of these carry their own vocabulary. `deploy-migrate` records how schema migrations reach
production - the migrations dir is already on the denylist sweep above; this key is the *run
mechanism*, read from where it actually lives: `platform-auto` when the platform runs them on every
deploy (a `release_command` in `fly.toml`, a Procfile `release:` phase), `release-step` when a deploy
workflow step runs the migrate command, `command: <cmd>` when the repo maps a command
(`npx prisma migrate deploy`) that nothing runs automatically, `manual` when the operator applies
schema changes by hand with no repo command - recorded on their word, never inferred - and `none`
when the repo carries migrations but has no path to the production schema (an external team owns
and applies them). A repo with no migrations surface records nothing for this key - there is
nothing to run. A repo with a migrations dir and no observable run mechanism is a
gap to ask about, not a value to guess; `/release-promotion` reads the recorded value so new code
never ships against an un-migrated database. `deploy-env` records where per-environment config lives
(the platform's env store, a secrets manager, an `.env.<environment>` scheme) and how to enumerate the
variable *names* an environment needs (the platform's own env listing, an `.env.example`, a config
schema) - names only, never values. Downstream verify passes recall it to confirm a newly required var
exists in each environment before a merge or promote, instead of meeting the miss as a red preview
build triaged as generic infra.

The preview rule earns the same premise-verify as the rest: record it only against an observed
platform config *and* an actual preview deployment seen (a deployment listed for a recent PR's head
sha, a preview URL that answered) - a platform that could deploy previews but demonstrably doesn't
records the explicit negative `deploy-preview: none`. The negative matters because a recorded no is
a decision `/pr-and-verify` settles on at its runtime-observation step, where a missing rule is a
gap every later session pays to re-detect.

Nothing observed splits two ways, and they record differently. A repo whose deploy surface is
*intentionally absent* - a library, a CLI, code consumed as code - records `deploy-surface: none`: a
recorded no is a fact `/release-promotion` reads and settles on, where a missing key is a question it
has to re-ask. A product that deploys - it serves users, and greenfield just means it hasn't shipped
yet - has a surface that needs *creating*, not recording: route to `/deploy-capability` to stand one
up, then record the observed values it hands back. Writing `none` for that repo wires a circle -
`/release-promotion` settles `NEEDS_INPUT` naming this skill as the recorder, this skill re-observes a
repo with nothing to observe, and no one creates anything. Which of the two a repo is comes from the
operator or the contract, never from a guess.

## Record the runnable-app entry points

The verify commands prove the code; downstream skills also have to *drive* it. Three more keys travel
the same way - detected from the sources the check sweep already reads (`package.json` scripts, a
Makefile's targets, a Procfile, a compose file, a framework's seed convention; `stacks.md` holds the
per-stack forms), reported as observed value + where, recorded on a yes:

```bash
.better-dev/bin/bd-mem remember "dev-run: <the command that stands the app up locally>"
.better-dev/bin/bd-mem remember "seed-reset: <seed command + reset command, or 'none'>"
.better-dev/bin/bd-mem remember "ops-runner: <where operational prod jobs run - job runner | platform console command | triggered workflow | none>"
```

- `dev-run` - what a fresh worktree runs to stand the app up. The verify rubric (`/pr-and-verify`'s
  `verify-runtime.md`, which the loop's runtime observation composes) and `/worktree-branching`'s
  fresh-worktree baseline recall it instead of re-discovering it in every worktree.
- `seed-reset` - how plausible data gets in and how local state resets. The explicit negative matters
  most here: `seed-reset: none` turns a missing seed path into a plannable work item for `/plan-grill`,
  where an unrecorded gap resurfaces as a fresh `NEEDS_INPUT` every time a verify pass needs data.
- `ops-runner` - where a decoupled operational job (a backfill, a batched data fix) actually runs
  against production: a job runner, the platform's one-off console command, a manually triggered
  workflow. The recorded value is the execute route such a job's stop can name; `ops-runner: none` is
  the recorded fact that "run it yourself" currently has no route.

The never-guess rule holds: a command a README names that no script or config backs is a claim, not an
entry point - report it as a gap and ask.

## Record the observability surface

For a repo with a deploy surface, a verified deploy the operator cannot see fail is a gap the same
size as a missing CI gate. Three keys record whether production is visible and whether an incident
reaches a human before a churned user's email does - same premise-verify as the deploy keys: an SDK
init observed at `file:line`, a config that names a channel, a probe seen answering.
(`deploy-surface: none` makes all three moot - skip them.)

```bash
.better-dev/bin/bd-mem remember "obs-error-tracking: <where prod errors aggregate, observed at file:line>"
.better-dev/bin/bd-mem remember "obs-alert-channel: <what pages a human on a prod incident>"
.better-dev/bin/bd-mem remember "obs-health: <the standing probe that watches prod between releases>"
```

- `obs-error-tracking` - the error tracker the app initializes: its SDK setup in code, its DSN named
  in config (the name, never the secret value).
- `obs-alert-channel` - the route from a failure to a person: the tracker's alert rule, an uptime
  service's notification, a paging hook. Most of these live outside the repo, so the value is
  operator-confirmed, the same standing `deploy-url` has.
- `obs-health` - whether anything watches the health URL *unattended* between releases: a monitor
  service, a scheduled workflow, the host's own cadence primitive armed with the release watch's
  probe line. `deploy-health` above records the URL; this records that something reads it when nobody
  is looking.

Absence records exactly the way `deploy-surface: none` does - an explicit negative per key
(`obs-error-tracking: none`, `obs-alert-channel: none`, `obs-health: none`), a fact downstream skills
settle on instead of re-asking. Each recorded `none` is a named gap `/observability-install` exists to
fill; a production repo carrying `obs-alert-channel: none` learns of its incidents from users, so that
line belongs in the close-out headline with the other operator-action items, never below a victory
banner.

## Record the blast-radius policy

The surface detected above earns the same confirm-first flow: show the operator the resolved policy - the
denylist paths, the gated classes, the scope number - one decision at a time, and write on a yes. Recording
it turns that surface into something the loop, `/review`, and the PR brief recall and grade against, so the
one detection is reused everywhere and nothing downstream re-guesses it.

Promote it as durable rules through the memory contract, keyed so a single `recall "safety"` returns the
whole policy - the same shape this skill already uses for the verify commands. One write per key, and
this skill's prose above is the authoritative home for what each key means:

```bash
.better-dev/bin/bd-mem remember "safety-denylist: <detected globs>"    # the paths a loop edit escalates on, not edits
.better-dev/bin/bd-mem remember "safety-gate: <classes with a real surface here>"
.better-dev/bin/bd-mem remember "safety-scope: <n>"                    # files touched that trip the scope gate; ~10 default
.better-dev/bin/bd-mem remember "merge-policy: <auto-on-green | human>" # standing allowance: who MAY merge a gates-passed green PR
```

The merge policy is recorded the same way the branch structure is - detected, proposed, written on a yes.
The proposed default is `auto-on-green`: the agent MAY merge a PR whose change came through the
loop's review and gates - an allowance the operator grants here once, not a merge that happens by
itself; each work-item still answers its own seal question before any merge fires. Record
`human` where the base's branch protection requires a reviewing approval, or where the operator wants one -
stakes, not habit, earn that gate. `/pr-and-verify` recalls this at entry: the recording is the
standing *allowance*, never the act - each work-item's contract carries its own `merge: auto | hold`
line (the seal question `/plan-grill`'s done-contract defines); the recording alone never merges
anything. `/pr-and-verify`'s DONE state owns the full merge condition; an unset policy holds the
merge for the operator.

Where `auto-on-green` is recorded and the host has a permission config, wire the allowance so the
merge command actually runs without a prompt at the moment it is earned: on the Claude family that is
the merge command in the project's `.claude/settings.local.json` allow list (a gitignored personal
grant). The agent never writes that file itself - observed 2026-07-16: the write class is
classifier-blocked in auto mode even with adjacent operator consent. The grant is its own question
at a **turn boundary**: finish everything else, then ask it, and emit a paste-ready snippet (offered
to the clipboard where the host has one) carrying the exact line to add. The operator runs it and
confirms; the agent proceeds only on that confirmation. A host with no permission config needs no
wiring - the recorded rule is the whole allowance, and the host's own approval flow stays whatever
it is.

Two more durable safety rules travel with the policy - the *why* behind the denylist lives in
`/security-pass`, not here; these are the standing rules a green check does not by itself satisfy:

```bash
.better-dev/bin/bd-mem remember "safety-secret-leak: a committed secret is compromised - revoke and reissue the key first, then purge history; deleting the line is not enough."
.better-dev/bin/bd-mem remember "safety-gate-integrity: a red check is fixed, never silenced - do not disable a lint rule, skip or weaken a test, or lower a threshold to reach green."
```

A recorded default, never a hardcode and never a permanent hard-fail - each entry is an escalation a human
answers, not a wall. A project waives, narrows, or widens any of it through `/overrides`: a line in the
read-first `.better-dev/overrides.md` (e.g. "safety scope-gate is 20 files", "don't gate dependency bumps
here") wins over the recalled baseline. The loop and `/review` read that overrides layer first, then the
baseline - so the resolved policy is honored every run and stays this project's to adjust.

One standing rule beyond the blast-radius policy travels the same way. The repo's always-loaded context -
CLAUDE.md and the managed blocks - is read on every turn, so it is a per-turn tax; carry it lean or it
compounds. Record the discipline through the same memory contract:

```bash
.better-dev/bin/bd-mem remember "context-hygiene: the repo's standing context (CLAUDE.md + always-loaded blocks) is a per-turn tax - keep it lean, prune stale lines on each release, and rewrite instructions written for an older model rather than carrying them forward."
```

## Earned autonomy - propose the standing line the record already supports

On a re-run against a working repo - or when the operator keeps answering the same non-safety gate
yes, run after run - read `earned-autonomy.md` and propose, once, the standing allowance the kept
approval record supports (a 5+ unmodified-yes streak, counted from the record, never estimated).

Safety gates sit outside this move entirely. The denylist paths, the human-gate classes (auth,
payments/PII, infra, dependency bumps), and the scope threshold get no proactive proposal however
long their yes streak runs - a hundred approvals on a payments path is a hundred deliberate looks,
the gate working, not friction to optimize away. Loosening one of those starts with the operator
through `/overrides`, never with this skill suggesting it.

## Make CI a gate, not a suggestion (advice, host-specific)

CI only guards the integration branch if that branch *requires* it - without branch protection, a green
workflow is a suggestion. better-dev cannot set protection on a real remote for you (that stays the
operator's call), so surface the exact move and let them run it: on GitHub, a `gh api` call or a pointer
to Settings -> Branches to require the checks workflow and a PR review before a merge to
`staging`/`main`. Emit it; do not assume it - though an operator who then asks you to apply it, or tries
it themselves and hands you the error, has made the call, and running it for them is the right response.

Two mechanics keep a handed-over command from failing in their terminal: shape the protection call as
JSON on stdin (`gh api -X PUT .../branches/<branch>/protection --input -` with a heredoc), never as
`-f`/`-F` field flags - this endpoint takes typed booleans and nulls, and `-f` sends every value as a
string, which the API rejects with a 422. And where the host allows it, put the command on the
operator's clipboard (`pbcopy` / `xclip`) and say so, rather than relying on a clean copy-paste of a
multi-line block.

## Optional integrity gates (offered, not imposed)

Three cheap ratchets for a repo that wants more than pass/fail - each is bash-light, opt-in, and never wired
by default. Offer them; do not install them uninvited.

- **Anti-fabrication grep** - a pre-commit or CI grep over the *product* diff (test files exempt) that fails
  when a metric is faked or work is marked done without running: a `confidence`/`score`/`accuracy` assigned
  from `Math.random`, a `sleep`/`setTimeout` standing in for real work, or a leftover `mock*`/`fake*`/`stub*`
  / `TODO: implement` / `not implemented`. It is the mechanical complement to the loop's honesty invariant -
  the loop won't do it, this catches it if it slips.
- **Witness-marker guard** - a `fixes.jsonl` of `{id, file, marker}` where `marker` is a substring a specific
  fix created, plus one grep-loop in CI that fails if a marker has vanished from the tree. A cheap regression
  ratchet that catches a silently reverted fix a deleted test would miss. No crypto, no signing.
- **Monotone-baseline ratchet** - for retrofitting existing lint/type-error debt without a big-bang cleanup:
  store the current violation *count* in a baseline file, fail CI if the count rises above it, and re-lock a
  lower floor after a fix. The count can only go down.

## Optional format-on-write hook (offered, host-specific)

The pre-commit hook formats staged files at commit time. A repo that wants a written file formatted the
moment it lands - never carried dirty through the working tree - can add a post-write hook alongside it:
after the agent writes a file, run the repo's own formatter on that one file. It is host-specific (Claude
Code expresses it as a `PostToolUse` Edit|Write hook) and offered as an upgrade, never wired by default.
Detect the formatter the same way the pre-commit gate does - the `format` script or the stack's formatter
the repo already carries - and gate the hook on that detection: no formatter found, no hook, the same
never-guess-a-command discipline the rest of the skill holds. A repo without one is never handed a
formatter it does not have.

## Enforcement - wire the hook where the host has one

The policy above is what the loop escalates on; enforcement is what checks it even when a model under
pressure would not. The mechanism is one spine script, `bd-guard`: `check-bash` asks on a destructive
command (recursive rm outside the build-artifact allowlist, SQL `DROP`/`TRUNCATE`, git force-push /
`reset --hard` / working-tree discards, `kubectl delete`, docker prune) and denies an obfuscated shell
construct outright - an assembled or hidden command is the injection vector, never a judgment call;
`check-edit` denies a write outside the active scope boundary and asks on a `safety-denylist` glob. Both
fire only in repos carrying `.better-dev/`, fail open on parse failure, and stay silent otherwise.

Detect, in order, which delivery this repo already has:

- **The better-dev plugin's hooks are registered** (the plugin `hooks.json` carries the two `PreToolUse`
  entries) - nothing to do; enforcement is already always-on. A plugin install never writes host
  settings.
- **A clone install on a host with a pre-execution hook** - the agent never edits
  `.claude/settings.json` itself; it emits the wiring as a paste-ready operator-run step carrying
  `stacks.md`'s exact JSON (Claude Code: `hooks.PreToolUse`, merging into any existing array, never
  replacing it - an existing hooks array survives byte-for-byte). The operator runs it per repo, on
  an explicit yes, then the probe verification below confirms it took.
- **A host with no pre-execution hook** - the policy stands as prose and the loop's escalation
  discipline carries it alone. A named coverage limit, not a failure.

Record which, so downstream skills know what kind of gate they have:

```bash
.better-dev/bin/bd-mem remember "safety-enforcement: hook (claude, PreToolUse bash+edit)"   # or
.better-dev/bin/bd-mem remember "safety-enforcement: prose"
```

One vocabulary, one policy layer: `bd-guard` reads `safety-denylist` and the scope state at check time -
it carries no path list of its own, so widening the denylist is one `bd-mem remember`, never a hook
edit. `safety-enforcement` records the mechanism's existence, not a second copy of the policy; exactly
one line under the `safety-` prefix family, and a re-run that finds the wiring already present writes
nothing. The boundary stops accidents, not attacks - a Bash `sed` can still write outside it; the
denylist ask and `/security-pass` cover what a boundary cannot.

Two disciplines the hook cannot see stay with the loop and `/security-pass`, not here: a real-world
irreversible side effect (a remote delete, a prod write, a data drop) is confirmed as that specific
action before it runs - a prior approval does not extend to the next destructive op - and data loss
that already happened is reported immediately, never quietly repaired.

## Close honestly

End with what was installed and, as the headline, what still waits on the operator's own hands (a
permission grant, branch protection) - each with its exact move. "Armed", "ready", or "fully wired"
is claimable only when that list is empty; a pending operator action leads the recap, never trails a
victory banner.

## Composability

Everything here is additive and idempotent. It never disables an installed hook, never rewrites an
existing CI workflow, and re-running only fills what is still missing. When a repo already guards a check,
that check is done - leave it. When authoring or revising this skill, follow `/writing-skills`.
