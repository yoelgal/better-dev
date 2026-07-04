# better-dev - Master Build Plan & Spec (consolidated)

**Single source of truth for building better-dev.** Self-contained: a fresh session or a subagent can
implement from this file alone. Exhaustive detail lives on disk (see §14) but you rarely need it.
Last consolidated 2026-07-03, after the research + harvest phase and Phase-0 foundations #1-#2.

---

## 1. What it is (and is not)

better-dev is a **portable set of dev PRACTICES packaged as skills (`SKILL.md`)** that run *inside* the
coding agent you already use - Claude Code, Codex, hermes, pi - to make it do software development well.

It is **NOT**: an agent or runtime · a framework you install *instead of* your tools · a model/provider
router (**no provider spine** - model choice is the host's; we may *advise* tiering, never *route*, and we
do **not** copy forge's `frugal`) · a cross-project brain (**no GBrain** - gstack's memory daemon deleted
users' working trees; project-scoped only).

## 2. Principles

1. **Agent-agnostic** - `SKILL.md` (agentskills.io) is the portable unit; no lock to one model/harness.
2. **Composable, never blocking** - additive; complements installed skills/tools/MCP; never exclusive; no maximalist "MUST/STOP" tone.
3. **Self-describing** - a project's `CLAUDE.md`/`AGENTS.md` + each skill's `description` auto-teach usage.
4. **Self-improving & self-extending** - one ordered flow on a gap: **source first** (`find-skills`), **create only as fallback** (hermes `/learn`). See §7.
5. **Self-hostable / OSS-preferred; minimal deps** (bash-light).
6. **Project-scoped & opinionated** - one repo, not a cross-project brain; one strong way to work.
7. **User-steerable & self-revising** - override a practice in flow → the agent honors it now **and** persists it to `.better-dev/overrides.md` (light confirm before a one-off becomes policy). Never rewrites a shared skill.

**Invocation rule (applies to every skill):** default **model-invoked** (agent-reachable). Use
`disable-model-invocation: true` **only** for things a *human* should deliberately trigger - destructive/
expensive actions, or a reference a person pulls up by hand. Disciplines the *agent* must apply on its own
stay model-invoked.

## 3. Core loop - work items are FEATURE **or** FIX

1. **Bootstrap for parallelism** - set up the *minimum base* (main/staging, worktree conventions, guardrails). Adapt to what's there; don't impose.
2. **Front-end (typed):** **feature → `plan-grill`** (ideate + grill the plan watertight); **fix → `diagnose`** (reproduce → red-capable signal → root-cause → falsifiable hypothesis).
3. **Autonomous implementation loop** - same loop for both; run to real done-criteria; a fix's contract = red-signal-goes-green + regression test. See §5-loop below.
4. **Capability-gap → source the tool** (§7). Ships the *practice of sourcing*, not every tool.

Feedback: sourced capability feeds the loop; lessons + overrides persist to per-project rules (self-revising).

## 4. Branching (locked)

`main` (protected, releasable, tagged) ⟵ `staging` (integration: PR + grill + verify, then soak) ⟵
`feature/<slug>` & `fix/<slug>` in their **own git worktrees** off `staging`; `hotfix/<slug>` off `main`
→ merges to both. Flow: worktree off staging → loop → PR → grill/review → merge staging → soak → promote
main. (Prefix naming is a per-project override - e.g. papers.town uses `feat/`.)

## 5. Memory - bring-your-own, files by default

No memory engine. Skills call the **contract** via `scripts/bd-mem`:
`init · remember <rule> · learn <lesson> [conf] · recall <query> · persist-override <line> · read rules|overrides|learnings|ledger`.
Backend via `BETTER_DEV_MEMORY`: `files` (default) · `cmd:<command>` · `mcp:<server>`.
**Files layout** under `.better-dev/`: `rules.md` (promoted, human-readable) · `learnings.jsonl`
(append-only, confidence-scored) · `overrides.md` (managed block, principle #7) · `ledger/<feature>/`
(loop state: `contract.md`, progress, receipts). It's just repo files the host agent already ingests -
composes with standard memory by *being part of it*. `bd-mem` exists and passes `bd-mem selftest`.

## 5-loop. The autonomous loop (the differentiated core) - four layers + a fresh spine

- **OUTER (orchestration):** reimplement superpowers' subagent-driven-development - read plan+constraints → per task dispatch a **fresh isolated-context worker** (agent-agnostic dispatch verb, `scripts/bd-dispatch`, single-session role-switch fallback) with a file brief → generate a diff/review package → **independent reviewer that distrusts the report** (spec + quality verdict) → fix worker for Critical/Important → append ledger line → next → broad final review → hand off to PR-into-staging. File handoffs; never grade own work.
- **INNER (drive-to-green):** reimplement devloop `grind` (verify→pick→implement-one-step→re-verify→log→commit, budget, protect-set) + `stuck-check` (rabbit-hole detector → halt-STUCK); precondition from mp `diagnosing-bugs`: name one **already-run red-capable command** before hypothesizing; per-slice from mp `tdd` (one test→one impl at agreed seams).
- **INVARIANTS (legitimacy):** from loop-library `loopy` + forge - observable done-criteria (no "until happy"), **never error/exhausted = success**, no-progress stop (don't invent limits), ask-don't-invent, verify separate from signal, independent evaluator, "done means proven not asserted", pre-loop ground-truth gate.
- **SPINE (fresh, ours):** ONE canonical terminal-state taxonomy = `DONE · DONE_WITH_CONCERNS · BLOCKED · NEEDS_INPUT · EXHAUSTED · NO_PROGRESS` (every source's verdicts map onto it); ONE durable ledger (SDD progress + grind scratchpad + loopy receipt merged, via bd-mem) - in the **primary checkout's** `.better-dev/ledger/<feature>/`, shared across worktrees (tracer-bullet finding); **restart-from-contract** (on `NO_PROGRESS` confirmed by stuck-check → reset worktree off staging, replay `contract.md`, human only if the contract is wrong - karpathy §V reimplemented, never quoted); the dispatch verb + contract front-end + worktree/PR glue.

## 6. Onboarding - the entry skill `onboard`

Idempotent; greenfield **or** existing codebase. **Detect** (harness; installed skills/MCP; existing
memory system; git + branching; `CLAUDE.md`/`AGENTS.md`) → **adapt, don't impose** (respect existing
conventions as overrides - never force main/staging or a prefix; scaffold minimum base only where absent;
never disable installed skills) → **wire memory** (bd-mem to detected backend or files) → **self-describe**
(write a managed block into the entry file + `.better-dev/` scaffold) → **grill + light-confirm** before
writing. Detection is a *premise* - verify at file:line before scaffolding on it (never guess a command;
unmapped capability = a gap, not an invention). Reimplement shape from orrgal1 `welcome` (idempotent
detect→report→ask→act, `argument-hint` resume) + mp `setup` (present-one-decision-at-a-time; entry-file
rule). **Entry-file rule (from papers.town):** if both `CLAUDE.md` and `AGENTS.md` exist, the convention is
`CLAUDE.md` `@`-imports `AGENTS.md`; write our managed block into the entry file, update in place, never
duplicate, never clobber user edits.

## 7. Sourcing & self-extension - **source before create**

```
capability gap
 └ find-skills:  npx skills find  →  adequate hit?  →  npx skills add → use.  DONE.
      └ nothing adequate?  →  self-extension (/learn): draft a NEW skill (fallback only)
```
- **tool-sourcing:** reimplement find-skills as `source-a-tool` - but **ride the CLI** (`npx skills find|add|use`), don't vendor its TS. Its *installer* is solid; its *discovery* is leaky (ranks by install-count, silent `[]` on error) → wrap discovery (GitHub refs + `.well-known` + web search, non-silent retry, **blocking risk-gate in autonomous mode**, our own vetting md). Steal `skills use | claude` (ephemeral try-before-adopt).
- **self-extension (hermes model, no engine):** a prompt-authored `/learn` flow - read-before-write → draft `SKILL.md` in a **staged dir** → **test-before-promote** (script+fixture+test, approval gate, atomic commit) → promote. Guards: negative-lesson filter (never persist transient "X is broken"). It **applies `writing-skills` by referencing that file** (single source of truth), never by inlining a copy.

## 8. SKILL.md authoring standard (`skills/writing-skills/SKILL.md` - built, model-invoked)

agentskills.io verbatim. Frontmatter: **`name` + `description` required** (missing description is the only
hard fail). `description` = **triggering conditions only** ("Use when…"), never a workflow summary (a
summary makes agents skip the body). Optional: `disable-model-invocation` (per §2 rule), `argument-hint`,
`allowed-tools`. Keep `version`/`license` out. Body: one skill = one job; progressive disclosure via **prose
pointers to sibling `.md`**, never `@`-links; cross-skill deps as `/skill` prose, not file paths; calm voice.

## 9. Licensing - the clean path (owner-approved)

Build by **reimplementing patterns from understanding**. Ideas/methods/designs aren't copyrightable →
reimplemented components are original work, **owe no attribution**. Order of preference: **reimplement >
adapt > verbatim**; minimize verbatim. Rewriting someone's file with an AI = a derivative work - reimplement
from the *idea*, not by paraphrasing their file. `NOTICE` credits **only** expression actually copied
(currently ~none). **Never redistribute** `karpathy:LOOPS.md` (personal-use). **Never copy** superpowers'
"MUST/STOP" tone. See `NOTICE`, `LICENSE` (MIT, © 2026 Yoel Gal).

## 10. Components → reimplement from (condensed; full detail in the harvest manifest, §14)

All sources MIT unless noted. **opensrc the real files first (paths in `harvest.json`), understand them
deeply, then reimplement** (§12) - capture the actual mechanism, don't approximate. Coverage: all buildable
(2 full, rest partial, 0 from-scratch).

| Component | Reimplement from (understanding) |
|---|---|
| **writing-skills** ✅ | authoring standard - DONE |
| **memory-contract** ✅ | `scripts/bd-mem` - DONE (selftest passes) |
| **onboard** | orrgal1 `welcome` (idempotent phases), mp `setup` (entry-file rule), forge `forge-setup`/`forge-ground` (never-guess, premise-verify) |
| **plan-grill** | mp `grilling` (one-Q-at-a-time + confirm gate), `to-prd`; forge `forge-ground` |
| **diagnose** (fix front-end) | mp `diagnosing-bugs` (red-first, minimise-repro, falsifiable), devloop `/root-cause` `/trace` `/pepper`, forge premise-verify, loop-library error-sweep |
| **autonomous-loop** | devloop `grind`+`stuck-check` (INNER), loop-library `loopy` + forge proof-chain (INVARIANTS), mp `tdd`; owned SPINE = terminal-states + ledger + restart-from-contract (karpathy LOOPS.md §V inspiration only, never quoted). OUTER dispatch **references `/orchestrating-agents`** - see §5-loop |
| **orchestrating-agents** (new) | superpowers `subagent-driven-development` (dispatch fresh workers, file handoffs, never self-grade, planner/generator/evaluator split), forge/devloop dispatch, frugal (route subtasks - practice only). Owns the D4 dispatch verb + fan-out/pipeline patterns; agent-agnostic (host `Task`/`Workflow`, in-session fallback) |
| **worktree-branching** | superpowers `using-git-worktrees` (detect-isolation, native-first), forge `forge-start` (HANDOFF_WORKTREE stop) |
| **review** | mp `code-review` (Standards+Spec, no self-grade), superpowers `task-reviewer` (distrust-report, diff-only) |
| **tool-sourcing** | find-skills CLI (ride it) + wrapped discovery (§7) |
| **self-extension** | hermes `/learn` (prompt-authored) + read-before-write + gstack `skillify` test-before-promote (§7) |
| **bootstrap-hooks** | superpowers SessionStart + ponytail SubagentStart re-inject (bash-light, always-on-when-installed) |
| **packaging-distribution** | `.claude-plugin/plugin.json`, symlink+copy-fallback install; delegate long-tail to `npx skills add` |
| **overrides** (own component) | `.better-dev/overrides.md` managed block, read-first, confirm gate |
| **release/promotion** | staging→main soak/promote, tags, hotfix double-merge (owned; no source) |
| **guardrails-install** | onboard *installs* pre-commit/lint/CI, not just detects |
| **pr-and-verify** | `gh pr create` into staging + end-to-end verify (drive the flow, not just tests) |
| **feature-ideation** | propose options from rough intent (distinct from grilling a plan) |
| **browser-capability** | wire agent-browser as a sourced capability (web QA / iOS-sim) |

## 11. Build order & status

- **Phase 0 - foundations:** `writing-skills` ✅ · `memory-contract` (bd-mem) ✅ · `onboard` ✅ (+ `bd-block`) · **tracer-bullet ✅ PASSED**.
- **Phase 1 - core loop: ✅ built + integration-tested** - `worktree-branching`, `plan-grill`, `diagnose`, `orchestrating-agents`, `autonomous-loop`, `review` (fanned out via Workflow, each reimplemented from real opensrc source). Spine unified: `bd-mem` now resolves the primary checkout and owns the ledger (`bd-mem ledger dir|init|resume|put|read`); helpers normalized to the `bd-*` namespace (`bd-mem`, `bd-block`, `bd-dispatch`, `bd-worktree-guard`, `bd-review-package`), all self-tests + a cross-skill worktree integration test green.
- **Phase 2 - self-improvement: ✅** `tool-sourcing` (rides find-skills CLI) + `self-extension` (hermes /learn fallback, `bd-skill-stage` test-before-promote).
- **Phase 3 - ship: ✅** `bootstrap-hooks`, `pr-and-verify`, `release-promotion`, `guardrails-install`, `overrides`, `browser-capability`, and `packaging` (`install.sh` vendored install + `.claude-plugin/plugin.json` + `bd-package-check` release gate).

**Build complete + quality-upgraded + install reworked.** 18 skills + 8 `bd-*` scripts + hooks; `bd-package-check` green. **Install model (D10):** the tool installs **globally per host** (`install.sh` + `hosts/` adapters + `bd-link`, or the Claude plugin); a repo's `.better-dev/` is **data only** + a per-machine `bin` symlink; repo-authored skills stay repo-local; one-paste `BOOTSTRAP.md` is the front door. **In flight:** `groundwork` (idea→foundation→parallelization front-end) and a loop-engineering audit. A forge+devloop audit (175 mechanisms; 59 already-covered, 15 skipped as plumbing) drove a quality pass - proof-realism (test-body-realizes-criterion), adversarial refutation for non-runnable claims, diff-fingerprint review scrutiny, red-triage (flake/infra/genuine), deslop-on-green, bounded wait-for, content-pinned contract approval (`bd-mem ledger approve`/`check-approval`) - plus `codebase-map` (sourced structural orientation, sibling to `browser-capability`). Remaining is human-only (see §13): publish, real-remote branch protection, live multi-harness runs.

**Tracer-bullet gate (after Phase 0): ✅ PASSED** - ran `onboard` + one feature slice → staging on the
papers.town clone, locally, no push. onboard adapted (didn't impose), wrote an idempotent non-clobbering
discovery block, wired files-memory; the slice went worktree-off-staging → verify GREEN → merge-to-staging
→ DONE. **Six findings now bind Phase 1 (see `DECISIONS.md` → Tracer-bullet findings):** helpers live in
`.better-dev/bin/` (not a bare `scripts/`, which collides); the ledger lives in the *primary* checkout's
`.better-dev/ledger/<feature>/` (shared across worktrees); detection is premise-verified at the git level;
the primary checkout tracks the integration branch while features are worktrees off it; done = a real check
going GREEN.

## 12. Build method

**Read the REAL source first - do NOT underbuild.** Before reimplementing a component, the build agent
**`opensrc` (or reads the local clone of) the exact files listed in `harvest.json` for that component**
(each source's `repo:path`) and studies how the mechanism *actually* works - its real logic, edge cases,
and the parts that make it good. `harvest.json`'s per-component `sources[]` (repo:path + what + adapt_notes
+ `copy_mode`) is the **reading list and the instruction**. This is not optional: "reimplement from
understanding" means *understand the real code deeply, then rebuild it in our own structure* - never a thin
approximation from the summary or from memory.

- Respect each source's **`copy_mode`**: `verbatim` (trivially-small helpers - copy as-is, then attribute in
  `NOTICE`), `adapt`, or `pattern-only` (reimplement the mechanism in our own voice).
- **Study the richest sources hardest - especially `forge` / `devloop` (orrgal1):** the proof-chain
  (goal→scenario→real test→passing run, "done means proven, not asserted"), `forge-ground` (premise verify),
  `forge-status` (disk-state resume), `grind` (iterate-to-green), `stuck-check` (rabbit-hole detector). Take
  these *properly* - they are the closest existing implementation of our core loop.
- If a component ends up thinner than its source's real capability, that's a bug - re-read the source.

**Verify every component** (valid SKILL.md frontmatter; scripts run + self-test; lint; dry-run). Phase-gated:
foundations proven before consumers build on them. Use **subagents/workflows** for fan-out (one component per
agent, worktree-isolated when writing files); **every build-agent prompt points it at `harvest.json` + the
source repos + this PLAN and tells it to opensrc the real files before writing.** Then a verify/synthesis
pass. Commit clean per component (Co-Authored-By trailer). Repo layout: `skills/<name>/SKILL.md`, `scripts/`,
`hooks/`, `.claude-plugin/`, `.agents/`, `NOTICE README LICENSE install.sh`.

## 13. What still needs the human (can't do autonomously)

Publishing to a marketplace/npm · pushing/branch-protection on a *real* remote repo · true multi-harness
in-agent invocation proof (I validate structure + dry-run; live Claude-Code/Codex/pi runs need you).

## 14. On-disk detail (read for depth; survives compaction)

- **This file** - master plan. **`DECISIONS.md`** - locked build decisions (D0-D8). **`README.md`** / **`NOTICE`** / **`LICENSE`**.
- **`raw/better-dev-design-principles.md`** - the full design spec (raw/ is gitignored, local-only).
- **`raw/sources/2026-07-03-harvest-manifest/`** - `manifest.md` (per-component sources, coverage, build order, attribution, completeness critic) + `harvest.json` (~100 sources: repo:path, license, copy_mode, adapt_notes, gaps).
- **`raw/sources/2026-07-03-opensrc-scan/`** - `report.md` (11-repo real-source synthesis) + `extractions.json`.
- **`raw/sources/2026-07-03-resource-scan/`** - memory/eval/orchestration tools (source-on-demand menu, NOT core).
- Other `raw/sources/*` - the ingested tweets/articles/repos/reel (Karpathy LOOPS.md, loop-library, etc.).
- **papers.town eval clone:** `/Users/yoelgal/Developer/papers.town-bd-eval` (fresh `--depth 1` clone; Next.js/TS/Drizzle/Playwright; has `CLAUDE.md`+`AGENTS.md`, `.claude/skills`, `skills-lock.json`, `feat/*→staging→main`). Use it for the tracer-bullet; do not push to `github.com/yoelgal/papers.town`.

## 15. Environment

Repo `github.com/yoelgal/better-dev` (private). `gh` authed as **yoelgal** with `delete_repo`+`repo`+`workflow`.
Working dir `/Users/yoelgal/Developer/better-dev`. `raw/` is gitignored - **never commit it**. Memory dir:
`~/.claude/projects/-Users-yoelgal-Developer-better-dev/memory/`. Toolchain verified: `yt-dlp`, `ffmpeg`,
`whisper-cli`, `gh`, `jq`, `node`, Playwright (for agent-browser-style work: prefix with
`DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib` for any yt-dlp DASH work).
