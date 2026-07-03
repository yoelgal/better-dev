# better-dev — Build Decisions (locked defaults)

Opinionated defaults that resolve the spec's open design calls so skills are built against settled
foundations. These are **my calls** (per principles #6 opinionated / #7 overridable) — flagged for review,
not set in stone. Spec: `raw/better-dev-design-principles.md`. Build plan: `raw/sources/2026-07-03-harvest-manifest/`.

## D0 · Output layout
Product lives at the **repo root**; `raw/` stays the research archive.
```
skills/<name>/SKILL.md         # agentskills.io units (+ sibling .md refs, progressive disclosure)
scripts/                       # shared bash (memory resolver, dispatch, ledger, stage-test-commit)
hooks/                         # optional SessionStart / SubagentStart injection
.claude-plugin/plugin.json     # Claude Code plugin manifest (generated)
.agents/                       # agent-agnostic install target (symlink + copy-fallback)
NOTICE  README.md  install.sh
```
**Install contract (tracer-bullet finding):** in a *target* repo the helpers install to **`.better-dev/bin/`**,
never a bare `scripts/` — a real project (papers.town) already owns `scripts/` and a bare path collides.
Skills reference helpers as `.better-dev/bin/bd-mem` etc. (`scripts/` remains only the dev-repo source home).

## D1 · Canonical terminal-state taxonomy
One set every harvested vocabulary (loopy/grind/SDD/forge) maps onto. Hard rule: **never map an error or
exhausted budget to a success state.**
| State | Meaning | Absorbs |
|---|---|---|
| `DONE` | proven against done-criteria | SDD DONE, grind SUCCESS, loopy success/clean-no-op |
| `DONE_WITH_CONCERNS` | proven, non-blocking flags | SDD DONE_WITH_CONCERNS |
| `BLOCKED` | external blocker, can't proceed | grind/SDD BLOCKED, loopy blocked |
| `NEEDS_INPUT` | needs human/context/approval | SDD NEEDS_CONTEXT, loopy approval-required |
| `EXHAUSTED` | budget/iterations hit | grind BUDGET_EXHAUSTED, loopy exhausted |
| `NO_PROGRESS` | stagnated → triggers restart-from-contract | loopy stagnated, stuck-check confirmed |

## D2 · Memory contract (4 ops) + files default
Skills call: `remember(rule)` · `recall(query)→rules/lessons` · `persist(override)` · `read(state)`.
Resolver script routes to a backend set by `BETTER_DEV_MEMORY` (default `files`; else `mcp:<server>` or `cmd:<...>`).
**Files backend (default, zero infra):**
- `.better-dev/rules.md` — human-readable promoted rules
- `.better-dev/learnings.jsonl` — append-only, confidence-scored (gstack-style)
- `.better-dev/overrides.md` — the #7 overrides layer (managed block; also mirrored to a CLAUDE.md block)
- `.better-dev/ledger/<feature>/` — loop state (contract.md, progress ledger, per-iteration receipts)

## D3 · Restart-from-contract (owned, karpathy-inspired, never quoted)
On `NO_PROGRESS` confirmed by stuck-check → **reset the feature worktree off `staging`, replay
`.better-dev/ledger/<feature>/contract.md`**, escalate to human **only if the contract itself is wrong**.
Reimplemented in our own words (LOOPS.md §V is personal-use — inspiration only).

## D4 · Agent-agnostic dispatch verb
`scripts/bd-dispatch <role> <brief-file>` — prefer the host's fresh-context subagent primitive (Claude Code
Task, etc.); **fall back to a single-session role-switch with an explicit context reset** when none exists.
Preserves planner / generator / evaluator separation on Codex / pi / hermes. We **advise** model-tiering in
prose ("least-capable model that works"); we never **route** (no provider spine — see spec out-of-scope).

## D5 · Overrides layer = its own component
`.better-dev/overrides.md` (managed block), **read first by every skill**. The confirm gate
(*"make this the default here?"*) lives in whatever skill would write it. Never rewrites a shared skill.

## D6 · Scope additions (completeness critic — now in scope)
`overrides` · `release/promotion` (staging→main soak, tags, hotfix double-merge) · `guardrails-install`
(onboard installs pre-commit/lint/CI, not just detects) · `pr-and-verify` (gh PR into staging + end-to-end
verify) · `feature-ideation` (propose options vs grill a plan) · `browser-capability` (wire agent-browser).

