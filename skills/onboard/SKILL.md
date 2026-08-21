---
name: onboard
description: Use when a repo's own shape has not been established yet - the first better-dev session in a project, or a later one after the branch model, the stack, or the verify surface moved and the recorded facts went stale. It reads the repo and records what it found as standing facts in your harness's durable memory - the stack, the test and lint commands, the branch model and its integration branch, the team-or-solo shape, and whether guardrails exist - so later sessions and every other skill get those facts without re-deriving them. It writes no files into the repo. Also use to clean up a repo still carrying a managed better-dev block written by an earlier version, which comes out by its own markers on an explicit ask.
argument-hint: "[phase to jump to, optional]"
allowed-tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Onboard - establish what this repo actually is

Read this project and establish its shape - greenfield or an existing codebase - then record what you
found where every later session reads it. One job: **the facts about this repo get derived once, by
someone who verified them, instead of guessed again every session.**

**Nothing is written into the repo.** No entry file, no scaffold, no ignore line, no directory. The
skills reach a machine through the host's own plugin channel and load from the plugin's own directory,
so if this skill is running there is nothing to install and nothing to wire. What the run produces is
a set of recorded facts in your harness's durable memory, a hand-off, and a close-out naming what is
still missing.

One exception, and it is not a file: on a staged branch model with no integration branch, this skill
offers once to create that branch. A recorded model that names a branch git does not have is the exact
premise-versus-fact failure the rest of this skill exists to prevent.

So the whole value of the run is the detection. Every fact below is one a later session would
otherwise re-derive from whatever files it happened to open - `/worktree-branching` needs the
integration branch, `/release-promotion` needs the branch model, the loop needs the verify command,
`/review` needs the safety baseline. Derive each one here, verify it, record it once.

## Agent contract

Run the phases in order. If `$ARGUMENTS` names a phase, jump straight to it. At each phase:
**detect → report tersely → confirm → act.** Skip anything already recorded - this skill is idempotent
and safe to re-run; a re-run only fills gaps and replaces a fact that went stale.

Three rules carry the whole skill:

- **Detection is a premise, not a fact.** Verify it at `file:line` before you build on it. A branch
  named `staging` in `CLAUDE.md` prose isn't a `staging` branch until `git` shows it. Report what you
  actually observed, with where.
- **Never guess a command.** An unmapped capability (test runner, lint, typecheck) is a *gap* to
  record and ask about - not a command to invent. Silence beats a wrong guess.
- **Quiet defaults.** Take the obvious call and keep moving; stop to ask only when a choice genuinely
  matters - no integration branch to base worktrees on, or a fact you cannot settle from the repo.
  Don't batch a wall of questions, and don't ask about a default you can safely pick and record.

Almost everything here is a read, and reads need no confirmation. You can't drive interactive UIs (a
plugin installer, an auth login); a host settings or permission file at either scope, and any
machine-global change D26's list does not name, stay operator-run. For that class, **emit a
paste-ready command block** and let the operator run it (`! <cmd>` runs in-session) - then **read the
effect back before building on it**: the config re-read, the file stat'd. An operator's "ran it" is a
report, not a result; observed 2026-08-04, two pasted blocks failed silently in one run and the run
reported both applied on the strength of the reply.

---

### Phase 1 - Detect

