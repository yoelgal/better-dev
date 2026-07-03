# better-dev

Portable dev **practices, packaged as skills** (`SKILL.md`), that run *inside* the coding agent you
already use — Claude Code, Codex, hermes, pi — to make it do software development well.

Not an agent, not a framework, not a provider layer. A **composable, project-scoped, opinionated** layer
that adds a method — **bootstrap → plan & grill → autonomous loop → source the tool you're missing** — and
gets out of the way of everything else you've installed.

> **Status: early build.** Being assembled from ~100 MIT-licensed sources (see [`NOTICE`](NOTICE)); the
> design spec and build plan live in private working notes. Locked build decisions: [`DECISIONS.md`](DECISIONS.md).

## Layout

| Path | What |
|------|------|
| `skills/` | the practices (agentskills.io standard: `name` + `description`, progressive disclosure) |
| `scripts/` | shared bash — memory-contract resolver, agent-agnostic dispatch, ledger |
| `hooks/` | optional session bootstrap (SessionStart / SubagentStart injection) |
| `DECISIONS.md` | locked build decisions |
| `NOTICE` | attribution for adapted MIT sources |

MIT licensed.
