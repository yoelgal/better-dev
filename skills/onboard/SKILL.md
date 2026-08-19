---
name: onboard
description: Use when setting up better-dev in a repository for the first time, or re-running to wire in anything missing - greenfield or existing codebase. Also use when the repo has the better-dev skills available but no .better-dev/ scaffold and no CLAUDE.md discovery block yet.
argument-hint: "[phase to jump to, optional]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Onboard a repo into better-dev

Bring better-dev into this project - greenfield or an existing codebase - by detecting what's
already here, adapting to it, recording the repo's own rules, and leaving a discovery block so every
later session knows the practices are available. One job: **get the repo wired, without imposing.**

better-dev installs in two layers, and onboard only touches the second. The **skills** are installed
once per machine, globally, into your host's native skills dir (Claude Code:
`~/.claude/skills/<skill>`; Codex: `~/.codex/skills/<skill>`, one symlink per skill), never vendored
per repo. This repo carries only **data**: `.better-dev/` with its rules and overrides - tracked and
shared on a team adoption, local-only on a solo one (Phase 2 asks which). Nothing is installed into
the repo. The host loads the entry file itself and resolves skills on its own, so there is no bridge
to link, no hook to register, and no install step here to verify afterwards.

## Agent contract

Run the phases in order. If `$ARGUMENTS` names a phase, jump straight to it. At each phase:
**detect → report tersely → confirm → act.** Skip anything already done - this skill is idempotent
and safe to re-run; re-running only fills gaps.

Three rules carry the whole skill:

- **Detection is a premise, not a fact.** Verify it at `file:line` before you build on it. A branch
  named `staging` in `CLAUDE.md` prose isn't a `staging` branch until `git` shows it. Report what you
  actually observed, with where.
- **Never guess a command.** An unmapped capability (test runner, lint, typecheck) is a *gap* to
  record and ask about - not a command to invent. Silence beats a wrong guess.
- **Quiet defaults.** Take the obvious call and keep moving; stop to ask only when a choice genuinely
  matters - no integration branch to base worktrees on, or an entry file that's truly ambiguous.
  Don't batch a wall of questions, and don't ask about a default you can safely pick and record.

You can't drive interactive UIs (a plugin installer, an auth login); a host settings or permission
file at either scope, and any machine-global change D26's list does not name, stay operator-run. That
class is exactly those. Everything else you run yourself after confirming: writes under the working
tree - excepting any file whose own text asks to be consulted first, which Phase 4 covers - git
operations on the branch already recorded, and the reversible, non-secret machine-global
writes D26 does name - each one named in the recap. Git is never in the operator-run class; handing
back a `git merge` or a `git commit` you are allowed to run spends the operator's turn on your work.

For the operator-run class, **emit a paste-ready command block** and let the operator run it
(`! <cmd>` runs in-session) - then **read the effect back before building on it**: the config re-read,
the hook fired once against a probe, the file stat'd. An operator's "ran it" is a report, not a
result; observed 2026-08-04, two pasted blocks failed silently in one run and the repo was reported
wired on the strength of the reply.

---

### Phase 1 - Detect

A read-only sweep. Report each as *observed value + where*, then move on:

```bash
setopt no_nomatch 2>/dev/null || true                     # zsh aborts on an unmatched glob; make it inert like sh
ls CLAUDE.md AGENTS.md 2>/dev/null                        # entry file(s)
grep -l '@AGENTS.md' CLAUDE.md 2>/dev/null                # which imports which
ls -d .better-dev .omp 2>/dev/null                        # prior data scaffold? project-local omp policy?
ls "$HOME"/.[!.]*/skills/.better-dev-install "$HOME"/.[!.]*/*/skills/.better-dev-install 2>/dev/null  # tool installed for any host? (marker holds clone path; both dir depths - .claude vs .omp/agent)
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
git log --merges --oneline -n 5 2>/dev/null              # which base merged PRs actually target
```