A read-only sweep. Report each finding as *observed value + where*, then move on:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
git log --merges --oneline -n 5 2>/dev/null     # which base merged PRs actually target
git log --format='%ae' | sort -u | head         # one author, or several
ls package.json Cargo.toml go.mod pyproject.toml Makefile 2>/dev/null   # is there a stack at all
ls -d .github/workflows .husky .git/hooks/pre-commit 2>/dev/null         # any gate already here
grep -rl 'BEGIN better-dev' . --include='*.md' 2>/dev/null              # a block from an old version
```

Read (don't guess) seven things:

1. **Stack** - the dependency manifest, the build file, the source tree. A repo with none of the three
   is a **greenfield** repo, and that changes what the rest of this run can honestly establish: most
   of the facts below describe code that does not exist yet. Say so once here and carry it forward
   rather than recording a hollow value per consequence.
2. **Verify surface** - the repo's real test, lint, and typecheck commands, read where they actually
   live (a `package.json` script, a Makefile target, a CI workflow step) - observed value + where.
   `/guardrails-install` owns the recorded `verify` key, so spot the commands here and let Phase 3
   hand them over. An unmapped one is a gap, never a command to invent.
3. **Runnable entry points** - the dev/start command and any seed/reset command, read where they live
   (`package.json` scripts, a Makefile, a Procfile). Same shape: spot here, recorded by
   `/guardrails-install` under its `dev-run` / `seed-reset` keys.
4. **Git and branching** - does an integration branch (`staging`/`develop`) exist, what feature prefix
   is in use (`feat/` vs `feature/`), is there a remote, and which base recent merged PRs actually
   target. Read it from branch names and merge history, not from an assumption. This resolves to a
   branch model: **staged** or **trunk**.
5. **Team or solo** - a repo with a remote and other authors in `git log` is a shared project; a
   history that is all yours is not. The shape decides one thing in this run, and it matters:
   whether you may offer to create a shared branch at all. One adopter's yes is not team consent.
6. **Guardrails** - is there a pre-commit hook, a CI workflow that runs the repo's real checks, a
   project-local policy putting destructive commands behind a prompt? Present or absent, both are
   findings; absent is what Phase 3 hands to `/guardrails-install`.
7. **Installed skills and MCP servers** - note them so you never disable or replace one. better-dev
   only adds, and a tool the operator named wins over a skill.

An eighth read is only for the cleanup route: a `BEGIN better-dev` marker in any `*.md` means an
earlier version of this skill wrote a managed block into this repo. Note it and leave it alone - the
last section of this skill covers it, on an explicit ask and never as part of a re-run.

**Reconcile prose against git before you build on it.** Documented conventions are premises, not
facts - verify each at the git or file level, in this fixed order, so nothing downstream stands on a
name that only exists in prose:

- Any integration or feature branch the docs *name* but `git branch` does not list is a **gap, not a
  fact**: record it absent and let Phase 2 offer to create it. This is the tracer case - `staging`
  documented in `CLAUDE.md`, `staging` not in `git`.
- Any capability the prose claims (a test runner, a lint command, a deploy target) is verified where
  it actually lives - a file, a script, a config key - before it counts as detected. Unverified reads
  forward as a gap to ask about, never as a command to invent.

---

### Phase 2 - Record what you found

The detected facts become this project's standing record. Record it in your harness's durable memory
(see `/overrides`). A later session in this repo then starts holding them, and a dispatched worker
receives them in its brief rather than re-deriving them - which is the entire return on this run.

Five facts are this skill's own to record - the branch model (staged or trunk), the integration branch
by name, the feature prefix in use, whether this is a shared project or one person's, and whether the
repo has a stack yet. The verify surface and the runnable entry points are *not*: they go to
`/guardrails-install` in Phase 3, which owns those keys. One writer per key is what stops two skills
recording the same fact differently, so name the gap and hand it over rather than recording it here.

**A fact you could not settle is recorded as unsettled, never left blank.** Never guess it - but an
absent record is indistinguishable from a repo nobody ever looked at, so the next session cannot tell
"onboard could not determine the branch model" from "onboard never ran here" and will quietly assume
the second. Record the key with an explicit unknown and what blocked it, and name it in the close-out
too. The rule generalises past this phase: a signal that cannot separate *no* from *not asked* is not
a signal, so make the absence loud rather than trusting a later reader to notice a hole.

**One ask covers the batch.** Recording a fact makes it a standing claim about someone's project, and
that is the operator's call, not yours - but it is one call, not one per line. Show the facts you are
about to record as a short list, ask once, and record on a yes. A fact they correct is recorded as
corrected; a fact they strike is not recorded at all. Striking is a decision, not a gap - it is theirs
to make, so it needs no unknown record standing in for it, and the close-out names it once. Never
split the batch into a question per key: the same consent discipline that governed file writes governs
this, and it was always one ask.

**What's already here wins.** A repo using `feat/* → staging → main` keeps it - don't force
`feature/`. The detected convention is recorded as this project's rule, not overwritten by a
better-dev default. That is the whole point of detecting it.

**One line per key.** A re-run replaces the line whose key is already recorded rather than recording a
second one beside it: two contradictory lines under one key leave the next reader no way to tell which
is current. Phrase each as a standing rule the next session can act on cold ("integration branch is
`staging`"), never as a note about this conversation.

Two cases need a decision before the branch model can be recorded:

- **No integration branch, only `main`.** Two shapes fit, and git - not prose - says which. A team
  already running trunk-based (PRs merge to `main`, `main` releases) is a first-class model, not a
  gap: record the trunk model and move on. `/worktree-branching` then bases worktrees off the trunk
  and `/release-promotion` reduces to tag-plus-verify. An existing repo with real history that isn't
  already trunk gets the staged mechanism suggested once - a `staging` branch off `main` that
  feature and fix worktrees branch from and merge back into, promoted to `main` on release, with work
  on `feat/*` (`fix/*`) - and a declined offer is a trunk repo, recorded as one.
- **Greenfield has nothing to detect**, so whatever is picked there is a pure default, and a silent
  shared `staging` on a repo with no history commits a team to a ladder nobody chose. A shared repo
  gets one question of its own, asked once: trunk or staged, named side by side with **trunk marked
  the recommendation** - a branch living hours rather than days keeps an agent's assumptions from
  going stale against a moving `main`, and `/release-promotion` already degenerates to tag-plus-verify
  under it. Staged stays one answer away for a team that wants a soak point. Trunk, or no answer,
  records the trunk model and creates nothing.

A solo repo skips both offers entirely and records the trunk model on the default branch: a shared
branch created on one person's yes imposes a workflow the team never chose. That shape is read from
git, not asked - the old question existed because a team adoption wrote shared files, and it wrote
none this run. One remote plus other authors is a shared project; a history that is all yours is not,
and the only decision the shape still gates has its own confirm above. Where staged resolves and
`staging` does not exist, create it off the default branch after that confirm, and only then record
the staged model, the integration branch, and the feature prefix - the record follows the branch into
existence, never the reverse.

Those two are decisions, so present them one at a time and skip the one you can default. The batch ask
above is separate and stays one ask: it approves the recording, not the choices.

---

### Phase 3 - Hand off the minimum base

With the facts recorded, hand off to `/guardrails-install`. It owns the repo's recorded verify
command and its safety baseline (the denylist, the gated classes, the scope threshold), and the
project-local policy that puts destructive bash patterns behind an approval prompt. It fills only
what's missing, so Phase 4's "guardrails/CI wired" and "verify command mapped" signals rest on
something recorded rather than assumed.

Hand it what Phase 1 observed, each with its `file:line`: the test, lint, and typecheck commands, and
the dev/start and seed/reset commands for its `dev-run` / `seed-reset` keys. It owns those keys;
onboard only spots them.

Say which repo you are handing over, because it changes what comes back. A repo with **no stack** -
no dependency manifest, no build file, no source tree - gets that skill's stack-agnostic half only:
the commit-time secret gate, one deferred line recorded, and no `none` placeholders and no policy
questions, because each of those describes code that does not exist yet. Name the deferral in the
Phase 4 recap, pointing at what closes it: `/groundwork` lands the stack, and guardrails re-runs
against something real. A greenfield onboard that ends with nothing owed by the operator is the
target, not a step that got skipped.

---

### Phase 4 - Confirm and close

Recap what was recorded, then list anything the operator skipped or deferred (no integration branch,
an unmapped test command, a decision parked) so they can come back with `/onboard <phase>`.

Scale the recap to what actually varies. Where every deferred item traces to one absent thing - a
repo with no stack yet defers guardrails and the verify command for the same reason - say that reason
once and name the one step that closes it, instead of an entry per consequence.

Then read the draft back as the operator, who has run one command and never seen this tooling's
source, and apply two tests before sending:

- **Every word they could not have met before is glossed or cut.** Not a list of terms - the terms
  differ every run, and they arrive from the phases this recap summarizes as much as from here
  (`loop-readiness`, `blast-radius`, a *protect-set*, a *parked decision*). Half a line of plain
  English at first use, or leave the jargon name in the record where a later session meets it and
  describe the thing in plain words here.
- **The one action they owe is in the first two lines.** Observed 2026-08-05, three runs closed with a
  wall an operator had to read three times to find the single thing asked of them; one answered
  "could've just asked where the block goes". Everything else in the recap is reference they can read
  or skip. Anything still waiting on the operator's own hands **leads** the recap - "ready" or "fully
  established" is claimable only when that list is empty; a pending operator action is the headline,
  not a footnote under a victory banner.

Each parked decision is also recorded where downstream skills trip over it, because a recap line
scrolls away: record it in your harness's durable memory as a pending decision, naming the question
and that onboard parked it. The first skill that needs the answer - a contract about to set merge
policy, a loop about to deploy - treats a recorded pending decision as a must-ask, never a blank it
may fill with the autonomous default.

If Phase 1 found a remote, note once - advisory, not a blocker - whether the host can reach it before
the first remote-dependent step (`/pr-and-verify`, `/release-promotion`, branch protection): a
`gh auth status` that returns logged-in, or a `git ls-remote` that succeeds over SSH. A red result
doesn't stop the run; it's the thing to fix before a PR or push, surfaced now rather than at the first
failed `gh pr create`.

Close with a **loop-readiness** read - a short prose check on whether this repo can actually drive the
loop, not a score. Four signals, each drawn from what the phases above already turned up:

- **Integration branch** - one exists, by name, for feature worktrees to branch off; without it
  `/worktree-branching` has no base to start a loop from. Report the name read from `git branch`, not
  from what Phase 2 recorded - the recorded name is the premise, git is the fact.
- **Guardrails and CI wired** - a pre-commit hook and a CI check run the repo's real lint/typecheck/test
  (`/guardrails-install`), so the loop's green rests on gates that actually hold.
- **Verify command mapped** - the repo's real verify command is recorded, not guessed (the `verify`
  key `/guardrails-install` owns); an unmapped one is a gap the loop can't grade against.
- **Red-capable-signal discipline** - the operator understands that each work-item names a check
  already seen to go red before the loop drives it; without one, a "green" run proves nothing
  (`/autonomous-loop`, `/diagnose`).

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

When this was not greenfield but a repo that already has history, the counterpart step is `/vision`:
run it before the first grill. An adopted repo's non-goals and invariants usually live in one
person's head, and the acceptance policy that skill recovers is what lets a later `/plan-grill` or
`/review` judge a change nobody anticipated - without it, every session re-derives the project's
intent from whatever files it happened to open.

## Cleaning up a repo an older version wrote into

Earlier versions of this skill wrote a managed block into a repo's entry files. Nothing does that any
more, so nothing else in the library knows where those markers are - which is why removing them stays
here. This runs on an explicit ask to clean the repo up, never as part of a re-run.

**A block comes out by its markers, never by a line range.** There are two marker pairs, and both
come out wherever each landed: `<!-- BEGIN better-dev -->` / `<!-- END better-dev -->` and
`<!-- BEGIN better-dev-comms -->` / `<!-- END better-dev-comms -->`. Find them with the search from
Phase 1 rather than from a remembered file list - which files an old run chose depended on its version
and on the host it ran in. Cut marker to marker with the file-edit tool. A recorded range is stale the
moment the operator edits above the block, and what a wrong range deletes is their own prose. A
missing marker or an unbalanced pair is a stop: report the file and let the operator point at the
boundary rather than inferring it. Read each file back before reporting done - a search for
`better-dev` in it returns nothing, and their own text above and below where the block sat is
untouched.

An old run may also have left an ignore entry pointing at what it wrote, in a tracked ignore file or
in git's local-only `info/exclude`. Name each one you find and let the operator drop it; git ignoring
a path that no longer exists is harmless, and their ignore files are not this skill's to edit on a
cleanup ask.

**Anything left under `.better-dev/` is the operator's data, so removing it is a second, separate
ask.** Records they wrote by hand are theirs, and the `ledger/` directory is live loop state that
`/autonomous-loop` still reads - a cleanup that takes the ledger out from under a running work-item
destroys the only thing that survives a compaction. Name what is there, name the ledger as in use, and
let them decide; emit any removal paste-ready and stat the path afterwards rather than reporting it
gone.

What none of this does is uninstall the plugin. That runs through the host's own plugin channel and is
the operator's to do, and this repo's cleanup is correct either way.

## Composability

Every phase above is a read, a recorded fact, or a hand-off, and all three are idempotent - a re-run
fills gaps and refreshes a stale fact, and nothing accumulates. The one mutation is the confirmed
integration branch; the one removal path is the cleanup section, which runs on an explicit ask and
never on a re-run. Nothing here disables an installed skill, rewrites a shared skill to encode a
preference (that's `/overrides`), or writes a file into the repo. When authoring or revising this
skill, follow `/writing-skills`.
