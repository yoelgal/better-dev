# better-dev

Portable dev **practices, packaged as skills** (`SKILL.md`), that run *inside* the coding agent you
already use — Claude Code, Codex, hermes, pi — to make it do software development well.

Not an agent, not a framework, not a provider layer. A **composable, project-scoped, opinionated** layer
that adds a method — **bootstrap → plan & grill (or diagnose) → autonomous loop to proven-done → source
the tool you're missing** — and gets out of the way of everything else you've installed.

> **Status: core built.** 17 skills + a small `bd-*` script spine, reimplemented from ~100 sources (see
> [`NOTICE`](NOTICE)). Proven end-to-end on a real repo; `scripts/bd-package-check` is green. Design spec
> and build plan live in [`PLAN.md`](PLAN.md); locked decisions in [`DECISIONS.md`](DECISIONS.md).

## Install

```sh
git clone https://github.com/yoelgal/better-dev && ./better-dev/install.sh /path/to/your/repo
```

This vendors the practices into your repo's `.better-dev/` (helpers in `.better-dev/bin/`, skills in
`.better-dev/skills/`) and links them into `.claude/skills/` when present — additive, it never touches
your own skills. Then, from inside your repo, run **`/onboard`** once: it detects your stack, memory
system, and branching, adapts to what's already there, and writes a discovery block so every session
knows the practices are available. Claude Code users can alternatively install the plugin
(`.claude-plugin/plugin.json`); the skill contract is identical.

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
| `skills/` | the 17 practices (agentskills.io: `name` + `description`, progressive disclosure) |
| `scripts/` | the `bd-*` spine — memory + ledger (`bd-mem`), managed blocks (`bd-block`), dispatch, worktree guard, review package, skill staging, package check |
| `hooks/` | optional SessionStart / SubagentStart awareness injection |
| `install.sh` · `.claude-plugin/` | vendored install · Claude Code plugin manifest |
| [`PLAN.md`](PLAN.md) · [`DECISIONS.md`](DECISIONS.md) · [`NOTICE`](NOTICE) | spec + plan · locked decisions · attribution |

MIT licensed.