## D7 · Work items = feature OR fix (bug investigation + fixing IS in scope)
The core loop is a **work-item loop**, not feature-only. A work item is a `feature/` or a `fix/`/`hotfix/`
(the branching model already anticipates this). Same autonomous loop + PR-into-staging; only the **front-end**
differs:
- **feature** → `plan-grill` (ideate + grill the plan)
- **fix** → **`diagnose`**: reproduce → establish a red-capable signal → root-cause → falsifiable hypothesis,
  then the *same* loop drives red→green. A fix's done-contract = **red signal goes green + regression test at a
  correct seam**.

New component **`diagnose`** (fix front-end), Phase 1 beside `plan-grill`. Harvest: `mp:diagnosing-bugs`
(red-first, minimise-repro, falsifiable hypotheses), `devloop` `/root-cause` `/hypothesize` `/trace` `/pepper`,
`forge:forge-ground` (bug-premise verify), `loop-library` production-error-sweep / ticket-to-PR-ready.

## D8 · Source before create (self-extension is the fallback)
On a capability gap the agent **first sources an existing skill** via `find-skills` (`npx skills find` →
`add`); it **only writes a new skill** (hermes `/learn` self-extension) when nothing adequate exists.
Create is the last resort — prefer proven, installed skills over fresh ones (ponytail: don't reinvent what
the ecosystem already has). A freshly-created skill passes test-before-promote first; once proven it can
later be published back. So `tool-sourcing` and `self-extension` are **one ordered flow**, not two.

## Tracer-bullet findings (2026-07-03, on the papers.town clone) — bind Phase 1
Ran `onboard` + one feature slice → staging end-to-end on the real clone (locally, no push). Proven, plus:
1. **Helpers → `.better-dev/bin/`** (bare `scripts/` collides with the project's own — see D0 install contract).
2. **Ledger lives in the primary checkout's `.better-dev/ledger/<feature>/`, shared across worktrees** — not in
   the feature worktree (separate working tree). `autonomous-loop` + `worktree-branching` write there (forge keeps
   state in a shared `$FORGE_HOME` for the same reason).
3. **Premise-verify earns its place:** `staging` was documented in `CLAUDE.md` but absent from `git` — onboard must
   verify at the git level, never trust prose. Same rule for any detected capability.
4. **Primary checkout tracks the integration branch (`staging`); features are worktrees off it** (papers.town
   convention). `worktree-branching` detects and respects this rather than imposing a layout.
5. **Entry-file rule holds:** `CLAUDE.md` `@`-imports `AGENTS.md` → block into `CLAUDE.md`, idempotent, no clobber
   (verified against the real 2.6 KB file via `bd-block`).
6. **Done = a real runnable check going GREEN**, recorded as the contract's observable done-criteria (not a claim).

## Build order (phase-gated, verify each)
0. authoring-standard → memory-contract (D2) → onboard  ← **foundations, built first**
   ↳ then a tracer-bullet slice: onboard → one loop → PR-into-staging, run in a throwaway repo
1. worktree-branching → plan-grill → autonomous-loop → review
2. tool-sourcing → self-extension
3. bootstrap-hooks → packaging → (release, guardrails, pr-and-verify, browser)

## Licensing & attribution — the clean path (owner-approved 2026-07-03)
Build by **reimplementing patterns from understanding**. Ideas, methods, and system designs are not
copyrightable, so reimplemented components are our original work and owe **no attribution**. Copy verbatim
only when a snippet is too trivial to bother reimplementing — and minimize even that. Order of preference
per source: **reimplement > adapt > verbatim**.
- `NOTICE` credits **only** expression actually copied (currently ~none); pattern inspiration is courtesy, not required.
- Rewriting someone's file with an AI ≠ making it ours — that's a derivative work. We reimplement from the
  *idea*, not by paraphrasing their file.
- **Never redistribute** `karpathy:LOOPS.md` (personal-use) — reimplement, never quote.
- **Never copy** superpowers' maximalist "MUST/STOP" tone — take the plumbing, write our own voice.
