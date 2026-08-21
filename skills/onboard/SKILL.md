---
name: onboard
description: Use when setting up better-dev in a repository for the first time, or re-running to wire in anything missing - greenfield or existing codebase. Also use when the repo has the better-dev skills available but no .better-dev/ scaffold and no discovery block yet. Also use to unwire a repo - "remove better-dev from this repo", "unwire this", or a repo left carrying the managed discovery block after the plugin was uninstalled - which takes the block out by its markers and treats `.better-dev/` as the operator's data on a separate ask.
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

better-dev ships as a plugin, and onboard installs nothing. The skills reach a machine through the
host's own plugin channel and load from the plugin's own directory - never copied into the
repo, and never into your personal skills folder, which is why a skill of your own with the same name
still wins. If this skill is running, the plugin is already installed, so there is no install to check
here and no bootstrap to hand over. What onboard wires is one repo: `.better-dev/` with its rules and
overrides - tracked and shared on a team adoption, local-only on a solo one (Phase 2 asks which) - and
a discovery block in every entry file this repo's agents read. The host loads and resolves the
practices itself, so there is no bridge to link and no hook to register.

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
ls AGENTS.md CLAUDE.md .omp/AGENTS.md CLAUDE.local.md 2>/dev/null   # which of Phase 4's targets exist
grep -l '@AGENTS.md' CLAUDE.md 2>/dev/null                # which imports which
ls -d .better-dev .omp 2>/dev/null                        # prior data scaffold? project-local omp policy?
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
git log --merges --oneline -n 5 2>/dev/null              # which base merged PRs actually target
```

Read (don't guess) five things:

1. **Entry files** - which of Phase 4's measured targets already exist: root `AGENTS.md`, root
   `CLAUDE.md`, `.omp/AGENTS.md`, `CLAUDE.local.md`. Note which host you are running on too, because
   it decides two of the four. Phase 4 owns the choice; here, only record what is there and whether
   `CLAUDE.md` `@`-imports `AGENTS.md`.
2. **Installed skills / MCP** - note them so you never disable or replace them. better-dev only adds.
3. **Git + branching** - does an integration branch (`staging`/`develop`) exist, what's the feature
   prefix in use (`feat/` vs `feature/`), is there a remote, and which base recent merged PRs
   actually target. Read it from branch names and merge history, not from an assumption - Phase 2
   records the shape as `branch-model: staged|trunk`.
4. **Prior better-dev data** - `.better-dev/` or a discovery block already present → this is a
   top-up run; a `.better-dev/` with no `rules.md`, or a repo with no `.omp/config.yml`, is the
   common gap to fill.
5. **Runnable entry points** - the dev/start command and any seed/reset command, read where they
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
  discovery block in its host's own local-only file, and never creates a shared branch - Phases 3 and 4
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
- **A wiring commit carries wiring.** `.better-dev/`, the entry files' blocks, and the ignore file
  this run wrote - that is the whole contents. Anything else the run wants to
  land (a lockfile, a lint config, a new dependency, a formatter) is the operator's call, asked before
  the write and committed separately if they say yes. A repo the operator described as green and
  committed is one they expect to find that way; observed 2026-08-04, a run put a lockfile, an eslint
  config and a devDependency into the wiring commit on the integration branch, and the operator's next
  turn was spent taking it back rather than on the work they came for.
- Installed skills stay installed. better-dev complements them.

Present real decisions one at a time; skip the ones you can default.

---

### Phase 3 - Wire this repo

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

Both stay plain files with named writers, and neither has a CLI in front of it.
`/guardrails-install` records this repo's verify command and safety baseline into `rules.md`;
`/overrides` writes an accepted standing correction into `overrides.md` with its file-edit tool, as
does `/design-brief` for a settled token set; and the operator edits either one by hand whenever they
disagree with what is recorded. That is the whole writer list - a line in `overrides.md` beats any
built-in default, so a repo that never disagrees leaves the file empty and loses nothing.

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

Write the discovery block into **every entry file this repo's agents actually read**, between its own
two markers - `<!-- BEGIN better-dev -->` / `<!-- END better-dev -->` - replacing any existing block
in place and never touching the operator's own text.

Which files those are is a measurement, and the answer is awkward: the two hosts read disjoint sets,
so no single file reaches both. Probed 2026-08-21 - one unique token written into each of three files
in a throwaway git repo, then the agent asked which tokens stood in its context, with no tool calls
allowed:

| File | omp | Claude Code 2.1.233 |
|---|---|---|
| root `AGENTS.md` | loaded | not loaded |
| root `CLAUDE.md` | **not loaded** | loaded |
| `CLAUDE.local.md` | **not loaded** | loaded |

Claude Code's own answer noted `AGENTS.md` sitting on disk while its contents were absent from
context, so on-disk is not in-context. omp's half has a documented cause: its context providers match
`.omp/AGENTS.md`, `.claude/CLAUDE.md`, `.agent/AGENTS.md`, `.agents/AGENTS.md`, and a standalone
`AGENTS.md` walked up to the repo root - and no provider matches a bare root `CLAUDE.md`
(`omp://context-files.md`). Re-run the probe when a host version moves: this is two versions read on
one day, not a standard.