Read (don't guess) six things:

1. **Is the tool installed for this host**: the `.better-dev-install` marker in the host's global skills
   dir above (install.sh writes it beside the per-skill symlinks, holding the clone path). Absent means
   Phase 3 helps the operator install it before anything else can work.
2. **Entry file** - `CLAUDE.md`, `AGENTS.md`, both, or neither. If both exist, the convention is that
   one `@`-imports the other (papers.town: `CLAUDE.md` opens `@AGENTS.md`); the **importer is the
   entry file** and the block goes there. Neither → create `CLAUDE.md`.
3. **Installed skills / MCP** - note them so you never disable or replace them. better-dev only adds.
4. **Git + branching** - does an integration branch (`staging`/`develop`) exist, what's the feature
   prefix in use (`feat/` vs `feature/`), is there a remote, and which base recent merged PRs
   actually target. Read it from branch names and merge history, not from an assumption - Phase 2
   records the shape as `branch-model: staged|trunk`.
5. **Prior better-dev data** - `.better-dev/` or a discovery block already present → this is a
   top-up run; a `.better-dev/` with no `rules.md`, or a repo with no `.omp/config.yml`, is the
   common gap to fill.
6. **Runnable entry points** - the dev/start command and any seed/reset command, read where they
   live (`package.json` scripts, a Makefile, a Procfile) - observed value + where. Phase 3's
   hand-off gives them to `/guardrails-install`, which owns the recorded `dev-run` / `seed-reset`
   keys: spot them here, record them there.

**Reconcile prose against git before you build on it.** The documented conventions are premises, not
facts - verify each at the git or file level, in this fixed order, so nothing downstream scaffolds on a
name that only exists in prose:

- Any integration or feature branch the entry file *names* but `git branch` does not list is a **gap,
  not a fact**: record it absent and let Phase 2 offer to create it. This is the tracer case - `staging`
  documented in `CLAUDE.md`, `staging` not in `git`.
- Any capability the prose claims (a test runner, a lint command, a deploy target) is verified where it
  actually lives - a file, a script, a config key - before it counts as detected. Unverified reads
  forward as a gap to ask about, never as a command to invent.

---

### Phase 2 - Adapt, don't impose

Reconcile better-dev's defaults with what the repo already does. **What's already here wins**, and is
recorded as an override rather than overwritten:

- **Whose adoption is this?** On a repo with a remote and other authors in `git log`, ask one
  question before anything shared is written: *adopting for the team, or just you?* Record the answer
  as an `adoption: team` (or `adoption: solo`) line in `.better-dev/rules.md`. One
  adopter's yes is not team consent, so **solo** keeps `.better-dev/` out of git entirely, puts the
  discovery block in a local-only entry file, and never creates a shared branch - Phases 3 and 4
  mark where each lands. A repo whose history is all yours records `team` quietly, no question
  asked. Going team later is the team's call: re-run `/onboard`, answer team, and the tracked
  shape is written the normal way.
- Repo uses `feat/* → staging → main`? Keep it. Don't force `feature/`. Record two lines in
  `.better-dev/overrides.md` - `feature branch prefix = feat/` and `integration branch = staging` -
  and one in `.better-dev/rules.md`, `branch-model: staged`. One line per key: a re-run replaces the
  line whose key is already there rather than appending beside it, because two contradictory lines
  under one key leave the next reader no way to tell which is current.
- **Only `main`, no integration branch?** Two shapes fit, and git - not prose - says which (the
  branches that exist, the base merged PRs actually target, from Phase 1). A team already running
trunk-based - PRs merge to `main`, `main` releases - is a first-class model, not a gap: record
`integration branch = main` in `.better-dev/overrides.md` and `branch-model: trunk` in
`.better-dev/rules.md` (`/worktree-branching` then bases worktrees off the trunk;
`/release-promotion` reduces to
  tag-plus-verify). An existing repo with real history that isn't already trunk: suggest the staged
  mechanism - a `staging` branch off `main` that feature/fix worktrees branch from and merge back
  into, promoted to `main` on release, with work on `feat/*` (`fix/*`) - and confirm once before
  creating it (a choice that genuinely matters); a declined offer is a trunk repo - record it as one.
  Greenfield has nothing to detect, so what onboard picks there is a pure default, and a silent
  shared `staging` on a repo with no history commits a team to a ladder nobody chose: team adoption
  gets one question of its own, asked once - trunk or staged, the two named side by side with trunk
  marked the recommendation, not the staged suggestion above with trunk as its decline - a branch
  living hours rather than days keeps an agent's assumptions from going stale against a moving
  `main`, and `/release-promotion` already degenerates to tag-plus-verify under it; staged stays
  one answer away for a team that wants a soak point. Trunk, or no answer, records
  `integration branch = main` and `branch-model: trunk` with no `staging` created. Staged creates
  `staging` off the default branch, on greenfield and on a confirmed existing repo alike, and
  once it exists, record `integration branch = staging`, `feature branch prefix = feat/`, and
  `branch-model: staged`.
  Solo adoption skips both offers entirely: a shared branch created on one person's yes imposes a
  workflow the team never chose - record `branch-model: trunk` on the default branch.
- **End the run standing on the integration branch.** Whichever shape resolved, check the working
  tree out onto the branch just recorded (`git checkout staging`, or the trunk) *before* this run's
  first commit, so onboard's own wiring commits land on the base every later worktree branches from.
  A repo whose overrides read `integration branch = staging` while `git branch --show-current` reads
  `main` has recorded a convention it is not standing on, and the operator's next commit lands on the
  wrong base; a `git branch -f staging main` used to drag the branch along afterwards is the tell that
  the commits went to the wrong place. Phase 5 names the checked-out branch in the recap.
- **A wiring commit carries wiring.** `.better-dev/`, the entry file's blocks, and the ignore file
  this run wrote - that is the whole contents. Anything else the run wants to
  land (a lockfile, a lint config, a new dependency, a formatter) is the operator's call, asked before
  the write and committed separately if they say yes. A repo the operator described as green and
  committed is one they expect to find that way; observed 2026-08-04, a run put a lockfile, an eslint
  config and a devDependency into the wiring commit on the integration branch, and the operator's next
  turn was spent taking it back rather than on the work they came for.
- Installed skills stay installed. better-dev complements them.

Present real decisions one at a time; skip the ones you can default.

---

### Phase 3 - Ensure the skills, then wire this repo

**First, make sure the skills are installed for this host.** If Phase 1 found no `better-dev` entry in
the host's global skills dir, the practices can't load. Hand the operator the one-paste bootstrap and
let them run it - you can't change their machine globally on your own:

```bash
git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh
```

Updates are a plain `git pull` in that clone.

**Memory needs no wiring.** Lessons live in the host's own memory backend - its `memory.backend`
setting picks where - and a session reads them at `memory://root/learned.md`, alongside the compact
project summary the host injects at `memory://root`. Nothing here initializes a store, and no file
under `.better-dev/` holds one.

What this repo does own is two plain files every skill reads before applying a default. Create both,
empty, so a later skill appends to a file that exists rather than deciding whether it may:

```bash
mkdir -p .better-dev
[ -f .better-dev/rules.md ]     || : > .better-dev/rules.md      # recorded rules: verify command, safety baseline, branch-model
[ -f .better-dev/overrides.md ] || : > .better-dev/overrides.md  # project overrides - they win over any built-in default
```

**Keep `.better-dev/` data-only.** The ledger is transient loop state and stays out of version
control; the rules and the overrides are the repo's own record. What happens to those follows the
recorded adoption:

- **Team** - rules and overrides are tracked and shared:

  ```bash
  grep -qxF 'ledger/' .better-dev/.gitignore 2>/dev/null \
    || printf '%s\n' 'ledger/' >> .better-dev/.gitignore   # append; never clobber a project's own entries
  ex="$(git rev-parse --git-common-dir)/info/exclude"   # a solo-to-team upgrade: drop solo's local-only
  if grep -qxF '.better-dev/' "$ex" 2>/dev/null; then   # ignore, or the dir stays invisible to git and
    grep -vxF '.better-dev/' "$ex" > "$ex.tmp"; mv "$ex.tmp" "$ex"   # empty result is correct when the solo line was the only line
  fi
  ```
- **Solo** - the whole dir stays local. Write git's local-only ignore file (itself never committed)
  rather than tracked entries:

  ```bash
  ex="$(git rev-parse --git-common-dir)/info/exclude"
  grep -qxF '.better-dev/' "$ex" 2>/dev/null || printf '%s\n' '.better-dev/' >> "$ex"
  ```

**Stamp the wired version.** On every run, re-runs and top-ups included, write the installed
clone's plugin-manifest version (read from `.claude-plugin/plugin.json` in the clone the install
marker names) to `.better-dev/wired-version` as a plain string, e.g. `0.6.0`. `/update` compares
releases against this stamp. It is repo wiring state, so on a team adoption it stays tracked - no
gitignore entry - and a wired repo with no stamp reads as wired before 0.6.0.

