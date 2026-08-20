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

better-dev is text, plus one session hook. Your agent already provides discovery, dispatch, structural
search, memory and command approval, so the library states the method and your agent carries it out. The
hook runs at session start for one job: hand the session whatever your agent's own plugin channel leaves
out.

## Install

**Fastest path, and the one that works on an agent nobody has tested:** paste the prompt at the top of
[`BOOTSTRAP.md`](BOOTSTRAP.md) into your agent. It reads the install story, works out which agent it is,
installs better-dev through that agent's channel, and runs `/onboard` in this repo. Your agent places the
files, so an agent missing from the table below still ends up wired.

better-dev is one plugin carrying three things: the **skills**, the always-applied **comms rule** that
shapes every reply, and the **session hook**. Which channel you install through decides how the comms
rule reaches your session.

| Host | Skills arrive by | Comms rule arrives by | Stays current by |
|---|---|---|---|
| omp (marketplace) | `omp plugin install <name@marketplace>` | the session hook | `marketplace.autoUpdate: auto`, or `omp plugin upgrade` by hand |
| omp (git/link) | `omp plugin install <git-url>` | native rules provider (`alwaysApply`) | `git pull` in the linked clone, or re-running the install |
| Claude Code | marketplace add + install | the session hook | its own plugin update verb, run by hand |
| hermes | `hermes plugins install <git-url>` | the session hook | re-running that command |
| Cursor / Windsurf | `npx skills add yoelgal/better-dev --all -g` | native rules dir | `npx skills update` |
| Codex / other | `npx skills add yoelgal/better-dev --all -g` | `/onboard` writes a pointer | `npx skills update`, then `/onboard` again |
| any host at all | the paste prompt in BOOTSTRAP.md | whichever of the above fits | whichever of the above fits |

**The two `npx skills add` rows are a partial install.** That CLI copies the skills into your global
skills directory and leaves no plugin tree, so the session hook never loads, taking its status-line
upgrade line and its `/onboard` reminder with it. Cursor and Windsurf read the shipped `rules/` directory
themselves, so the comms rule is live there. On Codex and anything else in that row, the comms rule
reaches a session only as the pointer `/onboard` writes into the repo's entry file, so that row is
unfinished until `/onboard` has run.

### Per-agent commands

**omp** - the marketplace channel, where the hook carries the comms rule:

```bash
omp plugin marketplace add yoelgal/better-dev
omp plugin install better-dev@better-dev
```

**omp** - a git or link root instead, where omp's own rules provider injects the comms rule:

```bash
omp plugin install https://github.com/yoelgal/better-dev
```

Or clone it and link the clone, which keeps the update in your hands: a linked install loads from that
clone, so `git pull` there is the update.

```bash
git clone https://github.com/yoelgal/better-dev ~/better-dev
omp plugin link ~/better-dev
```

A link needs the repo's root `package.json` and its `omp` key. Without them omp prints success and loads
no skills and no rules; `omp plugin doctor` is what reports it.

**hermes:**

```bash
hermes plugins install https://github.com/yoelgal/better-dev
```

**Claude Code, and any other agent that reads a plugin marketplace:** point it at `yoelgal/better-dev`
with its own marketplace-add verb, then install `better-dev@better-dev`. This repo is its own
marketplace, carrying `.omp-plugin/marketplace.json` and a byte-identical
`.claude-plugin/marketplace.json`, each listing one plugin sourced from the repo root.

**Cursor, Windsurf, Codex, or an agent with no plugin channel:**

```bash
npx skills add yoelgal/better-dev --all -g
```

Then, in each repo you want wired, ask your agent to run `/onboard`.

### Staying current

omp's marketplace channel is the one that can update itself, once you ask it to:

```bash
omp config set marketplace.autoUpdate auto
```

`auto` upgrades plugins at startup. The shipped default, `notify`, writes update availability to omp's
debug log and puts nothing on your screen, so a version behind is easy to sit on for months.
Recommended anyway, though it means the rules that shape every reply can change between one session and
the next without you reading what changed.

Every other channel updates when you run one command: `git pull` in a linked clone, `hermes plugins
install` again, `npx skills update`, or your agent's own plugin update verb. On an omp marketplace
install, better-dev puts the upgrade command in the status line when the catalog copy your agent already
cached is ahead of the installed version. It reads local state only, so an offline session stays quiet,
and a git or link install says nothing, since git is what updates it.

### Also worth knowing

Nothing of better-dev's lands in your own skills folder on a plugin channel. Plugin skills load through
your agent's plugin provider, so `~/.claude/skills` and `~/.omp/agent/skills` stay yours, and a skill you
wrote under the same name still wins.

Removal goes through the same channel that installed it: `omp plugin uninstall better-dev@better-dev`,
`hermes plugins remove`, your agent's marketplace-uninstall verb, or the `skills` CLI for an
`npx skills add` install. A repo you wired keeps its own `.better-dev/` data and its managed blocks until
you remove them; `/onboard` has an unwiring step for that.

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
- on an agent the session hook cannot reach, a pointer to the installed `rules/comms.md`, between its own
  `<!-- BEGIN better-dev-comms -->` sentinels

Skills you later mint with `/self-extension` are **repo-scoped** by default, committed to that repo's own
`.claude/skills/<name>` and seen only there. A plugin upgrade never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the practices, one dir per skill - the roster above is the count of record |
| `rules/` | the always-applied rules, one file each: injected by your agent where its channel provides rules, and by the session hook where it does not |
| `hooks/pre/` | the session hook, loaded from the installed plugin tree, versioned with it, and gone when you uninstall |
| `.omp-plugin/` · `.claude-plugin/` | omp's marketplace catalog · Claude Code's catalog beside the version stamp (`plugin.json`) |
| `package.json` | required: `omp plugin link` refuses a directory without one and skips the plugin entirely unless it declares an `omp` key |
| `scripts/` | the two maintainer helpers, run from a clone of this repo and never from a repo that uses better-dev: `bd-package-check` (the release gate) and `bd-skill-stage` (stage, lint and promote a freshly authored skill) |
| `BOOTSTRAP.md` | the canonical install story, assuming nothing is installed, and the only home of the paste prompt |
| [`docs/`](docs/) · [`NOTICE`](NOTICE) | design plan + decisions · attribution |

> **Status:** built and self-verified (`bd-package-check` green), reimplemented from ~100 sources. Not yet
> battle-tested in live runs across multiple agents. Design notes: [`docs/PLAN.md`](docs/PLAN.md) ·
> [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

<p align="center"><sub>MIT · built by reimplementing patterns from ~100 sources (see <a href="NOTICE">NOTICE</a>); nothing is vendored</sub></p>
