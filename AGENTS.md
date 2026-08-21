## Repo layout

This repo (`better-dev`) is the better-dev tool itself, laid out flat at the root: `skills/`, `rules/`,
`hooks/`, `scripts/`, `docs/`, and the gitignored `raw/` research archive are its own parts, not
separate tools. `skills/`, `rules/` and `hooks/` are the product; `scripts/` holds the two maintainer
helpers that survive because no host ships them - the package gate and the skill staging tool - and
neither is shipped capability, so no skill tells a user to run one. `package.json` is load-bearing
rather than scaffolding: `omp plugin link` refuses a directory without one and silently skips the
plugin unless it declares an `omp` key. `.claude-plugin/plugin.json` is the canonical version; both
marketplace catalogs and `package.json` carry a copy the gate checks against it. One release ledger,
`docs/RELEASES.md`. Branch discipline is trunk: `feat/*` off `main`, merged back to `main`, released by
a version commit and a tag. `main` is the distribution channel - a merge is live to every user on their
next plugin upgrade - so a red gate reaches people, and that is the cost trunk trades the staging
buffer for.

Anything the harness already does, this library does not carry: discovery is the host reading each
skill's own description, dispatch is its `task` tool, structural queries are its `lsp` tool, this
project's recorded decisions and lessons are its durable memory, and command approval is
`.omp/config.yml`. A capability that arrives natively is removed here rather than wrapped. The library
writes nothing into a repo that installs it.

This is the file this repo's own host auto-loads, so it is the only always-loaded context the repo has
and the layout prose lives here rather than in `README.md` (written for someone deciding whether to
install) or `docs/` (the decision record). Measured 2026-08-21: omp loads a root `AGENTS.md` and loads
no root `CLAUDE.md`.