**Wire the minimum base.** With those two files in place, hand off to `/guardrails-install` - it
records this repo's real verify command and its safety baseline (the denylist, the gated classes, the
scope number) into `.better-dev/rules.md`, and it owns the project-local `.omp/config.yml` that puts
the destructive bash patterns behind an approval prompt. It fills only what's missing, so Phase 5's
"guardrails/CI wired" and "verify command mapped" signals rest on something recorded rather than
assumed. Hand it the runnable entry points Phase 1 observed - the dev/start and seed/reset commands,
each with its file:line - for its `dev-run` / `seed-reset` recording step: it owns those keys, onboard
only spots them.

Say which repo you are handing over, because it changes what comes back. A repo with **no stack** - no
dependency manifest, no build file, no source tree, which is every greenfield scaffold this phase just
created - gets that skill's stack-agnostic half only: the commit-time secret gate, one deferred line
recorded, and no `none` placeholders and no policy questions, because each of those describes code
that does not exist yet. Name the deferral in the Phase 5 recap, pointing at what closes it:
`/groundwork` lands the stack, and guardrails re-runs against
something real. A greenfield onboard that ends with nothing owed by the operator is the target, not a
step that got skipped.

---

### Phase 4 - Self-describe

Write the discovery block into the **entry file** from Phase 1, between the markers the shared writer
uses - `<!-- BEGIN better-dev -->` / `<!-- END better-dev -->` - replacing any existing block in place
and never touching the operator's own text.