The targets that follow, on a team adoption:

- **root `AGENTS.md` - always.** The one file omp reads, and Codex and the cross-tool convention
  read it too.
- **root `CLAUDE.md` - when it already exists, or when the host you are running on is Claude Code.**
  Anywhere else it is a file nothing loads, so do not create one.

Write both wherever both apply, even where `CLAUDE.md` holds nothing but an `@AGENTS.md` import. That
import is Claude Code's own mechanism and no other host's guarantee, and the two failures do not cost
the same: a duplicate block is a few lines of per-turn tax the operator can see and delete, while a
missed write is silent - the repo reads as never wired and nothing says why. Name the import in the
Phase 5 recap so they can collapse it if they want to.

**Two files are allowed here because this skill is what reconciles them.** Duplicated prose drifts,
which is why better-dev deleted its last copy - the spliced comms body that then served a stale rule
for the rest of its life (D42). The difference here is mechanical: `/onboard` is idempotent and
**replaces** the text between its markers on every run, so a re-run makes both copies identical again
by construction. Nothing else reconciles them. That makes the write shape load-bearing: **if this
write ever becomes an append rather than a replace-between-markers, the copies start drifting and this
rule stops being safe** - whoever changes the write shape owns re-deciding the target set with it.

**The reconciler stops at the markers, so nothing else gets a second copy.** Text outside them is the
operator's, and no run replaces it - duplicate it across two entry files and it drifts with nobody
watching. Where their own prose needs to reach both hosts, it lives once in the file the running host
reads and the other file carries a pointer to it. That split is theirs to approve, not yours to make
silently: propose it, and leave one copy where it is if they decline.

**An entry file that withholds consent in its own text keeps it.** Read the file before writing:
where it says to ask first - "do not edit without asking", "my notes, hands off" - that sentence is
addressed to you, and appending below it is still editing it. Ask, and offer the host's own local-only
file beside it as the other option - not as a way around the answer: that file loads into every session
too, so an operator who declined always-loaded better-dev text has declined it there as well. Their
answer picks a destination or none, and it covers the whole block. Being invoked is not the
permission: `/onboard` is an instruction to wire the repo, and the operator who wrote that line was
declining exactly the write you are about to make on the strength of it - observed 2026-08-05, a run
appended and explained itself with "`/onboard` was taken as the 'ask' its edit rule requires", and the
operator came back with "next time actually ask before touching CLAUDE.md". The rule holds for any file
carrying that instruction, not `CLAUDE.md` alone.

**Solo adoption keeps the same rule and changes the files.** Local-only means a file git never tracks,
and which file that is depends on the host:

- **omp** - `.omp/AGENTS.md`, with that path appended to `.git/info/exclude`, the same mechanism
  Phase 3 used for `.better-dev/`. It is omp's own documented answer for project-local uncommitted
  context, and its `native` provider reads it.
- **Claude Code** - `CLAUDE.local.md`, loaded beside `CLAUDE.md` and excluded the same way.

`CLAUDE.local.md` is Claude Code's file and no other host's, so **it is never the only target.** A
solo adoption on omp that writes only there writes into a void: nothing loads the file, the operator
sees no block, and every later session behaves as though the repo was never wired. That was the live
defect the probe above was run to settle. A host with no local-only file of its own gets no block;
name that limitation in the Phase 5 recap, where discovery then rests on the installed skills' own
descriptions.

