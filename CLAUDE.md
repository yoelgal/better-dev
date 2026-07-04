<!-- BEGIN better-dev -->
## better-dev is wired here

This repo uses **better-dev** — portable dev practices that run inside your agent (installed globally
for your host, not vendored here). On non-trivial work:

- **Feature** → `/plan-grill`, then the autonomous loop. **Bug/fix** → `/diagnose`, then the loop.
- Each feature/fix runs in its **own git worktree** off `staging`; branching is
  `feat/* (fix/*) → staging → main`, promoted to `main` on release.
- Durable rules & lessons: `.better-dev/bin/bd-mem` (backend: files). Project overrides live in
  `.better-dev/overrides.md` and **win over defaults** — read them first.
- `.better-dev/` holds better-dev data (rules, overrides, learnings); in **this** repo the whole dir is
  gitignored as local runtime state (`bin/` and `ledger/` are per-machine regardless). A fresh clone
  re-runs `/onboard` to rebuild the `bin` bridge.
- Hit a capability gap? **Source a skill** (`find-skills`) before writing one. A skill you author here
  is repo-scoped — it lands in this repo's own project skills dir, not the global tool.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive — it complements, never replaces, whatever else is installed.
<!-- END better-dev -->
