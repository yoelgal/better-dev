# better-dev - Build Decisions (locked defaults)

Opinionated defaults that resolve the spec's open design calls so skills are built against settled
foundations. These are **my calls** (per principles #6 opinionated / #7 overridable) - flagged for review,
not set in stone. Spec: `raw/better-dev-design-principles.md`. Build plan: `raw/sources/2026-07-03-harvest-manifest/`.

## D0 · Output layout

Product lives at the **repo root**; `raw/` stays the research archive.
```
skills/<name>/SKILL.md         # agentskills.io units (+ sibling .md refs, progressive disclosure)
.claude-plugin/plugin.json     # Claude Code plugin manifest
NOTICE  README.md  install.sh  BOOTSTRAP.md
```

## D10 · Install model - global per host; a repo carries data only (revises D0, 2026-07-04)

Two layers (gstack-confirmed; per-repo skill-vendoring + a `.claude/skills` symlink-bridge is the deprecated
model - dropped):
- **Tool - global, once per machine.** `install.sh` links this clone's `skills/` into each detected host's
  native global skills dir (`~/.claude/skills/better-dev`, `~/.codex/skills/better-dev`) through one
  symlink-or-copy helper (`scripts/bd-link`; Windows copy-fallback), with per-host adapters under `hosts/`.
  Claude Code alternative = the `.claude-plugin` plugin. Update = `git pull` in the clone. Never duplicated per repo.
- **Repo `.better-dev/` = DATA only, committed** - `rules.md` and `overrides.md` tracked;
  `ledger/` gitignored.
- **Repo-authored skills (from `/self-extension`) are repo-scoped** - committed to the repo's own project
  skills dir (`.claude/skills/<name>` on Claude), discovered only there, never added to the global tool.
  `/self-extension` classifies scope: project-specific → **local** (`.claude/skills/<name>`, this repo only;
  default when unsure); broadly-reusable → **global** = the user's OWN `~/.claude/skills/<name>`, seen across
  their repos - still their skill, sitting alongside the installed tool but never inside it (a tool `git pull`
  never touches it), and NOT packaged into better-dev or pushed upstream; genuinely unsure → **ask**. This is what makes a global tool
  safe: a repo-specific skill never clutters other repos.
- **One-paste bootstrap** (`BOOTSTRAP.md` + a README block) is the front door: detect host → global-install →
  `/onboard` wires the repo's data and the discovery block.

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

## D2 · Memory contract - files default

**The files (zero infra):**
- `.better-dev/rules.md` - human-readable promoted rules
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
We **advise** model-tiering in prose ("least-capable model that works"); we never **route** (no
provider spine - see spec out-of-scope).

## D5 · Overrides layer = its own component
`.better-dev/overrides.md` (managed block), **read first by every skill**. The confirm gate
(*"make this the default here?"*) lives in whatever skill would write it. Never rewrites a shared skill.

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
ledger and keyed to the reviewed HEAD sha (the work-item's `review.md`). `/pr-and-verify`
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
  orchestrating-agents, vendor-neutral, advise-never-route (D4 upheld).
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
  `ios-capability`. The reimplement-first default is unchanged for everything else.
- **Enforced guardrails**: recorded safety policy becomes enforcement where the host has hooks;
  worktree-branching is the single boundary writer. The pre-commit secret scan requires a value
  shape, case-insensitive (precision fix, user-approved).
- **One report trailer** (`STATUS`/`VERIFY`/`COMMITS`/`BLOCKER`/`CONCERNS`/`QUESTIONS`, `STATUS` = D1
  states) owned by orchestrating-agents; review's severity counts are a "counts block", never a trailer.
- **Blast radius = the fix-scope contract line** (dir / file list / repo-wide + reason, written after root
  cause); no rating enum; `safety-scope` stays the only recorded number.
- **D2 amendments**: lessons carry `ts` + `source` (`observed | user-stated | inferred`); recall is
  latest-wins-per-key with provenance. writing-skills owns the close-out disposition.
- **Vocabulary**: soak (pre-promote) / deploy verify / post-deploy watch ("canary" retired); hyphenated
  `deploy-*` rules; a "lens" is a named perspective with a checkable question block; second-layer typed
  enums are record markers, never loop states.
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
sets fix order and review effort, never whether a finding gets addressed. (2) A sealed contract
without a `merge: auto | hold` line is not sealed, so D16's seal question cannot be skipped.
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
receipts narrated compliance in the loop's own vocabulary. Adopted:
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
The ruling that a band decision must reach the dispatch parameter stands: silence at that
parameter is a top-tier choice, not neutrality, and a resume path that drops a per-dispatch pin
relaunches with the pin restated. The library stays vendor-free - the mapping is the host's own
routing config (`modelRoles`, `task.agentModelOverrides`, an agent's frontmatter `model` list),
never a router recorded here. D18's no-router ruling stands.

## D21 - flow-atlas audit dispositions (2026-07-10)
A 78-agent flow audit of the whole library raised 34 canonical gaps; the dispositions with a live
subject are recorded here. 20 confirmed and fixed in this change-set, 6 refuted as already covered, 4
re-affirmations of standing decisions, plus two audit blind-spots parked as named follow-ups.

**20 confirmed - fixed in this change-set** (id -> landing site):
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
- Loop and lanes: **G09** inbound-PR path `review/inbound.md`
  (host mechanics + recorded-policy overlay); **G11** solo-adopter onboard mode (`adoption: solo`,
  `.git/info/exclude`, local-only entry file, no shared-branch offer); **G23** shared-datastore lanes (per-lane namespacing in
  worktree-branching, data-disjointness in carving, `shared-runtime: serialize` recalled by both
  live-lanes checks); **G27** `worktree-branching/handoff.md` (bundle on the
  branch: contract bytes, consent hash, reviewed-HEAD verdict, receipts; consent re-pins on pickup);
  **G30** library-defect-candidate disposition (self-extension names it, release distill surfaces
  it).

**6 refuted - already covered** (id -> coverage): **G07** out-of-git changes - done-contract/lenses,
pr-and-verify, and post-deploy already carry contract/verify/rollback for them; **G10** merge
conflicts - sync-base-every-pass, BLOCKED-external, and the live-lanes check; **G17** bad-release /
bad-merge recovery - containment + restart-from-contract + revert-forward/back-merge;
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
- Self-hosted single-plugin marketplace (.claude-plugin/marketplace.json) - REVERSED by D24 (2026-07-30): the agent-tools monorepo supplies the second consumer the rejection was predicated on; the marketplace manifest now ships at the monorepo root. RE-REVERSED by D32 (2026-08-14): the extraction to its own repo removes that second consumer and the manifest is deleted, so this rejection stands again on its own terms.

Covered, not re-filed (so the next harvest does not re-litigate):
- Spec-first-then-AFK-agent (the post's core preference) - is the plan-grill -> autonomous-loop architecture; validation, not a gap.
- Remote writes without consent (their #599) - operator-run/paste-ready + recorded-allowance policy (D16/D22) already holds this line.
- Durable context diverging across concurrent worktrees (their #579) - the primary-checkout shared ledger is the standing answer.
- Prose router friction (their #591) - the CLAUDE.md routing table is already the deterministic form.
- "design tree" -> "decision tree" rename - plan-grill already says decision tree.
- New-map-per-epic, labels-over-segregation, spec-slicing-by-review Q&A - ledger keys per epic and the carve gate's granularity ask already carry these.
- ADR ends in checkable invariants - D-entries already function as rulings with teeth.

## Tracer-bullet findings (2026-07-03, on the papers.town clone) - bind Phase 1

Ran `onboard` + one feature slice → staging end-to-end on the real clone (locally, no push). Proven, plus:
1. **Ledger lives in the primary checkout's `.better-dev/ledger/<feature>/`, shared across worktrees** - not in
   the feature worktree (separate working tree). `autonomous-loop` + `worktree-branching` write there (forge keeps
   state in a shared `$FORGE_HOME` for the same reason).
2. **Premise-verify earns its place:** `staging` was documented in `CLAUDE.md` but absent from `git` - onboard must
   verify at the git level, never trust prose. Same rule for any detected capability.
3. **Primary checkout tracks the integration branch (`staging`); features are worktrees off it** (papers.town
   convention). `worktree-branching` detects and respects this rather than imposing a layout.
4. **Entry-file rule holds:** `CLAUDE.md` `@`-imports `AGENTS.md` → block into `CLAUDE.md`, idempotent, no clobber
   (verified against the real 2.6 KB file).
5. **Done = a real runnable check going GREEN**, recorded as the contract's observable done-criteria (not a claim).

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
independently installable tool, and better-dev's entire D0 tree - `skills/`, `scripts/`,
`.claude-plugin/plugin.json`, `NOTICE README.md install.sh BOOTSTRAP.md`, plus `docs/` and the
gitignored `raw/` archive - lives under `better-dev/`. D0's install model is unchanged; only the root
moved. The monorepo root carries its own README, LICENSE, CLAUDE.md, shared CI, and
`.claude-plugin/marketplace.json` listing each tool as a plugin - the multi-plugin marketplace is exactly
the second-consumer case the earlier rejection named as its predicate, so that rejection is reversed, not
overridden. Branch discipline stays repo-wide (feat/* off staging, promoted to main); version stamps and
release ledgers stay per tool. Clone detection accepts both shapes (a pre-0.7.0 install resolves the old
repo root; the /update snippet steps down into `better-dev/`).
- REVISED by D32 (2026-08-14): better-dev is extracted to its own repo and flattened back to the root,
  and the marketplace reversal recorded here is reversed with it; this entry describes 2026-07-30 to then.

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

3. **The confidence law is a test, not a question.** Nothing in the library ever gated a memory
write on operator consent. A fact verified once this run is a lesson, one watched hold more than
once is a rule, and neither needs a click. Offering the write spends a turn collecting a yes no
policy asked for.

4. **A same-key override replaces the whole baseline entry.** The precedence itself is unchanged
(overrides win over the recalled baseline). What was missing is that one key commonly carries several
gates: this repo's general "agent merges its own green PR" override silently cancelled a path-scoped
gate under the same `safety-gate` key, and the gate survived for weeks only because agents
read the baseline and skipped the precedence rule. An override meant to narrow rather than waive must
name what survives it. `/overrides` says so at the line that creates the collision.

5. **A known human gate is pre-authorized at seal, and the merge-time gate stands as backstop.** The
contract gains a `gated paths:` line beside the `merge:` line the seal already requires.
Rationale is the cost of "no": at seal, no changes the seam or scope in a
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
authorize arbitrary package installs under agent authority. A command joins the list by being added
here, not by resembling one that is. One carries it today:

- Replacing the lines between the `BEGIN better-dev-comms` and `END better-dev-comms` markers in
  the host's own global entry file with the body of `docs/comms-block.md` (undo: delete the marked
  block, markers included). Made by `/update` step 2 when the installed copy has drifted from the
  shipped body, and by `BOOTSTRAP.md` on a first global install.
  It qualifies on this list's own two tests: one command undoes it, and it carries no credential.
  It writes only between its own two markers, so operator text in that file is untouched either way.

  The operator's ruling that put it here, verbatim: "i shouldnt have to run that command, because it
  should be run for anyone when they run `/update`". The reasoning generalises past this one write. A
  drift check that ends in a paste block is a check whose fix depends on the operator noticing the
  output, and the drift it detects is invisible from the user's side: they experience a months-old
  block as the practices not working. This library shipped exactly that failure, so handing the repair
  back to the person who cannot see the problem is the wrong half of the loop to automate.

  D22 is not weakened by this. That entry keeps SETTINGS-class writes operator-run because agent writes
  to a host settings file are classifier-blocked, which is a capability limit rather than a consequence
  rule. The global entry file is a memory file, not a settings file, and a normal install already
  writes it.

## D27 - gauntlet-for-software harvest rulings (2026-08-05; four calls operator-ratified)

Sources: the re-submitted gauntlet-loop article, mfishbein's software-factory thread,
simoncorry/foundry and squidbay/factory, mattpocock/skills v1.2 delta plus the aihero wayfinder
piece, steida's observatory thread, and three research sweeps - five dossiers, a completeness critic,
and the master plan under `raw/synthesis/2026-08-05-gauntlet-software/`. Operator ratified four calls:
best-of-N stays rejected; D23's doctrine lands as `/writing-skills` lines; the artifact set is two
plain files with one writer; scope covers features and
PRs, not only a gauntlet run. Rulings, in the order they bind.

1. **The gauntlet run's artifact set is two plain files with one writer.** An append-only
`gauntlet/RUN.md` in the run's own working directory, one block per round - round number, one state
word per unit, the critic's named gap, spend against the ceiling - and the prompt saved beside it as
`gauntlet/PROMPT.md` rather than only on a clipboard. The progress page is a **renderer** over that
record, so a compaction costs markup and never history, and a fresh session resumes from prompt plus
record. Plain files deliberately, never a memory store: a gauntlet run is a fresh session on a repo
that may carry no wiring, so a memory dependency would fail exactly where the record is needed most.
Bar rows live inline in the skill's step 2 - no sidecar. **Critic fence:** the record and the page are
surfaces the blind critic never reads; it receives the artifact and its bar row and nothing else.

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
are exempt; `/review` already ruled that scope. "Unrun round" retires as vocabulary. `/autonomous-loop`
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

9. **One prose rule gets reader-side teeth.** An unmarked `safety-*`-class line - one carrying no
`[operator: "<their words>" <date>]` marker - reads as absent, and the recalled baseline gate stands.
This is consistent with D25 ruling 3 - that
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
drift check reads the groundwork record's do-not-modify list rather than a
second recorded key; and gauntlet's bar rows carry the comp-plus-deltas form, the no-comp written behavior
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
   **CLOSED by D32 (2026-08-14)**: the plugin channel is deleted, so a fresh install cannot be made
   through it and the verification row can never be run. The row is retired rather than left open on
   an impossible observation - and with one channel there is no host-namespacing to sidestep the
   collision, so the collision is answered by install.sh's skip report and `/review` alone, exactly as
   the rest of this ruling already says. A legacy plugin install predating D32 keeps whatever
   namespacing it had; nothing new acquires it.
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
observed failure did not reproduce under the guards.
2. **The D29 wait-what rejection is reopened by operator call: the corrective ships as a tiny
model-invoked skill.** The rejection's ground (the comms block carries the preventive half) stands,
but the corrective half had no home - the record's own "I just wanted 'here's what I'll build,
ok?'" moment is the evidence it was needed. The operator chose the skill form over a comms-block
clause. The ratified ledger line said user-invoked; it ships model-invoked - a build-time upgrade
disclosed at the PR, not silently ratified - so it fires on the natural signal ("wait", "you lost
me"), not only by name: a corrective needed at the moment of frustration cannot depend on
remembering a command, and the authoring standard reserves user-invocation for deliberate-command
skills. The body stays a few lines by design; the authoring standard's fails-by-growing rule has
its working example.
3. **The questionnaire unblock gains a front door.** The grill-the-send machinery (landed at D27)
is reachable from any flow the moment the operator says a decision is someone else's - a routing
row plus an arrival paragraph in plan-grill, trap 153. No new machinery: a name and a door.
4. **D29 ruling 6 widened: the payload fork is the library's canonical walkthrough form.**
deploy-capability rung 2 keeps the full form and is named the canonical home; observability-install
and guardrails-install point at it from their own operator steps. Still no vendored template file -
bash-light, reimplement-first.
5. Two uncontested widenings ride along: the third-party logic prototype gains one tab per worked
case (each spelled out in plain words, its clicks numbered, the state rewound on open); the
writing-skills bar explicitly binds the sibling files a skill sends the agent off to read. The sweep
that stops at the `SKILL.md` files is a miss this very branch came one review away from shipping,
when ruling 1's repeal left `brief-decode.md` arguing from the repealed rhythm and the reviewer, not
the sweep, was what caught it.

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

## D32 - better-dev is its own repo, flat at the root; the marketplace channel is deleted (revises D24; 2026-08-14)

better-dev leaves the monorepo. The GitHub repo is renamed `yoelgal/better-dev`, and everything that
sat under `better-dev/` moves back to the repo root - `skills/`, `scripts/`, `hosts/`, `hooks/`,
`docs/`, the vendored `browse/` and `ios-qa/` daemons, the `friction/` first-run harness,
`.claude-plugin/plugin.json`, `NOTICE README.md install.sh BOOTSTRAP.md`. `LICENSE` and
`.gitignore` never moved in the first place: they stayed at the root through D24 and needed no change
here. The gitignored `raw/` archive follows too, but by hand - `git mv` does not carry an untracked
tree. D0's tree is literally true again; D24's relocation held from 2026-07-30
to today. The install one-liner is now
`git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh`.

**The move is an ordinary `git mv` (323 renames), not a history rewrite, and that is a choice.** A
rewrite would produce a history where the files always sat at the root, and it would invalidate every
clone already on a machine. Truthful history wins over a uniform-looking one: the cost is that the log
shows the files at the root, then under `better-dev/`, then at the root again, which is what actually
happened.

**The self-hosted marketplace is deleted, and D24's reversal is itself reversed.** D24 overturned D0's
rejection of a single-plugin marketplace on one predicate: the monorepo supplied a second consumer, so
the manifest listed more than better-dev. The extraction removes that predicate, so the rejection
stands again on its own terms rather than being re-argued. `.claude-plugin/marketplace.json` is gone,
and any instruction to `/plugin marketplace add` or `/plugin install better-dev@agent-tools` is removed
rather than retargeted. better-dev is a clone-installed tool, full stop.

## D33 - a legacy plugin install is not a supported state (2026-08-15)

D32 deleted the marketplace channel, but not the installs made through it. Item 1's docs sweep found
three places still branching on one, disagreeing about what it means, and left the question open
rather than deciding it inside a sweep. Deciding it: **an install made through the plugin channel is
not supported.** The remedy is a clone install, not an update.

## D35 - the script surface was over-built; cut it and keep cutting (operator ruling, 2026-08-15)

An audit of `scripts/` and `hooks/` found **8,006 lines of shell and python** for a library whose
product is markdown an agent reads. The operator's ruling, verbatim: *"I don't get why we need all
these scripts. This thing should be able to be handled by the agent. I feel like making all these
scripts just makes it brittle."*

### The rule this sets

A new `bd-*` script has to earn its existence against what skill prose plus the already-running gate
already do. A proposed `scripts/bd-release-cut` was rejected under this rule the same day: version
arithmetic is `git log` read by the agent, atomicity comes from the commit rather than a script, and
the invariant it would have enforced is already enforced by `bd-package-check` on every PR. **Name the
collector before reaching for a script; often CI already is one.**

### Still open, deliberately

Over half of `bd-package-check`'s checks assert that a phrase exists in skill prose rather than that
anything works, and adding a check now needs its own documented protocol - a gate that needs rules
about how to extend it has outgrown its job. Cutting those is a reduction of the repo's own CI safety
net, so it waits on the operator naming the checks rather than riding a general mandate.

## D36 - better-dev runs on trunk; the staged model stays fully supported (operator ruling, 2026-08-15)

`main` is now this repo's integration branch and its release branch. `feat/*` branches off it and
merges back into it; a release is a version commit and a tag on that branch. `staging` is retired,
archived as `archive/staging-2026-08-15` and restorable from that pushed tag.

This reverses the branch discipline the `better-dev-extraction` groundwork carved (`feat/*` off
`staging`, promoted to `main`) and replaces the recorded `integration branch = staging` override. It
is a ruling, not a derivation: the operator asked for the release ceremony to go away, and a staged
model keeps it by construction - someone still has to decide when to promote, and that decision *is*
the ceremony.

**The library is not changing with it.** The operator was explicit: *"the goal is not to retire
anything, but it's more we wanna be flexible. So I think the default is clearly moving to trunk. But
if a developer still wants to use the whole staging approach, then there definitely still needs to be
a way for them to trigger a release and a promotion."* So `/release-promotion` drives four paths
(trunk or staged, crossed with whether a release tool is wired), every staged gate is intact, and
`staging` stays the example integration branch throughout `skills/`. An audit of all 34 files
mentioning it found **zero** that needed rewriting for the library's sake - only this repo's own
config did, which is the evidence that the staged path was never conditional on this repo using it.

**What it costs, recorded so nobody rediscovers it.** `main` is the distribution channel: users
install by cloning the default branch and update by pulling it. Under `staging` there was a buffer
where work accumulated before users could see it; there is not one now, so a merge is live on the
next `git pull` and a red gate reaches people rather than sitting behind a promote. `main`'s
protection is `strict: true`, so every PR must be up to date with `main` before it merges - a
day-to-day cost the staged model did not have.

The historical record is annotated, not rewritten: `docs/DECISIONS.md`, `docs/PLAN.md` and
`docs/TRAPS.md` describe decisions that were really made about `staging`, and they still say so.

## D38 - links-batch harvest rulings: the block gains a device that acts on a reply (2026-08-17)

32 submitted sources, 18 archive entries. Full plan at
`raw/synthesis/2026-08-17-master-plan.md`, frontier read at `raw/synthesis/2026-08-17-frontier-read.md`.

The operator re-submitted sources this archive already held, with two complaints: replies "too long and
verbose and not pragmatic", and `/wait-what` invoked "too often". Neither was a capture failure. The
26-row rule-by-rule diff against upstream grades our comms block STRONGER on two rows and narrower on
one, so the rules were not the problem: **nothing applied them at the moment they would bind.** Two
independent absences, and one regression.

**What was wrong, with receipts.**

- No device acted on a drafted reply. Every mechanism the library shipped acted on the *block*: one
  writer per destination, a single-home gate, a duplicate-copy trap, an authoring size trap.
- The installed copy had drifted from the shipped body. Two clauses in `docs/comms-block.md` had never
  reached `~/.claude/CLAUDE.md`; four installed clauses were reworded or dropped. Nothing reconciles
  them: the two writers (`BOOTSTRAP.md` globally, `/onboard` per repo) each run once, and
  `skills/update/SKILL.md` step 2 explicitly skipped content-only changes.
- The exploration carve-out written to answer upstream `ayghri/i-have-adhd` issue #42 had **regressed
  out** of `docs/comms-block.md` while a work-item contract still pinned it.

**Rulings.** Full text in the master plan; the load-bearing ones:

1. Argument completeness lands in the block, never in `/wait-what`. A fact stated without its
   consequence is the shape a reader answers with "wait, what?", so the fix belongs where it prevents
   the failure. `/wait-what` is untouched and stays its size: growing a corrective against volume fails
   the rule it teaches.
2. `prose` and `i-have-adhd` genuinely conflict on form. Resolved by axis rather than by picking a
   winner: lists for parallel enumerable facts, prose where items join with because, so, or but.
   Neither source adopted whole.
3. Brevity rules ship with their cheapest wrong obedience named. Shortness comes from cutting content,
   never from clipping sentences.
4. `/update` reconciles copies as well as links. The host-global write stays operator-run per D26.

**The harvest skill's own defect, and its fix.** The operator also reported that harvest passes "gloss
over some things". The depth ladder was enforced by prose, and this batch measured the result: seven of
fourteen extraction agents reported `DONE` over entries a mechanical check found incomplete, one missing
`source.md` entirely. The fix is a **refusal at a stage boundary**, not a lint - no new `bd-*` script,
per D35. Stage 2 will not open a dossier on an entry whose rungs are not dispositioned, and the grading
is done by a reader other than the writer.

The advisory alternative is a documented failure, not a hypothesis. Upstream `hyperresearch` built a
26-rule lint over exactly this problem and only 2 of its 26 rules bind, by being imported into the one
command that produces the ship verdict; the code comment explaining why is quoted at the decision point
in `skills/source-harvest/SKILL.md`, which is that quote's one home. The capture is at
`raw/sources/2026-08-17-repo-jordan-gibbs-hyperresearch/`.

Three further ladder rulings: the disposition shape is pinned (`CAPTURED` or `SKIPPED: <closed-list
reason>`), because the check produced false failures until it accepted the heading shapes agents
actually use; each rung now names the specific miss it suffers rather than only its category, since "go
deep" is an adjective; and a source's own evidence is read rather than its caption, because two sources
this batch had evidence that undercut their framing.

**Wayfinder, answered.** Neither obvious explanation holds: every rejection carries a recorded reason
and all seven ruled-on landings are faithful, one stronger than its source. The gap is **scope** - D18
harvested grilling, D23 harvested the handoff seam, and no batch ever took wayfinder's
artifact-and-typing model as its subject. "HITL" appears zero times in this file's 1,309 prior lines,
though the typing was captured verbatim in the first ingest and re-named in two more. Three ingests,
zero dispositions. Carried to its own work-item rather than folded here (master plan H3).

**Landed:** `docs/comms-block.md`,
`skills/update/SKILL.md` step 2, `skills/source-harvest/SKILL.md` (ladder plus stage-2 audit gate),
`skills/source-harvest/extraction-recipes.md` (single-browser batch reader after measuring 19 pages in
82s against 4 in 10 minutes, silent-video keyframe recipe, fxtwitter fallback).

**Rejected, so it is not re-litigated:** paraphrase distillation (training-time, no prompt-level
analogue); the `/effort` ladder as written (maps effort to job categories not judgment bands, and
`codex -e high` is not a documented flag); the smart-zone and dumb-zone vocabulary (undefined in its
source, and "handoff" is taken); "map once, not grep forever" as a claim (the replies falsify it for
active repos); taste-encoded design skills as a better-dev default (kept as a composed host capability).

**One lesson about this file.** The `groundwork` fog test shipped through a diff with no ruling and was
re-proposed three weeks later as a fresh finding. A landing recorded only in a diff is invisible to the
next harvest, which is why these rulings are numbered. Recorded as `harvest landing record`.

### D38 follow-up - keep upstream's wording, and state the reader model as upstream states it (operator rulings, 2026-08-17)

Three operator rulings after the first landing, all about `docs/comms-block.md`. Taken together they
reverse a compression this session had defended twice, so the reasoning is worth keeping.

**The framing was wrong, and it was wrong in a way that inverted the mechanic.** Our block opened "The
reader may have ADHD", which reads as an accessibility accommodation offered on a maybe. Operator's
correction, verbatim: "this isnt an accesibility thing. Its that if you tell the agent 'i have adhd' or
whatever the skill does, it helps the communication style". The declarative framing IS the instrument:
it is a prompt that shapes output, not a hedge about who might be reading. Upstream's own line is
declarative and ours now opens the same way: the reader's ADHD stated as fact, then what that means for
the output's shape. The sentence itself is not reproduced here, because the block body keeps one
canonical home in `docs/comms-block.md` and a quote in this file is the second copy that goes stale on
the next edit, which the package gate refuses by design. A hedge in front of an instrument disarms it.

**Keep upstream's wording rather than paraphrasing it.** Operator's ruling: copy the skill verbatim, or
at least the parts that carry the value. D31 already permits this for an MIT skill source and says why,
and this block is the case that proves the rule: three rounds of paraphrasing produced a version that a
reviewer measured as vaguer on the mechanism, and one round of compression deleted a rule outright while
recording itself as lossless. Now taken verbatim: the reader statement, the persistence clause, the
pre-send delete list with its first-line-and-last-line verify, the break-the-rules cases, and the
phrasing of the lead-with-the-action, numbered-steps, restate-state, suppress-tangents, visible-wins,
matter-of-fact-errors and cap-at-five rules. `NOTICE` records the split by file, naming both what was
kept and what stays ours, per D31's credit-by-file rule.

Ours in that file, and worth naming so a future editor does not "restore" them to upstream's shorter
form: the length budget by question class and the seven-paragraphs counter (from the `prose` capture),
the whole-argument rule, the message-is-its-own-summary rule, the glossing test, and the
report-versus-track carve-out with its diagnosing-or-exploring scope.

One mechanical note for the next editor, which bit this session:

- The gate's single-home detector greps for the block's opening sentence as its sentinel. Rewording the
  opening breaks the detector into reporting zero homes, which reads identically to a missing block.
  Both moved together this time; they have to.

**Every message is its own summary.** Operator-stated, verbatim: "treat every message it sends as a
tldr, but without saying 'tldr' explicitly at the start". Landed as its own clause:

> The whole message is the summary. No build-up to a payload, no separate recap at either end, and
> never a "TL;DR" label - a reader who stops after the first two lines still has the answer.

It is a shape rule and the length budget is a size rule, so they do not overlap: the budget says how
long the message may be, this says the message has no separate summary layer inside it. It also
subsumes two failures the pre-send cut list only catches after the fact, a recap at the end and a
wind-up at the start, by removing the structure that produces them.

The installed global block on the operator's machine was repaired to match in the same session, which
is the first exercise of ruling 4's new `/update` path.

## D39 - the batch lands as skills, not as patches (operator ruling, 2026-08-17)

The operator's ruling, after the batch's findings had been landing as edits to existing skills:
"skills are the easiest thing where we can add new ones and just wire them into the appropriate places
so the agent always knows to call on them at the right time." That is a scope ruling and it overrides
the orchestrator's own proposal, which had been an architectural one (a four-pillar harness rewrite,
drafted and NOT adopted). Recorded because the reasoning generalises: a new skill plus its routing is
cheaper, independently revertible, and immediately reachable, where an architecture change is none of
those. The rejected draft is not filed; its two salvageable parts are named in the opportunities
register instead.

**Six skills ship.** Each was authored from a captured source rather than invented, each carries a
`description` written as triggering conditions, and each was routing-tested against the live catalogue
of shipped description fields rather than assumed to fire.

| Skill | Fills | Source |
|---|---|---|
| `/deep-research` | No research capability existed at all | `jordan-gibbs/hyperresearch`, MIT |
| `/prototype` | Settling a design decision by building instead of arguing | `mattpocock/skills` + `will-ness-ai/skills`, MIT |
| `/test-audit` | Tests that pass against broken code, behind every green verify | `jamonholmgren` practice, ideas only |
| `/session-review` | The trigger the memory store never had | reader practice + `jamonholmgren` item 8 |
| `/vision` | Recovering intent from a repo that already exists | `kunchenguid/vision`, MIT |

`/brief-to-problem` was authored and is **not wired and not adopted**: see the operator calls below.

**Three existing skills changed**, against the three operator asks this batch opened with. `/review`
gained a FIX/NIT/ESCALATE disposition beside severity, a convergence stop, channel independence stated
as a property rather than a model choice, and a self-recording measurement suffix. `/security-pass`
gained VISA's five-check evidence gate with its refusal clause and an anti-manipulation rule naming
artifacts that address the reviewing agent instead of the code. `/pr-and-verify` gained a
deterministic-gates-before-judgment chain and the monotonic invariant.

**Three rulings the work forced, beyond the additions.**

1. **Environment variables and CLI flags are no longer blanket-trusted inputs.** `/security-pass`
   carried that as a flat precedent; VISA's group A carve-out supersedes it, because the writer's
   existing shell or deploy access was the entire basis of the trust, and a CI job parameter, scheduler
   argument, or shared config another team can write has writers who hold none of it. The flat line was
   deleted rather than qualified.
2. **`Hardening` ships as a report disposition, not a fourth severity rung.** Every rung of `/review`'s
   ladder blocks a merge, and a defence-in-depth note should not. `Not-applicable` was rejected: the
   drop line already records every failed candidate with its class and reason.
3. **A skill's routing line is applied by an integrator, never by its author.** Twelve workers
   reported 22 wiring lines with quoted anchors and applied none of them; one integration pass placed
   all 22 with every anchor matching verbatim. Three reported lines were the citation-plus-partial-
   paraphrase form `/writing-skills` bans and were repaired to enter-steps at placement. An author
   wiring its own skill writes the pointer it wishes existed; an integrator has to find the anchor.

### The open operator call, recorded so it is not lost

- **`/brief-to-problem` is ADOPTED as a skill (operator ruling, 2026-08-17), reversing D15.** D15 had
  adopted the capability as `/plan-grill` step 0 plus that skill's `brief-decode.md` sibling and named
  the skill form as examined and rejected, on the grounds that a single consumer does not earn a skill.
  Two things changed. A second consumer appeared: `/diagnose`'s symptom-only gate needs the same decode
  for a report whose claimed-actual is only an adjective, and `/writing-skills` forbids it from reaching
  into another skill's files, so inlining a copy was its only D15-legal route. And routing measurement
  showed a bare decode ask with no build behind it already lands on the new skill's description, which
  is the case with no other home at all: three of the five decode outcomes are not features.

  Landed as a **clean cutover**, which is what makes it an adoption rather than a second surface:
  `skills/plan-grill/brief-decode.md` is deleted, so the six moves live in one place. `/plan-grill` step
  0 now enters the skill and returns with its artifact, its description hands the relayed-language case
  over instead of claiming it, `/diagnose` enters it at the symptom-only gate, and `/groundwork`'s lean
  grill enters it for an epic that arrives as somebody else's words.

  Also corrected here, because the batch's own frontier read got it wrong: this was filed as an unlanded
  orphan. It was not. The worker reconstructed D15 from the record and logged a papercut against the
  brief that misled it, which is the sweep working rather than failing.

### One ordering dependency

`feat/wayfinder-artifact-typing` is stacked on this branch and its two new routing pointers reference
`/prototype` and `/vision`, which exist only here. The skill linter does not resolve cross-skill names,
so nothing catches it if the merge order slips: this branch merges first.

## D40 - the slop guidelines ship in the block, not in an override (operator ruling, 2026-08-17)

The operator's ruling, in two parts. First: "we should always follow the no-ai-slop rules." Second, after
a first attempt recorded it in `.better-dev/overrides.md`: "this shouldnt come in the form of the
overrides, the comms block that is shipped to every user should include the no-ai-slop guidelines."

The correction is about who the rule is for, and it is worth keeping because the first attempt was a
category error rather than a wording problem. An entry in `.better-dev/overrides.md` is one project's
preference, read by agents working in this repo and by nobody else. The comms block is the artifact this
library installs on a user's machine. Putting a library-wide default in the overrides file would have
meant this repo followed the rules and every consumer did not, which is the opposite of shipping them.
The override was removed rather than duplicated: a rule in two homes is the third-edit failure
`/writing-skills` names, and the block is the canonical home.

**What that costs, stated plainly.** The block goes from 58 lines to 80, under a cap of 85,
because a delete list has to name what it deletes and a pointer to a reference file does not load on the
turn it binds. That is a real per-turn tax on every session, accepted deliberately: the operator asked
for the rules to reach every user, and the only surface that reaches a user is this one. Upstream's own
skill runs about 140 lines always-on, so the block remains the compression.

**The split between gated and prose, which is the design decision under the ruling.** The mechanically
checkable patterns are gated in `scripts/bd-package-check` beside the older em/en dash gate: a
binary contrast, a colon reveal, a named empty phrase, a recap ending, and the vocabulary that has no
legitimate use in technical instruction text. Every gated phrase returned zero across the shipped
surfaces when the gate was added, so it locks in a property the library already had instead of demanding
a cleanup. The judgment half lives in the block as prose, because the portability test and
show-rather-than-label cannot be greppped and are the checks most surviving slop actually fails.

**One carve-out, and the reason it is not a compromise.** Upstream bans `harness`, `leverage`, `robust`,
`streamline` and `realm` outright. This library is about harness engineering and uses the first two as
domain terms on nearly every page. Gating them would fire on hundreds of correct lines, and a gate that
cries wolf gets switched off, taking the useful half with it. Those five stay advisory. The structural
patterns carry no exception.

**Three files are exempt from the gate by construction**, not by exception: the block itself, this
decision record, and any docs page about the patterns. Each has to name a pattern in order to forbid it.

**And one instance found in our own text while landing this.** The block's own opening read "Output is
not just brief. It is shaped so an ADHD brain can act on it", which is the binary contrast the same
source calls the loudest tell. That sentence was upstream's wording, kept under D31 and the operator's
earlier verbatim ruling, so the two rulings collided on one line. Resolved toward the slop rule and the
line rewritten, because shipping a block that violates its own first rule in its first sentence is worse
than departing from an upstream phrase. The operator was told which line changed so it can be reverted
in isolation.

## D41 - the harvest's final sweep: four rulings (2026-08-18)

Seven workers closed the 2026-08-17 harvest, reading `lopopolo/harness-engineering` at v1.0.0, the
`jamonholmgren` setup thread, the UI-design skill cluster, `haacked/dotfiles`, `ayghri/i-have-adhd`,
`PostHog`'s `qa-frontend`, and the eval sources. Their seven reports under `.better-dev/review/` are
the evidence for everything below; that directory is per-machine and gitignored, so each ruling here
carries its own citation into shipped files.

**The licence correction comes first, because the briefing carried the error into six briefs.**
`lopopolo/harness-engineering` is **CC BY 4.0** for repository-authored prose at tag **v1.0.0**, with
`sources/raw/acp/` and `sources/raw/images/` carved out under Apache 2.0 from the Agent Client Protocol
project. The batch briefing told six workers it was MIT. Three of them checked the capture rather than
inheriting the claim, and all three reported the same correction: the capture's own front matter states
it (`source.md:30`, "Repository-authored prose, editorial organization, and diagrams: CC BY 4.0") and
its Substance section states it again. Nothing verbatim landed from that repo, so no CC BY attribution
obligation was triggered; `NOTICE` now carries the licence, the version, the carve-out, and the
licence's own required attribution string against any future reuse. Recorded because a licence line in
a brief is a claim like any other, and this one reached six workers before anyone opened the file.

### The sweep's shape, which is itself evidence about harvesting

| Disposition | Count |
|---|---|
| Landed in skill text | 31 |
| Already held, with our own line quoted | 59 |
| Rejected with a stated reason | 48 |
| Deleted (one restated recap, in `design-brief`) | 1 |
| Landed as records in this commit rather than skill text | 4 |
| Referred to a file the finding worker did not own | 8 |

Per worker, so the totals are checkable: landed 1 / 2 / 8 / 1 / 6 / 13 for Lineage, ToolLegibility,
Playbooks, LoopHardening, VerifyEvidence and DesignCluster; already-held 5 / 8 / 11 / 5 / 13 / 11;
rejected 4 / 4 / 14 / 0 / 8 / 13, with four of LoopHardening's five already-held items also carrying a
rejected half. `EvalAndRecovery` edited no skill directory: its five lands are records, four of which
land in `docs/TRAPS.md` in this same commit and the fifth of which is explicitly not taken. Its
already-held count is 6 and its rejected count is 5. The batch brief's own estimate was 31 / 48 / 44;
the landed figure was right and the other two were low.

**The lesson is that a sweep proving we already hold something is the common case, and that this is a
good outcome rather than a wasted pass.** Fifty-nine already-held findings against thirty-one landings
is close to two to one. It only reads as a good outcome because every worker was required to quote our
own line beside the claimed gap: an already-held verdict with no quotation behind it is
indistinguishable from a worker that did not look. Three of the seven corrected a sibling report's
already-held claim by checking it in the file instead of inheriting it, which is the same discipline one
level up.

### 1. A recorded command is a claim until it has run

`ToolLegibility` returned `ours-is-weaker` on the tool-legibility thesis, against a prior claim that we
held it, and the seam it found is narrower than the capture's. Five of the thesis's seven output
properties were already held and the prove-it-before-you-record discipline was already held twice. What
was absent: the recorded keys name routes and nothing ever proved a route runs. The deploy keys already
carried a probe (`guardrails-install:241-242`, fetch the health URL once and read the status code); the
five keys a worker actually executes, `dev-run`, `seed-reset` and the three `verify` keys, were recorded
off a file observation with no probe at all. The governing rule did not close it, because "detection is
a premise, not a fact" is satisfied by a fact about a file and says nothing about execution, which is
precisely why the deploy block twenty-two lines later had to add a probe of its own.

**This repo has already paid for it, which is what makes the ruling evidence rather than theory.**
`.better-dev/rules.md:3` carries, live, a paragraph of where-the-command-used-to-be on the `verify:` key
after the 2026-08-14 flatten (D32) moved the gate to the repo root, and `rules.md:9` carries the same
correction again for `verify lint:`. The recorded command's path moved, nothing re-probed it, and there
was no route to replace it, so the record grew an explanation instead. Landed at
`guardrails-install:224-235`: a probe per runnable key in the shape that key allows, `(CI-only)` named
as the exemption, and the re-run re-probing this one family rather than skipping it. The runtime half landed at
`observability-install:73-77`, where `obs-alert-channel` is the one key whose rot is silence.

### 2. A design mechanic lands when it is a relation, a ban, or a presence check, and is rejected when it is a constant

`DesignCluster`'s deciding test, and it resolved the taste-versus-checkable tension the cluster had
blocked on. A relation is arithmetic a reviewer re-derives from the project's own values (outer radius
against inner radius plus the padding between them; an inter-group gap at least twice the intra-group
gap). A constant is the author's taste wearing a number (`scale(0.96)` on press, `1.5px`, `200ms`), and
it belongs to whichever host design skill ships it. Thirteen mechanics landed under that test and
thirteen were refused by it, including the three named cubic-beziers, the five-row duration table, and
the icon-animation values.

**This is not a new axis.** It is the operational form of two rulings already on file: D15's design
hardening bullet keeps token-set slots as form only, with values never shipped, and D18's rejection
row sends spring constants and platform animation formulas to the composed host skill. What
the cluster added is the test that decides a candidate at the moment it arrives, and the reason the
strong form of "skills carry criteria, not taste" is wrong: both upstream authors, when they sit down to
write, do convert judgment into exactly the checkable form our bar demands.

**So the ruling has a second half. Encoded taste is legitimate; an unwarranted constant is not.** A
skill may carry taste in a form a reviewer can check, and each constant it ships carries a derivation or
a named source. The evidence is a 30k-star taste library whose four factual errors, two of them throwing
at runtime, survived in `emilkowalski/skills` issue #26 until one reader ran the code against two
library versions. With no derivation and no regression surface, a value's only warrant is reputation,
and reputation cannot notice when it goes stale. That is why `/design-brief`'s new sourcing step grades
a candidate by opening it and looking for three properties (a value per property, an owner per domain, a
stated override condition) and never by its author's standing, and why two such skills installed
together record which one owns which domain in `.better-dev/overrides.md` rather than letting whichever
loaded last arbitrate.

One more piece of evidence for the never-restate rule, from the same capture: one author, in one month,
published two skills carrying the same check with different thresholds, a light/dark boundary and a
body-text floor that disagree between his cluster's colour skill and his standalone one. That is what a
second copy costs, and it is why `slop-and-checks.md` lives beside `design-brief/SKILL.md` instead of
being copied into `/review`.

### 3. A brief's scene-setting line is a claim, and the orchestrator is the one who has to check it

**Recorded as an observed failure of this orchestrator, with the instance named, because that is what
makes it a rule rather than a platitude.** `Lineage`'s brief opened by asserting that no skill uses a
prior run's trail as an input to a new one. That was false on disk, and
`report-HarnessThesesLand.md:145-150`, a sibling report the same brief cited two lines later, had
already disproved it along with two further false claims in the same opening line (that `lineage` is one
of the twelve theses, and that thesis 10 is lineage rather than `durable-systems`). The worker paid to
re-derive a correction that was sitting in a file its own brief pointed at. The failure is upstream of
every check we already run: we vet a worker's claims at the source, and we vet a brief downstream
through a judge whose reference is authored outside the goal-writer (`orchestrating-agents:200-205`),
and nothing vetted the brief's own framing at the moment it was written, which is before the cited
sources are read. Landed as four lines on the scene-setting bullet at
`orchestrating-agents/briefs-and-reviews.md:16-20`, in a read-when-you-need-it sibling rather than the
always-loaded body.

**The same worker's second edit is the precedent worth keeping.** It drafted an address-versus-noise
test for carried trail items into the brief-contents list, then A/B tested it across five scenarios and
found that 5 of 5 arms produced the behaviour without the text, one of them inventing a routing key
unprompted to carry the finding. It reverted its own edit as already-held, citing
`briefs-and-reviews.md:113` as the line that teaches the identical discipline for the adjacent object.
That is cut-before-add executing rather than being asserted, and it is recorded as precedent: a drafted
edit whose without-arm already passes is a restatement, and the honest move is to delete it and say the
measurement said so. The kept sentence is reported as not measurable by that instrument, since a
stateless arm has the source already pasted in, which is the state the rule exists to produce.

### 4. Pocock's reply is recovered, and it is an author's own ablation

Recovered at `https://x.com/mattpocockuk/status/2081655893427450117` (2026-07-27) after four prior
routes failed, by an authenticated headless read of the critique permalink at 14 scrolls plus a second
per-reply syndication fetch on the reply's own status id. The load-bearing sentence, verbatim:

> This is strictly an AFK agent optimization - AFK agents do better with chunks scoped ahead of time.
> I've experimented with just a spec and /goal, but the results were worse.

**That is the author trying the lighter alternative his critic asked for and reporting it worse, which
is the evidence the batch was missing on whether to copy the spec-then-tickets-then-wayfinder shape.**
It points the same way as ours: better-dev's carve into work-items with a sealed contract per item is
the chunking, and `/autonomous-loop` is the AFK case the sentence scopes the optimization to.

Two qualifications ride with it, both load-bearing.

1. **It is an unquantified anecdote and travels as one.** "The results were worse" carries no n, no task
   set, no rubric. Under `skills/deep-research/SKILL.md:134-136` it rides at best as inspect-grade.
   It supports a decision already made and licenses no claim.
2. **The AFK scope cuts both ways.** If chunking is strictly an AFK optimization, then applying the full
   carve-and-contract weight to attended, interactive work is unjustified by this evidence. So the reply
   is external support for keeping `/plan-grill`'s contract-lite path for attended and chore-class work,
   and it is evidence against widening the heavy carve, not for it.

### Recommended and deliberately not built: one committed worked example

`Playbooks` read the artichoke refactor ledger in full and recommends one committed, redacted promotion
of a single completed work-item's ledger at `docs/worked-example-<slug>.md`. The gap it closes is real
and specific: `writing-skills:150-153` sends the author of a `rationalizations.md` to find real excuses
in "a work-item's receipts and `reception.md`", and those live under `.better-dev/`, which is gitignored,
so that instruction points at artifacts nobody outside the producing machine can read. Nothing was
written, and this sweep declined to write it, because inventing a ledger would be the fabrication the
source's own contamination warning is about. Three constraints if it is ever taken: pure evidence with
real commit links and no interpretation, since links do not rot into wrongness the way a paraphrase
does; the two kinds of open work kept separate, a falsified hypothesis disappearing while an accepted
debt that outlives the refactor is preserved; and a contamination line, because a worked example drawn
from this repo's history and committed into this repo cannot then be used as a trap. One work-item,
never a growing collection.

### Rejected with reasons (one row each)

- Notation-first colour, converting hex or rgb to a perceptual space - tried at scale by an expert and retracted in one merge (+547/-405) for "notation is not a defect"; our token source is representation-agnostic by construction, so adopting it would force a representation onto the visual contract.
- Agent-readiness as a `/codebase-audit` lens - its evidence is a trajectory rather than a `file:line`, its operational half is already a `/guardrails-install` record with absence recorded as `none`, and its unowned half is a repo-teaches-agent standard with its own trigger. What crossed into the audit is the severity floor and the prior-friction leads, and nothing else should.
- The nine-field review contract and the sixteen-field result record (both playbooks) - ceremony in front of a one-shot advisory report; D13 pins `/codebase-audit` ephemeral. The one field with independent value, the revision, landed as one line inside the report.
- A `credential-custody` recorded key - custody is a capability needing a broker better-dev cannot install, so the key would record `none` on every repo with no consumer.
- A per-key "may fire unattended" flag - the gate is already closed at the moment of firing (`guardrails-install:577-579`), which beats a flag recorded months earlier.
- The `head`/`tail` context-unsafe detector on recorded verify commands - zero instances in this repo, no observed occurrence to price it against, and our records are copied verbatim from CI rather than improvised by a worker.
- A committed visual-baseline set with LFS - a baseline goes stale silently, every intended change then needs a blessing, and reflexive blessing reports green on real regressions too. Refused with the cost of refusing named: a regression on a surface the work-item never enumerated.
- Standing performance benchmark tests - a capability, not a rule; this repo's own verify command has no timing surface; on shared runners a timing gate is a flake generator and a waived gate reports nothing.
- Committing the work-item ledger and tagging git to match it - the ledger is transient loop state and stays out of version control by decision (`onboard:324`); a bundle travels on the branch and the receiving side re-pins consent.
- A periodic cross-work-item commit sweep, and an unattended march through a task queue - both are cadence work, refused by name at `autonomous-loop:13-15`. `/review`'s whole-branch pass and the witness-marker guard cover the within-branch case.
- Escalating a precommit hook to a cheap model that rewrites source - the rewrite lands unreviewed inside the one step everybody trusts to be mechanical; `review:167-169` already forbids the inverse.
- Reading prior session transcripts as a run input - `/session-review` exists to compress a session into five lines and four keyed destinations precisely so the next run reads those instead.
- A `tool-legibility` skill, and a lineage skill or file - neither has a trigger of its own; every moment they would fire is a moment the recorder, the adopter, or `/session-review` is already firing.
- Accessibility rule sets inside `/design-brief` (hit-target thresholds, `:focus-visible`, forced-colors, the eight escalation triggers) - out of scope by that skill's own frontmatter, and landing them would fork the host audit its step 3 composes.
- A stable ID plus a Fail/Pass code pair per design tell - the real failure, that positional numbers shift, is fixed by one sentence requiring an override to quote the tell's text; cut-before-add decides between two working fixes.
- The reproducibility retry and an `INTERMITTENT` coverage row - `verify-runtime.md:90-92` settles ambiguity toward FAIL on a stated cost asymmetry, and that row is the escape hatch the asymmetry exists to close.

### Covered, not re-filed (recorded so the next harvest does not re-litigate)

- "Documents are for the model, not the human" (Pocock) - the sharpest reframe in the reply and a principle we hold implicitly; it is the deletion test's purpose from another angle, and the authoring bar is already 258 lines. A future bar revision may use it instead of a rule, never in addition to one.
- "Test the gate itself once" as a standing rule for new gates - held in a stronger form at `guardrails-install:189-195`, three observations including staging a violation and seeing the gate refuse.
- Clearing the always-on comms block from a baseline condition - `docs/TRAPS.md:25-32`, which already credits `ayghri` issue #52 by number. This sweep added the model pin and the isolation-flag preference beside it.
- A privacy contract on read-back session logs - our version reads the repo's own memory store, so there is no third-party boundary to cross.

### Two follow-ups for the operator, deliberately not landed

1. **A `--fix` precommit hook can settle a loop `NEEDS_INPUT` on a formatter.** `guardrails-install/stacks.md:52-61` wires `lint-staged` plus `prettier --write` for a Node repo. If it reformats a file the loop pinned into `protect.hashes` earlier in the same pass, the settle-time re-hash at `autonomous-loop:97-100` sees a moved hash and can settle on a formatter rather than a defect. `LoopHardening` derived this rather than observing it, and recorded it here instead of smuggling derived material in under a harvest brief.
2. **A periodic no-op pass tied to model releases.** Pocock: "I often do a no-op pass on my skills to check for things the models now do out of the box." We hold the reactive form at `writing-skills:124-127`, which fires when a skill under-performs. A standing sweep on a model release is a different trigger, and it belongs to whoever owns the via-negativa work rather than to a second copy of the deletion rule.

### Referred and not placed, so the sentences are not lost

Six workers produced eight sentences for files they did not own, each with a quoted anchor in its
report. Four are placed in `docs/TRAPS.md` by this commit. The rest need their owner:
`skills/release-promotion/distill.md` (a `rules.md` line is the weakest owner a lesson can have; name
the earliest owner that could carry the same invariant before promoting),
`skills/diagnose/SKILL.md` (the caller list bounds the fix and not the defect; where the root cause is a
choice rather than a call, the population is every site that made the same choice),
`skills/worktree-branching/SKILL.md` and `skills/pr-and-verify/verify-runtime.md` (a recalled command
this tree cannot run is a defect in the record, routed back to `/guardrails-install`, never a local
substitute), `skills/review/inbound.md` (a thread is machine-authored when it carries our own authorship
line, never when its account looks like a bot), and `skills/writing-skills/SKILL.md` (a scope guard in a
body is the tell that a split is overdue). Each is a live gap its worker verified in the file rather
than inheriting.

## D42 - better-dev ships as a host plugin; the installer is deleted (supersedes D10, D24, D32; 2026-08-19)

The library stops shipping an installer. The repo root is both the marketplace and the single plugin it
lists (`source: "./"`), the catalog ships byte-identical at `.omp-plugin/marketplace.json` and
`.claude-plugin/marketplace.json`, and the host installs it. On the one host actually measured, omp, the
delivering channel is `omp plugin link <clone>` rather than the catalog, for the reason set out below; the
catalogs are the portable channel for Claude Code and anything else that reads one, and their rules
behaviour off omp is untested. So a linked install still involves a clone, and a `git pull` in it is
therefore the update. `install.sh`, `scripts/bd-uninstall`,
`skills/uninstall/`, `skills/update/` and the `hosts/` adapter table are deleted, along with `friction/`.

**The reason is not distribution, it is namespace ownership.** The operator reported that symlinking 35
skills into a host's global skills folder made better-dev the owner of that folder and made installing
other skills harder. Measured: 35 of 55 entries in one host's dir were ours, and better-dev squats
generic names (`review`, `update`, `vision`, `diagnose`, `onboard`) in a shared namespace where
`install.sh` skipped a foreign same-named skill and `--verify` then failed on it. Plugin skills load
through their own provider, so they no longer enter that folder at all and a user's same-named skill wins
on precedence. The hazard is removed rather than handled.

**D32's structural objection died with its subject.** D32 deleted the plugin channel partly because the
plugin cache is version-pinned per directory while `scripts/bd-link` baked an absolute `.better-dev/bin`
path at wiring time, so a plugin update stranded every wired repo. The 2026-08-19 cutover deleted
`bd-link` and the bridge, so that objection no longer has a referent. It is recorded here rather than
edited into D32, because a ruling rewritten to match a later decision stops being a record.

**No host needed the installer.** omp and Claude Code take marketplace catalogs; hermes installs a plugin
from a Git URL through `hermes plugins install`; codex is not installed on this machine at all, so
`install.sh` had been linking 35 skills into a directory for a binary that does not exist.

**The channel is not uniform, and the asymmetry is part of the model.** Verified on omp 17.3.8 by
installing this repo into an isolated HOME and probing a real session: a marketplace-installed plugin
delivers skills but its `rules/` is never loaded, because the provider serving marketplace roots
registers skills, commands, hooks, tools and MCP but not rules, while the provider that does scan
`rules/` filters marketplace roots out by realpath. A **linked** install (`omp plugin link <clone>`)
delivers both. So the comms block reaches a session only through a link today, and a linked install
implies a clone on the machine.

`omp plugin link` also requires a root `package.json` declaring an `omp` key. Without it the link
reports success, `plugin doctor` warns, and the plugin contributes nothing; measured as no skills and no
rules. That file now exists, carries `private: true`, and the version in it is gated equal to
`.claude-plugin/plugin.json`.

**The comms block becomes a rule, not a skill.** `alwaysApply: true` is honoured for rules and ignored
for skills: tested here, a skill carrying it had its body absent from context while its name was
discovered. `docs/comms-block.md` is deleted and `rules/comms.md` is the single home. Always-apply rule
content is auto-injected and deduped against content already in the prompt, which structurally prevents
the two-copy drift that shipped a stale block on this machine earlier the same day.

**Three mechanisms were removed rather than replaced**, which is the argument for the change: the
comms-block splice into a host entry file, `/onboard`'s check that the skills are installed (it cannot
fail now, since the skill only runs if the plugin is installed), and `/self-extension`'s resolution of
the clone from an installed skill link.

**Two capabilities were genuinely lost.** A sentinel-accurate repo unwire, now readopted as an unwiring
section in `/onboard`, since no plugin channel touches a repo's files. And the stale-ledger sweep from
`/update` step 5, readopted as a judgement step in `/session-review`. `docs/RELEASES.md`'s four-tier
format lost its only machine reader with `/update`, so the release ledger is now ungraded by machine and
the operator confirmation at tag time is the only thing standing between a mis-tiered line and its
readers; `/packaging` says so in those words.

`scripts/bd-package-check` and `scripts/bd-skill-stage` survive as maintainer gates run from a checkout.
They are not shipped capability, and shipped skill prose no longer instructs anyone to run them.

## D43 - the comms rule reaches a hookless channel through a hook in the plugin tree (extends D42; 2026-08-20)

D42 made `rules/comms.md` the single home for the comms block and deleted the splice that used to paste
its body into a host entry file. It also measured the hole that left: the provider serving marketplace
roots registers skills, commands, hooks, tools and MCP but not rules, so a marketplace-installed plugin
ships the rule file and no session loads it - the block reached a session only through
`omp plugin link`. **A hook shipped inside the plugin tree closes that hole**, at
`hooks/pre/bd-session.ts`: it injects `rules/comms.md` where nothing else delivered it, surfaces an
available update, and nudges `/onboard` in a repo carrying no discovery block.

**Measured before it was designed.** A minimal probe plugin carrying one `hooks/pre/probe.ts` was
linked, and a single `omp -p` run wrote:

```
FACTORY-CALLED dir=/private/tmp/bd-hookprobe/hooks/pre
SESSION_START-FIRED
CONTEXT-FIRED messages=1
```

The negative control - the same probe with the plugin uninstalled - wrote nothing at all. So the hook is
discovered from the installed plugin tree with no manifest entry and no path registered anywhere
(`marketplace.md:151`, "runtime hooks are discovered from the installed plugin tree"); both the
`session_start` and `context` events fire; and `import.meta.dirname` resolves to the hook's own directory
*inside the plugin*, which is the fact the whole design rests on - the hook reaches its sibling content
by relative path, so an update cannot strand it. The probe also fired on a run whose model call failed,
so the mechanism costs no tokens.

**This is not the hook D42 deleted.** `install.sh` registered its hooks by absolute path into
machine-global config, so a `git pull` that moved a target left every session failing a hook forever -
the defect that killed the installer. A hook in the plugin tree resolves its siblings relative to
`import.meta.dirname`, is versioned with the plugin that ships it, and is gone the moment the plugin is
uninstalled; there is no absolute path anywhere to strand. The cutover was right to delete the installer
and wrong to conclude the hook had to go with it.

**Hookless hosts get a documented pointer, never a copy.** A host reached only by `npx skills add` has
no plugin hook mechanism, so `/onboard` writes a pointer between
`<!-- BEGIN better-dev-comms -->` / `<!-- END better-dev-comms -->` in the repo's entry file, replacing
any existing block in place. Its body points at the installed `rules/comms.md` and restates none of it:
a copy cannot receive an update, and the drifted 80-line splice D42 deleted is this library's own
instance of that bug. That install is genuinely partial, and the channel table says so in those words
rather than hiding it. (That table has since moved to `BOOTSTRAP.md`, where it is the agent's decision
procedure rather than a menu a human picks from; only the pointer moved, not the ruling.)

`/onboard` writes that block only after measuring which of the three routes the session is on - the
plugin-tree hook (observable: the hook leads its injection with a `better-dev:comms` sentinel), a native
rules provider (the rule's subject in context with no sentinel), or neither - because a step that cannot
report "already delivered" gets re-run forever.

## D44 - the plugin hook is an omp mechanism; Claude Code and hermes take the pointer (corrects D43; 2026-08-20)

D43 recorded the mechanism as if the hook reached every plugin-capable host, and `/onboard`'s first cut
read the hook file's presence on disk as evidence the hook had run. Both are wrong, and they compound.
An independent review of `feat/plugin-session-hook` (`HookReview`, findings F1 and F2, report in
`.better-dev/review/`) read the host sources:

- **`hooks/pre/*.ts` is an omp convention.** omp treats every `.ts`/`.js` file under a plugin's
  `hooks/pre/` as an extension entry point (`isExtensionFile`,
  `pi-coding-agent/src/extensibility/extensions/loader.ts:491-493` - verified in the installed
  `17.3.8`) and calls its default export as a hook factory.
- **Claude Code** loads plugin hooks from `hooks/hooks.json`, or an inline `hooks` key in
  `plugin.json`, as shell-command or HTTP entries keyed by event name. It has no `hooks/pre/`
  convention and no TypeScript factory protocol, and this repo ships neither file
  (code.claude.com/docs/en/plugins-reference; anthropics/claude-code
  `plugins/plugin-dev/skills/hook-development/SKILL.md`).
- **hermes 0.16.0** is a Python agent: plugins are Python modules discovered by entry point and loaded
  by importing the module and calling its `register(ctx)`
  (`~/.hermes/hermes-agent/hermes_cli/plugins.py:1490-1650`; the missing-`register()` refusal is at
  `:1539`), and hooks are shell commands declared under `hooks:` in `~/.hermes/config.yaml`
  (`~/.hermes/hermes-agent/agent/shell_hooks.py:175`). Nothing there scans `hooks/pre/*.ts`.

So on both hosts the hook file ships, is never loaded, and the sentinel is absent by design. Confirmed
on 2026-08-20 from the hosts' own CLIs (measured by `DocsFix`, not inferred):
`claude --plugin-dir . plugin details better-dev` prints `Skills (33)` and **`Hooks (0)`**;
`hermes plugins install <git-url>` warns the repo "doesn't contain plugin.yaml or `__init__.py`", after
which `hermes plugins list` does not list better-dev at all.

**Those hosts get the rule through `/onboard`'s pointer, and that is stated, not hidden.** Each reads a
project entry file, which is the route the pointer block uses, so it genuinely works on both - and it is
weaker than injection: it is one read the agent has to honour rather than a body already in context.
Both hosts do land the **whole repo tree** even though neither runs the hook, so the pointer has a real
target: `~/.hermes/plugins/better-dev/rules/comms.md` (verified on disk, 6877 bytes) and
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. The channel table says pointer for Claude
Code and hermes, and the hook only for omp marketplace installs. Supporting the two host-specific hook
protocols above is a **named gap**, not a maybe: it would mean shipping a `hooks/hooks.json` shell entry
for Claude Code and a Python `register(ctx)` module for hermes, neither of which exists here.

**A skills-only install brings no pointer target of its own.** Measured the same day, and the scope is
part of the result: run against a **throwaway `HOME`**, `npx skills add yoelgal/better-dev --all -g`
lands `skills/` only - real directories at `~/.agents/skills/<name>/`, symlinked into every host skills
dir - and no `rules/` directory and no `comms.md` arrived with it. That scope is not decoration. Stated
unqualified - "no `comms.md` anywhere on the machine" - the claim is measurably false on any machine
that also carries a clone or a plugin-channel install, and it misdirects the one reader that acts on it:
`skills/onboard/SKILL.md` is agent-executed text whose very next routing row tells the agent to ask the
operator for a path where the repo is on disk, which an unqualified "there is nothing anywhere" tells it
not to bother doing. So the honest statement is per-channel, not per-machine: that channel cannot run
the hook *and* supplies nothing to point at. `/onboard` reads the path back before writing, and where it
does not resolve it writes no block and asks for a path where the repo itself is on disk (plugin channel
or a plain clone), which turns the row back into the pointer row.

**File presence was mistaken for execution.** `/onboard`'s detection tested whether
`hooks/pre/bd-session.ts` sat two levels above the running skill and converted a yes into either "the
hook delivers the rule" or "contradiction - write nothing". On Claude Code and hermes that file is
present and the hook never runs, so both landed on the contradiction row, wrote nothing, and the one
repair the skill had - the pointer - was suppressed by the observation that should have triggered it.
The detection is now built on the sentinel alone, which is a positive in-session observable: present
means the hook ran here this session, absent means it did not deliver and the reason never changes the
response. The contradiction row is **deleted from the routing decision**, on two independent grounds:
file presence never evidenced execution, and even on omp the hook deliberately stays quiet when a native
rules provider already loads `rules/`, so a present hook file beside an absent sentinel is the dedup
design working rather than a broken install. The tree walk survives only as path resolution for the
pointer - it answers *what path can a pointer name*, never *is the rule delivered*.

**The diagnosis survives as a recap clause, though, and deleting that too was a mistake.** The second
ground above describes a state the routing never reaches: when the native provider delivers, the rule is
in context, so `/onboard`'s observation 2 answers yes and the run stops one row earlier. On omp the two
observations are therefore not independent, and the only way a session reaches the pointer row is that
the hook *was* this install's delivery route and delivered nothing - a broken plugin, not the ordinary
absence. The first fix round dropped the routing test and the note with it, which left the one repo
positioned to notice its own delivery route failing writing a workaround and reporting nothing. So the
pointer write is unconditional (that part of the deletion was right) and, on a host that runs
`hooks/pre/*.ts`, the recap names the defect alongside it: tree installed, hook is the route here, it
delivered nothing, pointer is a workaround, and `omp plugin list` plus the install scope is the fact
that makes it reproducible (`skills/onboard/SKILL.md`, row three and the clause under it).

**One measurement cited for the marketplace path did not show it.** The claim that "a root named like a
marketplace cache dir gave sentinel=true, correct" was an instance of the `___` basename false
positive: that root (`/tmp/mkt___better-dev___0.1.0`) was still symlinked into
`~/.omp/plugins/node_modules/better-dev`, making it a **link** root, which omp does load `rules/` from -
so the injection observed there was a duplicate, not a marketplace delivery. The marketplace hole is
real and confirmed in source (`discovery/claude-plugins.ts:603-641` registers Skill, SlashCommand, Hook,
CustomTool and MCPServer providers and no Rule provider, against `discovery/omp-plugins.ts:110` which
loads rules for other roots), and D43's own linked-probe measurement stands. That one end-to-end line
does not, and no text in this repo may repeat it.

**The marketplace path now carries a measurement of its own.** It is recorded here because its evidence
expires everywhere else - a chat message and `~/.omp/logs` - and because the line it replaces was just
retracted above, which would otherwise leave the channel table's omp-marketplace cell resting on source
inference with no observation written down anywhere. Measured 2026-08-20, and corroborated by the
re-reviewer from omp's own logs rather than from the implementer's report:

- `Marketplace added name=better-dev sourceType=local`, then `Plugin installed
  pluginId=better-dev@better-dev version=0.1.0
  cachePath=/Users/yoelgal/.omp/plugins/cache/plugins/better-dev___better-dev___0.1.0` - that is
  `MarketplaceManager.installPlugin`, a real install into the marketplace cache, not a hand-built
  directory wearing a marketplace-shaped name.
- Two omp sessions run against it in `/tmp/bd-mkt-proj` observed
  `lastRole=developer lastHasSentinel=true firstRole=user`: the hook delivered, as a `developer` turn
  appended after the operator's own prompt - on the promoting model that session used. Appending is
  now conditional on the resolved model carrying `supportsMidConversationSystem`; elsewhere the rule
  goes immediately before the last user turn, because three providers read the final entry as the
  request itself and an appended rule became the request.
- The link-root control gave `n=1` and no sentinel - the hook correctly silent where omp loads `rules/`
  natively - and that control's `~/.omp/plugins/node_modules/better-dev` symlink is stamped **after**
  both marketplace sessions, so it was not present during them. That stray symlink is exactly what
  invalidated the retracted measurement; here it is absent from the window being measured.

**What it did not cover: project scope.** The install was user-scope. A marketplace install at
`--scope project` writes its runtime symlink under `<project>/.omp/plugins` while its cache stays at the
user root whatever the scope, and that shape was found to deliver nothing at all (N1 of the re-review) -
fixed on this branch by testing the marketplace cache mark against every state root before resolving any
`node_modules` entry, rather than against the root the link happened to be found under. So this
measurement is evidence for one sub-shape of the marketplace channel, never for the channel: any future
claim about `--scope project` needs its own observation.

## D45 - install is one prompt, and the host facts behind it are recorded here

The install surface is a single copy-pasteable prompt in `README.md`. It sends the agent to
`BOOTSTRAP.md`, which is an executable procedure rather than prose: detect the host, install through
that host's own channel, confirm `rules/comms.md` is delivered, wire the update alert, run `/onboard`.
The agent is the per-host adapter, so a host nobody wrote a channel for still gets wired or hears why
it cannot be. This replaces the human-facing channel table, which became the agent's decision table.

The bar a channel must clear is the operator's, recorded 2026-08-20: a channel earns its place by
auto-updating or by raising an update alert. These rules shape every reply, so an install that ages in
silence is experienced as the practices not working. A channel that can do neither is named as such
rather than listed as supported.

**Host measurements, 2026-08-20.** These live here because `BOOTSTRAP.md` acts on them and a procedure
whose facts live only in its own prose cannot be re-checked when a host changes.

- Claude Code 2.1.233's `claude plugin` carries `install`, `update`, `uninstall`, `list` and
  `marketplace add/list/remove/update`. An earlier check in this session reported only four verbs
  because it piped `--help` through `head -20` and read the truncation as the whole list.
- Claude Code's `plugin-catalog-cache.json` holds records for the official marketplace only. Three
  third-party plugins installed on the measuring machine were all absent from it, and every marketplace
  clone sat at exactly the commit its install record named with no `FETCH_HEAD` since install. So local
  state never advances on its own and a read-only version comparison can never fire: an alert has to
  run `claude plugin marketplace update` before comparing. Scoped to a machine where better-dev itself
  was installed through omp.
- hermes 0.16.0 fires `on_session_start` from `hooks:` in `config.yaml` (`VALID_HOOKS`,
  `hermes_cli/plugins.py:128`) once per session, and discards the return value, so an alert there has
  to reach the operator by its own channel. `hermes plugins install` registers no skills from this repo;
  `skills.external_dirs` is what makes them load, read at `agent/skill_utils.py:417,454`.
- The `npx skills add` CLI at 1.5.23 offers `update` and no check or notify verb, so that channel clears
  neither half of the bar by its own command list.

**Carried gaps, not fixed.** Each is real, each was measured or source-read, and each is cheaper to
record than to close today.

- `stateRoots` derives omp's config-dir name as `basename(dirname(agentDir))`. That holds for
  `PI_CONFIG_DIR` and breaks for a named profile, whose config root is `~/.omp/profiles/<name>`, and for
  `PI_CODING_AGENT_DIR`, which moves the agent dir without moving the config root. Both duplicate the
  rule rather than losing it, so the delivery bias holds at the cost of one extra body per call.
- The stage 3 pointer-target probe ORs a hermes path against a Claude Code cache glob, so on a machine
  carrying both CLIs a stale hermes tree can satisfy the check for a Claude Code install that failed. It
  proves some `comms.md` exists, never that this install's does.
- Stage 1's check is a self-assessment with no failing branch, and nothing asks the agent to identify
  which host it is, so naming the wrong one satisfies it.
- The prompt names `BOOTSTRAP.md` at `main` rather than at a ref, so an operator installing version N is
  handed the procedure for HEAD. It also requires web fetch, with no branch for an agent that cannot,
  which is not universally enabled on the hosts stage 2 routes to `npx skills add`.
- Stage 5 invokes `/onboard` in the session that ran the install, while the same file says twice that a
  running session keeps the text it loaded at start. Claude Code's own help states `restart required to
  apply`. The fallback nobody wrote down is reading `skills/onboard/SKILL.md` out of the installed tree
  and executing it as text, which stage 3 already resolves a path for.
