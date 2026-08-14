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
| `DONE_WITH_CONCERNS` | proven; residue no fix pass can retire (accepted rebuttals, cannot-verify, doc judgment calls) - never an unaddressed fixable finding (D17) | SDD DONE_WITH_CONCERNS |
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

## D17 - all findings fixed in-loop; seal consent mechanically gated (2026-07-08; user directive)
From the papers.town nim-inference retro. (1) Every review finding blocks, Minor included: the fix
pass answers all of them (fixed or rebutted per reception's table), and a clean verdict means zero
open findings of any severity. `DONE_WITH_CONCERNS` narrows to residue no fix pass can retire -
reviewer-accepted rebuttals, unresolved cannot-verify items, judgment-call doc concerns. Severity now
sets fix order and review effort, never whether a finding gets addressed. (2) `bd-mem ledger approve`
refuses a contract without a `merge: auto | hold` line, so D16's seal question cannot be skipped.
(3) `/pr-and-verify` never opens drafts - a hold is expressed by not merging, and a draft hides an
earned green. (4) Settling `DONE`/`DONE_WITH_CONCERNS` requires a non-empty `receipts.md` - an
unrecorded loop settles nothing. (5) Reviewer-brief calibration: an abuse vector that drains a finite
budget or paid resource is at least Important.

## D18 - links-harvest rulings (2026-07-09; carve gate, D-format, expand-contract, effort knob user-ratified)
Sources: emilkowalski/skills, mattpocock/skills v1.1, shannholmberg orchestration chain, rich_odinn
effort-levels post (dossiers under `raw/synthesis/2026-07-09-*`). Adopted: always-on carve approval
gate in groundwork; expand-contract as carving.md's named wide-refactor exception; effort as a
budget axis distinct from tier (no imported numbers). **Format ruling (standing):** harvest
rejections land as one consolidated D-entry per batch, one row per rejection with a one-line why -
no more comma-runs, no backfilled index.

Rejected-with-reasons (one row each):
- Tracker-hosted planning map (wayfinder) - D2 keeps files/ledger the single source of truth; a tracker map splits it.
- A third planning front-end skill - groundwork + plan-grill occupy the slot (D12, D15); missing moves fold in.
- One-ticket-per-session / claim-by-assignment - human tracker ergonomics; fresh-worker dispatch + a worktree already claim.
- "Extremely extensive" user-story lists (to-spec) - extensiveness is an adjective satisfied by padding; done-contract right-sizing stands.
- Flag-first reviewer posture (Emil) - under D17 every finding blocks; flag-first amplifies noise in a blocking regime.
- 400-word review channel cap (Matt) - caps recall exactly where deep effort wants over-surfacing; effort tiers govern volume.
- Reviewer-side remedial fix ordering (Emil) - fix selection belongs to the fix worker; a reviewer cannot verify fixes from the diff.
- Moving refactoring wholly out of the loop (Matt's TDD change) - our cleanup pass is removal-only; adopting would delete the first-green slop-strip.
- Vendor-named model routing table (shann) - agent-agnostic principle; tiers.md carries the tier-shaped version.
- "Fable 5 Low beats Opus 4.8 xhigh" - unbenchmarked influencer claim; official guidance steers intelligence-sensitive work away from low. The opus-substitutes-fable5 design stance stands; no internal benchmark spent (user-ratified).
- Same-tier rerun of an unchanged goal on a miss - a rerun must change brief, slice, or tier; which one is triage, not a fixed rule.
- "The orchestrator never executes" absolutism - the loop's inline escape for a fully-specified, live-verified edit is deliberately cheaper; default, not ban.
- Pinned-open-questions-then-execute (shann's plan.md handoff) - proceeding with unknowns open is what seal-before-drive prevents; the pinned-question SHAPE lands via plan-grill's four-field `NEEDS_INPUT` handoff instead.
- Four-lens project review as a second audit taxonomy - codebase-audit keeps one vocabulary; the moves land as its Move column (cut/fix/add/restructure).
- Changesets/CHANGELOG - stays the D15 non-goal; a symlinked-clone install has no per-version consumer.
- `skills/deprecated/` graveyard - install reconcile prunes and the package gate catches dangling references; no clutter directory.
- Issue-tracker question at onboard - no skill has a hard dependency on a tracker mapping; revisit only if a triage-like skill lands.
- Spring constants, platform animation formulas, apple-design wholesale (Emil) - implementation values and platform taste, not practice; they belong to the composed host design skill.
- animation-vocabulary as a glossary skill or appendix (Emil) - a curated glossary mirroring a live external page is a dated content asset with a sync cadence; naming effects is host / tool-sourcing turf.
- Block/Approve verdict grammar inside design-brief (Emil) - verdicts belong to /review and the loop (D17: zero open findings = clean); a second verdict grammar would fork the loop's.
- A third design-brief sidecar (its own STANDARDS.md numeric catalog) - the handful of motion bounds fit the method rule plus slop-and-checks.md; a catalog earns a file only past what two files carry.
- The MUST-table anti-example device (showing the wrong output format beside the right one) - Negation in output-format form, the wrong shape named into context; D15's shown-once-as-a-filled-example rule covers the need.

Covered, not re-filed (recorded so the next harvest does not re-litigate):
- "Connected network of code review" (matt-thread reply) - whole-branch review before PR + staging soak + the foundation contract are the connective tissue; reopen only if a multi-item epic ships an integration defect its per-item reviews each passed.
- AI-misuse responsibility line (Emil's apple-design) - security-pass's model-output surface + plan-grill's abuse-case reference already cover it.
- Setup-skill one-time questions (Matt's setup) - `/onboard` has carried present-one-decision-at-a-time since Phase 0.
- `disable-model-invocation` scoping (Emil, via the design dossier's baton) - PLAN §2's invocation rule and writing-skills' frontmatter guidance already carry the same decision with the same costs named.
- rich_odinn "12 prompts" article - consumed; the one durable fragment (synthesize disagreement, never flatten it) landed in the research-dispatch conventions.

## D19 - podcast-thing transcript-audit rulings (2026-07-10; first full pipeline run in the wild)
Source: session d7ba7450 in ~/Developer/podcast-thing (onboard -> groundwork -> worktree ->
plan-grill -> autonomous-loop, ends mid-loop), audited against the skills it composed. Two systemic
themes: every human gate fired without rendering its artifact, and the loop ran soloist while its
receipts narrated compliance in the loop's own vocabulary. Adopted (traps 89-98):
- Native worktree tool owns placement; `.worktrees/` is the git fallback's default, never a native-tool argument; base honoring is the one legitimate hybrid.
- "Present before approval" = full artifact rendered as message text; a question-prompt synopsis or a file on disk is not presentation; a user asking to see the artifact gets the artifact, never the same prompt again.
- The loop's inline escape is a per-step conditions test (fully specified + live-verified), not a rationale a receipt can quote as a waiver; a whole work-item inline is a defect; can't-dispatch hosts run orchestrating-agents' degraded mode. (D18's "default, not ban" ruling stands - this pins the default's teeth.)
- Process policy (merge autonomy, deploy) is never an inventable contract default; an onboard-parked decision is recorded as `pending-decision:` and is a standing must-ask; absent an answer the conservative form goes in.
- A pasted brief seeds answers as quoted decodes, never as "stated knowingly"; unsupported answers stay must-asks; the carve gate is never batched with preference questions.
- Negative controls are per test; protect-pins land in the authoring pass; receipts land per pass (settle backstop is for crashes); the scope boundary binds where a step may write even for contract-named seams (route via the owning skill); worktree local-state copy happens at creation.
Not adopted as rules (compliance failures of existing text, kept as observations): setup commits on
main with staging force-synced (pre-pipeline setup; no skill governs it yet - revisit if it recurs
with a remote), planned-at-SHA drift check skipped (text already prescribes it), commits batched
(step 6 already prescribes per-step commits).

## D20 - tier-map resolution at the dispatch call (2026-07-10; recurring flagship-inherit complaint)
Source: repeated operator observation (podcast-thing and prior sessions) that fan-out workers run on
the session's frontier model despite tiers.md placing them mid/cheap. Root cause: D18 rightly rejected
a vendor-named routing table in the library, but "the host owns model choice" left the host's actual
choice mechanism - the per-dispatch model parameter - unaddressed, and an omitted parameter inherits
the orchestrator's model. Ruling: the library stays vendor-free; the binding lands as a repo-recorded
knob (`tier-map: top/mid/cheap -> host model names`, via bd-mem, recorded at the first fan-out if
missing, overrides winning) plus the rule that a band decision must reach the dispatch parameter -
silence at that parameter is a top-tier choice, not neutrality. Resume paths that drop per-dispatch
pins get relaunch-with-pin-restated, generalizing the host-specific observation. (Trap 99. D18's
no-router ruling stands - a recorded map the dispatcher reads is config, not a router.)

## D21 - flow-atlas audit dispositions (2026-07-10)
A 78-agent flow audit of the whole library raised 34 canonical gaps; every one carries an explicit
disposition here. 24 confirmed and fixed in this change-set, 6 refuted as already covered, 4
re-affirmations of standing decisions, plus two audit blind-spots parked as named follow-ups.

**24 confirmed - fixed in this change-set** (id -> landing site):
- Ship: **G02** promote-range migration gate + `release-promotion/migrations.md` (deploy-migrate
  vocabulary, snapshot-before-destructive-DDL, expand-before-deploy order); **G03** revert-range
  applied-schema check before any revert (release-promotion "goes bad" + pr-and-verify containment),
  `rollback-schema:` receipt line; **G05** hotfix routes through /diagnose first, expedited four-line
  fix-contract shown filled (hotfix.md); **G08** `deploy-env` parity check before treating an
  env-shaped failure as code (post-deploy + pr-and-verify step 3); **G12** `branch-model: trunk` as a
  first-class profile (onboard records it from git, worktree-branching edge-case profile,
  release-promotion reduces to tag-plus-verify); **G34** the flag's entry side - /plan-grill records
  `flag: <name>=<state>` in the done-contract, the exact line post-deploy already reads.
- Recorded keys (guardrails-install owns the schema): **G01** the greenfield fork - intentionally
  absent records `deploy-surface: none`, needs-creating routes to the new skill **`deploy-capability`**
  (+ `provisioning.md` for database/auth/email/DNS); **G04** the `obs-*` family with absence as
  explicit per-key `none`, filled by the new skill **`observability-install`**; **G22** earned
  autonomy - a counted 5+ unmodified-yes streak on a non-safety gate proposes the standing allowance
  once, safety gates excluded; **G24** `dev-run` / `seed-reset` (+ onboard Phase 1 detection);
  **G25** `ops-runner` + the operational-job criterion (done-contract) and verify-surface row
  (verify-runtime).
- Planning: **G13** two-repo work-items named at decode time, coordinated via
  `orchestrating-agents/cross-repo.md` (mirrored contract line, deploy-order gate in pr-and-verify,
  spanning done-criterion); **G14** chore-class contract-lite path (plan-grill gate + done-contract's
  four-part shape); **G15** routing-table rows for the new verbs, rollback merged into the
  release-promotion row, tie-break rule (CLAUDE.md + onboard block); **G21** mid-loop product
  corrections routed by /overrides' three-disposition test (amend / new item / in-scope one-off),
  loop carries the decision point.
- Loop and lanes: **G06** model-fingerprint staleness nudge (bd-session-start compare-then-warn +
  loop setup check + the TRAPS.md revalidation ritual); **G09** inbound-PR path `review/inbound.md`
  (host mechanics + recorded-policy overlay); **G11** solo-adopter onboard mode (`adoption: solo`,
  `.git/info/exclude`, local-only entry file, no shared-branch offer); **G20** `bd-mem ledger status`
  + session-start in-flight clause; **G23** shared-datastore lanes (per-lane namespacing in
  worktree-branching, data-disjointness in carving, `shared-runtime: serialize` recalled by both
  live-lanes checks); **G26** `learnings.jsonl merge=union` on team adoption + the `mem: <work-item>`
  close-out commit as propagation owner; **G27** `worktree-branching/handoff.md` (bundle on the
  branch: contract bytes, consent hash, reviewed-HEAD verdict, receipts; consent re-pins on pickup);
  **G30** library-defect-candidate disposition (self-extension names it, release distill surfaces
  it); **G32** promotion-independent distill anchor - `ledger init` nudges `bd-mem prune` past 200
  lessons, `--apply` stays release-checkpoint-only.

**6 refuted - already covered** (id -> coverage): **G07** out-of-git changes - done-contract/lenses,
pr-and-verify, and post-deploy already carry contract/verify/rollback for them; **G10** merge
conflicts - sync-base-every-pass, BLOCKED-external, and the live-lanes check; **G17** bad-release /
bad-merge recovery - containment + restart-from-contract + revert-forward/back-merge + TRAPS 42-44;
**G18** EXHAUSTED/NO_PROGRESS - ownership split ratified in D1/D3/D4, canonical next-moves in
terminal-states.md and restart.md; **G19** capability-gap chain - protect-set discipline plus
explicit NEEDS_INPUT exits in tool-sourcing and self-extension; **G28** decision rationale - the
tracked `.better-dev/overrides.md` is the read-first surface both auditors key off; the ledger is
runtime state by design.

**4 re-affirmed standing decisions**: **G16** the worktree handoff-and-stop is the deliberate
imported design (PLAN.md:133) - an agent cannot relocate its own harness session; **G29** no tracker
integration - the issue tracker owns triage (D13) and unattended cadence stays the host's (D12);
**G31** no self-telemetry aggregation - trend DBs and health dashboards stay rejected (D14), eval
harness still deferred to issue #6; **G33** no release-notes machinery - the announce slice stays
the user-ratified D15 drop.

**Parked, not absorbed** - the audit named two blind-spot axes its own lenses never covered: a
threat model on better-dev itself, and better-dev treated as a product. Triage lives in the issue
tracker (D13/D14), so each is to be filed as its own deferred issue - titles: "Threat model on
better-dev itself (audit blind-spot, deferred)" and "better-dev as a product (audit blind-spot,
deferred)" - and this paragraph records only the ruling; the tracker owns the backlog.

## D22 - settings-class writes go operator-run everywhere; the native worktree flow is zero-settings (2026-07-16)
Settings-class mutations - host settings and permission files - are operator-run everywhere in the
library, never an agent write: paste-ready with a clipboard offer where the host has one, always.
This revises D16's wiring mechanism only, not its consent policy - the allowance is still recorded,
the per-item merge line still gates, and silence is still never consent. The native worktree flow is
now zero-settings, revising D19's "one legitimate hybrid": native creation is named
`<prefix>/<slug>` directly, then `git checkout -B "$branch" "origin/$base"` (falling back to local
`"$base"`) honors the integration base in the fresh clean tree the native tool already created - no
host knob, no relocation prompt. Evidence: agent writes to `.claude/settings.json` /
`.claude/settings.local.json` are classifier-blocked in auto mode even with adjacent operator
consent (2026-07-16); host settings (`worktree.baseRef` and the like) are snapshotted at session
start, so a mid-session knob change never takes effect anyway; Claude Code's `EnterWorktree` `name`
parameter accepts `/`-separated segments, so naming the worktree with the resolved branch directly
needs no separate relocation step.

## D23 - wayfinder-flow harvest rulings (2026-07-18)
Sources: mattpocockuk tweet 2075856898142740821 (the /wayfinder pipeline clarification + its reply
thread), Whamp/wayfinder-to-spec gist, mattpocock/skills v1.2 unreleased delta (dossier at
`raw/synthesis/2026-07-18-wayfinder-flow.md`). Adopted: carved-item entry hydration + pause-the-wave
conflict stop (plan-grill, diagnose, groundwork handoff rewrite); groundwork's build-pull drift tell;
pass/refuse/pass gate proof (guardrails-install); commit-history hot-spot scoping (codebase-audit);
prototype branch-parking option at seal, third-party questionnaire unblock, fenced background fact
lookup (plan-grill); one-word-one-unit chain rule (writing-skills). Watch condition (standing): if a
third seam shows the missing handoff-contract bug - candidates: loop -> pr-and-verify, worktree
handoff pickup - extract the audit/hydrate/stop stage-boundary pattern into a shared doctrine doc.
- CLOSED by D27 (2026-08-05): the third seam was `/gauntlet`'s handoff; the pattern landed as three
  checkable lines in writing-skills, and the doctrine doc was declined (operator-ratified).

Rejected-with-reasons (one row each):
- Chart-time research subagents writing remote branches (wayfinder v1.2) - an unfenced background write path; shipped a filed side effect (their #576, unwanted draft PRs) within days; our dispatch stays read-only for fact-finding and writes go through the loop's protect-set.
- batch-grill-me frontier-rounds interview - in-progress draft upstream; one-question-at-a-time with unblock-first ordering is the deliberate interactive discipline; revisit if it graduates and the round-batching survives their own use. Re-grounded by D27 ruling 12 (2026-08-05): the draft shipped upstream, and the rejection now stands on the interactive discipline itself plus the observed form-answering failure of batched rounds.
- Per-host metadata sidecars (agents/openai.yaml beside every SKILL.md) - no second harness reads better-dev skills today; the agentskills.io format is the agnostic layer; revisit when a real Codex consumer exists (their "keep the two in sync" rule is the shape to copy then).
- One-file-per-ticket local tracker - better-dev has no local ticket artifact; the ledger is the store; nothing to change.
- Self-hosted single-plugin marketplace (.claude-plugin/marketplace.json) - REVERSED by D24 (2026-07-30): the agent-tools monorepo supplies the second consumer the rejection was predicated on; the marketplace manifest now ships at the monorepo root.

Covered, not re-filed (so the next harvest does not re-litigate):
- Spec-first-then-AFK-agent (the post's core preference) - is the plan-grill -> autonomous-loop architecture; validation, not a gap.
- Remote writes without consent (their #599) - operator-run/paste-ready + recorded-allowance policy (D16/D22) already holds this line.
- Durable context diverging across concurrent worktrees (their #579) - the primary-checkout shared ledger is the standing answer (bd-mem resolution rule).
- Prose router friction (their #591) - the CLAUDE.md routing table is already the deterministic form.
- "design tree" -> "decision tree" rename - plan-grill already says decision tree.
- New-map-per-epic, labels-over-segregation, spec-slicing-by-review Q&A - ledger keys per epic and the carve gate's granularity ask already carry these.
- ADR ends in checkable invariants - D-entries already function as rulings with teeth.

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
Build by **reimplementing patterns from understanding**. Ideas, methods, and system designs are
not copyrightable, so reimplemented components are our original work and owe **no attribution**.
Copy verbatim only when a snippet is too trivial to bother reimplementing - and minimize even
that. Order of preference per source: **reimplement > adapt > verbatim** - REVERSED IN PART by D31
(2026-08-07): for an **MIT-licensed skill source** the order is now to keep the author's wording
where the wording carries the value and credit it in `NOTICE`. Everything else in this ruling,
including both carve-outs below, still stands; read D31 before applying this line.
- `NOTICE` credits **only** expression actually copied; pattern inspiration is courtesy, not
  required. (This line used to enumerate the copied set inline. It was eight entries behind by
  2026-08-07 and read as a cap on what the section may hold at exactly the moment D31 started
  adding to it, so the enumeration lives in `NOTICE` alone now.)
- Rewriting someone's file with an AI ≠ making it ours - that's a derivative work. We reimplement from the
  *idea*, not by paraphrasing their file.
- **Never redistribute** `karpathy:LOOPS.md` (personal-use) - reimplement, never quote.
- **Never copy** superpowers' maximalist "MUST/STOP" tone - take the plumbing, write our own voice.

## D24 - agent-tools monorepo layout (revises D0, reverses the marketplace rejection; 2026-07-30)

The repo is now the `agent-tools` monorepo (github.com/yoelgal/agent-tools): each top-level dir is one
independently installable tool, and better-dev's entire D0 tree - `skills/`, `scripts/`, `hosts/`,
`hooks/`, `.claude-plugin/plugin.json`, `NOTICE README.md install.sh BOOTSTRAP.md`, plus `docs/` and the
gitignored `raw/` archive - lives under `better-dev/`. D0's install model is unchanged; only the root
moved. The monorepo root carries its own README, LICENSE, CLAUDE.md, shared CI, and
`.claude-plugin/marketplace.json` listing each tool as a plugin - the multi-plugin marketplace is exactly
the second-consumer case the earlier rejection named as its predicate, so that rejection is reversed, not
overridden. Branch discipline stays repo-wide (feat/* off staging, promoted to main); version stamps and
release ledgers stay per tool. Clone detection accepts both shapes (a pre-0.7.0 install resolves the old
repo root; `normalize_clone` in bd-session-start and the /update snippet step down into `better-dev/`).

## D25 - the chain continues by default; a known gate is asked at seal (2026-08-01; user-ratified)

From dogfooding issue 57: four operator stops in one work-item, three of which no policy required.
Rulings, in the order they bind.

1. **A recorded cadence decides the promote, not the agent's read.** `/guardrails-install` records
`release-cadence: per-merge | on-demand` beside `merge-policy`. Default and unrecorded both resolve to
`on-demand`, so every repo wired before this key behaves exactly as it did. On `per-merge`,
`/pr-and-verify` continues into `/release-promotion` in the same turn; that skill still fails closed on
its own gates, and a held promote is a normal reported outcome. A PR opened on `/release-promotion`'s
behalf (its version or manifest bump) is release-internal and never triggers the cadence, or the
release releases itself. Naming a successor skill in a closing line is NOT continuing to it: the
operator reads "Next: run X" as work still owed, which is what made the stop.

2. **The close-out is the only thing that binds.** `/pr-and-verify` had carried "hand the merged PR to
`/release-promotion`" in prose since before this, and it produced a menu anyway, because the mandatory
close-out enumerated five lines and none of them was the release. Second occurrence of the recorded
`gate-at-decision-point` lesson (the plugin.json version drift was the first). The enforcing line lives
in the checklist or it does not exist. Close-out is now six lines.

3. **`bd-mem`'s confidence law is a test, not a question.** Nothing in the library ever gated a memory
write on operator consent; `scripts/bd-mem` gates `remember` on verification alone. A fact verified
once this run is a `learn`, one watched hold more than once is a `remember`, and neither needs a click.
Offering the write spends a turn collecting a yes no policy asked for.

4. **A same-key override replaces the whole baseline entry.** The precedence itself is unchanged
(overrides win over the recalled baseline). What was missing is that one key commonly carries several
gates: this repo's general "agent merges its own green PR" override silently cancelled the path-scoped
`hooks/**` gate under the same `safety-gate` key, and the gate survived for weeks only because agents
read the baseline and skipped the precedence rule. An override meant to narrow rather than waive must
name what survives it. `/overrides` says so at the line that creates the collision.

5. **A known human gate is pre-authorized at seal, and the merge-time gate stands as backstop.** The
contract gains a `gated paths:` line beside the `merge:` line that `bd-mem ledger approve` already
refuses to pin without. Rationale is the cost of "no": at seal, no changes the seam or scope in a
sentence; at merge, no discards finished work, so the answer is structurally yes and the gate has
stopped reviewing anything. Because the seal names a PREDICTION of blast radius, it is
pre-authorization and never a replacement - a gated path the seal did not name still stops at merge,
so an item cannot escape a gate by mis-predicting its own reach.

6. **A contract-named out-of-boundary target is consented to, crossing included.** `/autonomous-loop`'s
edit boundary previously read "not the loop's to edit directly even when the contract names the seam,
because the contract consents to the change, not to crossing the boundary" - which makes ruling 5's
pre-authorization worthless for exactly the writes that need it. Caught by dogfooding this very
work-item: the contract named this repo's `overrides.md` reword, the operator approved that text
verbatim at seal, and the loop handed back a command it had written itself rather than running it.
Naming a target and then stopping on it is a double-ask. The exception covers only what the seal could
consent to: a denylist or human-gate-class path still escalates, and a target the contract never named
still stops. A missing tool op is never the trigger - a gap to route around, not consent withheld.

Rejected: a new stop taxonomy. D1 already defines `NEEDS_INPUT` as "needs human/context/approval"; what
was missing was a predicate, not a vocabulary. Also rejected: resolving same-key collisions by
specificity (makes "which is narrower" a judgment call at the moment a safety gate fires) and surfacing
them for the operator to resolve (adds a stop, in the safety class). Deferred, not refused: a
library-wide closed list of never-ask actions.

## D26 - a named list of machine-global writes is agent-run (2026-08-02; user-ratified)

A machine-global write **on the list below** is an agent write, and the running skill names it in
its recap with its undo, so the change is visible rather than silent.
**Reversible** (one command undoes it) and **non-secret** (it carries no credential) is what
qualifies a command for the list, never what authorizes a command that is not on it: a
machine-global write this list does not name stays operator-run, handed over as a paste block.
Settings-class writes are untouched: host settings and permission files stay operator-run per D22.
D22's block is a **capability** limit (agent writes to `.claude/settings.json` are
classifier-blocked, observed 2026-07-16), not a consequence rule, and over-reading it as a general
ban on machine-global writes is the misreading that produced the drift this entry ends.

The exception authorizes **specific named commands**, never an open class: an open class would
authorize arbitrary package installs under agent authority. Three carry it today, all made by
`/graphify-wrapper-setup` except where the third says otherwise:

- `uv tool install 'graphifyy>=0.9.18' --default-index https://pypi.org/simple` (undo: `uv tool
  uninstall graphifyy`). The version floor is pinned in the command itself, so no install lands
  below it. The index pin is best-effort and bounds nothing: `--default-index` sets uv's
  lowest-priority index, and `UV_INDEX` / `UV_EXTRA_INDEX_URL` are searched first (measured, uv
  0.11.7), so this authorization does not bound whose build backend runs under the operator's
  account.
- `uv tool upgrade graphifyy` with the same `--default-index`, run only below the version floor
  (undo: `uv tool install 'graphifyy==<the version the skill printed before upgrading>'`)
- `mkdir -p ~/.claude/graphify/<repo key>/` and everything written inside it: this repo's
  `registry.json` **and every graph built from any of its worktrees**, so what is authorized here
  is unbounded in size rather than one small JSON file (undo: `rm -rf` that directory, which
  discards every graph on this machine for this repo along with the registry; the next question
  rebuilds them). Made by setup step 2, and by `gfx_ensure_graph` when `/graphify-wrapper-query`
  heals a missing registry - the one write on this list a second skill makes, so that skill names
  it too.

Two costs no reversible undo erases. `uv tool uninstall` reverses the installed files, not the
code the install already ran; the version floor bounds what may run, not that something ran. And
the install is not a one-time execution: at every SessionStart `hooks/bd-graphify-refresh-stale`
spawns a background child that runs `graphify update` on each registered domain whose graph is
stale against HEAD and whose path the delta touched, so the package keeps running on that machine
until the domains or the tool go.

A fourth command joins by being added here, not by resembling these three.

The list carried a fourth on the day this entry landed: the never-commit guard, a global-gitignore
write made by setup so in-tree graph output could never be committed. It was authorized
**provisionally**, against the work-item that would relocate that output. The relocation shipped
(2026-08-03): graphs are written to an absolute `GRAPHIFY_OUT` under `~/.claude/graphify/<repo
key>/`, outside the tree they index, so nothing graphify writes can land in a repo and the guard
has nothing left to guard. The write is gone, so its authorization is gone with it - retired with
its cause, not revoked on its merits. The ruling above is untouched. Retiring a write does not
reverse the one already made: every machine that ran setup before the relocation still carries it,
so the 0.9.7 line in `docs/RELEASES.md` carries the undo as an `offer`, which is the only channel
that reaches an already-wired machine.

Evidence: `/graphify-wrapper-setup` has made these writes on every run since it shipped, while
`/onboard` forbade silent global machine changes in the same phase that hands the operator a
settings paste block; neither `docs/DECISIONS.md` nor `docs/TRAPS.md` carried a single graphify
entry, so the contradiction survived by nobody having decided it (audit, 2026-08-02).

## D27 - gauntlet-for-software harvest rulings (2026-08-05; four calls operator-ratified)

Sources: the re-submitted gauntlet-loop article, mfishbein's software-factory thread,
simoncorry/foundry and squidbay/factory, mattpocock/skills v1.2 delta plus the aihero wayfinder
piece, steida's observatory thread, and three research sweeps - five dossiers, a completeness critic,
and the master plan under `raw/synthesis/2026-08-05-gauntlet-software/`. Operator ratified four calls:
best-of-N stays rejected; D23's doctrine lands as `/writing-skills` lines; the artifact set leverages
graphify; scope covers features and PRs, not only a gauntlet run. Rulings, in the order they bind.

1. **The gauntlet run's artifact set is two plain files with one writer.** An append-only
`gauntlet/RUN.md` in the run's own working directory, one block per round - round number, one state
word per unit, the critic's named gap, spend against the ceiling - and the prompt saved beside it as
`gauntlet/PROMPT.md` rather than only on a clipboard. The progress page is a **renderer** over that
record, so a compaction costs markup and never history, and a fresh session resumes from prompt plus
record. Plain files deliberately, never `bd-mem`: a gauntlet run is a fresh session on a repo that may
carry no wiring, so a memory dependency would fail exactly where the record is needed most. Bar rows
live inline in the skill's step 2 - no sidecar. **Critic fence:** the record and the page are surfaces
the blind critic never reads; it receives the artifact and its bar row and nothing else. Where
graphify is wired, or one AST-only sync is cheap, the round block carries
`graphify-wrapper-query --affected`, so a round's blast radius is structural rather than recalled -
a run note, not a prompt sentence.

2. **The observatory generalizes past `/gauntlet`, and the D14/G31 boundary is ruled once here.**
One owner, `skills/orchestrating-agents/observatory.md`, carries the emission contract: the
append-only record, the page that renders and never records, the four state words
(`BUILDING`/`JUDGING`/`WAITING`/`STUCK`), the question channel, the counter rule, the critic fence.
Three skills compose it - `/gauntlet` for a fresh-session run, `/autonomous-loop` for a long or
unattended item (the ledger already is the record: a page renders `receipts.md` and `progress.md`
against the operator-set ceiling, and nothing new goes on disk to put one up), `/pr-and-verify` for
the landed `pr-evidence` block, one row per done-criterion with a literal `unverified` where a blank
cell would hide. **Boundary, cited by all three landings:** a counter series that lives inside one run
or one work-item, is never aggregated across items and never charted across time, is inside the
ruling - the same class as `receipts.md`. Nothing here reopens D14. steida's persistent code-health
observatory is out of scope for a practices library (that is a product, in its own repo), and
`/codebase-audit` is recorded as the shipped on-demand answer to his clause 6.

3. **Seven grill slots, three of them must-asks.** `Blast radius` joins the table: what live or shared
systems, paths, and credentials are in the run's reach, defaulting - and answering a user with no
preference - to a fresh directory, no credentials, no calls to a system the operator did not name. An
unnamed environment is not a permissive one. Prediction may never satisfy three slots: Bars, Stop
condition, and Blast radius wherever a live or shared system is in reach; each traces to a user
message in the conversation or to a quoted recorded override. `Unattended decisions` is **not** an
eighth slot - it is ruling 4 plus one batched pre-run question set folded into the existing handoff
step, because a question answered before the run starts is not a question that strands it at 3am.

4. **An unsettled fork mid-run splits by reversibility, and deviating carries a cap.** Under an
operator-set ceiling, a two-way door takes the conservative option, recorded as a named assumption in
the pass receipt and carried to the PR as a concern - no `deviations.md`, no new artifact class. A
one-way door (schema fork, destructive action, trust boundary, credential, addition to the goal set)
settles `NEEDS_INPUT` in a loop, or writes that unit's `WAITING` block with the question and two
candidate answers in a gauntlet run, advancing the other units and reading the answer file at round
boundaries. Cap: a conservative deviation counts as no new learning for the stuck check, so two
consecutive passes deviating on the same contract line trip the stuck signal. Answering a `WAITING`
question by writing one file is not interrupting the run - the watch-without-interrupting stance
forbade barging into the session's turn, not answering what the run asked.

5. **No `attendance:` field, as a standing non-goal.** No contract, ledger record, or override line
ever gains a boolean "the loop may proceed unattended" or "this item carries execution" field an agent
can author; #683 is the proof of what such a field becomes when the constrained party can write it.
The unattended signal stays the operator-set turn or wall-clock ceiling `/autonomous-loop` already
requires - set by hand, unwritable by the loop, and needing no render-minimum or approve-gate change.
The Autonomy Dial (a spectrum from "suggest only" to "act and notify me after", settable per task
type) is recorded as **examined prior art**: its per-task-type dial is exactly the field this declines.

6. **`/review` owns rotation, and the cycle's hard ceiling is four rounds.** A full re-review declares
in one line an angle from outside the exclusion set (prior rounds' channel focuses and lens surfaces),
dedupes candidates against everything seen - counts blocks plus `reception.md`'s disposition table,
`REBUTTED` rows included - and closes `ROUND: <n> ANGLE: <one line> NEW: <count>`. Fix-confirm passes
are exempt; trap 73 already ruled that scope. "Unrun round" retires as vocabulary. `/autonomous-loop`
carries the consequence sentence: a zero-finding round with no new angle is re-dispatched, never read
as a verdict. **Accounting ruled:** a re-dispatched round counts toward neither cap, at most one
re-dispatch per round, so bookkeeping can neither exhaust the ceiling nor unbound it. "The same seam"
is defined - same file plus the same function or block; different files, or different blocks of one
file, are the next layer and do not trip the cap.

7. **One disproof vocabulary.** `reviewer-brief.md` carries the full form: before a row reads `DONE`,
spend one attempt on the opposite claim and let the Evidence cell carry both the behaviour at
`file:line` and the failed attack (`tried: <input> -> <where it held>`); one attempt per criterion,
never a matrix. `/gauntlet`'s critic line uses the same verb ("tries to prove the artifact fails its
bar row") as a reference to that idea, not as a second definition of it.

8. **Both comprehension surfaces land; the per-work-item explain artifact does not.**
`/pr-and-verify`'s settle announcement gains the capability sentence - what the operator can now DO,
banned from containing a file path, a file count, or a first-person verb about the session's work -
and `/gauntlet`'s prompt names the return report as the run's last act: two paragraphs (what you now
have; what it cannot do yet) plus one line per unit naming its bar row and its closing round. A
per-work-item explain artifact (owner's manual, comprehension quiz) is a **named non-goal**: the
steered pipeline's operator reviewed every gate, so it would serve a bottleneck that pipeline does not
have.

9. **One prose rule gets script teeth; the other convenience read does not.** `bd-mem
persist-override` refuses a `safety-*`-class line carrying no `[operator: "<their words>" <date>]`
marker, and the reader-side rule lands beside the overrides-win text: an unmarked safety-class line
reads as absent and the recalled baseline gate stands. This is consistent with D25 ruling 3 - that
de-gated memory writes on consent, this demands provenance on one key class and asks nobody anything.
`approvals.log` entries carry the operator's answer quoted in their own words; an entry without one is
indistinguishable from a waiver the loop wrote for itself, so it authorizes no resume. The
`ledger status` stage column is declined - a resuming agent derives the stage with `ls`.

10. **Best-of-N stays rejected, critic-scored included** (operator-ratified). D14's rejection binds
critic-scored best-of-N against a pinned bar too: the spend multiplier is real, and a gauntlet run's
only cost governance is its stop condition.

11. **D23's watch condition is MET and closed** (operator-ratified). The third seam is `/gauntlet`'s
own handoff. The pattern lands as three checkable lines in `/writing-skills` - every stage boundary a
skill ships names an audit gate (proceed only when the named checks pass), a hydration step (the next
stage re-reads the decisions and never trusts a summary), and an explicit stop reporting exactly what
keeps the boundary closed. **No doctrine doc:** four boundaries already carry the pattern, and a doc
would cache their text. Gauntlet's own boundary is fixed by ruling 1 plus one run note - the first
work-item on the artifact after a run is a review pass over what landed, not a feature, and the bar
rows seed that item's done-criteria.

12. **D18's batch-grill rejection is re-grounded, not reversed.** Its original predicate ("in-progress
draft upstream") is gone - the rounds mechanic shipped. The rejection now stands on refreshed grounds:
one-question-at-a-time with unblock-first ordering is the deliberate interactive discipline, and our
own form-answering observation is that batched rounds get answered as a form rather than considered.
No mechanism change.

13. **The sentence budget and the net delta are gates, not aspirations.** `/gauntlet`'s worked example
stays at or under 13 sentences, counted in the diff - bar rows replace the old bar sentence, and the
record-plus-page-plus-question sentences replace the old progress-surface one. The panel enumeration
and the per-round field schema stay OUT of the prompt (the source's own "you don't need to
over-specify this" wrote the current cell) and live in `observatory.md` for the skills. Hot-file edits
state their net character delta in the commit body; `autonomous-loop/SKILL.md` and `review/SKILL.md`
each stay net under +2,000 characters this batch. The 97.7k-characters-per-pass read-budget diagnosis
is real, and its fix - extracting loop setup into a sidecar - is its own chore work-item, never a
harvest rider; `/writing-skills` gains the deletion test (does every sentence change what a reader
does?) as the standing counterweight.

Also adopted, one line each, no ruling needed: `/update` checks both sources of truth updated by
different human acts and takes the newer, and never string-sorts version-like identifiers (`sort -V`);
`/observability-install` gains the honest-null rule (a check whose failure mode is indistinguishable
from its success mode is not a check, and a red X on a nightly read-only job trains people to ignore
it); `/guardrails-install` gains the corroborating blast-radius line (a capability that CAN act
autonomously is not thereby AUTHORIZED to); `/tool-sourcing` gains the SEO-mill caution (templated
AI-generated comparison domains need a provenance sniff before a hit counts as found); `/review`'s
drift check reads the groundwork record's do-not-modify list via `bd-mem ledger read` rather than a
second recorded key; `--affected` filtered to test paths lands at its owning verb
(`/graphify-wrapper-query`) and in `/review`'s ripple step - the loop's triage cites the verb and
reads the filter from its doc; `/codebase-map`'s freshness hedge becomes the named
`/graphify-wrapper-status` command with three dispositions; and gauntlet's bar rows carry the comp-plus-deltas form, the no-comp written behavior
list authored by an agent that will not implement that unit, `none, deliberate` for a declined axis,
and the carve rule that every unit names at least one row.

Rejected-with-reasons (one row each):
- `skills/gauntlet/bars.md` sidecar - a 136-line skill whose whole output is one paste block buys a progressive-disclosure hop for roughly 15 lines; the rows go inline in step 2.
- Five-panel page mandate plus the six-field per-round schema - machinery where two sentences hold, against a prompt whose ceiling is a dozen sentences and a source that says do not over-specify the surface.
- `deviations.md` as a ledger artifact class - five files for a record the pass receipt already exists to hold; the conservative choice is a named assumption in the receipt, carried to the PR as a concern.
- `attendance:` contract field - puts a "may proceed unattended" boolean in a file the constrained party can write; the operator-set ceiling already carries the signal (ruling 5).
- `BAR.md` / `ROUNDS.md` / `STATE.md` file triple - three writers of one run's state; ruling 1's single append-only record plus the saved prompt covers resume and history both.
- Bar-derivation recipes (screen-record the comp for frame timings, capture its waterfall) - speculative; no operator has wanted a performance bar yet, and "every number names its source" already forces the honest answer.
- `ledger status` stage column - runtime for a fact five `test -f` calls infer; a resuming agent reads the artifacts directly.
- Per-work-item explain artifact (owner's manual, quiz) - serves a comprehension bottleneck the steered pipeline does not have; the two settle-time surfaces in ruling 8 close the real absences.
- Stage-boundary doctrine doc - four boundaries already carry the pattern; a doc would cache their text and drift from it. The three checkable lines go in `/writing-skills`.
- Batch-grill frontier rounds - re-grounded, not reversed (ruling 12): batched rounds get answered as a form, not considered.
- Critic-scored best-of-N against a pinned bar - operator-ratified extension of D14's rejection; the spend multiplier is real and the stop condition is a gauntlet's only cost governance.

Covered, not re-filed (so the next harvest does not re-litigate):
- steida's clause 6 (track complexity, coverage, duplication, readability) - `/codebase-audit` is the shipped on-demand answer; the trend DB half stays rejected under D14.
- The ADE vendor definition (a task board, a spec-approval gate, an isolated branch per agent, the runtime, a review layer ending in a PR) - a clause-by-clause description of this library's pipeline, arrived at independently. Corroboration, not a gap.
- The Autonomy Dial - examined prior art, declined by ruling 5; recorded so it is not re-proposed as new.
- "A capability that can act autonomously is not thereby authorized to" - independent corroboration of `/guardrails-install`'s blast-radius framing, landed as one line there.
- Issues #6 (Braintrust's eval-gated CI: the trace becomes a test fixture) and #7 (critic-harness slot knob; different-model-same-diff rotation axis via the D20 tier-map) - nudged by comment, deliberately not by skill change.
- Glamorous Toolkit's verbatim ingest, the Sourcegraph/Amp split, Riftmap - promoted hops this batch did not fetch; recorded as next-batch inputs in the batch manifest rather than dropped.

## D28 - observatory-viz harvest (2026-08-05; three calls operator-ratified)

Sources: 4 dossiers, a completeness critic, and the master plan under
`raw/synthesis/2026-08-05-observatory-viz/`, built against a live verification pass (graph built
for this repo: 1929 nodes / 3184 edges / 162 communities at 9b27ee6; callflow and wiki exports
tested working, svg export reproduced broken). Operator ratified three calls: (1) this work-item
lands both the free path (text edits plus a setup fix) and the bd-atlas build in one pass, nothing
else grows the scope; (2) a CDN stays acceptable for graphify's own rendered pages (callflow,
graph.html) while the word "self-contained" is reserved for bd-atlas, which must open with the
network disabled; (3) the flows panel and the answer overlay are bd-atlas features now, with a
real path/affected export upstreamed to graphify itself recorded as an opportunity rather than
built here. Rulings, in the order they bind.

1. **Render ownership splits across three skills, no new skill.** Emission belongs to
`/graphify-wrapper-sync`: after `graphify update` the report's first line is the human-openable
page path, `graph.json` second; refusal (a semantic-only build, a zero-node or single-community
callflow graph) is reported, never fatal. Freshness is one column on `/graphify-wrapper-status`,
computed at read time from the page's mtime against `graph.json`'s `built_at_commit` - stored
nowhere. The look-first practice belongs to `/codebase-map`: open the domain's rendered page
before grepping, worded engine-agnostically. The query pointer is one line on
`/graphify-wrapper-query` naming the page beside the graph.
2. **Never pass `--output` on the callflow export.** The default filename lands on graphify's
`*-callflow.html` auto-regeneration glob, so every later sync refreshes the page for free; a
custom name is correct once and then silently stale forever. Stated in the sync skill with the
failure mode, not just the rule.
3. **Two surfaces, two names, one firewall sentence - and the deletion test decides which.** The
run observatory (`observatory.md`) renders a record that accumulates within one run. The codebase
atlas is a pure function of `graph.json` plus commit and holds no history: delete it and rebuild
it losslessly, or it is not an atlas. "Observatory" is not shared vocabulary; the firewall
sentence lands once, in `observatory.md`, and the atlas text cross-references it by name. Never
commit a rendered page, never store a render history; the freshness column computes, it never
accumulates.
4. **Flows are computed, never invented.** A flow is a named pair of endpoints a human or skill
declares in `flows.json` (`[{name, from, to}]`, config beside `graph.json`, not history); the
steps are whatever the embedded graph traversal yields at render time, recomputed per render so
they cannot go stale independently of the graph. bd-atlas checks every rendered flow against the
graph's own edges before a byte is written - endpoints, every step's node id, and every consecutive
pair as a real edge - so a fabricated path of real ids is refused by name, not just an unknown id.
A model never authors a flow's steps.
5. **Pedagogy is a sort order, not a narration.** bd-atlas orders what it shows (entry point
first, then fan-in rank within layer/community) and never generates per-step prose - no LLM call
in any render path, so the page can never drift from the graph.
6. **The wiki export is the agent-readable offline surface.** One line in
`/graphify-wrapper-query` names `graphify export wiki --graph "$graph"` (markdown articles,
`index.md` as entry point, zero JS) as the answer to "give an agent the whole area without the
graph tooling."
7. **Setup fix.** `/graphify-wrapper-setup` installs with matplotlib so `export svg` works -
reproduced broken (ImportError) on the harvesting machine. One line.
8. **codebase-map stays engine-agnostic.** No wrapper function names hardwired in; the
fallback-to-grep exit is tightened by condition (no structural tool installed and sourcing one
declined), not by naming a tool.
9. **bd-atlas is the build row.** One stdlib-only Python script (`better-dev/scripts/bd-atlas`)
rendering `<domain>-atlas.html` beside `graph.json`: one file, no server, no external fetch, opens
with the network disabled; data embedded in a JSON script tag and mirrored to `window.ATLAS_DATA`
so agents and the console both read it. The renderer computes its own layered layout (no vendored
JS, no CDN); drill-down goes community/layer cards to member nodes to a node card naming the next
`/graphify-wrapper-query --explain` command - a front door to the library's verbs, not a rival
surface. `--highlight "<a>[,<b>]"` re-emits the page with a precomputed highlight set, and the page
also accepts `#highlight=<id-list>` at open time. Above roughly 3000 nodes the page embeds the
community-aggregated graph plus per-community drill-down instead of every raw node in one SVG.
10. **Pipeline-hygiene folds are surgical, not a rewrite (R9).** Two land here, both one edit each:
`/graphify-wrapper-sync`'s torn-graph repair moves the unparsable `graph.json` into a timestamped
`.trash-<epoch>/` instead of `rm -f`-ing it, because an `rm` on a just-created path trips
destructive-action gates on hardened hosts and left the repair unable to run where it was needed
most; and `orchestrating-agents/briefs-and-reviews.md` gains one sentence requiring an output
naming contract to be stated together with its failure mode ("files not matching batch-N.json are
silently dropped by the merge" binds a worker where "filenames must match" does not). The larger
emission-contract upgrades that came with them in the dossier - arithmetic self-checks and ordered
deterministic repair for `orchestrating-agents` - are recorded as an opportunity rather than ridden
along: they change how every dispatch reports, so they earn their own grill and their own
verification pass, not a slot in a visualization harvest.

Rejected-with-reasons (one row each):
- Attendance-style run knobs (per-run dials over what the observatory records, filed with ruling 3's
  naming call) - what the run record holds is a ruling, not a per-run preference, and a dial over it
  is the first step back toward a series compared across runs, which D27 already rejected.
- Log overlay on the atlas - would make the atlas a run-fact surface and start the metrics-store
  slide; a fenced permission is still a permission, and run facts stay on the run observatory's
  record.
- Served dashboards (Vite plus a token gate) - contradicts no-server discipline; the artifact
  could no longer be shared as a file.
- Vendoring a multi-phase LLM pipeline or a JS graph library - `/codebase-map`'s "mature ecosystem
  territory" line stands; graphify already answers the schema; a vendored library is a
  NOTICE-plus-maintenance bill the stdlib renderer avoids.
- C4 as mandated notation - the atlas borrows the levels idea as drill-down without adopting the
  notation; `/design-brief` owns visual language.
- LLM-regenerates-the-page as the primary rendering path - that is what hallucinates components;
  the atlas is deterministic. The source thread's value was the artifact shape and the
  dual-delivery doctrine, both adopted; the regeneration method itself was not.
- Committing rendered pages or the graph - stale with a git blessing.

Covered, not re-filed (so the next harvest does not re-litigate): a persistent code-health
observatory tracking complexity/coverage/duplication trends over time (already rejected, D27);
shared "observatory" naming across the two surfaces (ruling 3).

Recorded as opportunities, priced but unbuilt: a real path/affected visual export upstreamed to
graphify itself (days, external review cycle; every graphify user would inherit it, and it could
retire bd-atlas's overlay duty); an emission-contract grill for `orchestrating-agents` (arithmetic
self-checks, ordered deterministic repair); an install-surface security audit of `install.sh`; a
bd-atlas tour mode surfacing ruling 5's sort order as a "read in this order" strip; watching
graphify 0.9.33's hosted-platform early access for a future serve story.

## D29 - mattpocock v1.2 release harvest rulings (2026-08-05 evening; four calls operator-ratified)

Sources: the v1.2 release announcement thread and the release-delta repo ingest (a621cc4..0986eba,
fourth capture of this repo). Three dossiers plus a completeness critic and the master plan under
`raw/synthesis/2026-08-05-mattpocock-v1.2-release/`. Operator ratified four calls: batch scope =
everything including the two author-decoupled droppables; the install-story repair as sequenced;
a **full per-skill human docs layer** - an operator override of the dossier's "no" and the critic's
cheap-middle recommendation, recorded as such; the retirement clause written now. Rulings:

1. **The docs layer exists**: one page per shipped skill at `docs/skills/<name>.md`, standard and
index at `docs/skills/README.md`. Four-section spine (What it does / When to reach for it / Common
questions / It's working if); FAQ evidence-gated from TRAPS/DECISIONS/RELEASES/rationalizations and
sized honestly; working-if bullets checkable without opening SKILL.md, bound by the pr-and-verify
capability ban list; a known unfixed sharp edge stated plainly with its stopgap (the page is the
user surface for edges; TRAPS.md stays the library record); no install commands (BOOTSTRAP.md is
canonical); the cache rule binds pages; branches in tables; a behaviour change lands with its page
re-synced in the same commit; `bd-package-check` enforces the name mapping both ways.
2. **BOOTSTRAP.md is the canonical install story** - README's locked-down block is regenerated from
it (marked so), and its update line names both channels' verbs. The standing-permission offer (2c)
is restored to the README block.
3. **The release ledger is a version-bearing surface**: release-promotion gates the RELEASES.md
line at the tag; the package gate bounds RELEASES.md versions against the manifest one-directionally
(a line ahead re-fires the nudge and re-asks a declined offer forever; equality is wrong - pull-only
releases legitimately trail, seven live tags prove it). Flags on a condensed line are the union;
a removal names its absorber or says "retired, nothing replaces it".
4. **Generic-name collision is named where it bites**: install.sh's skip report and packaging state
the consequence (a foreign same-named skill wins the name; /review is the loop's merge gate). The
plugin channel's host-namespacing fact is recorded in packaging. **Open verification row**: on a
machine with no clone symlinks, install better-dev as a plugin, route "review this diff", record
which skill enters. No chain rewrite until that observable fails. No writing-skills clause about
generic slugs is owed (resolved by the packaging sentence; do not add one later).
5. **The #693 coordinator-mode exposure** (Claude desktop/web drops user-invoked skills from the
listing) is answered by a fallback route in the always-loaded routing row - terse form - and a trap;
`/uninstall` keeps its flag: user-invoked-for-destructive-acts is right, the harness owns the fix.
6. **wizard's mechanic lands at exactly one seam**: deploy-capability rung 2's payload fork (values
transcribed -> one generated script, traced statically, never run end-to-end; probeable end states ->
block-by-block). No vendored template (bash-light, reimplement-first), no sidecar doc (D27 r11).
7. **writing-skills gains the batch's authoring rules**: the widened trigger (always-loaded blocks),
the cache leading word (the environment is a source of truth; a restated lookup passes the deletion
test and still rots), one-canonical-wording, delete-the-generator-with-the-thing, evidence-hunted
rationalization rows (an invented row is a suggestion, not dead weight), branches-in-tables with its
always-loaded-block boundary, a-skill-about-its-own-text-property-fails-by-growing, and
reach-for-a-pretrained-word-before-coining.

Rejected-with-reasons (one row each; full grounds in the batch dossiers):
- Narrative RELEASES.md entries - machine-read by two awk consumers; the one-line format is load-bearing.
- Changesets tooling - a Node toolchain and a bot for one line in one file.
- "Drop docs-only entries" - category mismatch; the tier system filters by consumer consequence, which is stronger.
- Empty deprecated/ bucket + public beta channel - a bucket that does not gate distribution is a label (their obsidian-vault proves it); self-extension's staging dir gates mechanically.
- The equality version check - red today by contract (0.9.14 manifest vs 0.9.7 newest line, seven pull-only tags).
- tag==manifest check - already shipped in release-promotion.
- A wait-what corrective skill - the comms block carries the preventive half; the naming insight is already the description rule.
- SKILL-MECHANICS-style split of writing-skills - one audience, no minority branch; the split buys a hop for material every reader needs.
- First-use-link mechanics - hypertext-page mechanics with no plain-text analogue beyond one-word-one-unit.
- The dictionary as a vocabulary asset - D15-era ruling at the Emil glossary row stands (dated asset, sync cadence).
- Flipping /uninstall model-invoked - PLAN section 2 holds; the upstream filer's own position: the fix belongs in the harness.
- Vendored template.sh / wizard sidecar doc - see ruling 6.
- The five-option phase-boundary tree as a shipped artifact - four rows covered by existing owners; /clear declined because the ledger IS the durable why its primary-source argument protects; their /handoff-was-oversold correction is a check worktree-branching/handoff.md passes.
- provisioning.md pointer sentence - a cache under the batch's own cache rule.
- Branch-table conversion of comms-block.md's "Override when" line - the block is read whole every turn by an agent, not scanned by a reader who knows their situation; the branch rule's own boundary excludes it.
- The narrative changeset style as a DECISIONS.md format upgrade - these rulings already read in that shape (what changed, what it replaced, the failure that drove it); nothing to add.

Covered, not re-filed (so the next harvest does not re-litigate): #747 is a second independent
same-day field report of the #683 self-authorization class - validates D27 rulings 5 and 9 with
field evidence; the 25-page per-page-agent docs rewrite corroborates /orchestrating-agents' fan-out
practice; #746 (whether-vs-where a change warrants the loop) is covered by front-end routing;
#748 (rename shipped, Codex sidecar not re-synced, model invocation silently dead) is live field
corroboration of D23's sidecar rejection; #481/Cursor asks carry no transfer under D23's
second-consumer predicate; upstream's marketplace.json deprecated-in-prose has no transfer (ours is
load-bearing); the v1.2.1 lesson is behavioural, not structural, for us (one version surface by
construction; the propagation receipt now names its channels).

## D30 - conversation-layer north star (2026-08-06 ratified; 2026-08-07 built)

Source: the operator's north-star alignment over the mattpocock v1.2 conversation layer, one day
after D29. The four contested calls were themselves put as one guarded round; all four came back
considered - two overrode the session's recommendation - which is the second live receipt for
ruling 1 below. Rulings:

1. **Ruling 12 (D23, re-grounded D27) reversed: the grill works the frontier in rounds, guarded.**
The recorded revisit condition was met - the rounds mechanic graduated upstream into the main
grilling skill and survived their own use - and the form-answering ground the rejection stood on is
answered inside the mechanic: a round caps at four, every question carries options plus a
recommended pick, a one-way door is always its own round of one, and a blanket accept-all reply
gets the two most consequential picks reflected back before locking. Evidence on the reversal side:
two live batched rounds in this repo's own sessions (2026-08-05 harvest scope round, 2026-08-06
north-star round) produced considered answers including overrides of the recommendation - the
observed failure did not reproduce under the guards. Traps 150-151 rig both guards.
2. **The D29 wait-what rejection is reopened by operator call: the corrective ships as a tiny
model-invoked skill.** The rejection's ground (the comms block carries the preventive half) stands,
but the corrective half had no home - the record's own "I just wanted 'here's what I'll build,
ok?'" moment is the evidence it was needed. The operator chose the skill form over a comms-block
clause. The ratified ledger line said user-invoked; it ships model-invoked - a build-time upgrade
disclosed at the PR, not silently ratified - so it fires on the natural signal ("wait", "you lost
me"), not only by name: a corrective needed at the moment of frustration cannot depend on
remembering a command, and the authoring standard reserves user-invocation for deliberate-command
skills. The body stays a few lines by design; the authoring standard's fails-by-growing rule has
its working example, and trap 152 rigs the growth ask.
3. **The questionnaire unblock gains a front door.** The grill-the-send machinery (landed at D27)
is reachable from any flow the moment the operator says a decision is someone else's - a routing
row plus an arrival paragraph in plan-grill, trap 153. No new machinery: a name and a door.
4. **D29 ruling 6 widened: the payload fork is the library's canonical walkthrough form.**
deploy-capability rung 2 keeps the full form and is named the canonical home; observability-install
and guardrails-install point at it from their own operator steps. Still no vendored template file -
bash-light, reimplement-first.
5. Two uncontested widenings ride along: the third-party logic prototype gains one tab per worked
case (each spelled out in plain words, its clicks numbered, the state rewound on open); the
writing-skills bar explicitly binds the sibling files a skill sends the agent off to read. Trap 155
rigs that second one: the sweep that stops at the `SKILL.md` files is a miss this very branch came
one review away from shipping, when ruling 1's repeal left `brief-decode.md` arguing from the
repealed rhythm and the reviewer, not the sweep, was what caught it.

Rejected-with-reasons:
- Full upstream-shape frontier rounds (whole frontier at once, no guards) - the form-answering
  observation was real; the two guards are the reversal's price, not decoration.
- A comms-block wait-what clause, or clause plus skill - the operator chose the single skill form;
  two homes for one corrective is drift.
- A standalone questionnaire skill - the machinery already lives in plan-grill; a name and a door
  was all that was missing (the laziness test).
- A full general wizard skill - the install-class seams are the observed need; a generator for any
  manual procedure anywhere is surface with no second user yet.
- Renaming writing-skills (writing-for-agents style) - a breaking rename buys a broken invocation
  path (upstream's own #748 is the field report) to gain a name; the scope sentence does the work.

## D31 - verbatim is allowed where the wording is the value (operator ruling, 2026-08-07)

Reverses the preference order in the 2026-07-03 licensing ruling above for **MIT-licensed skill
sources**. That ruling read `reimplement > adapt > verbatim`, with verbatim reserved for snippets
"too trivial to bother reimplementing". The grounds for the reversal are this branch's own receipts:
all four Blocking findings across four review rounds were one defect - upstream expression surviving
where `NOTICE` claimed none - and three of the four were dispositioned by rewording the line, each
trading precision for the claim. Round 4 measured one of them ("set your pick apart beneath each
one" against "your recommendation on its own line") as vaguer about the mechanism it specifies. The
operator's call: a skill's wording is part of what makes it work, so paraphrasing a well-made line
to avoid an attribution line is the wrong trade.

New order for an MIT-licensed skill source: **keep the wording where the wording carries the value,
and credit it**; reimplement where our shape genuinely differs. What does not change:

- **Credit by file, not by sentence.** A source's entry names the files of ours that carry its
  expression, the upstream files they draw on, examples of what was kept, and what stays ours. Six
  review rounds on this branch established why: a sentence-level entry names a file, naming a file
  puts it in an auditor's scope, the audit finds one more passage in it, and the entry that was
  written to be accurate is now false. A file-scoped entry survives the next passage found in a file
  it already names. `NOTICE` says so in the entry itself, so the scope is a stated choice rather
  than an omission.
- Every kept passage sits under a named entry in `NOTICE`'s "Copied verbatim / substantially"
  section, carrying the file, the upstream file, the licence and the copyright holder. The courtesy
  section's "reimplemented, no shipped text" claim closes with a pointer to that section, so the two
  can no longer disagree.
- **The licence still gates it.** No-licence and personal-use sources are unaffected:
  `karpathy:LOOPS.md` is never redistributed, and a gist with no licence stays ideas-only.
- Taste still gates it. Superpowers' maximalist MUST/STOP tone stays out, licence or not, and a kept
  line still gets house-rule treatment (dash-free, our own vocabulary in the surrounding prose).
- Rewriting someone's file wholesale with an AI is still not how we make something ours; this ruling
  is about keeping a line that is right, not about lifting a file and calling it reimplemented.

Applied in this branch: the four passages the earlier rounds reworded are restored to their author's
wording and credited (wait-what's leading framing on both surfaces, the grill's question format,
trap 153's send-not-subject antithesis and its questionnaire phrasing). The three F1 rewordings that
lost nothing stay as they are - the ruling permits verbatim, it does not require it.
