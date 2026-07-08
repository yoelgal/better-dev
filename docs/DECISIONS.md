# better-dev - Build Decisions (locked defaults)

Opinionated defaults that resolve the spec's open design calls so skills are built against settled
foundations. These are **my calls** (per principles #6 opinionated / #7 overridable) - flagged for review,
not set in stone. Spec: `raw/better-dev-design-principles.md`. Build plan: `raw/sources/2026-07-03-harvest-manifest/`.

## D0 · Output layout
Product lives at the **repo root**; `raw/` stays the research archive.
```
skills/<name>/SKILL.md         # agentskills.io units (+ sibling .md refs, progressive disclosure)
scripts/bd-*                   # the bd-* spine (mem+ledger, block, dispatch, worktree-guard, review-package, skill-stage, link, package-check)
hosts/<host>                   # per-host install adapters (claude, codex, …) - each host's global skills dir
hooks/                         # optional SessionStart / SubagentStart injection
.claude-plugin/plugin.json     # Claude Code plugin manifest
NOTICE  README.md  install.sh  BOOTSTRAP.md
```
**Install model:** the TOOL installs **globally, per host** (never vendored per repo); a repo's `.better-dev/`
holds **data only** plus a per-machine `.better-dev/bin` symlink to the global install, so skills keep the
portable reference `.better-dev/bin/bd-mem`. Full model in **D10** (which revises the earlier per-repo /
`.agents/` vendoring assumption).

## D10 · Install model - global per host; a repo carries data only (revises D0, 2026-07-04)
Two layers (gstack-confirmed; per-repo skill-vendoring + a `.claude/skills` symlink-bridge is the deprecated
model - dropped):
- **Tool - global, once per machine.** `install.sh` links this clone's `skills/` into each detected host's
  native global skills dir (`~/.claude/skills/better-dev`, `~/.codex/skills/better-dev`) through one
  symlink-or-copy helper (`scripts/bd-link`; Windows copy-fallback), with per-host adapters under `hosts/`.
  Claude Code alternative = the `.claude-plugin` plugin. Update = `git pull` in the clone. Never duplicated per repo.
- **Repo `.better-dev/` = DATA only, committed** - `rules.md`, `overrides.md`, `learnings.jsonl` tracked;
  `ledger/` and `bin/` gitignored. `.better-dev/bin` is a per-machine symlink → the global install's scripts,
  so `.better-dev/bin/bd-mem` resolves everywhere (**Option-B reference model - zero skill churn**; skills
  never hard-code `${CLAUDE_PLUGIN_ROOT}`).
- **Repo-authored skills (from `/self-extension`) are repo-scoped** - committed to the repo's own project
  skills dir (`.claude/skills/<name>` on Claude), discovered only there, never added to the global tool.
  `/self-extension` classifies scope: project-specific → **local** (`.claude/skills/<name>`, this repo only;
  default when unsure); broadly-reusable → **global** = the user's OWN `~/.claude/skills/<name>`, seen across
  their repos - still their skill, sitting alongside the installed tool but never inside it (a tool `git pull`
  never touches it), and NOT packaged into better-dev or pushed upstream; genuinely unsure → **ask**. This is what makes a global tool
  safe: a repo-specific skill never clutters other repos.
- **One-paste bootstrap** (`BOOTSTRAP.md` + a README block) is the front door: detect host → global-install →
  `/onboard` wires the repo's data + the `bin` symlink + the discovery block.

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
- `.better-dev/rules.md` - human-readable promoted rules
- `.better-dev/learnings.jsonl` - append-only, confidence-scored (gstack-style)
- `.better-dev/overrides.md` - the #7 overrides layer (managed block; also mirrored to a CLAUDE.md block)
- `.better-dev/ledger/<feature>/` - loop state (contract.md, progress ledger, per-iteration receipts)
- **Typed-status amendment (2026-07-07, user-ratified, D13):** any record the model both reads and
  rewrites (contract done-criteria, ledger steps, worker reports) carries an explicit typed status
  marker (enum/checkbox), never a prose sentence a later session re-interprets; free-form narrative
  belongs in append-only receipts. writing-skills owns the authoring rule.

## D3 · Restart-from-contract (owned, karpathy-inspired, never quoted)
On `NO_PROGRESS` confirmed by stuck-check → **reset the feature worktree off `staging`, replay
`.better-dev/ledger/<feature>/contract.md`**, escalate to human **only if the contract itself is wrong**.
Reimplemented in our own words (LOOPS.md §V is personal-use - inspiration only).

## D4 · Agent-agnostic dispatch verb (owned by `orchestrating-agents`, D9)
**Dispatch itself is prose**, run through the host's fresh-context subagent primitive (Claude Code `Task`
for one worker, `Workflow` for fan-out/pipeline; equivalents elsewhere) - a bash script cannot spawn the
host's agent. Fallback when none exists: a single-session role-switch with an explicit context reset.
`.better-dev/bin/bd-dispatch` owns only the **file-handoff + ledger bookkeeping** around a dispatch -
`dir | brief <role> | record <role> <state> [note] | pending` - so a run survives compaction and resumes
finished work instead of re-dispatching it (it defers ledger resolution to `bd-mem ledger`). Preserves
planner / generator / evaluator separation on Codex / pi / hermes. We **advise** model-tiering in prose
("least-capable model that works"); we never **route** (no provider spine - see spec out-of-scope).

