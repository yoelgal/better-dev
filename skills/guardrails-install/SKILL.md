---
name: guardrails-install
description: Use when a repo is missing basic commit-time or CI guardrails — no pre-commit hook, no lint/typecheck gate, or no CI workflow — and you want to add the minimum where it is absent. Invoked by /onboard while bootstrapping the minimum base, or run directly to install a pre-commit hook or a basic CI check without touching what the repo already has.
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

Give this repo the smallest set of automated checks that catch a broken commit before it lands —
a pre-commit hook and a CI check — built out of the commands the repo *already* runs, not commands
invented for it. One job: **fill the guardrail gaps, and leave everything already there alone.**

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
