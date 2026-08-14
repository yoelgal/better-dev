---
name: onboard
description: Use when setting up better-dev in a repository for the first time, or re-running to wire in anything missing - greenfield or existing codebase. Also use when the repo has the better-dev tool installed but no .better-dev/ scaffold, no .better-dev/bin bridge, or no CLAUDE.md discovery block yet.
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
already here, adapting to it, wiring memory, and leaving a discovery block so every later session
knows the practices are available. One job: **get the repo wired, without imposing.**

better-dev installs in two layers, and onboard only touches the second. The **tool** (the skills +
`bd-*` scripts + hooks) is installed once per machine, globally, into your host's native skills dir
(Claude Code: `~/.claude/skills/<skill>`; Codex: `~/.codex/skills/<skill>`, one symlink per skill), never
vendored per repo. This repo carries only **data**: `.better-dev/` with rules, overrides, and
learnings - tracked and shared on a team adoption, local-only on a solo one (Phase 2 asks which) -
plus a per-machine `.better-dev/bin` symlink back to the global install so the portable
path `.better-dev/bin/bd-mem` resolves here.

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
ls -d .better-dev .better-dev/bin .mcp.json 2>/dev/null   # prior data scaffold? bin bridge? MCP?
ls "$HOME"/.*/skills/.better-dev-install "$HOME"/.config/*/skills/.better-dev-install 2>/dev/null  # tool installed for any host? (marker holds clone path)
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
git log --merges --oneline -n 5 2>/dev/null              # which base merged PRs actually target
```

Read (don't guess) seven things:

1. **Is the tool installed for this host**: the `.better-dev-install` marker in the host's global skills
   dir above (install.sh writes it beside the per-skill symlinks, holding the clone path). Absent means
   Phase 3 helps the operator install it before anything else can work.
2. **Entry file** - `CLAUDE.md`, `AGENTS.md`, both, or neither. If both exist, the convention is that
   one `@`-imports the other (papers.town: `CLAUDE.md` opens `@AGENTS.md`); the **importer is the
   entry file** and the block goes there. Neither → create `CLAUDE.md`.
3. **Installed skills / MCP** - note them so you never disable or replace them. better-dev only adds.
4. **Existing memory system** - an MCP memory server in `.mcp.json`, claude-mem, Mem0/Graphiti, or a
   host-native store. Found → that becomes the memory backend. None → the zero-infra files default.
5. **Git + branching** - does an integration branch (`staging`/`develop`) exist, what's the feature
   prefix in use (`feat/` vs `feature/`), is there a remote, and which base recent merged PRs
   actually target. Read it from branch names and merge history, not from an assumption - Phase 2
   records the shape as `branch-model: staged|trunk`.
6. **Prior better-dev data** - `.better-dev/` or a discovery block already present → this is a
   top-up run; a missing `.better-dev/bin` is the common gap to fill.
7. **Runnable entry points** - the dev/start command and any seed/reset command, read where they
   live (`package.json` scripts, a Makefile, a Procfile) - observed value + where. Phase 3's
   hand-off gives them to `/guardrails-install`, which owns the recorded `dev-run` / `seed-reset`
   keys: spot them here, record them there.

**Reconcile prose against git before you build on it.** The documented conventions are premises, not
facts - verify each at the git or file level, in this fixed order, so nothing downstream scaffolds on a
name that only exists in prose:

- Any integration or feature branch the entry file *names* but `git branch` does not list is a **gap,
  not a fact**: record it absent and let Phase 2 offer to create it. This is the tracer case - `staging`
  documented in `CLAUDE.md`, `staging` not in `git`.
- Any capability the prose claims (a test runner, a lint command, a memory backend) is verified where it
  actually lives - a file, a script, a config key - before it counts as detected. Unverified reads
  forward as a gap to ask about, never as a command to invent.

---

### Phase 2 - Adapt, don't impose

Reconcile better-dev's defaults with what the repo already does. **What's already here wins**, and is
recorded as an override rather than overwritten:

- **Whose adoption is this?** On a repo with a remote and other authors in `git log`, ask one
  question before anything shared is written: *adopting for the team, or just you?* Record the
  answer - `.better-dev/bin/bd-mem remember "adoption: team"` (or `"adoption: solo"`). One
  adopter's yes is not team consent, so **solo** keeps `.better-dev/` out of git entirely, puts the
  discovery block in a local-only entry file, and never creates a shared branch - Phases 3 and 4
  mark where each lands. A repo whose history is all yours records `team` quietly, no question
  asked. Going team later is the team's call: re-run `/onboard`, answer team, and the tracked
  shape is written the normal way.
- Repo uses `feat/* → staging → main`? Keep it. Record `feature branch prefix = feat/` and
  `integration branch = staging` via `.better-dev/bin/bd-mem persist-override "<line>"`, plus
  `.better-dev/bin/bd-mem remember "branch-model: staged"`. Don't force `feature/`.
- **Wired staged, and the operator asks to move to trunk?** Migrate it rather than re-recording
  `staged` - the keep-it above stays what happens by default, and a repo whose operator never asks
  is untouched. **Do not hand-run the steps.** This retires a shared branch, and the preconditions
  are the whole job: which remote, whether the release branch resolves at all, whether local and
  remote have diverged in either direction, an unclean tree, open PRs the delete would close, a
  colleague's worktree, a half-finished earlier attempt. Prose has nowhere for a precondition to
  fail, so the procedure is a script that fails closed:

  ```bash
  .better-dev/bin/bd-migrate-branch-model check        # every precondition, one verdict each
  .better-dev/bin/bd-migrate-branch-model apply --yes  # re-runs check, then migrates
  ```

  `check` is read-only as to branches and history - it only ever retires its own stale
  unfinished-migration marker - so it is safe to run for the answer alone; show its output before
  asking for the yes. It stops rather than guesses - it resolves the release branch from
  `refs/remotes/<remote>/HEAD` and never from the literal name `main`, and refuses outright when
  that resolves to the integration branch itself. `apply` archives the branch tip as
  `archive/<integration>-<YYYY-MM-DD>` and pushes that tag *before* deleting anything, so
  `git branch <integration> <tag>` puts the branch back exactly where it stood; a tag push that
  fails aborts before any delete, and a remote delete refused by branch protection reports the
  migration **incomplete** with the command to finish it, never as a clean run.

  Two things the script deliberately leaves to you. It reports commits the integration branch
  carries that the release branch does not, but never merges them - offer to guide that merge
  first, as a suggestion rather than a refusal. And it does not touch the entry file: once it
  returns success, rewrite the discovery block so its routing text names the new integration
  branch. Read `--help` before passing `--skip-pr-check`; it exists for a non-GitHub remote and it
  asserts something the script could not check.
- **Only `main`, no integration branch?** Two shapes fit, and git - not prose - says which (the
  branches that exist, the base merged PRs actually target, from Phase 1). A team already running
  trunk-based - PRs merge to `main`, `main` releases - is a first-class model, not a gap: record
  `integration branch = main` via `persist-override` and `branch-model: trunk` via `remember`
  (`/worktree-branching` then bases worktrees off the trunk; `/release-promotion` reduces to
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
- **A wiring commit carries wiring.** `.better-dev/`, the entry file's discovery block, and the ignore
  and attributes files this run wrote - that is the whole contents. Anything else the run wants to
  land (a lockfile, a lint config, a new dependency, a formatter) is the operator's call, asked before
  the write and committed separately if they say yes. A repo the operator described as green and
  committed is one they expect to find that way; observed 2026-08-04, a run put a lockfile, an eslint
  config and a devDependency into the wiring commit on the integration branch, and the operator's next
  turn was spent taking it back rather than on the work they came for.
- Installed skills stay installed. better-dev complements them.

Present real decisions one at a time; skip the ones you can default.

---

### Phase 3 - Ensure the tool, then wire this repo

**First, make sure the tool is installed for this host.** If Phase 1 found no `better-dev` entry in
the host's global skills dir, the practices can't load. Hand the operator the one-paste bootstrap and
let them run it - you can't change their machine globally on your own:

```bash
git clone https://github.com/yoelgal/agent-tools ~/agent-tools && ~/agent-tools/better-dev/install.sh
```

On Claude Code, installing the plugin manifest (`.claude-plugin/plugin.json`, added as a plugin
marketplace) is an equally valid path. Either way, updates are a plain `git pull` in that clone.

**Then wire this repo's `.better-dev/bin` bridge.** The scripts live beside the globally-linked
skills; resolve them and let `bd-link` create the per-machine symlink (or a copy where symlinks don't
refresh):

```bash
setopt no_nomatch 2>/dev/null || true   # zsh: an unmatched glob must fall through to the -f test, not abort the loop
sd=""
# Glob, don't name hosts: any adapter's convention leaves the marker at <skills-dir>/.better-dev-install.
for m in "$HOME"/.*/skills/.better-dev-install "$HOME"/.config/*/skills/.better-dev-install; do
  [ -f "$m" ] && sd="$(cat "$m")/scripts" && [ -f "$sd/bd-mem" ] && break
done
if [ -n "$sd" ] && [ -f "$sd/bd-link" ]; then
  "$sd/bd-link" link        # creates .better-dev/bin -> the global install's scripts
else
  echo "No install marker resolved - the tool is not installed for this host yet. Run the bootstrap above, then re-run /onboard 3." >&2
fi
```

If the loop leaves `$sd` empty, no marker resolved and the tool is not installed for this host - loop
back to the bootstrap block above rather than running `bd-link` against an empty path.

**Wire graphify where a graph would have something to say.** It answers structural questions by
traversing a built index under a token budget instead of reading the subtree, which is where the
saving is, and `/codebase-map`, `/review`'s ripple step and `/autonomous-loop`'s triage all reach for
it. Probe both halves before deciding - the CLI is machine-global, the registry is per repo:

```bash
command -v graphify >/dev/null && echo "graphify CLI: present $(graphify --version 2>&1 | grep -oE '[0-9.]+' | head -1)" || echo "graphify CLI: ABSENT"
. .better-dev/bin/bd-gfx 2>/dev/null && r=$(gfx_registry 2>/dev/null) \
  && { [ -f "$r" ] && echo "registry: $r ($(jq -r '.indexes|keys|length' "$r" 2>/dev/null) domains)" || echo "registry: ABSENT"; }
```

**CLI absent and this repo carries code → run `/graphify-wrapper-setup` now**, as part of this same
wiring. It is idempotent, D26 authorizes its writes, and it is the one link in the chain nothing else
recovers. The registry, the domain carve and the graph build all self-heal on the first real question
(`gfx_ensure_graph`); the CLI does not - `bd-gfx` returns 1 naming this skill, and the SessionStart
refresh hook exits silently without it. Skipping this step is what leaves a fully wired repo quietly
grepping where it should be querying, with nothing anywhere reporting a gap. A registry that then
holds **no domains needs no action** - the first question carves one; offer `/graphify-wrapper-map`
only where the repo is big enough to earn a deliberate split.

**No code yet** - a greenfield scaffold, a README and nothing else - defers it, because installing a
CLI and resolving its version floor over an empty tree spends the operator's attention on a
capability that cannot answer a question until code exists, and a version-floor upgrade surfacing
there reads as an onboarding blocker rather than the unrelated errand it is. Defer by recording the
gap and naming it in the Phase 5 recap, alongside guardrails' - `/groundwork` lands the stack and
both re-run against something real:

```bash
.better-dev/bin/bd-mem remember "graphify: deferred at onboard - no code to index yet; run /graphify-wrapper-setup once the stack lands (the CLI is the half no first question self-heals)"
```

With the bridge resolving, offer the standing allowance so its own calls never trip the permission
gate: two allow rules, `"Bash(.better-dev/bin/bd-mem:*)"` and `"Bash(.better-dev/bin/bd-guard:*)"`,
merged into any existing allow list rather than replacing it. The rationale: these scripts write only
inside `.better-dev/`, and nearly every skill leans on `bd-mem` for recall/remember/learn/ledger on
almost every step (`bd-guard` at worktree creation), so an unwired host prompts on its own memory spine.

**Propose it machine-wide, not per repo.** Both rules name a repo-relative path, so one grant in the
host's global permission config (Claude family: `~/.claude/settings.json`) covers every repo better-dev
is ever wired into, and every later `/onboard` then finds it present and proposes nothing at all. A
repo-local grant asks the same question again in every repo the operator adopts - the friction this
ordering exists to remove. Fall back to the repo-local config (`.claude/settings.local.json`) only
where the host has no global one, or where the operator wants the grant kept to this repo.

**Check before proposing.** Install offers this same grant once per machine (`BOOTSTRAP.md` step 2c),
so read the global config first and propose nothing when both rules are already there - which is the
steady state on any machine that took the install offer. Only a machine that predates that offer, or
declined it, reaches this at all.

Probe that config for the two rule names, and expect the probe itself to be refused. A host classifier
can treat its own permission file as off-limits to every read, whatever the shape: observed 2026-08-05,
a `python3 -c` that printed the allow list was blocked, and a later run's narrow
`grep -c 'bd-mem' ~/.claude/settings.json` was blocked too. Spend one cheap attempt, never a second
phrasing of the same question - the refusal is about the file, not the command. A refused probe means
*unknown*, not *absent* - so offer the grant anyway,
saying the check could not run and it may already be there. The two failures are not the same size: a
redundant paste block costs one turn once, while a grant never offered leaves the host prompting on
its own memory spine for every `bd-mem` call in every later skill, and nothing downstream catches it.

The doctrine holds at either scope: a permission file is a settings-class mutation, so the write stays
operator-run - observed 2026-07-16, that write class is classifier-blocked for the agent even with
adjacent operator consent, so proposing to make it yourself buys a denial rather than a shortcut. Emit
one paste-ready snippet, put it on the clipboard where the host has a clipboard command, let the
operator run it, and confirm afterwards that the rules read back. A host with no permission config
skips this entirely, and a run that finds both rules already present at either scope proposes nothing.

Now `.better-dev/bin/bd-mem` resolves. **Point the memory contract at what Phase 1 found, then
initialize it:**

- Files default (nothing else detected) → `.better-dev/bin/bd-mem init`.
- A detected backend → record it (`export BETTER_DEV_MEMORY=mcp:<server>` or `cmd:<command>`) so
  `bd-mem` routes there, then `.better-dev/bin/bd-mem init`. Note the export in the discovery block so
  it persists.

**Keep `.better-dev/` data-only.** The bridge is per-machine, the ledger is transient loop state,
and the model fingerprint is per-machine runtime state the SessionStart hook writes; all three stay
out of version control. What the rest does follows the recorded adoption:

- **Team** - rules, overrides, and learnings are tracked and shared:

  ```bash
  mkdir -p .better-dev
  # 'bin' carries no trailing slash on purpose: it is a symlink, and git's dir-only pattern never
  # matches one - 'bin/' leaves the per-machine bridge tracked on the first commit.
  for p in 'bin' 'ledger/' 'model-fingerprint'; do   # append only what's missing; never clobber a project's own entries
    grep -qxF "$p" .better-dev/.gitignore 2>/dev/null || printf '%s\n' "$p" >> .better-dev/.gitignore
  done
  grep -qxF 'learnings.jsonl merge=union' .better-dev/.gitattributes 2>/dev/null \
    || printf '%s\n' 'learnings.jsonl merge=union' >> .better-dev/.gitattributes
  ex="$(git rev-parse --git-common-dir)/info/exclude"   # a solo-to-team upgrade: drop solo's local-only
  if grep -qxF '.better-dev/' "$ex" 2>/dev/null; then   # ignore, or the dir stays invisible to git and
    grep -vxF '.better-dev/' "$ex" > "$ex.tmp"; mv "$ex.tmp" "$ex"   # empty result is correct when the solo line was the only line
  fi
  ```

  The `.gitattributes` line covers the one file two clones append to concurrently: `learnings.jsonl`
  is append-only, so git's built-in `union` driver keeps both sides' lines when their histories
  reconcile instead of raising a conflict. Propagation has an owner: `bd-mem` writes land in the
  primary checkout, and the close-out of the work-item that earned a memory delta commits it there -
  one `mem: <work-item>` commit on the integration branch - so shared memory travels with the work
  that produced it rather than sitting uncommitted on one machine.
- **Solo** - the whole dir stays local. Write git's local-only ignore file (itself never committed)
  rather than tracked entries, and skip the `.gitattributes` line - an untracked file has no merges
  to reconcile:

  ```bash
  ex="$(git rev-parse --git-common-dir)/info/exclude"
  grep -qxF '.better-dev/' "$ex" 2>/dev/null || printf '%s\n' '.better-dev/' >> "$ex"
  ```

**Stamp the wired version.** On every run, re-runs and top-ups included, write the installed
clone's plugin-manifest version (read from `.claude-plugin/plugin.json` in the clone the install
marker names) to `.better-dev/wired-version` as a plain string, e.g. `0.6.0`. `/update` and the
session-start reonboard nudge compare releases against this stamp. It is repo wiring state, so on
a team adoption it stays tracked - no gitignore entry, unlike the per-machine model-fingerprint -
and a wired repo with no stamp reads as wired before 0.6.0.

**Wire the minimum base.** With memory live, hand off to `/guardrails-install` - it records this repo's
real verify command and its safety baseline (the denylist, the gated classes, the scope number) through
`bd-mem`, filling only what's missing, so Phase 5's "guardrails/CI wired" and "verify command mapped"
signals rest on something recorded rather than assumed. Hand it the runnable entry points Phase 1
observed - the dev/start and seed/reset commands, each with its file:line - for its `dev-run` /
`seed-reset` recording step: it owns those keys, onboard only spots them.

Say which repo you are handing over, because it changes what comes back. A repo with **no stack** - no
dependency manifest, no build file, no source tree, which is every greenfield scaffold this phase just
created - gets that skill's stack-agnostic half only: the secret-scan hook installed, one deferred line
recorded, and no `none` placeholders, no policy questions, and no enforcement paste block, because each
of those describes code that does not exist yet. Name the deferral in the Phase 5 recap alongside
graphify's, pointing at the same trigger: `/groundwork` lands the stack, and both re-run against
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
reads as instruction injection and denies, while a native edit shows a reviewable diff and lands. The
shared writer stays the mechanism for non-interactive contexts (hooks, scripts, a re-run inside CI):

```bash
printf '%s\n' "$BLOCK" | .better-dev/bin/bd-block CLAUDE.md better-dev   # scripted contexts only
```

Either path leaves the same marker-bounded block, byte-stable across re-runs (replace, never append),
which keeps the prompt cache below it valid - preserve that property when changing the block shape.

Fill the block from what you actually detected (branching, memory backend). The block is
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
| "what's in flight?", "where did we leave off?" | `.better-dev/bin/bd-mem ledger status` | one line per work-item with its state |
| "hand this off", "pick up X's work" | `/worktree-branching` (handoff) | the bundle rides the branch; consent re-pins on pickup |
| "make it look good", "design the page" | `/design-brief` | -> `/plan-grill` or the loop |
| "is this safe", a security pass on a risky diff | `/security-pass` | composed by `/review` automatically |
| "is there a tool or skill for X" | `/tool-sourcing` | -> `/self-extension` only if discovery is empty |
| "who calls this / what breaks if I change X" | `/codebase-map` | queries the code graph before grepping; changes nothing |
| "index the repo", "build / refresh the code graph" | `/graphify-wrapper-map` (or `-sync`) | `/graphify-wrapper-query` answers from it; hooks keep worktree graphs fresh |
| "what's worth doing here", "audit this codebase" | `/codebase-audit` | ranked findings; you pick -> front-ends |
| "here are some links / ingest these / harvest this", a link or dump of source material for the library - even one framed as "implement this" | `/source-harvest` | captures verbatim -> critical synthesis; a build ask then -> `/plan-grill` |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "wait, you lost me", "what does that mean?" - a reply that didn't land | `/wait-what` | re-pitches it plainly in this repo's own vocabulary |
| "I can't answer this - my colleague / the client owns it" | `/plan-grill` (questionnaire unblock) | drafts the doc, grills only the send; the item waits on the answers |
| "remove better-dev" | `/uninstall` (or `.better-dev/bin/bd-uninstall repo`) | unwires this repo, keeps your data |
| a one-to-two-step change | no front-end - just make it | inline in the work-item's worktree; verify before done |

You name the entry, not every step: each front-end hands to `/autonomous-loop`, which hands a DONE
result to `/pr-and-verify`, which hands a green PR to `/release-promotion`. Every work-item - even a
trivial one that skips the front-ends - runs in
its own git worktree, off `<integration-branch>` (`/worktree-branching` sets it up first); a follow-up
to an open item rides that item's existing worktree. Branching is `<detected convention>`.

- Durable rules and lessons: `.better-dev/bin/bd-mem` (backend: `<detected>`); `--help` prints the
  full command surface. Project overrides in
  `.better-dev/overrides.md` **win over defaults**, so read them first.
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the global tool.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  build ask, `/groundwork` opens by asking how you want it built - steered (foundation plus
  parallelizable work-items, you review each) or one-shot (`/gauntlet` hands a fresh session one
  prompt and runs long with minimal interaction).
- `.better-dev/` holds tracked data (rules, overrides, learnings); `bin` and `ledger/` are per-machine
  and gitignored. A fresh clone re-runs `/onboard` to rebuild the `bin` bridge.
- Update the tool with `/update` - it pulls the global clone (`git pull` underneath), reconciles
  skill links when needed, and tops up this repo's wiring when a release changed it.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
```

**Comms-style block.** Beside the discovery block, write a second marker-bounded block -
`<!-- BEGIN better-dev-comms -->` / `<!-- END better-dev-comms -->` - carrying the ADHD-adapted
communication style every later session in this repo speaks in. The body is not retyped here: it ships
as one file, `docs/comms-block.md` in the better-dev clone, and both this path and the machine-global
one at install write *that file's contents*. A second copy of the body is drift waiting to happen, and
the drift would only surface on a user's machine.

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

**When the machine already carries it globally.** The operator may have taken the global option at
install (`BOOTSTRAP.md`), which puts the same block in the host's own entry file - the
`bd_host_global_entry` path in the matching `hosts/*` adapter, `~/.claude/CLAUDE.md` on Claude Code.
Resolve the clone the same way the rest of this phase does, from the bridge this repo already has
(`bd=$(dirname "$(dirname "$(readlink .better-dev/bin)")")`, or the install marker found in Phase 1,
which holds the clone path); the adapter and the block body both live under it. Check the entry file
for the `<!-- BEGIN better-dev-comms -->` marker before writing, and let what you find decide:

- **Found, no teammates** (solo adoption, or a `team` label with no remote and no second author):
  skip the repo block without asking and name the skip in the Phase 5 recap. The operator already
  reads it from the global file, and a second copy is a duplicate tax on every turn of every session
  in this repo.
- **Found, real teammates:** write it anyway, after the confirm above. The shared block is not for the
  operator, it is for teammates who have no global block of their own. "Write it anyway" answers the
  duplicate question, never the consent one: where the destination file's own text asks to be
  consulted first, the answer given earlier in this phase still governs, and a declined destination
  stays declined for this block too.
- **Not found:** write as usual, and let the recap name the global option once. The install-time ask
  is prose an agent follows, so a missed ask should cost one line to recover, not a re-install.

The write mechanism is the discovery block's: the host's file-edit tool in an interactive session,
`.better-dev/bin/bd-block <entry-file> better-dev-comms < <clone>/docs/comms-block.md` in scripted
contexts. Replace in place between the markers, byte-stable across re-runs, never touching the
operator's own text or the discovery block. The block is a per-turn tax deliberately capped small:
at most 24 lines between the markers, gated by `bd-package-check` - cut a line before adding one.
`bd-block` writes the markers itself, so the piped body is only the lines between them. The body is
adapted from ayghri/i-have-adhd (MIT), credited in `NOTICE`.

Then confirm the `.better-dev/` scaffold exists (`bd-mem init` created it), the `bin` bridge resolves,
and both blocks read correctly at their destinations.

---

### Phase 5 - Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (tool not yet installed
globally, no integration branch, a memory backend left on files, an unmapped test command) so they can
come back with `/onboard <phase>`.

Scale the recap to what actually varies. Where every deferred item traces to one absent thing - a repo
with no stack yet defers guardrails, the verify command, the graph and the enforcement hook for the
same reason - say that reason once and name the one step that closes it, instead of four entries
repeating it.

Then read the draft back as the operator, who has run one command and never seen this tooling's
source, and apply two tests before sending:

- **Every word they could not have met before is glossed or cut.** Not a list of terms - the terms
  differ every run, and they arrive from the phases this recap summarizes as much as from here
  (`loop-readiness`, `blast-radius`, `graphify registry`, a *parked decision*). Half a line of plain
  English at first use, or leave the name in the record where the next skill reads it and describe the
  thing here.
- **The one action they owe is in the first two lines.** Observed 2026-08-05, three runs closed with
  a wall an operator had to read three times to find the single thing asked of them; one answered
  "could've just asked where the block goes". Everything else in the recap is reference they can read
  or skip. Anything still waiting on the operator's own hands **leads** the
recap - "ready", "armed", or "fully wired" is claimable only when that list is empty; a pending
operator action is the headline, not a footnote under a victory banner. Each parked decision is also
recorded where downstream skills trip over it, because a recap line scrolls away:
`.better-dev/bin/bd-mem remember "pending-decision: <question> (parked at onboard)"`. The first skill
that needs the answer - a contract about to set merge policy, a loop about to deploy - treats a
recorded pending-decision as a must-ask, never a blank it may fill with the autonomous default.

If Phase 1 found a remote, note once - advisory, not a blocker - whether the host can reach it before
the first remote-dependent step (`/pr-and-verify`, `/release-promotion`, branch protection): a
`gh auth status` that returns logged-in, or a `git ls-remote` that succeeds over SSH. A red result here
doesn't stop onboarding; it's just the thing to fix before a PR or push, surfaced now rather than at the
first failed `gh pr create`.

Close with a **loop-readiness** read - a short prose check on whether this repo can actually drive the
loop, not a score. Six signals, each drawn from what the phases above already turned up:

- **Integration branch** - one exists (the `staging`/`develop` or the recorded integration branch) for
  feature worktrees to branch off, and the working tree is standing on it; without it
  `/worktree-branching` has no base to start a loop from. Report the branch by name, read from
  `git branch --show-current` rather than from what Phase 2 recorded - the recorded name is the
  premise, the checked-out one is the fact.
- **Guardrails & CI wired** - a pre-commit hook and a CI check run the repo's real lint/typecheck/test
  (`/guardrails-install`), so the loop's green rests on gates that actually hold.
- **Verify command mapped** - the repo's real verify command is recorded, not guessed (the `verify`
  rules `/guardrails-install` records for `bd-mem` to recall); an unmapped one is a gap the loop can't
  grade against.
- **Memory wired** - `.better-dev/bin/bd-mem` resolves and is initialized to the detected backend, so
  overrides, rules, and the shared ledger survive across sessions.
- **Structural graph reachable** - `command -v graphify` resolves, so `/codebase-map`, `/review`'s
  ripple step and `/autonomous-loop`'s triage answer from a budgeted traversal rather than falling
  back to grep. This is the one signal with a silent failure mode: without the CLI every one of those
  degrades without saying so, which is why it is checked here rather than left to be noticed. Report
  it from the Phase 3 probe, and name `/graphify-wrapper-setup` as the one command that closes it.
- **Red-capable-signal discipline** - the operator understands that each work-item names a check already
  seen to go red before the loop drives it; without one, a "green" run proves nothing (`/autonomous-loop`,
  `/diagnose`).

All six clear → the repo is ready to drive the loop. A gap isn't a blocker: name it alongside the
`/onboard <phase>`, `/guardrails-install` or `/graphify-wrapper-setup` that closes it, and let the
operator decide when to.

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
Record a durable rule for anything worth remembering next session
(`.better-dev/bin/bd-mem remember "<rule>"`).

## Composability

Everything here is additive and idempotent. It never disables an installed skill, never rewrites a
shared skill to encode a preference (that's what `.better-dev/overrides.md` is for), and never
clobbers the operator's edits to the entry file. It vendors nothing into the repo - the tool stays
global; the repo keeps only data and a per-machine `bin` bridge. When authoring or revising this
skill, follow `/writing-skills`.
