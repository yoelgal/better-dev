<h1 align="center">better-dev</h1>

<p align="center">
  <strong>Portable dev practices, packaged as skills</strong> - that run <em>inside</em> the agent you already use.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" />
  <img src="https://img.shields.io/badge/hosts-omp%20·%20Claude%20Code%20·%20hermes%20·%20any%20marketplace%20host-0d9488" alt="hosts" />
</p>

---

better-dev is a set of `SKILL.md` practices that make the agent you already use do software development *well*,
whether you're **starting a project from scratch** or working in an existing codebase. It adds one
opinionated method and gets out of the way of everything else you have installed:

> **idea → scope it into an observable contract → isolate it → drive a loop to *proven* done → ship** - and
> when you're missing a tool, go source it.

better-dev is text, plus one session hook. Your agent already provides discovery, dispatch, structural
search, memory and command approval, so the library states the method and your agent carries it out. The
hook runs at session start, on a host that loads it, for one job: hand the session whatever that
host's plugin channel leaves out.

## Install

Paste this into your agent. It installs for the whole machine, so it does not matter where you run it:

```
Install better-dev on this machine if it is not already there. Read
https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md and follow it: work out which
agent you are, install through your own channel, and run the check each stage names. Write nothing
into a repo unless I ask - when the install lands, say what it did and offer to onboard this
directory if it is a repo. If your channel cannot keep better-dev current, tell me that instead of
finishing quietly.
```

**Wiring a repo is a separate step, and it is asked for rather than assumed.** The install puts the
skills and the comms rule on your machine; `/onboard` writes into one repo, so it runs when you say so
and never on whatever directory you happened to be standing in. Once the plugin is there, any repo
needs only `/onboard` - it is one of the skills that arrived.

[`BOOTSTRAP.md`](BOOTSTRAP.md) is written for your agent to execute: it carries the channel for each
host, the check that proves each stage landed, and the words to hand back when a check cannot pass.
Your agent is the part that adapts, so a host nobody has written a channel for still ends up wired, or
hears why it cannot be.

**What the install puts on your machine.** One plugin, once, carrying the 33 skills, the
always-applied comms rule that shapes every reply, and the session hook. Nothing in any repo.

**What `/onboard` adds, per repo, when you ask for it.** That repo's own `.better-dev/` data and a
discovery block in every entry file your agents read - `AGENTS.md` always, `CLAUDE.md` beside it for
Claude Code, because the two hosts read disjoint sets of files.

On a plugin channel your own skills folder stays yours: plugin skills load through your agent's
plugin provider, so `~/.claude/skills` and `~/.omp/agent/skills` keep only what you put there, and a
skill you wrote under the same name still wins.

**The bar a channel has to clear.** These rules shape every reply, so an install that ages in
silence is the failure this library designs against: you experience a months-old copy as the
practices not working. So a channel earns its place by auto-updating or by raising an update alert.
omp's marketplace channel auto-updates once you allow it. Claude Code carries no alert of its own: the
plugin ships no session-start hook there, so your agent writes the check as a shell command and hands it
to you to paste into `~/.claude/settings.json`, and the alert exists from the moment you paste it and
not before. A skills-only install through `npx skills add` can do neither, by that CLI's own command
list, so your agent is told to say so in as many words and name what to add rather than reporting
success. Either way you finish knowing which of these you got, and knowing whatever is still waiting on
you.

Removal runs through the same paste: ask your agent to remove better-dev from this machine, and
`BOOTSTRAP.md` carries the verb for the channel it used. A repo you wired keeps its own
`.better-dev/` data and its managed blocks until you ask for those to go too.

Once a repo is wired, your next message can just be *"here's a bug…"*, *"here's a feature…"*, or *"let's
build an app that…"* - the wired repo carries an utterance-to-skill routing table, so you say what you want
and the chain runs itself.

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
session ending and every worktree reads the same copy. Override any practice in flow and it persists to
`.better-dev/overrides.md` and *wins* - the shared skills are never rewritten to encode your preference.

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

## What a wired repo gains

`/onboard` writes this repo's own data:

- `.better-dev/overrides.md` - your standing corrections, which beat any default
- `.better-dev/rules.md` - what this repo records about itself
- `.better-dev/ledger/` - loop state per work-item, gitignored
- a discovery block in each entry file your agents read (`AGENTS.md`, and `CLAUDE.md` for Claude Code)
- a committed `.omp/config.yml` - which shell commands need your approval, travelling with the repo
- on a host the session hook cannot reach, a pointer to the installed `rules/comms.md`, between its own
  `<!-- BEGIN better-dev-comms -->` sentinels, once that file is on disk to point at

Skills you later mint with `/self-extension` are **repo-scoped** by default, committed to that repo's own
`.claude/skills/<name>` and seen only there. A plugin upgrade never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the practices, one dir per skill - the roster above is the count of record |
| `rules/` | the always-applied rules, one file each: injected by omp's rules provider on a git or link install, by the session hook on an omp marketplace install, and named by `/onboard`'s pointer elsewhere |
| `hooks/pre/` | the session hook in the shape omp reads, loaded from the installed plugin tree, versioned with it, and gone when you uninstall |
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
