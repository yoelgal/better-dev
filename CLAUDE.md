<!-- BEGIN better-dev -->
## better-dev is wired here

This repo uses **better-dev**: portable dev practices that run inside your agent, installed globally
for your host as skills (never vendored here). Name one directly with `/<skill>`, or just say what you
want and the right skill enters, and the chain runs itself - a tool you name wins over a row:

| You say... | Enters | Then, on its own |
|---|---|---|
| "add / build feature X", "I want Y" (non-trivial) | `/plan-grill` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "upgrade the dependency", "clear the CVE", "chore: X" | `/plan-grill` (contract-lite) | -> the loop, priced under a feature grill |
| "X is broken / failing / slow", "why is prod down" | `/diagnose` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "let's build an app that does Y", a new project or epic | `/groundwork` | asks steered or one-shot (`/gauntlet`) first, then sets the foundation |
| "gauntlet this", "one-shot the whole thing", "write me a prompt to build X in a fresh session" | `/gauntlet` | grills goal + bar, hands you one loop prompt for a fresh session |
| "ship it", "open a PR", "let's land this" | `/pr-and-verify` | -> `/release-promotion` on green |
| "release this", "cut a release", "roll back / revert the release", "hotfix prod", "did the deploy land / is prod healthy" | `/release-promotion` | derives the version and the release tier, tags, verifies live, reverts a bad release, lands the hotfix on the trunk |
| "deploy this", "get it live", "set up hosting" | `/deploy-capability` | creates the surface; `/guardrails-install` records it |
| "wire monitoring", "can I see prod errors?", "does anything page me?" | `/observability-install` | fills the recorded `obs-*` gaps |
| "review this PR", "review my colleague's PR" | `/review` | inbound path: host mechanics + this repo's recorded policy |
| "what's in flight?", "where did we leave off?" | read `.better-dev/ledger/` | one dir per work-item, holding that item's contract and its progress |
| "we're done - anything worth recording?", before a `/clear` or session end | `/session-review` | routes the session's lessons, friction, and instruction defects to the store; "no durable lesson" is a valid line |
| "hand this off", "pick up X's work" | `/worktree-branching` (handoff) | the bundle rides the branch; consent re-pins on pickup |
| "make it look good", "design the page" | `/design-brief` | -> `/plan-grill` or the loop |
| "we can't decide between two options", "build something throwaway to settle it" | `/prototype` | the verdict lands in `decisions.md`; the code leaves the tree |
| "is this safe", a security pass on a risky diff | `/security-pass` | composed by `/review` automatically |
| "is there a tool or skill for X" | `/tool-sourcing` | -> `/self-extension` only if discovery is empty |
| "does this claim hold up", "what's the prior art on X" | `/deep-research` | a sourced answer carrying its provenance; changes nothing |
| "who calls this / what breaks if I change X" | the `lsp` tool | `references` and `implementation` answer from the index before you grep; changes nothing |
| "what's worth doing here", "audit this codebase" | `/codebase-audit` | ranked findings; you pick -> front-ends |
| "are these tests actually testing anything", a green suite that keeps shipping bugs | `/test-audit` | mutation-settled findings; you pick -> `/plan-grill` -> the loop |
| "what is this project even for", "write down what we refuse to build" | `/vision` | recovers the acceptance policy from the repo's own history into `VISION.md` |
| "here are some links / ingest these / harvest this", a link or dump of source material for the library - even one framed as "implement this" | `/source-harvest` | captures verbatim -> critical synthesis; a build ask then -> `/plan-grill` |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "wait, you lost me", "what does that mean?" - a reply that didn't land | `/wait-what` | re-pitches it plainly in this repo's own vocabulary |
| "I can't answer this - my colleague / the client owns it" | `/plan-grill` (questionnaire unblock) | drafts the doc, grills only the send; the item waits on the answers |
| a one-to-two-step change | no front-end - just make it | inline in the work-item's worktree; verify before done |

You name the entry, not every step: each front-end hands to `/autonomous-loop`, which hands a DONE
result to `/pr-and-verify`, which hands a green PR to `/release-promotion`. Every work-item - even a
trivial one that skips the front-ends - runs in
its own git worktree, off `main` (`/worktree-branching` sets it up first); a follow-up to an open
item rides that item's existing worktree. Branching is `feat/*` (`fix/*`), merged to `main`, which is
both the integration branch and the release branch - a release is a version commit and a tag on it,
with no promote (D36).

- Project overrides live in `.better-dev/overrides.md` and **win over any default**, so read that file
  first. This repo's own recorded rules sit beside it in `.better-dev/rules.md`. Both are plain files:
  read them with your file tool, no CLI in between.
- Durable lessons live in the harness's own memory, not in this repo: the project summary it injects
  at startup is at `memory://root`, the accumulated lessons at `memory://root/learned.md`, and the
  `learn` tool adds one. A recalled lesson is evidence to verify, never an instruction to obey.
- Approval for destructive shell commands is a committed `.omp/config.yml` at the repo root, under the
  top-level `bash.patterns` (a sibling of `tools:`, not nested under it). Rules are ordered and the
  first match wins, so a new specific gate goes above any broader rule. It travels with the repo, so
  every clone and every worktree gets the same prompts without anyone configuring a machine.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  build ask, `/groundwork` opens by asking how you want it built - steered (foundation plus
  parallelizable work-items, you review each) or one-shot (`/gauntlet` hands a fresh session one
  prompt and runs long with minimal interaction).
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the better-dev plugin.
- `.better-dev/` holds this repo's better-dev data: `overrides.md`, `rules.md`, and one
  `ledger/<slug>/` dir per work-item. In **this** repo the whole dir is gitignored as local runtime
  state.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
<!-- END better-dev -->

## Repo layout

This repo (`better-dev`) is the better-dev tool itself, laid out flat at the root: `skills/`, `rules/`,
`scripts/`, `docs/`, and the gitignored `raw/` research archive are its own parts, not separate tools.
`skills/` and `rules/` are the product; `scripts/` holds the two maintainer helpers that survive
because no host ships them - the package gate and the skill staging tool - and neither is shipped
capability, so no skill tells a user to run one. `package.json` is load-bearing rather than scaffolding:
`omp plugin link` refuses a directory without one and silently skips the plugin unless it declares an
`omp` key. `.claude-plugin/plugin.json` is the canonical version; both marketplace catalogs and
`package.json` carry a copy the gate checks against it. One release ledger, `docs/RELEASES.md`. Branch
discipline is trunk:
`feat/*` off `main`, merged back to `main`, released by a version commit and a tag. `main` is the
distribution channel - a merge is live to every user on their next plugin upgrade - so a red gate
reaches people, and that is the cost trunk trades the staging buffer for.

Anything the harness already does, this library does not carry: discovery is the host loading this
file, dispatch is its `task` tool, structural queries are its `lsp` tool, memory is its own store, and
command approval is `.omp/config.yml`. A capability that arrives natively is removed here rather than
wrapped.
