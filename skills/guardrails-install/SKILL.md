---
name: guardrails-install
description: Use when a repo needs its guardrails installed or recorded — a missing commit-time or CI gate (no pre-commit hook, no lint/typecheck gate, no CI workflow), or the autonomous loop's blast-radius policy (the high-consequence paths it should escalate rather than auto-edit, the change classes that gate a human, the scope threshold). Invoked by /onboard while bootstrapping the minimum base, or run directly to fill a guardrail gap or record the safety policy without touching what the repo already has.
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

Give this repo the smallest set of guardrails that keep its automated work honest — a pre-commit hook and
a CI check that catch a broken commit before it lands, plus the **blast-radius policy** the autonomous loop
reads before it acts — all built from what the repo *already* is, not rules invented for it. One job:
**give this repo its guardrails, and leave everything already there alone.**

`/onboard` calls this while setting up the minimum base; it also runs on its own when a repo needs
guardrails wired after the fact.

## Agent contract

**Detect → report at `file:line` → confirm → add.** Two rules carry the skill:

- **Detection is a premise, not a fact.** A `lint` script named in `package.json` prose is a lint gate
  only once you have seen it there — report the observed value and where you read it. A CI badge in the
  README proves nothing until a workflow file backs it.
- **Never guess a command.** The pre-commit hook and the CI check run the repo's *real* lint, typecheck,
  and test commands — the ones you detected. An unmapped check is a gap to report and ask about, not a
  command to invent. Silence beats a wrong guess, the same discipline `/onboard` uses.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`) — if the project has
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

Then read the repo's own definition of its checks — never assume them:

- **The real check commands.** `package.json` `scripts` (`lint`, `typecheck`, `test`), a `Makefile`'s
  targets, `pyproject.toml` tool config, `go.mod` / `Cargo.toml` conventions. `stacks.md` in this skill's
  folder lists the per-stack signals and the hook recipe for each — read it when you reach a stack you
  want the exact commands for.
- **What a hook would already fire.** If `.husky/pre-commit`, `.pre-commit-config.yaml`, or a native
  `.git/hooks/pre-commit` exists, read it and note which checks it runs. That set is off-limits — you add
  only what is missing from it.

An unmapped check (no lint script, no typecheck anywhere) is a **gap**: name it, and either offer to add
the tooling or leave it out of the hook. Do not wire a hook to a command the repo does not have.

## Detect the repo's high-consequence surface

The guardrails above catch a broken commit. The autonomous loop needs a second map: **where this repo keeps
what is costly to get wrong**, so it escalates instead of auto-editing there, and stops for a human on the
change classes that warrant one. The canonical defaults below are the starting point; the same
premise-not-fact discipline applies — locate each at `file:`level from the repo's real layout, and record a
class as absent rather than guessing a home for it.

**High-consequence path denylist** — a loop edit that would touch one of these settles `NEEDS_INPUT` with
the evidence instead of writing:

- **Secrets & credentials** — `.env*`, `**/secrets/**`, key/credential files (`*.pem`, `*.key`, `id_rsa*`,
  service-account JSON). A pattern gate — it holds for a file not yet committed.
- **DB migrations** — the repo's real migrations dir (`**/migrations/**`, or a framework form like
  `prisma/migrations/`, `alembic/versions/`, `db/migrate/`, `supabase/migrations/`).
- **Auth / authz code** — where sign-in, sessions, permissions, and access policy actually live.
- **Payments / billing / PII** — payment, billing, checkout, subscription, or personal-data handling.
- **Infrastructure & prod config** — `*.tf` / `*.tfvars`, `k8s/**/production/**`, and deploy config
  (Dockerfile, compose, deploy workflows, `vercel.json`, and the like).
- **Dependency manifests + lockfiles** — `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`,
  `go.sum`, `poetry.lock`, and their manifests — from the ones the repo actually has.

**Human-gate change classes** — a change landing in one of these is a `NEEDS_INPUT` for a human even on a
green, clean check: security/auth, payments/PII/money, infra/Terraform/prod config, and dependency/version
bumps. Record which have a real surface here; a class the repo has no code for needs no gate.

**Scope-creep gate** — a diff touching more than ~10 files stops for a human rather than auto-proceeding.
Ten is the default; record the repo's own number where its norms differ.

These **extend** the loop's existing protect-set — the tests and contract artifacts it may never edit, which
keep it from moving its own goalposts — rather than replacing it. A denylist path or a gated class means
escalate, not edit-or-merge past it. None of it is a permanent block; each is an ask a human answers.

A read-only sweep to locate them — report the observed path and move on, then read the hits to confirm a
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

Add only the gaps. Never overwrite or disable an existing hook, config, or workflow — an installed check
stays exactly as the operator wrote it.

- **Pre-commit hook** (absent) — a hook that runs the repo's detected checks: format the staged files,
  then the real `lint` / `typecheck`. Omit any check the repo does not have (report it as a gap rather
  than inventing one). Adapt the mechanism to the stack — Husky + lint-staged for a Node repo, the
  `pre-commit` framework for Python, a plain `.git/hooks/pre-commit` elsewhere. `stacks.md` holds the
  concrete recipe per stack; keep the hook to detected commands.
- **CI check** (absent) — one workflow that runs the same real commands on push / PR, so the gate holds
  even for a commit made with the hook bypassed. Match the host: a `.github/workflows/` file for GitHub,
  the equivalent where the remote lives. Keep it to the checks you detected.

Full commit-time coverage costs the least when the hook stays fast: format only the staged files, run
lint / typecheck / a quick test. Leave a slow full test suite to CI unless the operator asks otherwise.

## Confirm, then record

Show the operator what you propose to write — the hook body, the CI file — before writing it. One
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

The autonomous loop and `/pr-and-verify` recall these to run the same checks the hook and CI enforce —
one detection, reused everywhere, no guessing downstream.

## Record the blast-radius policy

The surface detected above earns the same confirm-first flow: show the operator the resolved policy — the
denylist paths, the gated classes, the scope number — one decision at a time, and write on a yes. Recording
it turns that surface into something the loop, `/review`, and the PR brief recall and grade against, so the
one detection is reused everywhere and nothing downstream re-guesses it.

Promote it as durable rules through the memory contract, keyed so a single `recall "safety"` returns the
whole policy — the same shape this skill already uses for the verify commands. One write per key, and
this skill's prose above is the authoritative home for what each key means:

```bash
.better-dev/bin/bd-mem remember "safety-denylist: <detected globs>"    # the paths a loop edit escalates on, not edits
.better-dev/bin/bd-mem remember "safety-gate: <classes with a real surface here>"
.better-dev/bin/bd-mem remember "safety-scope: <n>"                    # files touched that trip the scope gate; ~10 default
```

A recorded default, never a hardcode and never a permanent hard-fail — each entry is an escalation a human
answers, not a wall. A project waives, narrows, or widens any of it through `/overrides`: a line in the
read-first `.better-dev/overrides.md` (e.g. "safety scope-gate is 20 files", "don't gate dependency bumps
here") wins over the recalled baseline. The loop and `/review` read that overrides layer first, then the
baseline — so the resolved policy is honored every run and stays this project's to adjust.

## Agent-side git safety (optional, host-specific)

The guardrails above protect the repo. A second, separate guardrail protects it from the *agent*: a host
hook that refuses destructive git commands (`push`, `reset --hard`, `clean -fd`, `branch -D`,
`checkout .`) before they run. This one is host-specific — Claude Code expresses it as a `PreToolUse`
Bash hook — so offer it as an upgrade, wired per host, never imposed. `stacks.md` sketches the Claude Code
form. `/worktree-branching` already keeps feature work on its own worktree, which covers most of the risk;
this hook is belt-and-suspenders for operators who want a hard stop.

## Composability

Everything here is additive and idempotent. It never disables an installed hook, never rewrites an
existing CI workflow, and re-running only fills what is still missing. When a repo already guards a check,
that check is done — leave it. When authoring or revising this skill, follow `/writing-skills`.
