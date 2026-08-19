<h1 align="center">better-dev</h1>

<p align="center">
  <strong>Portable dev practices, packaged as skills</strong> - that run <em>inside</em> the agent you already use.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" />
  <img src="https://img.shields.io/badge/hosts-omp%20·%20hermes%20·%20any%20marketplace%20host-0d9488" alt="hosts" />
</p>

---

better-dev is a set of `SKILL.md` practices that make the agent you already use do software development *well*,
whether you're **starting a project from scratch** or working in an existing codebase. It adds one
opinionated method and gets out of the way of everything else you have installed:

> **idea → scope it into an observable contract → isolate it → drive a loop to *proven* done → ship** - and
> when you're missing a tool, go source it.

better-dev ships text and nothing that runs. Your agent already provides discovery, dispatch, structural
search, memory and command approval, so the library states the method and your agent carries it out.

## Install

better-dev is one plugin carrying both halves of the library: the **skills**, and the always-applied
**rules** that shape output. Your agent's own plugin channel installs, updates and removes it.

**omp** - the channel measured to deliver both halves:

```bash
git clone https://github.com/yoelgal/better-dev ~/better-dev
omp plugin link ~/better-dev
```

Keep the clone. A linked install loads from it, so `git pull` in it is the update.

**hermes:**

```bash
hermes plugins install https://github.com/yoelgal/better-dev
```

**Any other agent that reads a plugin marketplace:** point it at this repo and follow its own plugin docs.
It carries `.omp-plugin/marketplace.json` and a byte-identical `.claude-plugin/marketplace.json`, each
listing one plugin sourced from the repo root.

Then, in each repo you want wired, ask your agent to run `/onboard`.

### Two things worth knowing before you install

**Not every channel carries the rules.** On omp, the *marketplace* verbs install the skills and silently
drop `rules/`, so the output-shaping half never reaches a session while the install looks complete. Link a
clone instead. On hermes, rules delivery is unchecked.

**A link can register and deliver nothing.** `omp plugin link` needs the repo's root `package.json` and
its `omp` key; without them it prints success and loads no skills and no rules. Only `omp plugin doctor`
says otherwise, so reach for it if better-dev's skills do not appear.

Nothing of better-dev's lands in your own skills folder. Plugin skills load through your agent's plugin
provider, so `~/.claude/skills` and `~/.omp/agent/skills` stay yours, and a skill you wrote under the same
name still wins.

Removal goes through the same channel that installed it: `omp plugin uninstall better-dev`,
`hermes plugins remove`, or `/marketplace uninstall` on a catalog install. A repo you wired keeps its own
`.better-dev/` data and its managed blocks until you remove them; `/onboard` has an unwiring step for that.

<details>
<summary>Rather have your agent do it? Paste this.</summary>

```
Set up better-dev in this repo. Read https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md
and follow it exactly: detect my coding agent, install the better-dev plugin for it if it isn't already,
then run /onboard to wire this repo. Ask me only if something is genuinely ambiguous.
```

`BOOTSTRAP.md` is the canonical install story and assumes nothing is installed yet. If your environment
cannot fetch it, open it in this repo and paste its contents instead.

</details>

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
- a discovery block in `CLAUDE.md` / `AGENTS.md` - the routing table your agent reads every session
- a committed `.omp/config.yml` - which shell commands need your approval, travelling with the repo

Skills you later mint with `/self-extension` are **repo-scoped** by default, committed to that repo's own
`.claude/skills/<name>` and seen only there. A plugin upgrade never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the practices, one dir per skill - the roster above is the count of record |
| `rules/` | the always-applied rules, injected into the system prompt by your agent |
| `.omp-plugin/` · `.claude-plugin/` | omp's marketplace catalog · Claude Code's catalog beside the version stamp (`plugin.json`) |
| `package.json` | required: `omp plugin link` refuses a directory without one and skips the plugin entirely unless it declares an `omp` key |
| `scripts/` | the two maintainer helpers, run from a clone of this repo and never from a repo that uses better-dev: `bd-package-check` (the release gate) and `bd-skill-stage` (stage, lint and promote a freshly authored skill) |
| `BOOTSTRAP.md` | the canonical install story, assuming nothing is installed |
| [`docs/`](docs/) · [`NOTICE`](NOTICE) | design plan + decisions · attribution |

> **Status:** built and self-verified (`bd-package-check` green), reimplemented from ~100 sources. Not yet
> battle-tested in live runs across multiple agents. Design notes: [`docs/PLAN.md`](docs/PLAN.md) ·
> [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

<p align="center"><sub>MIT · built by reimplementing patterns from ~100 sources (see <a href="NOTICE">NOTICE</a>); nothing is vendored</sub></p>