**An entry file that withholds consent in its own text keeps it.** Read the file before writing:
where it says to ask first - "do not edit without asking", "my notes, hands off" - that sentence is
addressed to you, and appending below it is still editing it. Ask, and offer the local-only entry file
beside it as the other option - not as a way around the answer: that file loads into every session
too, so an operator who declined always-loaded better-dev text has declined it there as well. Their
answer picks a destination or none, and it covers every block this phase writes into that file, the
comms block included. Being invoked is not the permission: `/onboard`
is an instruction to wire the repo, and the operator who wrote that line was declining exactly the
write you are about to make on the strength of it - observed 2026-08-05, a run appended and
explained itself with "`/onboard` was taken as the 'ask' its edit rule requires", and the operator
came back with "next time actually ask before touching CLAUDE.md". The rule holds for any file
carrying that instruction, not `CLAUDE.md` alone.

Solo adoption changes only the destination: the block goes in a local-only entry file - on the
Claude family, `CLAUDE.local.md`, loaded beside `CLAUDE.md` and kept out of git by its own
`.git/info/exclude` line, the same mechanism Phase 3 used - and the block's tracked-data bullet
reads local, not tracked. A host with no local-only entry file gets no block; name that limitation
in the Phase 5 recap - discovery then rests on the installed skills' own descriptions. On a team
re-run upgrading a solo adoption, remove any better-dev marker block from `CLAUDE.local.md` before
writing the block into the entry file - two discovery blocks loaded per turn is the exact per-turn
tax the block shape exists to avoid.

In an interactive session, make that write with the host's **file-edit tool**, not a shell pipe: an
opaque heredoc piped into the always-loaded entry file is the exact shape a host's action classifier
reads as instruction injection and denies, while a native edit shows a reviewable diff and lands.
Replace between the markers rather than appending, so the block stays byte-stable across re-runs -
that property is what keeps the prompt cache below it valid, so preserve it when changing the shape.

Fill the block from what you actually detected (branching, the integration branch). The block is
always-loaded context - a per-turn tax - so when tailoring it, cut or merge a row before adding one.
Shape:

```markdown
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
| "what's in flight?", "where did we leave off?" | read the last line of each `.better-dev/ledger/*/progress.md` | one line per work-item with its state |
| "we're done - anything worth recording?", before a `/clear` or session end | `/session-review` | routes the session's lessons, friction, and instruction defects to the store; "no durable lesson" is a valid line |
| "hand this off", "pick up X's work" | `/worktree-branching` (handoff) | the bundle rides the branch; the receiving operator re-confirms the contract |
| "make it look good", "design the page" | `/design-brief` | -> `/plan-grill` or the loop |
| "we can't decide between two options", "build something throwaway to settle it" | `/prototype` | the verdict lands in `decisions.md`; the code leaves the tree |
| "is this safe", a security pass on a risky diff | `/security-pass` | composed by `/review` automatically |
| "is there a tool or skill for X" | `/tool-sourcing` | -> `/self-extension` only if discovery is empty |
| "does this claim hold up", "what's the prior art on X" | `/deep-research` | a sourced answer carrying its provenance; changes nothing |
| "what's worth doing here", "audit this codebase" | `/codebase-audit` | ranked findings; you pick -> front-ends |
| "are these tests actually testing anything", a green suite that keeps shipping bugs | `/test-audit` | mutation-settled findings; you pick -> `/plan-grill` -> the loop |
| "what is this project even for", "write down what we refuse to build" | `/vision` | recovers the acceptance policy from the repo's own history into `VISION.md` |
| "here are some links / ingest these / harvest this", a link or dump of source material for the library - even one framed as "implement this" | `/source-harvest` | captures verbatim -> critical synthesis; a build ask then -> `/plan-grill` |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "wait, you lost me", "what does that mean?" - a reply that didn't land | `/wait-what` | re-pitches it plainly in this repo's own vocabulary |
| "I can't answer this - my colleague / the client owns it" | `/plan-grill` (questionnaire unblock) | drafts the doc, grills only the send; the item waits on the answers |
| "remove better-dev" | `/uninstall` | unwires this repo, keeps your data |
| a one-to-two-step change | no front-end - just make it | inline in the work-item's worktree; verify before done |

You name the entry, not every step: each front-end hands to `/autonomous-loop`, which hands a DONE
result to `/pr-and-verify`, which hands a green PR to `/release-promotion`. Every work-item - even a
trivial one that skips the front-ends - runs in
its own git worktree, off `<integration-branch>` (`/worktree-branching` sets it up first); a follow-up
to an open item rides that item's existing worktree. Branching is `<detected convention>`.

- Durable rules: `.better-dev/rules.md`. Project overrides in `.better-dev/overrides.md` **win over
  defaults**, so read them first. Lessons earlier sessions recorded live in your host's own memory,
  readable at `memory://root/learned.md`.
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the global tool.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  build ask, `/groundwork` opens by asking how you want it built - steered (foundation plus
  parallelizable work-items, you review each) or one-shot (`/gauntlet` hands a fresh session one
  prompt and runs long with minimal interaction).
- `.better-dev/` holds tracked data (rules, overrides); `ledger/` is per-work-item loop state and
  gitignored.
- Update the tool with `/update` - it pulls the global clone (`git pull` underneath), reconciles
  skill links when needed, and tops up this repo's wiring when a release changed it.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
```

**Comms-style block.** Beside the discovery block, write a second marker-bounded block -
`<!-- BEGIN better-dev-comms -->` / `<!-- END better-dev-comms -->` - carrying the ADHD-adapted
communication style every later session in this repo speaks in. The body is not retyped here: it ships
as one file, `docs/comms-block.md` in the better-dev clone, whose path the install marker Phase 1
found holds - write *that file's contents*. A second copy of the body is drift waiting to happen, and
the drift would only surface on a user's machine. There is no machine-global copy: the managed block
in each repo's entry file is better-dev's only entry point.

The destination follows the recorded adoption. Solo: the local-only entry file (`CLAUDE.local.md` on
the Claude family), the same mechanism as above. Team: the shared entry file after one confirm at
onboard - the style shapes every teammate's sessions, so the one adopter confirms before it lands
shared; a declined confirm falls back to the local-only file, so the operator still gets it personally.
A solo host with no local-only entry file skips this block too and names that in the Phase 5 recap,
mirroring the discovery-block rule.

**A confirm needs an audience.** `adoption: team` is recorded quietly wherever the history is all
yours, a fresh `git init` included, so that label on its own can name a team of one - and a confirm
asked on its authority stops the operator to settle something for nobody. Gate the ask on teammates
actually existing: a remote **and** another author in `git log`. Without both, take the solo path
without asking - the local-only file, or no block at all where the machine already carries one - and
report the call in the Phase 5 recap instead of spending a question on it.

**When the ask does fire, put it in the reader's terms.** The operator has no model of a "comms-style
block" and cannot answer a question that names one; they answer by guessing. State the change and its
blast radius - every session in this repo, for every teammate, speaks in one fixed terse style, and
here is the file it lands in - and let the options differ on scope rather than on vocabulary. Two
options a reader cannot tell apart is a question that has already failed, whatever they click.

The write mechanism is the discovery block's: the host's file-edit tool, replacing in place between the
markers, byte-stable across re-runs, never touching the operator's own text or the discovery block. The
block is a per-turn tax deliberately capped small: at most 24 lines between the markers - cut a line
before adding one. The body is adapted from ayghri/i-have-adhd (MIT), credited in `NOTICE`.

Then confirm `.better-dev/rules.md` and `.better-dev/overrides.md` exist and both blocks read
correctly at their destinations.

---

### Phase 5 - Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (skills not yet installed
globally, no integration branch, an unmapped test command) so they can come back with
`/onboard <phase>`.

Scale the recap to what actually varies. Where every deferred item traces to one absent thing - a repo
with no stack yet defers guardrails and the verify command for the same reason - say that reason once
and name the one step that closes it, instead of an entry per consequence.

Then read the draft back as the operator, who has run one command and never seen this tooling's
source, and apply two tests before sending:

- **Every word they could not have met before is glossed or cut.** Not a list of terms - the terms
  differ every run, and they arrive from the phases this recap summarizes as much as from here
  (`loop-readiness`, `blast-radius`, a *protect-set*, a *parked decision*). Half a line of plain
  English at first use, or leave the name in the record where the next skill reads it and describe the
  thing here.
- **The one action they owe is in the first two lines.** Observed 2026-08-05, three runs closed with
  a wall an operator had to read three times to find the single thing asked of them; one answered
  "could've just asked where the block goes". Everything else in the recap is reference they can read
  or skip. Anything still waiting on the operator's own hands **leads** the
recap - "ready", "armed", or "fully wired" is claimable only when that list is empty; a pending
operator action is the headline, not a footnote under a victory banner. Each parked decision is also
recorded where downstream skills trip over it, because a recap line scrolls away: a
`pending-decision: <question> (parked at onboard)` line in `.better-dev/rules.md`. The first skill
that needs the answer - a contract about to set merge policy, a loop about to deploy - treats a
recorded pending-decision as a must-ask, never a blank it may fill with the autonomous default.

If Phase 1 found a remote, note once - advisory, not a blocker - whether the host can reach it before
the first remote-dependent step (`/pr-and-verify`, `/release-promotion`, branch protection): a
`gh auth status` that returns logged-in, or a `git ls-remote` that succeeds over SSH. A red result here
doesn't stop onboarding; it's just the thing to fix before a PR or push, surfaced now rather than at the
first failed `gh pr create`.

Close with a **loop-readiness** read - a short prose check on whether this repo can actually drive the
loop, not a score. Four signals, each drawn from what the phases above already turned up:

- **Integration branch** - one exists (the `staging`/`develop` or the recorded integration branch) for
  feature worktrees to branch off, and the working tree is standing on it; without it
  `/worktree-branching` has no base to start a loop from. Report the branch by name, read from
  `git branch --show-current` rather than from what Phase 2 recorded - the recorded name is the
  premise, the checked-out one is the fact.
- **Guardrails & CI wired** - a pre-commit hook and a CI check run the repo's real lint/typecheck/test
  (`/guardrails-install`), so the loop's green rests on gates that actually hold.
- **Verify command mapped** - the repo's real verify command is recorded, not guessed (the `verify`
  line `/guardrails-install` writes into `.better-dev/rules.md`); an unmapped one is a gap the loop
  can't grade against.
- **Red-capable-signal discipline** - the operator understands that each work-item names a check already
  seen to go red before the loop drives it; without one, a "green" run proves nothing (`/autonomous-loop`,
  `/diagnose`).

All four clear → the repo is ready to drive the loop. A gap isn't a blocker: name it alongside the
`/onboard <phase>` or `/guardrails-install` that closes it, and let the operator decide when to.

When this was a greenfield or brand-new project, the next step is `/groundwork` - and name, in the
same breath, that it opens by asking *how* the thing gets built, because the two routes cost the
operator very different amounts of their own attention:

- **Steered** - groundwork's own path: a shared foundation lands first, the rest is carved into
  parallelizable work-items, and each one is grilled and reviewed before it merges. The operator is
  in the loop at every gate.
- **One-shot** - `/gauntlet`: one prompt handed to a fresh session, which then builds against a
  concrete bar for hours with almost no interaction. The operator's touchpoints are the bar and
  stopping the run.

Naming both here is the point. An operator who does not already know the word "gauntlet" cannot ask
for it, so a close-out that offers only `/groundwork` silently picks the steered route for them - and
the route is a real choice about how they want to spend their day, not an implementation detail.
Record a durable rule for anything worth remembering next session as a line in
`.better-dev/rules.md`.

When this was not greenfield but a repo that already has history, the counterpart step is `/vision`:
run it before the first grill. An adopted repo's non-goals and invariants usually live in one
person's head, and the acceptance policy that skill recovers is what lets a later `/plan-grill` or
`/review` judge a change nobody anticipated - without it, every session re-derives the project's
intent from whatever files it happened to open.

## Composability

Everything here is additive and idempotent. It never disables an installed skill, never rewrites a
shared skill to encode a preference (that's what `.better-dev/overrides.md` is for), and never
clobbers the operator's edits to the entry file. It vendors nothing into the repo - the skills stay
global; the repo keeps only data. When authoring or revising this
skill, follow `/writing-skills`.