The consent rule above governs each of these writes, and the operator's answer covers the whole block
wherever it lands - one ask, not one per file. On a team re-run upgrading a solo adoption, remove any
better-dev marker block from the local-only file before writing the tracked ones; two discovery blocks
loaded per turn is the exact tax the block's shape exists to avoid.

In an interactive session, make that write with the host's **file-edit tool**, not a shell pipe: an
opaque heredoc piped into the always-loaded entry file is the exact shape a host's action classifier
reads as instruction injection and denies, while a native edit shows a reviewable diff and lands.
Replace between the markers rather than appending, so the block stays byte-stable across re-runs -
that property is what keeps the prompt cache below it valid, so preserve it when changing the shape.

**Keep the block small.** Its unique payload is two facts: this repo is wired, and where its records
live. Two measurements say the rest is already covered. 28 of better-dev's 33 skills read
`.better-dev/overrides.md` themselves, so a block that restates an override taxes every turn to help
skills that were going to read the file anyway. And the routing table restated skill descriptions the
host injects regardless - proven in this repo, which ran a whole session with its own block unread
while routing worked. Fill what is left from what you actually detected, and cut a row before adding
one: the block lands in two files now, so every line is paid for twice. Shape:

```markdown
<!-- BEGIN better-dev -->
## better-dev is wired here

This repo uses **better-dev**: portable dev practices delivered by the plugin your host loads, not
vendored here. Say what you want and the matching skill enters - you name the entry, not every step,
and a tool you name wins over a skill.

- **Read before you apply a default:** `.better-dev/overrides.md` - a line there beats any built-in
  default. This repo's own recorded rules (verify command, safety baseline, branch model) sit beside
  it in `.better-dev/rules.md`. Both are plain files; read them with your file tool.
- **Work in flight:** one `.better-dev/ledger/<slug>/` dir per work-item, holding that item's contract
  and its progress. `ledger/` is loop state and stays out of git.
- **Branching:** `<detected convention>`, off `<integration branch>`. Every work-item gets its own git
  worktree off that branch, a trivial one included.
- **Lessons** earlier sessions recorded live in your host's own memory, at `memory://root/learned.md`.
- Re-run `/onboard` to wire in anything missing.
<!-- END better-dev -->
```

Then confirm `.better-dev/rules.md` and `.better-dev/overrides.md` exist, and read the block back out
of every file you wrote it into. A write you did not read back is indistinguishable from a write into
a void, which is the failure this phase exists to stop.

**Then check whether the comms rule reaches this session at all.** better-dev's response-style rule
ships as one file in the plugin tree, `rules/comms.md`, and whether anything loads it is decided by the
channel that delivered the skills, never by the host's name (`BOOTSTRAP.md` carries the per-host table).
Only one kind of evidence settles it: what you can see in *this* session's context. A file on disk is
not evidence that a host loaded it - the plugin's session hook is an omp convention (`hooks/pre/*.ts`),
while Claude Code loads plugin hooks from `hooks/hooks.json` as shell or HTTP entries and hermes loads
Python `register(ctx)` modules, so on those hosts that exact file ships and never runs (D44). Absence
of delivery is the ordinary case wherever that file cannot run, and it never changes what you write -
but on a host that *does* run `hooks/pre/*.ts` it is also a defect, and the third row of the table
below is where you report it.

Two observations settle it, in this order:

1. Search this session's own context for the literal token `better-dev:comms`. The hook leads its
   injection with that sentinel. **Proves:** the hook ran here, on this host, in this session, and the
   rule's body is in context - which is the whole claim. **Absence proves only its own negation:** the
   rule did not arrive that way, and never says why. You do not need why. Whether the host has no hook
   mechanism, ships one this file cannot use, or loads `rules/` natively so the hook stayed quiet on
   purpose, the response is identical - something else has to deliver the rule.
2. **Before you open `rules/comms.md`**, answer whether better-dev's comms rule itself is already
   standing in context from a source you did not read. A native rules provider injects the body with no
   sentinel, which is what this catches. **Proves:** something already delivers the rule here, so a
   pointer would be redundant. **Does not prove** which channel did it - and nothing downstream needs
   to know. Three constraints on the answer: reading the file puts the text in context too, so the
   order is what makes the answer worth anything; a memory of seeing it in an earlier session is not an
   observation of this one; and your host's own brevity guidance is not this rule - recognise the rule,
   not its topic. **Only a confident yes counts**, because the two errors do not cost the same: a wrong
   yes writes nothing and leaves the session with no rule at all, a wrong no costs one redundant
   pointer to a file already in context. Unsure is a no.

Resolving where `rules/comms.md` lives is a separate job from routing, and it answers a different
question - not *is the rule delivered* but *what path can a pointer name*. Resolve the **real** path of
the skill you are running - a skills-only install symlinks each skill directory into the host's own
skills dir, so the path the host reports can be a link - then look two levels up, above
`skills/onboard/`, where a plugin tree keeps `rules/` and `hooks/` beside `skills/`. **Proves:** a path
a pointer can name, once `rules/comms.md` reads back from it. **Proves nothing about delivery**, in
either direction: `hooks/pre/bd-session.ts` sitting there is the same shipped file on a host that cannot
run it, and on omp the hook deliberately stays silent whenever a native provider already loads `rules/`.
That second case never reaches the table's third row, though - a native provider puts the rule *in
context*, so observation 2 answers yes and the run stops at row two. Measured 2026-08-20, both
directions: `npx skills add yoelgal/better-dev --all -g` lands `skills/` only (real dirs at
`~/.agents/skills/<name>/`, symlinked into every host skills dir), and in that run's throwaway `HOME` no
`rules/` and no `comms.md` arrived with it - so that channel supplies no pointer target *of its own*.
Hold that scope: stated unqualified, "no `comms.md` anywhere on the machine" is false on any machine that
also carries a clone or a plugin-channel install, and acting on the unqualified version would stop you
asking for the path the next two rows exist to ask for. A plugin-channel install lands the whole repo,
so the file is there to point at even on the hosts that never run the hook
(`~/.hermes/plugins/better-dev/rules/comms.md`, and `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`).

| What you observed | What that proves | What to write |
|---|---|---|
| the `better-dev:comms` sentinel in context | the hook delivered the rule into this session | nothing |
| no sentinel, and the comms rule itself already standing in context | a native rules provider delivers it here | nothing |
| no sentinel, no rule in context, and `rules/comms.md` reads back from a path you resolved or the operator named | nothing delivers it, and there is a file to point at | the pointer block below - and, on a host that runs `hooks/pre/*.ts` (omp), a recap clause naming the defect: the plugin tree is installed, the hook is the delivery route here, and it delivered nothing |
| no sentinel, no rule in context, and no `rules/comms.md` on this machine | nothing delivers it and there is nothing yet to point at | ask for a path; with none, the recap line naming the install that fixes it |
| the host will not say where the running skill came from | only the path is unmeasured; both observations above still stand | ask where better-dev is installed, then finish the row |

**Absence always ends in a route.** The last three rows are one finding - nothing delivers the rule -
and they differ only in whether a pointer has a target. Row three writes it. Rows four and five ask the
operator one question - *where is better-dev's own repo on this machine?* - and act on the answer: a
path whose `rules/comms.md` reads back turns the row into row three, no matter how the repo got there
(plugin channel, or a plain `git clone`). Only an operator who has none closes without a block, and
that close is still a route: the recap names the install that puts the file on disk (`README.md`'s
table names it per host). A pointer to a file that is not there fails every session in silence, so that
line belongs in the recap and never as a dead path in an entry file. No observation ends in
write-nothing-and-hope.

Whichever row resolves, name it in the Phase 5 recap in a clause ("comms rule already delivered by the
session hook - nothing written"); that clause is what stops the next run from measuring this over again.

Row three carries a second clause, and only on a host that runs `hooks/pre/*.ts` - omp today. There the
two observations are not independent, so absence there means more than it does anywhere else: a native
rules provider that loads `rules/` puts the rule in context, which makes observation 2 a yes and stops
the run at row two. So the only way an omp session arrives at row three - no sentinel, no rule in
context, and a plugin tree sitting on disk above the skill - is that the hook *was* this install's
delivery route and delivered nothing. That is a broken plugin, not the ordinary absence, and this is the
one repo positioned to notice its own delivery route failing. Write the pointer, then report it:

> better-dev's comms rule did not reach this session. The plugin tree is installed at `<resolved path>`,
> and on omp the session hook in that tree is the delivery route - so it ran and delivered nothing.
> That is a defect in better-dev, not in this repo. I wrote the pointer block into `<entry files>`, so
> the rule governs this session anyway. It is a workaround, not the fix: the hook decides delivery per
> install shape, so `omp plugin list` (and the scope you installed with) is the one fact that makes this
> reproducible - worth reporting with that line attached.

The operator owes one command and a report, and neither blocks them: the pointer already restored the
rule for this session. Never quietly substitute the workaround for the fix. A run that repairs its own
delivery route and says nothing is how a channel dies in silence - which is the whole reason this clause
exists rather than just the pointer.

For the pointer row, write into the same files this phase already chose - all of them, for the same
reason, and the consent rule above governs this write too - between its own markers, replacing any
existing block in place:

```markdown
<!-- BEGIN better-dev-comms -->
Response style here follows better-dev's comms rule. Read it once, before your first reply:
`<path to the installed rules/comms.md>`. That file is the only current version of the rule; this block
is a pointer to it, not a copy.
<!-- END better-dev-comms -->
```

**The pointer stays a pointer.** A copy cannot receive an update: the 80-line splice of that rule's body
into a host entry file, which D42 deleted, drifted from the shipped file and served a stale block for the
rest of its life. One file, read live.

Read the path back before writing it, every time - what an install actually puts on disk is a
measurement, not an inference from its name. Where the read fails there is nothing to point at: write
no block, and give the recap the honest line instead - this host has the skills without the comms rule,
and what fixes it is getting the repo itself onto this machine, through the host's plugin channel or a
plain clone, then telling `/onboard` where it landed.

---

### Phase 5 - Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (no integration branch, an
unmapped test command, a decision parked) so they can come back with `/onboard <phase>`.

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

## Unwiring, when better-dev is removed

Uninstalling the plugin takes the skills away and nothing else: a wired repo still carries the managed
discovery block in each of its entry files and its `.better-dev/` directory, and no other skill knows
where those sentinels are. This skill wrote them, so it removes them - on an explicit ask to unwire the
repo, never as part of a re-run, which only ever fills gaps.

- **The block comes out by its markers, never by a line range.** Locate
  `<!-- BEGIN better-dev -->` and `<!-- END better-dev -->` and cut from one to the other with the
  file-edit tool, in every file Phase 4 wrote it into: root `AGENTS.md`, root `CLAUDE.md`, and the
  local-only file a solo adoption used (`.omp/AGENTS.md` on omp, `CLAUDE.local.md` on Claude Code).
  A recorded range is stale the moment the operator edits above the block, and what a
  wrong range deletes is their own prose. A missing marker or an unbalanced pair is a stop: report the
  file and let the operator point at the boundary rather than inferring it. Read each file back before
  reporting done - a search for `better-dev` in each one returns nothing. Both blocks come out, the
  discovery block and the `better-dev-comms` pointer, wherever each landed.
- **`.better-dev/` is the operator's data, so removing it is a second explicit ask.** The recorded rules,
  the overrides they wrote by hand, and the ledger history are theirs; unwiring the entry file does not
  license deleting them, and the two asks stay separate even when the answer to both is yes. When they do
  ask, remove the directory whole (emit `rm -rf .better-dev` paste-ready and let the operator run it,
  then stat the path to confirm it is gone) rather than naming files inside it: a purge here once
  enumerated three files and left six others sitting in the directory it reported clean, so either the
  directory goes or you enumerate every file and read the directory back empty. Solo adoption also
  appended a `.better-dev/` line to `.git/info/exclude`, and on omp an `.omp/AGENTS.md` line beside
  it; drop both in the same step, or git keeps ignoring a path that no longer exists.

What this does not do is uninstall the plugin. That runs through the host's own plugin channel and is the
operator's to do, and this repo's unwiring is correct either way - a repo can be unwired while the plugin
stays installed for every other repo.

## Composability

The wiring phases above are additive and idempotent, and the unwiring section is the one path that
removes anything - it runs on an explicit ask and never on a re-run. Neither one disables an installed
skill, neither rewrites a shared skill to encode a preference (that's what `.better-dev/overrides.md`
is for), and neither clobbers the operator's own text in any entry file. Nothing is vendored into the
repo - the practices stay in the plugin; the repo keeps only data. When authoring or revising this
skill, follow `/writing-skills`.
