<h1 align="center">better-dev</h1>

<p align="center">
  <strong>Portable dev practices, packaged as skills</strong> - that run <em>inside</em> the agent you already use.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" />
  <img src="https://img.shields.io/badge/hosts-omp%20·%20Claude%20Code-0d9488" alt="hosts" />
</p>

---

better-dev is a set of `SKILL.md` practices that make the agent you already use do software development *well*,
whether you're **starting a project from scratch** or working in an existing codebase. It adds one
opinionated method and gets out of the way of everything else you have installed:

> **idea → scope it into an observable contract → isolate it → drive a loop to *proven* done → ship** - and
> when you're missing a tool, go source it.

better-dev is text, plus a session hook on the two hosts that can load one. Your agent already provides
discovery, dispatch, structural search, memory and command approval, so the library states the method
and your agent carries it out. The hook's job is the two things a plugin channel otherwise drops: the
always-applied comms rule, and a one-line alert when a newer version is sitting unused.

## Install

Paste this into your agent. It installs for the whole machine, so it does not matter where you run it:

```
Install better-dev on this machine if it is not already there. Read
https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md and follow it: work out which
agent you are, install through your own channel, and run the check each stage names. Write nothing
into a repo. When the install lands, say what it did. If your channel cannot keep better-dev current,
tell me that instead of finishing quietly.
```

**The install writes nothing into a repo.** It puts the skills and the always-applied comms rule on
your machine, and that is the whole of it: no discovery block, no config file, no data directory. Any
repo is then ready, because the skills your agent loaded are the whole of what arrived.

Recommended once per repo, and it writes nothing either: `/onboard` reads the stack, the test and lint
commands, the branch model and integration branch, and the team-or-solo shape, and records them to
your agent's durable memory, so later sessions and every other skill get those facts without
re-deriving them. Skip it and you pay that re-derivation, not a loss of function.

Durable memory is what holds those facts, and your agent may ship it switched off - omp does. So the
install reads that setting, offers to turn it on with the cost named in the same breath, and where you
decline it says what you lose: a correction you make in flow does not survive the session, so you
restate it next time.

[`BOOTSTRAP.md`](BOOTSTRAP.md) is written for your agent to execute: it carries the channel for each
host, the check that proves each stage landed, and the words to hand back when a check cannot pass.
Your agent is the part that adapts, so a host nobody has written a channel for still ends up installed,
or hears why it cannot be.

**What the install puts on your machine.** One plugin, once, carrying the 33 skills. Nothing in any
repo. The always-applied comms rule and the update alert reach a session on **omp** and **Claude Code**
only:

- **omp marketplace:** the TypeScript hook injects the rule every call, and puts the upgrade command
  in the transcript (and the status line) when the cached catalog is ahead.
- **omp git or link:** omp's own rules provider injects the rule. Updates are a `git pull`; nothing
  reminds you.
- **Claude Code:** the plugin's `SessionStart` hook injects the rule and, when GitHub has a newer
  release, prints one operator-visible line with the update command. No paste into `settings.json`.

Every other host gets the 33 skills and not the rule. `BOOTSTRAP.md` says so on the host where it
happens rather than leaving you to notice. A skills-only install through `npx skills add` can neither
inject the rule nor raise an alert, by that CLI's own command list, so your agent is told to say so
in as many words.

Removal runs through the same paste: ask your agent to remove better-dev from this machine, and
`BOOTSTRAP.md` carries the verb for the channel it used. There is nothing to unwire afterwards,
because nothing was written into a repo.

Your next message can just be *"here's a bug…"*, *"here's a feature…"*, or *"let's build an app
that…"* - each skill's own description is what routes it, so you say what you want and the chain runs
itself.

## The method

Start a project **from scratch**, or land a feature or fix in an **existing codebase** - the work runs one spine:

0. **New project, or a large epic?** `/groundwork` takes the idea to a **minimum shared foundation** - schema,
   types, the interfaces between areas, the build/test/deploy pipeline - then carves the rest into **disjoint,
   parallelizable work-items**, so several loops can run at once without colliding. (A single feature or fix in
   an existing repo skips straight to step 1.)
1. **Scope it.** `/plan-grill` (feature) or `/diagnose` (fix) settles an *observable* done-contract - a real
   check that's red now and goes green exactly when the work is done - before any code.