## D5 · Overrides layer = its own component
`.better-dev/overrides.md` (managed block), **read first by every skill**. The confirm gate
(*"make this the default here?"*) lives in whatever skill would write it. Never rewrites a shared skill.

## D6 · Scope additions (completeness critic - now in scope)
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
Create is the last resort - prefer proven, installed skills over fresh ones (ponytail: don't reinvent what
the ecosystem already has). A freshly-created skill passes test-before-promote first; once proven it can
later be published back. So `tool-sourcing` and `self-extension` are **one ordered flow**, not two.

## D9 · Subagents & workflows are how we do dev - component `orchestrating-agents`
Non-trivial dev work is **decomposed and run through the host's subagent/workflow primitives**, not
done inline: fan out independent work in parallel, dispatch fresh-context workers for isolated tasks,
keep planner/generator/evaluator separate (verify independently of generate). New Phase-1 component
**`orchestrating-agents`** owns this practice **and the D4 dispatch verb**. Agent-agnostic: use the
host's primitive (Claude Code `Task` + `Workflow`; equivalents elsewhere); fallback = in-session
role-switch with an explicit context reset. A bash helper can only *prepare and record* a brief/receipt -
it can't spawn the host's agent, so dispatch itself is prose the orchestrator executes.
`autonomous-loop`'s OUTER layer **references** this skill (single source of truth), never re-specifies
dispatch. Harvest: superpowers `subagent-driven-development`, forge/devloop dispatch, frugal (route
subtasks - a practice, not a provider spine). This is also how better-dev itself is built (dogfood).

## D11 - Review gates the PR; the PR stage is automation only (2026-07-07, user directive)
A pull request opens only after the change carries a clean independent review verdict recorded in the
ledger and keyed to the reviewed HEAD sha (`bd-mem ledger read <work-item> review.md`). `/pr-and-verify`
checks that verdict as an entry precondition and never runs review itself; its post-open job is CI
truth-reading plus runtime verification. A CI-red fix pass is re-reviewed in the worktree and re-recorded
before its commits push, so an open PR never waits on a reviewer.

## D12 - Synthesis-wave additions (2026-07-07)
- **Three new skills**: `security-pass` (owns the security knowledge + the canonical untrusted-output
  rule; review's Security channel else-branches to it), `design-brief` (thin design front-end; composes
  host design skills, hardcodes no stack or aesthetic), `uninstall` (human-triggered wrapper over
  `bd-uninstall`; dry-run default, data sacred behind --purge-data). `feature-ideation` is NOT a skill -
  plan-grill step 2 covers it.
