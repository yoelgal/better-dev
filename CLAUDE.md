<!-- BEGIN better-dev -->
## better-dev is wired here

This repo uses **better-dev**: portable dev practices that run inside your agent (installed globally
for your host, not vendored here). On non-trivial work, drive it through these skills:

- **Feature**: `/plan-grill` to forge an observable done-contract, then `/autonomous-loop` to drive it
  to proven-done, then `/pr-and-verify` to land it. **Bug or fix**: `/diagnose` first, then the loop.
- Each feature or fix runs in its **own git worktree** via `/worktree-branching`, off `staging`;
  branching is `feat/*` (`fix/*`), merged to `staging`, promoted to `main` on release.
- Durable rules and lessons: `.better-dev/bin/bd-mem` (backend: files). Project overrides in
  `.better-dev/overrides.md` **win over defaults**, so read them first.
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the global tool.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  project, `/groundwork` takes the idea to a shared foundation and parallelizable work-items.
- `.better-dev/` holds better-dev data (rules, overrides, learnings); in **this** repo the whole dir is
  gitignored as local runtime state (`bin/` and `ledger/` are per-machine regardless). A fresh clone
  re-runs `/onboard` to rebuild the `bin` bridge.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
<!-- END better-dev -->