2. **Isolate it.** `/worktree-branching` puts the work in its own git worktree off the integration branch.
3. **Drive it to proven done.** `/autonomous-loop` runs verify → one step → re-verify → log against the
   contract, dispatching fresh workers (`/orchestrating-agents`), grading with a claim-blind `/review`
   that never sees the author's report, triaging flakes/infra from real defects, refusing staged greens
   (no hard-coded values, no weakened checks), escalating high-consequence changes, and restarting from
   the contract if it stalls. **Done means proven.**
4. **Ship it.** A PR opens only after the change already carries a clean review verdict, so the PR stage is
   pure automation. `/pr-and-verify` drives CI plus runtime verification end-to-end;
   `/release-promotion` promotes to main after a checkable soak.
5. **Missing a tool?** `/tool-sourcing` finds an existing skill first; `/self-extension` writes one only as a
   fallback (staged, tested, then promoted).

Loop state for each work-item lives in `.better-dev/ledger/<slug>/` as plain files, so it survives a
session ending and every worktree reads the same copy. The loop creates that directory when it starts
an item, and it is the only thing better-dev ever puts in a repo. Override any practice in flow and it
is recorded in your agent's durable memory, where it beats any built-in default (see `/overrides`) -
the shared skills are never rewritten to encode your preference.

## The skills

| Group | Skills |
|---|---|
| **Enter & set up** | `onboard` · `groundwork` · `guardrails-install` · `deploy-capability` (creates the deploy surface) · `observability-install` (prod visibility) |
| **Scope a work-item** | `plan-grill` (feature) · `diagnose` (fix) · `codebase-audit` (no item yet) · `brief-to-problem` (somebody else's feedback) · `design-brief` (UI direction) · `gauntlet` (one loop prompt for a fresh session) |
| **Isolate & drive** | `worktree-branching` · `autonomous-loop` · `orchestrating-agents` · `review` · `security-pass` · `prototype` (settle a choice by building it) |
| **Ship** | `pr-and-verify` · `release-promotion` |
| **Check the work** | `test-audit` (is the green suite defending anything) · `human-review` (land markup on a rendered artifact) · `deep-research` (a sourced answer, changes nothing) |
| **Self-improve** | `tool-sourcing` · `self-extension` · `session-review` (route what a session learned) · `source-harvest` (raw material -> library improvements) |
| **Sourced capabilities** | `ios-capability` (on-device proof; fetches the QA tool from upstream on demand) · `pick-ui-library` (settle the dependency question before building a component) |
| **Foundations** | `writing-skills` · `packaging` · `overrides` · `vision` · `wait-what` (re-pitch a message that didn't land) |

## What stays out of your repo

Nothing better-dev learns about a repo is written into it. What it records about the project, your
standing corrections and the lessons a session learns all live in your agent's own durable memory,
which already survives a session ending and already loads itself at the start of the next one (see
`/overrides`). The one exception is a work-item's loop state under `.better-dev/ledger/<slug>/`, which
the loop creates when it starts one and which git ignores.

Skills you later mint with `/self-extension` are **repo-scoped** by default, committed to that repo's own
`.claude/skills/<name>` and seen only there. A plugin upgrade never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the practices, one dir per skill - the roster above is the count of record |
| `rules/` | the always-applied comms rule: injected by omp's rules provider on a git or link install, by `hooks/pre/` on an omp marketplace install, and by `hooks/claude-hooks.json` on Claude Code |
| `hooks/pre/` | the omp session hook, loaded from the installed plugin tree |
| `hooks/claude-hooks.json` | Claude Code's plugin-hook manifest (SessionStart). Not omp's format. |
| `.omp-plugin/` · `.claude-plugin/` | omp's marketplace catalog · Claude Code's catalog beside the version stamp (`plugin.json`) |
| `package.json` | required: `omp plugin link` refuses a directory without one and skips the plugin entirely unless it declares an `omp` key |
| `scripts/` | the two maintainer helpers, run from a clone of this repo and never from a repo that uses better-dev: `bd-package-check` (the release gate) and `bd-skill-stage` (stage, lint and promote a freshly authored skill) |
| `BOOTSTRAP.md` | the install procedure your agent reads and runs: the channel per host, the check that proves each stage, and what to report where a check cannot pass |
| [`docs/`](docs/) · [`NOTICE`](NOTICE) | design plan + decisions · attribution |

> **Status:** built and self-verified (`bd-package-check` green), reimplemented from ~100 sources. Not yet
> battle-tested in live runs across multiple agents. Design notes: [`docs/PLAN.md`](docs/PLAN.md) ·
> [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

<p align="center"><sub>MIT · built by reimplementing patterns from ~100 sources (see <a href="NOTICE">NOTICE</a>); nothing is vendored</sub></p>
