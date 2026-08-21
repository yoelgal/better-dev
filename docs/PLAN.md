# better-dev - Master Build Plan & Spec (consolidated)

**Single source of truth for building better-dev.** Self-contained: a fresh session or a subagent can
implement from this file alone. Exhaustive detail lives on disk (see §14) but you rarely need it.
Last consolidated 2026-07-03, after the research + harvest phase and Phase-0 foundations #1-#2.

---

## 1. What it is (and is not)

better-dev is a **portable set of dev PRACTICES packaged as skills (`SKILL.md`)** that run *inside* the
coding agent you already use - Claude Code, Codex, hermes, pi - to make it do software development well.

It is **NOT**: an agent or runtime · a framework you install *instead of* your tools · a model/provider
router (**no provider spine** - model choice is the host's and the host's own routing config owns it; we
never *route*, and we do **not** copy forge's `frugal`) · a cross-project brain (**no GBrain** - gstack's memory daemon deleted
users' working trees; project-scoped only).

The practices are the product; they are still skills, not a framework. Where a practice has to drive a
real surface it uses what the host already ships - the `browser` tool for web QA, the `lsp` tool for
structural orientation - and sources an outside tool only on a genuine gap, through `/tool-sourcing`.
On-device iOS QA is the worked example: the daemon is fetched from upstream when a work item needs it,
never vendored here. So "not a framework" holds - every tool a practice reaches for is one you could
run yourself, and none of them is a runtime installed in place of your own.

## 2. Principles

1. **Agent-agnostic** - `SKILL.md` (agentskills.io) is the portable unit; no lock to one model/harness.
2. **Composable, never blocking** - additive; complements installed skills/tools/MCP; never exclusive; no maximalist "MUST/STOP" tone. Firmness is not blocking: a gate is a calm declarative naming its consequence; a hedged gate reads as optional and fails (D13; writing-skills owns the rule).
3. **Self-describing** - each skill's `description` is what teaches usage, and the host injects those descriptions itself, so nothing has to be written into a repo to make the practices discoverable (D48).
4. **Self-improving & self-extending** - one ordered flow on a gap: **source first** (`find-skills`), **create only as fallback** (hermes `/learn`). See §7.
5. **Self-hostable / OSS-preferred; minimal deps** (bash-light).
6. **Project-scoped & opinionated** - one repo, not a cross-project brain; one strong way to work.
7. **User-steerable & self-revising** - override a practice in flow → the agent honors it now **and** records it in the harness's durable memory (light confirm before a one-off becomes policy; `/overrides` owns the read-first layer). Never rewrites a shared skill.

**Invocation rule (applies to every skill):** default **model-invoked** (agent-reachable). Use
`disable-model-invocation: true` **only** for things a *human* should deliberately trigger - destructive/
expensive actions, or a reference a person pulls up by hand. Disciplines the *agent* must apply on its own
stay model-invoked.

## 3. Core loop - work items are FEATURE **or** FIX

1. **Bootstrap for parallelism** - set up the *minimum base* (main/staging, worktree conventions, guardrails). Adapt to what's there; don't impose.
2. **Front-end (typed):** **feature → `plan-grill`** (ideate + grill the plan watertight); **fix → `diagnose`** (reproduce → red-capable signal → root-cause → falsifiable hypothesis); **no item yet → `codebase-audit`** (advise-only ranked findings on an existing codebase; the human picks, then the typed front-end runs - D13).
3. **Autonomous implementation loop** - same loop for both; run to real done-criteria; a fix's contract = red-signal-goes-green + regression test. See §5-loop below.
4. **Capability-gap → source the tool** (§7). Ships the *practice of sourcing*, not every tool.

Feedback: sourced capability feeds the loop; lessons + overrides persist to the harness's durable memory (self-revising).

## 4. Branching (locked)

`main` (protected, releasable, tagged) ⟵ `staging` (integration: PR + grill + verify, then soak) ⟵
`feature/<slug>` & `fix/<slug>` in their **own git worktrees** off `staging`; `hotfix/<slug>` off `main`
→ merges to both. Flow: worktree off staging → loop → PR → grill/review → merge staging → soak → promote
main. (Prefix naming is a per-project override - e.g. papers.town uses `feat/`.)

## 5. Memory - the harness's own durable store

No memory engine of ours, and since D48 no records file of ours either. Lessons, overrides and promoted
rules all live in the harness's own durable memory: on omp, `learn` writes one keyed entry and a later
**main** session receives it injected at start. That asymmetry is the whole subtlety (D49) - a dispatched
worker gets no automatic recall and no injected memories, and most of this library's skills run in a
worker. So a skill says to honor this project's recorded decisions from durable memory where it has it
and otherwise from the brief it was given, which makes the dispatch brief that
`/orchestrating-agents` defines a worker's only delivery path. That brief names the seven facts one by
one rather than saying "project decisions" - branch model, integration branch, feature prefix,
shared-or-solo and stack-or-greenfield from `/onboard`, plus the verify surface and runnable entry
points from `/guardrails-install` - and an unsettled fact reads `unknown`, never blank, since blank
reads as "no constraint" and the worker invents one. Writing stays with the main agent alone: a worker
that finds something worth standing returns it as a finding, and the parent confirms with the operator
and records. `skills/overrides/SKILL.md` is the single place that names a harness's actual surface, and
every other skill points at `/overrides`. Friction is a lesson like any other - there is no separate
queue to triage.

**The one thing still on disk** is `.better-dev/ledger/<work-item>/`: `contract.md`, progress, receipts,
`protect.hashes`. It stays a file because it is the sealed done-criteria plus the recovery map an
interrupted loop resumes from, git holds neither, and prose memory is the wrong shape for structured
per-item state. The loop creates it when it first needs it; nothing scaffolds it up front. That is the
entire repo footprint - no entry-file block, no overrides file, no install marker.

## 5-loop. The autonomous loop (the differentiated core) - four layers + a fresh spine

- **OUTER (orchestration):** reimplement superpowers' subagent-driven-development - read plan+constraints → per task dispatch a **fresh isolated-context worker** (the host's `task` tool, single-session role-switch fallback) with a file brief → generate a diff/review package → **independent reviewer that distrusts the report** (spec + quality verdict) → fix worker for Critical/Important (the implementing worker itself while its session lives - independence binds the re-reviewer, never the fixer; fresh on dead session or defended defect - D15) → append ledger line → next → broad final review → hand off to PR-into-staging. File handoffs; never grade own work.
- **INNER (drive-to-green):** reimplement devloop `grind` (verify→pick→implement-one-step→re-verify→log→commit, budget, protect-set) + `stuck-check` (rabbit-hole detector → halt-STUCK); precondition from mp `diagnosing-bugs`: name one **already-run red-capable command** before hypothesizing; per-slice from mp `tdd` (one test→one impl at agreed seams).
- **INVARIANTS (legitimacy):** from loop-library `loopy` + forge - observable done-criteria (no "until happy"), **never error/exhausted = success**, no-progress stop (don't invent limits), ask-don't-invent, verify separate from signal, independent evaluator, "done means proven not asserted", pre-loop ground-truth gate. Plus **absence is not evidence** (D50): a check that cannot fail proves nothing, so prove it red before trusting it green.
- **SPINE (fresh, ours):** ONE canonical terminal-state taxonomy = `DONE · DONE_WITH_CONCERNS · BLOCKED · NEEDS_INPUT · EXHAUSTED · NO_PROGRESS` (every source's verdicts map onto it); ONE durable ledger (SDD progress + grind scratchpad + loopy receipt merged) as plain files in the **primary checkout's** `.better-dev/ledger/<feature>/`, shared across worktrees (tracer-bullet finding); **restart-from-contract** (on `NO_PROGRESS` confirmed by stuck-check → reset worktree off staging, replay `contract.md`, human only if the contract is wrong - karpathy §V reimplemented, never quoted); dispatch + contract front-end + worktree/PR glue.

## 6. Onboarding - the entry skill `onboard`

Idempotent; greenfield **or** existing codebase. **Detect** (harness; installed skills/MCP; git +
branching; the conventions the repo already follows) → **adapt, don't impose** (respect those
conventions as overrides - never force main/staging or a prefix; scaffold minimum base only where
absent; never disable installed skills) → **record what it found in durable memory** → **grill +
light-confirm** before recording. Detection is a *premise* - verify at file:line before recording it
(never guess a command; unmapped capability = a gap, not an invention). Reimplement shape from orrgal1
`welcome` (idempotent detect→report→ask→act, `argument-hint` resume) + mp `setup`
(present-one-decision-at-a-time).

**It writes no file into the repo (D48):** no entry-file block, no `.better-dev/` scaffold, no ignore
line. It detects, records, hands off to `/guardrails-install`, and closes. The one repo mutation left is
not a file - on a staged model with no integration branch it offers once, on a yes, to create that
branch, because recording a model that names a branch nobody has is the premise-versus-fact failure this
skill exists to stop. It keeps one cleanup path: removing a discovery block or comms pointer by marker
in repos wired under 0.1.1 or 0.1.2, since nothing else knows where those markers are.

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
from the *idea*, not by paraphrasing their file. `NOTICE` credits **only** expression actually copied.
**The one exception on record (2026-07-07, user-ratified, D14) is closed:** the `browse/` and `ios-qa/`
daemons vendored gstack's MIT code substantially verbatim, being infrastructure too large to reimplement
without losing fidelity. The 2026-08 harness-native cutover removed both - the browser surface is the
host's own tool now, and the iOS daemon is fetched from upstream on demand - so nothing here is vendored
verbatim today and reimplement-first applies everywhere. **Never redistribute** `karpathy:LOOPS.md` (personal-use).
**Never copy** superpowers' "MUST/STOP" tone. See `NOTICE`, `LICENSE` (MIT, © 2026 Yoel Gal).

## 10. Components → reimplement from (condensed; full detail in the harvest manifest, §14)

All sources MIT unless noted. **opensrc the real files first (paths in `harvest.json`), understand them
deeply, then reimplement** (§12) - capture the actual mechanism, don't approximate. Coverage: all buildable
(2 full, rest partial, 0 from-scratch).

| Component | Reimplement from (understanding) |
|---|---|
| **writing-skills** ✅ | authoring standard - DONE |
| **onboard** | orrgal1 `welcome` (idempotent phases), mp `setup` (entry-file rule), forge `forge-setup`/`forge-ground` (never-guess, premise-verify) |
| **plan-grill** | mp `grilling` (one-Q-at-a-time + confirm gate), `to-prd`; forge `forge-ground` |
| **diagnose** (fix front-end) | mp `diagnosing-bugs` (red-first, minimise-repro, falsifiable), devloop `/root-cause` `/trace` `/pepper`, forge premise-verify, loop-library error-sweep |
| **autonomous-loop** | devloop `grind`+`stuck-check` (INNER), loop-library `loopy` + forge proof-chain (INVARIANTS), mp `tdd`; owned SPINE = terminal-states + ledger + restart-from-contract (karpathy LOOPS.md §V inspiration only, never quoted). OUTER dispatch **references `/orchestrating-agents`** - see §5-loop |
| **orchestrating-agents** (new) | superpowers `subagent-driven-development` (dispatch fresh workers, file handoffs, never self-grade, planner/generator/evaluator split), forge/devloop dispatch, frugal (route subtasks - practice only). Owns the D4 dispatch verb + fan-out/pipeline patterns; agent-agnostic (host `Task`/`Workflow`, in-session fallback) |
| **worktree-branching** | superpowers `using-git-worktrees` (detect-isolation, native-first), forge `forge-start` (HANDOFF_WORKTREE stop) |
| **review** | mp `code-review` (Standards+Spec, no self-grade), superpowers `task-reviewer` (distrust-report, diff-only) |
| **tool-sourcing** | find-skills CLI (ride it) + wrapped discovery (§7) |
| **self-extension** | hermes `/learn` (prompt-authored) + read-before-write + gstack `skillify` test-before-promote (§7) |
| **packaging-distribution** | `.claude-plugin/plugin.json`, symlink+copy-fallback install; delegate long-tail to `npx skills add` |
| **overrides** (own component) | read-first layer over the harness's durable memory, confirm gate; the one file that names each harness's surface (D48) |
| **release/promotion** | staging→main soak/promote, tags, hotfix double-merge (owned; no source) |
| **guardrails-install** | onboard *installs* pre-commit/lint/CI, not just detects |
| **pr-and-verify** | `gh pr create` into staging + end-to-end verify (drive the flow, not just tests) |
| **feature-ideation** | COVERED BY plan-grill step 2 (per-option assumption surfacing) - not a separate skill (D12) |

## 11. Build order & status

Built and shipping. The roster in `skills/` is the count of record - stale numbers here have burned us
twice. Phases 0-3 landed in order (foundations, core loop, self-improvement, ship), each component
reimplemented from real opensrc source and integration-tested. The 2026-07-07 synthesis wave then drove a
14-branch quality rewrite over them: reward-hack invariants + rationalizations table + learning-law in
the loop; claim-blind effort-graduated review; review-verdict-gates-the-PR (D11) + `verify-runtime.md`;
failure-behavior + threat-surface passes in plan-grill; parallel-baseline hardening in groundwork;
concurrent-actor + rollback discipline in worktree/release; three new skills (D12: security-pass,
design-brief, uninstall); disposition menu + proving bar in writing-skills; `docs/TRAPS.md`. That wave's
utterance routing table is gone with the block that carried it (D48).

**Install model (D42, superseding D10, D24, D32 and D37):** better-dev ships as a **host plugin**. The repo
root is both the marketplace and the single plugin it lists (plugin source `./`, catalog shipped
byte-identical as `.omp-plugin/marketplace.json` and `.claude-plugin/marketplace.json`), so nothing moves
into a package and the library ships no installer, leaves no install marker, and puts no copy of itself
inside a repo. Skills load through the plugin's own provider, which is why they no longer occupy the
operator's skills folder and why an operator's same-named skill wins on precedence. Which channel omp
installs through - a marketplace install or a plugin link - is not settled yet, and one verified asymmetry
is why: on omp 17.3.8 a marketplace-installed plugin's `rules/` is never loaded, because the provider
serving marketplace roots registers skills, commands, hooks, tools and MCP but not rules, while the
provider that does scan `rules/` filters marketplace roots out. So the comms block ships correctly and
reaches a session only through a linked install. A repo's `.better-dev/` now holds the work-item ledger
and nothing else - `/onboard` writes no file into a repo at all, and overrides and promoted rules live in
the harness's durable memory (D48). Repo-authored skills stay repo-local.

**2026-08 harness-native cutover:** everything in the library that duplicated a capability the host
harness already ships was deleted - the `bd-*` script spine, the hook and host-adapter layer, the
vendored browser daemon, and the code-graph wrapper skills. The practices call host tools directly now:
`task` for dispatch, `browser` for web QA, `lsp` for structure, `learn` plus `memory://` for lessons,
`todo` and plain ledger files for loop state, and a committed `.omp/config.yml` for bash approval
policy. One removed capability had no native equivalent and is gone rather than replaced: path-based
gating of edits to `.env*`, `**/secrets/**`, `*.pem`, and `*.key`.

Remaining work is human-only (see §13): real-remote branch protection, live multi-harness runs.

**Tracer-bullet gate (after Phase 0): ✅ PASSED** - ran `onboard` + one feature slice → staging on the
papers.town clone, locally, no push. onboard adapted (didn't impose); the slice went
worktree-off-staging → verify GREEN → merge-to-staging → DONE. **Its findings still bind (see
`DECISIONS.md` → Tracer-bullet findings):** the ledger lives in
the *primary* checkout's `.better-dev/ledger/<feature>/` (shared across worktrees); detection is
premise-verified at the git level; the primary checkout tracks the integration branch while features are
worktrees off it; done = a real check going GREEN.

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
pass. Commit clean per component (Co-Authored-By trailer). Repo layout (flat at the repo root again
since the 2026-08-14 extraction; it sat under `better-dev/` from the 2026-07-30 monorepo move until
then): `skills/<name>/SKILL.md`, `scripts/`, `.claude-plugin/plugin.json`,
`NOTICE README.md LICENSE install.sh`, all at the root.

## 13. What still needs the human (can't do autonomously)

Pushing/branch-protection on a *real* remote repo · true multi-harness in-agent invocation proof
(I validate structure + dry-run; live Claude-Code/Codex/pi runs need you). Distribution is not on this
list: D32 settled it as a clone of the public repo, so there is nothing to publish to a registry.

## 14. On-disk detail (read for depth; survives compaction)

- **This file** - master plan. **`DECISIONS.md`** - locked build decisions, D0 onward. **`README.md`** / **`NOTICE`** / **`LICENSE`**.
- **`raw/better-dev-design-principles.md`** - the full design spec (raw/ is gitignored, local-only).
- **`raw/sources/2026-07-03-harvest-manifest/`** - `manifest.md` (per-component sources, coverage, build order, attribution, completeness critic) + `harvest.json` (~100 sources: repo:path, license, copy_mode, adapt_notes, gaps).
- **`raw/sources/2026-07-03-opensrc-scan/`** - `report.md` (11-repo real-source synthesis) + `extractions.json`.
- **`raw/sources/2026-07-03-resource-scan/`** - memory/eval/orchestration tools (source-on-demand menu, NOT core).
- Other `raw/sources/*` - the ingested tweets/articles/repos/reel (Karpathy LOOPS.md, loop-library, etc.).
- **papers.town eval clone:** `/Users/yoelgal/Developer/papers.town-bd-eval` (fresh `--depth 1` clone; Next.js/TS/Drizzle/Playwright; has `CLAUDE.md`+`AGENTS.md`, `.claude/skills`, `skills-lock.json`, `feat/*→staging→main`). Use it for the tracer-bullet; do not push to `github.com/yoelgal/papers.town`.

## 15. Environment

Repo `github.com/yoelgal/better-dev` (public; the tool lives at the repo root). `gh` authed as **yoelgal** with `delete_repo`+`repo`+`workflow`.
Working dir `/Users/yoelgal/Developer/better-dev`. `raw/` is gitignored - **never commit it**. Memory dir:
`~/.claude/projects/-Users-yoelgal-Developer-better-dev/memory/`. Toolchain verified: `yt-dlp`, `ffmpeg`,
`whisper-cli`, `gh`, `jq`, `node`, Playwright (for agent-browser-style work: prefix with
`DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib` for any yt-dlp DASH work).
