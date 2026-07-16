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

```
Set up better-dev in this repo. It's a portable set of dev practices packaged as skills, in two layers: the
TOOL (skills + bd-* scripts + hooks) installs GLOBALLY once per machine and every repo shares it; a repo's
.better-dev/ holds that repo's DATA only.

1. Detect which coding agent I'm in (Claude Code ~/.claude, Codex ~/.codex, or other) - that decides the
   install command and the global skills directory.
2. Install the tool globally, once per machine. If it's already installed (a better-dev entry in the host's
   global skills dir, or an existing clone), run `git pull` in the clone and skip to step 3. Otherwise: on
   Claude Code install it as a plugin (add this repo as a marketplace, then install better-dev); on any host,
   `git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh`, which links the
   tool into the host's global skills dir. Update later with `git pull` in the clone.
3. Run /onboard in this repo to wire it: create .better-dev/ for DATA only (rules.md, overrides.md,
   learnings.jsonl committed; ledger/ gitignored), create .better-dev/bin as a per-machine symlink to the
   global install's scripts so .better-dev/bin/bd-mem resolves here, and write a discovery block into the
   entry file (CLAUDE.md / AGENTS.md).

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

Durable rules, lessons, and loop state live in a per-project memory + ledger (`bd-mem`) shared across
worktrees. Override any practice in flow and it persists to `.better-dev/overrides.md` and *wins* - the
shared skills are never rewritten to encode your preference.

## The skills

| Group | Skills |
|---|---|
| **Enter & set up** | `onboard` · `groundwork` · `guardrails-install` · `deploy-capability` (creates the deploy surface) · `observability-install` (prod visibility) |
| **Scope a work-item** | `plan-grill` (feature) · `diagnose` (fix) · `codebase-audit` (no item yet) · `design-brief` (UI direction) |
| **Isolate & drive** | `worktree-branching` · `autonomous-loop` · `orchestrating-agents` · `review` · `security-pass` |
| **Ship** | `pr-and-verify` · `release-promotion` |
| **Self-improve** | `tool-sourcing` · `self-extension` · `source-harvest` (raw material -> library improvements) |
| **Sourced capabilities** | `codebase-map` (structural orientation) · `browser-capability` (UI proof, owned daemon in `browse/`) · `ios-capability` (on-device proof, daemon in `ios-qa/`) |
| **Foundations** | `writing-skills` · `packaging` · `bootstrap-hooks` · `overrides` · `uninstall` |

## How it installs

Two layers, so the tool updates once and your data travels with the repo:

- **The tool - global, once per machine.** The skills, `bd-*` scripts, and hooks live in one clone and link
  into your host's global skills dir, one symlink per skill (`~/.claude/skills/<skill>`,
  `~/.codex/skills/<skill>`, …), so every repo shares one copy. Claude Code users can install the plugin
  ([`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)) instead - same skill contract. Update with a
  single `git pull` in the clone - picked up by a session that starts fresh after the pull; re-run
  `./install.sh` when the pull added or removed a skill.
- **The repo - data only.** `/onboard` creates `.better-dev/` for *this repo's data* (`rules.md`,
  `overrides.md`, `learnings.jsonl` committed; loop `ledger/` gitignored) plus `.better-dev/bin`, a
  per-machine symlink to the global tool. No practices are ever copied into the repo.

Skills you later mint with `/self-extension` are **repo-scoped** by default - committed to the repo's own
`.claude/skills/<name>`, seen only there. A tool update never touches them.

## Layout

| Path | What |
|------|------|
| `skills/` | the 26 practices (agentskills.io: `name` + `description`, progressive disclosure) |
| `scripts/` | the `bd-*` spine - `bd-mem` (memory + ledger), `bd-block`, `bd-dispatch`, `bd-guard` (enforced guardrails), `bd-worktree-guard`, `bd-review-package`, `bd-skill-stage`, `bd-link`, `bd-package-check`, `bd-uninstall` |
| `hooks/` · `hosts/` | session awareness + PreToolUse guard hooks · per-host install adapters (declarative, enumerated) |
| `browse/` · `ios-qa/` | vendored daemons (gstack, MIT - see `NOTICE`): headless-browser QA · on-device iOS QA; compiled on first need, never in CI |
| `install.sh` · `BOOTSTRAP.md` · `.claude-plugin/` | installer · one-paste bootstrap · Claude Code plugin manifest |
| [`docs/`](docs/) · [`NOTICE`](NOTICE) | design plan + decisions · attribution |

---

<p align="center"><sub>MIT · built by reimplementing patterns from ~100 sources (see <a href="NOTICE">NOTICE</a>); one exception by design: the optional <code>browse/</code> and <code>ios-qa/</code> daemons vendor gstack's MIT code, attributed in NOTICE</sub></p>