- **Shared-disposition pattern**: the load-bearing one-line counter inlines at each skill's decision
  point (survives the skill being copied alone); ONE owning skill carries the full form; cross-references
  are /skill prose. Applied to the untrusted-output rule (security-pass), the runtime-observation rubric
  (pr-and-verify/verify-runtime.md), and the reward-hack clause (autonomous-loop's honesty invariants).
- **Effort vocabulary**: review effort is `light / standard / deep`; tier guidance lives once in
  `orchestrating-agents/tiers.md`, vendor-neutral, advise-never-route (D4 upheld).
- **Eval scope**: prose + one shipped `docs/TRAPS.md` (behavioral trap scenarios) + writing-skills'
  three-check proving bar. No eval harness, no per-skill fixtures.
- **Named non-goals**: stacked PRs (one work-item, one PR - devloop's /restack pattern deliberately not
  adopted); recurring/scheduled loop cadence (the host's /loop and /schedule own it; the loop stays a
  bounded goal-runner).

## D13 - Harvest-batch additions (2026-07-07 evening; rulings user-ratified)
- **One new skill**: `codebase-audit` - the advise-only "point at a codebase, tell me what's worth
  doing" front-end. Ephemeral by design: one-shot ranked findings with evidence, the human picks one
  item and enters `/plan-grill` or `/diagnose`; it writes nothing but its report and keeps no state.
- **Voice rule clarified (how principle 2 reads)**: a gate is a calm declarative naming its
  consequence; caps-lock walls AND hedge verbs are both banned - firm-with-consequence is not
  blocking. Owner: writing-skills.
- **Typed-status rule** (see D2 amendment): machine-rewritten records carry typed status markers.
- **Named non-goals added**: a persistent audit backlog + reconcile cadence (shadcn/improve's `plans/`
  shape) - collides with the one-work-item loop and the no-recurring-cadence stance, and the issue
  tracker owns triage; the method stays preserved in raw/ for a future reopen. The cross-vendor
  thin-wrapper dispatch pattern - rejected-for-now (adds surface with no owner need yet).
- **Eval-numbers policy**: shipped skills carry the mechanism and its reason, never a third-party eval
  percentage; numbers stay citable in raw/ working papers and commit messages.
- **Licensing note**: the two 2026-07 paper-styled one-pagers ("Fable Mode"; "Running Fable 5 Without
  Overpaying") are personal-use-only like LOOPS.md - ideas reimplemented, never their sentences.

## D14 - gstack harvest (2026-07-07/08; four rulings user-ratified, landing user-reviewed)
Full rulings R1-R15 in `raw/synthesis/2026-07-07-gstack-harvest/master-plan.md`; the load-bearing ones:
- **Vendored daemons (licensing exception on record)**: `browse/` and `ios-qa/` vendor gstack's MIT code
  substantially verbatim (user-ratified over a separate repo) - upstream license + commit pin per dir,
  `check-upstream.sh` red on security-file drift, compiled on first need, never CI-gated. New thin skill
  `ios-capability`; `browser-capability` runs a three-rung preference order (override > owned daemon >
  sourced). The reimplement-first default is unchanged for everything else.
- **Enforced guardrails**: `bd-guard` + two PreToolUse hook entries turn recorded safety policy into
  enforcement where the host has hooks; `safety-enforcement: hook | prose` recorded by guardrails-install;
  worktree-branching is the single boundary writer; `bd-guard off` is the escape hatch. The pre-commit
  secret scan requires a value shape, case-insensitive (precision fix, user-approved).
- **One report trailer** (`STATUS`/`VERIFY`/`COMMITS`/`BLOCKER`/`CONCERNS`/`QUESTIONS`, `STATUS` = D1
  states) owned by orchestrating-agents; review's severity counts are a "counts block", never a trailer.
- **Blast radius = the fix-scope contract line** (dir / file list / repo-wide + reason, written after root
  cause); no rating enum; `safety-scope` stays the only recorded number.
- **D2 amendments**: lessons carry `ts` + `source` (`observed | user-stated | inferred`); recall is
  latest-wins-per-key with provenance; `bd-mem prune --apply` may rewrite `learnings.jsonl` only at a
  release checkpoint, operator-confirmed, under lock. writing-skills owns the close-out disposition.
- **Vocabulary**: soak (pre-promote) / deploy verify / post-deploy watch ("canary" retired); hyphenated
  `deploy-*` rules; a "lens" is a named perspective with a checkable question block; second-layer typed
  enums are record markers, never loop states.
- **Host roster**: claude/codex/hermes shipped (premise-verified); adapters enumerated from `hosts/*`
  with `bd_host_dir_policy`; the rest wait on verification (issue #9).
- **Named non-goals (examined, rejected)**: tournament/best-of-N builds with self-scored winners; numeric
  1-10 confidence axes; per-project trend DBs and health-score dashboards; model overlays and any
  generated-skill pipeline; `WIP:` checkpoint commits; engineer-celebrity taste personas; cross-project
  memory; gstack's duplicated mega-preamble. Deferred to issues: eval harness (#6), cross-model second
  opinion (#7), remaining hosts (#9), self-extension quarantine lifecycle (#10).

## D15 - links-harvest additions (2026-07-08; rulings user-ratified)
Full plan: `raw/synthesis/2026-07-08-links-harvest/master-plan.md`.
- **Fixer continuity (user-ratified)**: a fix round reuses the implementing worker's live session -
  it already holds the files, suite state, and cache; independence binds the re-reviewer, never the
  fixer. Fresh fixer on a dead session (re-pin tier + constraints) or when the worker defended the
  defect as by-design. Amends the §5-loop fresh-worker-per-task line; owned by orchestrating-agents.
- **Both tiering directions**: tiers.md names delegate-down (orchestrator) AND escalate-up (a
  cheaper session buys a bounded top-tier consult at fixed moments: after orientation before the
  first substantive write, before settling done, on a stuck signal; output-capped; deliverable
  durable first). A non-top-tier session consulting up is the sanctioned move for top-band stages.
- **Brief-decode entry step**: plan-grill step 0 decodes somebody-else's-words briefs (verbatim
  capture into the contract, trigger-event-not-adjective, fork-typed candidate meanings,
  smuggled-solution translation, TBD(owner) over invented numbers, capped question batch beside a
  draft). NOT a skill - D12's feature-ideation precedent applies; sibling `brief-decode.md`.
- **One graded contradiction rule** (autonomous-loop owns): tool results contradict the BRIEF →
  surface a question naming both sides; a receipt contradicts a CONTRACT criterion → gap stop,
  settle `NEEDS_INPUT` with {contract line, contradiction, re-runnable evidence} - never drive a
  criterion green that a receipt shows is wrong. `DONE_WITH_CONCERNS` never absorbs a wrong target.
- **Contract-pin call sites**: `check-approval` re-runs before settling DONE/DONE_WITH_CONCERNS and
  as a `/pr-and-verify` entry precondition (the pin existed; only entry ran it). Loop-authored
  tests hash-pin into the ledger; a moved hash without a justifying red-then-green receipt settles
  `NEEDS_INPUT`. Every authored test shows a recorded red or one negative control before `DONE`.
- **Docs move with the diff** (autonomous-loop, at first green - the one legal edit point, since
  the review verdict is sha-keyed): delta-bounded sweep of tracked docs, split by "could this
  correction be wrong while the diff is right?"; factual fixes land, risky edits become PR-body
  concerns; new surface with no doc hit is a named concern; never generates. Event, never cadence.
- **Post-merge outward close-out** (pr-and-verify): four typed lines - lesson, shared-behavior
  change, originating report (`Fixes #n` + posted observation), parked-follow-up dispositions -
  each with an explicit negative form. Flag state is a deploy-verify target; the standing watch is
  offered (`standing-watch: offered | armed | declined`), never scheduled.
- **Reasoning-exposure rule (verified 2026-07-08)**: briefs never request raw chain-of-thought; on
  some hosts the request is refused and silently answered by a substitute model - on a quality
  drop, verify which model answered. Degraded fan-out runs disclose mode in the report's first line.
- **Design hardening**: token-set completeness slots (form only - values are never shipped, and the
  operator's personal taste stays personal per the no-persona ruling); pinned fonts/icons carry a
  license-portability check; brand/product register split with per-register slop tests; two-altitude
  guessability; existing-system read before direction; iteration never expands the token set
  silently; identity lock + family pass on variants.
- **Authoring standard**: least-privilege `allowed-tools` procedure (advise-only skills grant no
  Write/Edit); pinned output shapes are shown once as a filled example. Shown-format lint recorded
  as a `bd-skill-stage` candidate, not built.
- **Named non-goals (examined, rejected)**: pdd's freeze pipeline, skeleton emission, obligation
  graph, typed discharge enum, reconstruct-and-diff review, mutation testing proper, gap-stop
  skill; /fableloso and /brief-to-problem as skills; announce slice (tag + recorded release-notes
  rule carry it; user-ratified drop); impeccable's command vocabulary, slop-detector skill (source
  via /tool-sourcing), DESIGN.md parallel contract, per-model conditional blocks (model-overlays
  non-goal, D14), shipped font/palette bans; Diataxis quadrants, diagram-drift rule,
  CHANGELOG/VERSION machinery, docs-sync skill, doc-health table; 50-line SKILL.md cap; `paths`
  frontmatter (unverified, host-specific); week-later log scheduler (D12); Carmack pride persona
  (D14); plan-time press-release step.

## D16 - consent-based auto-merge (2026-07-08; user-ratified)
Auto-merge is opt-in at two layers. (1) The standing allowance: `/guardrails-install` records
`merge-policy: auto-on-green | human` (proposed at onboard, written on a yes) and, where the host has
a permission config, wires the merge-command grant beside it (Claude family:
`.claude/settings.local.json`, mirrored to worktrees) so an earned merge runs without a prompt; a
host without a permission config needs no wiring. (2) The per-work-item consent: every contract seal
(features via /plan-grill, fixes via /diagnose) asks - only when the allowance is recorded - whether
this item merges automatically on DONE or holds for the operator, recorded as the contract's typed
`merge: auto | hold` line. `/pr-and-verify` merges only on `merge: auto` + recorded `auto-on-green` +
no other gate; a hold line, a missing line, or an unset policy all hold - silence is never consent.
This flips the previous default (agent merges unless something recorded says otherwise); recorded
project overrides are unaffected and still win.

## Tracer-bullet findings (2026-07-03, on the papers.town clone) - bind Phase 1
Ran `onboard` + one feature slice → staging end-to-end on the real clone (locally, no push). Proven, plus:
1. **Helpers → `.better-dev/bin/`** (bare `scripts/` collides with the project's own - see D0 install contract).
2. **Ledger lives in the primary checkout's `.better-dev/ledger/<feature>/`, shared across worktrees** - not in
   the feature worktree (separate working tree). `autonomous-loop` + `worktree-branching` write there (forge keeps
   state in a shared `$FORGE_HOME` for the same reason).
3. **Premise-verify earns its place:** `staging` was documented in `CLAUDE.md` but absent from `git` - onboard must
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

## Licensing & attribution - the clean path (owner-approved 2026-07-03)
Build by **reimplementing patterns from understanding**. Ideas, methods, and system designs are not
copyrightable, so reimplemented components are our original work and owe **no attribution**. Copy verbatim
only when a snippet is too trivial to bother reimplementing - and minimize even that. Order of preference
per source: **reimplement > adapt > verbatim**.
- `NOTICE` credits **only** expression actually copied (today: the vendored `browse/` and `ios-qa/`
  daemons plus bd-guard's adapted pattern set - the D14 exception); pattern inspiration is courtesy, not required.
- Rewriting someone's file with an AI ≠ making it ours - that's a derivative work. We reimplement from the
  *idea*, not by paraphrasing their file.
- **Never redistribute** `karpathy:LOOPS.md` (personal-use) - reimplement, never quote.
- **Never copy** superpowers' maximalist "MUST/STOP" tone - take the plumbing, write our own voice.
