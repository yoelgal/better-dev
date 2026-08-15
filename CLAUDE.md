<!-- BEGIN better-dev -->
## better-dev is wired here

This repo uses **better-dev**: portable dev practices that run inside your agent (installed globally
for your host, not vendored here). Say what you want; the right skill enters, and the chain runs
itself - a tool you name wins over a row:

| You say... | Enters | Then, on its own |
|---|---|---|
| "add / build feature X", "I want Y" (non-trivial) | `/plan-grill` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "upgrade the dependency", "clear the CVE", "chore: X" | `/plan-grill` (contract-lite) | -> the loop, priced under a feature grill |
| "X is broken / failing / slow", "why is prod down" | `/diagnose` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "let's build an app that does Y", a new project or epic | `/groundwork` | asks steered or one-shot (`/gauntlet`) first, then sets the foundation |
| "gauntlet this", "one-shot the whole thing", "write me a prompt to build X in a fresh session" | `/gauntlet` | grills goal + bar, hands you one loop prompt for a fresh session |
| "ship it", "open a PR", "let's land this" | `/pr-and-verify` | -> `/release-promotion` on green |
| "release this / promote to main", "roll back / revert the release", "hotfix prod", "did the deploy land / is prod healthy" | `/release-promotion` | tags, verifies live, reverts a bad release, double-merges the hotfix |
| "deploy this", "get it live", "set up hosting" | `/deploy-capability` | creates the surface; `/guardrails-install` records it |
| "wire monitoring", "can I see prod errors?", "does anything page me?" | `/observability-install` | fills the recorded `obs-*` gaps |
| "review this PR", "review my colleague's PR" | `/review` | inbound path: host mechanics + this repo's recorded policy |
| "what's in flight?", "where did we leave off?" | `.better-dev/bin/bd-mem ledger status` | one line per work-item with its state |
| "hand this off", "pick up X's work" | `/worktree-branching` (handoff) | the bundle rides the branch; consent re-pins on pickup |
| "make it look good", "design the page" | `/design-brief` | -> `/plan-grill` or the loop |
| "is this safe", a security pass on a risky diff | `/security-pass` | composed by `/review` automatically |
| "is there a tool or skill for X" | `/tool-sourcing` | -> `/self-extension` only if discovery is empty |
| "who calls this / what breaks if I change X" | `/codebase-map` | queries the code graph before grepping; changes nothing |
| "index the repo", "build / refresh the code graph" | `/graphify-wrapper-map` (or `-sync`) | `/graphify-wrapper-query` answers from it; hooks keep worktree graphs fresh |
| "what's worth doing here", "audit this codebase" | `/codebase-audit` | ranked findings; you pick -> front-ends |
| "here are some links / ingest these / harvest this", a link or dump of source material for the library - even one framed as "implement this" | `/source-harvest` | captures verbatim -> critical synthesis; a build ask then -> `/plan-grill` |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "wait, you lost me", "what does that mean?" - a reply that didn't land | `/wait-what` | re-pitches it plainly in this repo's own vocabulary |
| "I can't answer this - my colleague / the client owns it" | `/plan-grill` (questionnaire unblock) | drafts the doc, grills only the send; the item waits on the answers |
| "remove better-dev" | `/uninstall` (or `.better-dev/bin/bd-uninstall repo`) | unwires this repo, keeps your data |
| a one-to-two-step change | no front-end - just make it | inline in the work-item's worktree; verify before done |

You name the entry, not every step: each front-end hands to `/autonomous-loop`, which hands a DONE
result to `/pr-and-verify`, which hands a green PR to `/release-promotion`. Every work-item - even a
trivial one that skips the front-ends - runs in
its own git worktree, off `staging` (`/worktree-branching` sets it up first); a follow-up to an open
item rides that item's existing worktree. Branching is `feat/*` (`fix/*`), merged to `staging`,
promoted to `main` on release.

- Durable rules and lessons: `.better-dev/bin/bd-mem` (backend: files); `--help` prints the full
  command surface. Project overrides in
  `.better-dev/overrides.md` **win over defaults**, so read them first.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  build ask, `/groundwork` opens by asking how you want it built - steered (foundation plus
  parallelizable work-items, you review each) or one-shot (`/gauntlet` hands a fresh session one
  prompt and runs long with minimal interaction).
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the global tool.
- `.better-dev/` holds better-dev data (rules, overrides, learnings); in **this** repo the whole dir is
  gitignored as local runtime state (`bin` and `ledger/` are per-machine regardless). A fresh clone
  re-runs `/onboard` to rebuild the `bin` bridge.
- Update the tool with `/update` - it pulls the global clone (`git pull` underneath), reconciles
  skill links when needed, and tops up this repo's wiring when a release changed it.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
<!-- END better-dev -->

## Repo layout

This repo (`better-dev`) is the better-dev tool itself, laid out flat at the root: `skills/`,
`scripts/`, `hooks/`, `hosts/`, `docs/`, `browse/`, `ios-qa/`, and the gitignored `raw/` research
archive are its own parts, not separate tools. There is one version, stamped in
`.claude-plugin/plugin.json`, and one release ledger, `docs/RELEASES.md`. Branch discipline is
`feat/*` off `staging`, promoted to `main`.

One exception to "flat at the root": `better-dev/hooks/` holds three legacy-path shims, and only
those. A host installed before the flatten records an absolute hook command pointing there, so
deleting the directory silently kills every session hook on that machine. D34 carries the rationale
and the removal condition - do not tidy it away because the rest of the tree looks flat.
