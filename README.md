<h1 align="center">better-dev</h1>

<p align="center">
  <strong>Portable dev practices, packaged as skills</strong> - that run <em>inside</em> the coding agent you already use.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" />
  <img src="https://img.shields.io/badge/agent--agnostic-Claude%20Code%20·%20Codex%20·%20pi%20·%20hermes-0d9488" alt="agent-agnostic" />
</p>

---

better-dev is a set of `SKILL.md` practices that make your existing agent - Claude Code, Codex, hermes, pi -
do software development *well*, whether you're **starting a project from scratch** or working in an existing
codebase. It's **not an agent, framework, or provider layer.** It adds one opinionated method and gets out of
the way of everything else you've installed:

> **idea → scope it into an observable contract → isolate it → drive a loop to *proven* done → ship** - and
> when you're missing a tool, go source it.

The whole library is text plus three files. The practices are skills your host already knows how to
load. A wired repo gains `.better-dev/overrides.md` (your standing corrections, which beat any
default), `.better-dev/rules.md` (what this repo records about itself), and a committed
`.omp/config.yml` (which shell commands need your approval). There is no daemon, no memory service, no
hook, and no wrapper CLI: your harness already ships discovery, dispatch, structural search, memory
and command approval, so better-dev states the method and lets the harness run it.

> **Status:** built and self-verified (`bd-package-check` green), reimplemented from ~100 sources and audited
> against forge/devloop and loop-engineering. Not yet battle-tested in live multi-harness runs. Design notes:
> [`docs/PLAN.md`](docs/PLAN.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Quick start - one paste

From inside the repo you want to set up, paste this into your agent. It installs better-dev once for your
machine, then wires the repo:

```
Set up better-dev in this repo. Read https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md
and follow it exactly: detect my coding agent, install better-dev globally for it if it isn't already, then
run /onboard to wire this repo. Ask me only if something is genuinely ambiguous.
```

<details>
<summary>Locked-down environment (no fetch)? Paste this self-contained version instead.</summary>

<!-- regenerated from BOOTSTRAP.md - change it there first -->

```
Set up better-dev in this repo. It's a portable set of dev practices packaged as skills, in two layers: the
TOOL (the skills) installs GLOBALLY once per machine and every repo shares it; a repo's .better-dev/ holds
that repo's DATA only.

1. Detect which coding agent I'm in (Claude Code ~/.claude, Codex ~/.codex, or other) - that decides the
   global skills directory the tool links into.
2. Install the tool globally, once per machine. If it's already installed (a better-dev skill in the host's
   global skills dir, or an existing clone), run `git pull` in the clone and skip to step 3. Otherwise:
   `git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh`, which links
   every skill into the host's global skills dir. Update later with /update - a `git pull` in the clone
   underneath.
3. Run /onboard in this repo to wire it: create .better-dev/ for DATA only (rules.md and overrides.md
   committed; ledger/ gitignored), write a discovery block into the entry file (CLAUDE.md / AGENTS.md), and
   write a committed .omp/config.yml naming the shell commands that need my approval, plus a comms-style
   block. Everything better-dev sets up lands in this repo; it writes nothing outside it.

Adapt to whatever conventions already exist; ask me only on genuine ambiguity.
```

</details>

Then your next message can just be *"here's a bug…"*, *"here's a feature…"*, or *"let's build an app
that…"* - the wired repo carries an utterance-to-skill routing table, so you say what you want and the
chain runs itself. Uninstall any time with `/uninstall` (or `scripts/bd-uninstall`): dry-run by default,
removes only what better-dev installed, and never touches your `.better-dev/` data unless you ask.

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
   the contract if it stalls. **Done means proven, not asserted.**
4. **Ship it.** A PR opens only after the change already carries a clean review verdict - the PR stage is
   automation, not waiting on reviewers. `/pr-and-verify` drives CI plus runtime verification end-to-end;
   `/release-promotion` promotes to main after a checkable soak.
5. **Missing a tool?** `/tool-sourcing` finds an existing skill first; `/self-extension` writes one only as a
   fallback (staged, tested, then promoted).

Loop state for each work-item lives in `.better-dev/ledger/<slug>/` as plain files, so it survives a
session ending and every worktree reads the same copy. Lessons go to your harness's own memory store.
Override any practice in flow and it persists to `.better-dev/overrides.md` and *wins* - the shared
skills are never rewritten to encode your preference.

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
| **Foundations** | `writing-skills` · `packaging` · `overrides` · `vision` · `wait-what` (re-pitch a message that didn't land) · `update` · `uninstall` |

## How it installs

Two layers, so the tool updates once and your data travels with the repo:

- **The tool - global, once per machine.** The skills live in one clone and link into your host's global
  skills dir, one symlink per skill (`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, …), so every
  repo shares one copy. Update with `/update` - it pulls the clone, has you re-run `./install.sh` only
  when a release added or removed a skill, and tops up a repo's wiring when a release changed it
  ([`docs/RELEASES.md`](docs/RELEASES.md) flags each release).
- **The repo - data only.** `/onboard` creates `.better-dev/` for *this repo's data* (`rules.md` and
  `overrides.md` committed; loop `ledger/` gitignored), writes the discovery block your host reads on
  every session, and commits `.omp/config.yml` so the approval policy travels with the repo. No
  practices are ever copied into the repo.

Skills you later mint with `/self-extension` are **repo-scoped** by default - committed to the repo's own
`.claude/skills/<name>`, seen only there. A tool update never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the practices, one dir per skill - the roster here is the count of record (agentskills.io: `name` + `description`, progressive disclosure) |
| `scripts/` | the three helpers no host ships, all of them maintainer tools run from this clone rather than from a repo that uses better-dev: `bd-package-check` (the release gate), `bd-uninstall`, `bd-skill-stage` (stage, lint and promote a freshly authored skill) |
| `install.sh` · `BOOTSTRAP.md` · `.claude-plugin/` | installer · one-paste bootstrap · version stamp (`plugin.json`) |
| `friction/` | the first-run harness: four throwaway repos, a simulated developer, and a review that files what a new user got stuck on |
| [`docs/`](docs/) · [`NOTICE`](NOTICE) | design plan + decisions · attribution |

---

<p align="center"><sub>MIT · built by reimplementing patterns from ~100 sources (see <a href="NOTICE">NOTICE</a>); nothing is vendored</sub></p>
