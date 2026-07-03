# better-dev

Portable dev **practices, packaged as skills** (`SKILL.md`), that run *inside* the coding agent you
already use — Claude Code, Codex, hermes, pi — to make it do software development well.

Not an agent, not a framework, not a provider layer. A **composable, project-scoped, opinionated** layer
that adds a method — **bootstrap → plan & grill (or diagnose) → autonomous loop to proven-done → source
the tool you're missing** — and gets out of the way of everything else you've installed.

> **Status: core built.** 18 skills + a small `bd-*` script spine, reimplemented from ~100 sources (see
> [`NOTICE`](NOTICE)). Proven end-to-end on a real repo; `scripts/bd-package-check` is green. Design spec
> and build plan live in [`PLAN.md`](PLAN.md); locked decisions in [`DECISIONS.md`](DECISIONS.md).

## Get started — one paste

Paste this into your coding agent from inside the repo you want to set up. It installs better-dev once
for your machine, then wires this repo:

```
Set up better-dev in this repo. Read https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md
and follow it exactly: detect my coding agent, install better-dev globally for it if it isn't already,
then run /onboard to wire this repo. Ask me only if something is genuinely ambiguous.
```

<details>
<summary>Locked-down environment (no fetch)? Paste this fully-inline version instead.</summary>

```
Set up better-dev in this repo, following these steps. better-dev is a portable set of dev practices
packaged as skills. It has two layers: the TOOL (skills + bd-* scripts + hooks) installs GLOBALLY once
per machine and every repo shares it; a repo's .better-dev/ holds that repo's DATA only.

1. Detect which coding agent I'm in (Claude Code ~/.claude, Codex ~/.codex, or other) — that decides the
   install command and the global skills directory.
2. Install the tool globally, once per machine. If a better-dev entry already exists in the host's global
   skills directory or a clone exists, run `git pull` in the clone and skip to step 3. Otherwise: on
   Claude Code, install it as a plugin (add this repo as a plugin marketplace, then install better-dev);
   on any host, `git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh`,
   which links the tool into the host's global skills directory. Update later with `git pull` in the clone.
3. Run /onboard in this repo to wire it: create .better-dev/ for DATA only (rules.md, overrides.md,
   learnings.jsonl committed; ledger/ gitignored), create .better-dev/bin as a per-machine symlink to the
   global install's scripts so .better-dev/bin/bd-mem resolves here, and write a discovery block into the
   entry file (CLAUDE.md / AGENTS.md).

Adapt to whatever conventions already exist; ask me only on genuine ambiguity.
```

</details>

## Install

better-dev installs in **two layers**:

- **The tool — global, once per machine.** The skills, `bd-*` scripts, and hooks live in a single clone
  and link into your host's global skills directory (`~/.claude/skills/better-dev`,
  `~/.codex/skills/better-dev`, …), so every repo shares one copy. Claude Code users can install it as a
  plugin ([`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)) instead; the skill contract is
  identical. Update everything with `git pull` in the clone.
- **The repo — data only.** Running **`/onboard`** in a repo creates `.better-dev/` for *that repo's
  data* — `rules.md`, `overrides.md`, `learnings.jsonl` (committed) and a gitignored loop `ledger/` —
  plus `.better-dev/bin`, a per-machine symlink back to the global tool so `.better-dev/bin/bd-mem`
  resolves everywhere. No practices are ever copied into the repo.

The one-paste prompt above runs both layers for you. Skills you later mint with `/self-extension` are
repo-scoped — committed into the repo's own project skills directory (`.claude/skills/<name>` on Claude
Code) and discovered only there; promotion to the global tool is a separate, deliberate step.

## The loop

A work item is a **feature** or a **fix**. Both run the same spine:

1. **`/onboard`** — wire the repo (once); **`/worktree-branching`** — isolate the work in its own git worktree.
2. **`/plan-grill`** (feature) or **`/diagnose`** (fix) — settle an *observable* done-contract before code.
3. **`/autonomous-loop`** — drive to green against that contract: verify → one step → re-verify → log, with
   an independent **`/review`**, a stuck-detector, and restart-from-contract when progress stalls. Done means
   *proven*, not asserted.
4. **`/pr-and-verify`** → **`/release-promotion`** — PR into staging, verify end-to-end, promote to main.
5. Hit a capability gap? **`/tool-sourcing`** finds an existing skill first; **`/self-extension`** writes one
   only as a fallback (staged, tested, then promoted).

Everything routes through a per-project memory + ledger (`bd-mem`) that's shared across worktrees, and any
practice you override in flow persists to `.better-dev/overrides.md` and wins over the default — the shared
skills are never rewritten to encode your preference.

## Layout

| Path | What |
|------|------|
| `skills/` | the 18 practices (agentskills.io: `name` + `description`, progressive disclosure) |
| `scripts/` | the `bd-*` spine — memory + ledger (`bd-mem`), managed blocks (`bd-block`), dispatch, worktree guard, review package, skill staging, package check |
| `hooks/` | optional SessionStart / SubagentStart awareness injection |
| `install.sh` · `.claude-plugin/` | vendored install · Claude Code plugin manifest |
| [`PLAN.md`](PLAN.md) · [`DECISIONS.md`](DECISIONS.md) · [`NOTICE`](NOTICE) | spec + plan · locked decisions · attribution |

MIT licensed.
