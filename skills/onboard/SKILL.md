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

You can't drive interactive UIs (a plugin installer, an auth login) or make global machine changes
silently. For those, **emit a paste-ready command block** and let the operator run it (`! <cmd>` runs
in-session); do file ops yourself after confirming.

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
- **Only `main`, no integration branch?** Two shapes fit, and git - not prose - says which (the
  branches that exist, the base merged PRs actually target, from Phase 1). A team already running
  trunk-based - PRs merge to `main`, `main` releases - is a first-class model, not a gap: record
  `integration branch = main` via `persist-override` and `branch-model: trunk` via `remember`
  (`/worktree-branching` then bases worktrees off the trunk; `/release-promotion` reduces to
  tag-plus-verify). Otherwise suggest the staged mechanism: a `staging` branch off `main` that
  feature/fix worktrees branch from and merge back into, promoted to `main` on release, with work
  on `feat/*` (`fix/*`). Greenfield: scaffold it under quiet defaults. An existing repo with real
  history: confirm once before creating `staging` off the default branch (a choice that genuinely
  matters); a declined offer is a trunk repo - record it as one. Once `staging` exists - the quiet
  scaffold or the confirmed yes - record `integration branch = staging`,
  `feature branch prefix = feat/`, and `branch-model: staged`.
  Solo adoption skips the offer entirely: a shared branch created on one person's yes imposes a
  workflow the team never chose - record `branch-model: trunk` on the default branch.
- Installed skills stay installed. better-dev complements them.

Present real decisions one at a time; skip the ones you can default.

---

### Phase 3 - Ensure the tool, then wire this repo

**First, make sure the tool is installed for this host.** If Phase 1 found no `better-dev` entry in
the host's global skills dir, the practices can't load. Hand the operator the one-paste bootstrap and
let them run it - you can't change their machine globally on your own:

```bash
git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh
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
  for p in 'bin/' 'ledger/' 'model-fingerprint'; do   # append only what's missing; never clobber a project's own entries
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

**Wire the minimum base.** With memory live, hand off to `/guardrails-install` - it records this repo's
real verify command and its safety baseline (the denylist, the gated classes, the scope number) through
`bd-mem`, filling only what's missing, so Phase 5's "guardrails/CI wired" and "verify command mapped"
signals rest on something recorded rather than assumed. Hand it the runnable entry points Phase 1
observed - the dev/start and seed/reset commands, each with its file:line - for its `dev-run` /
`seed-reset` recording step: it owns those keys, onboard only spots them.

---

### Phase 4 - Self-describe

Write the discovery block into the **entry file** from Phase 1, between the markers the shared writer
uses - `<!-- BEGIN better-dev -->` / `<!-- END better-dev -->` - replacing any existing block in place
and never touching the operator's own text.

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
| "let's build an app that does Y", a new project or epic | `/groundwork` | sets the foundation, then per-item front-ends |
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
| "who calls this / what breaks if I change X" | `/codebase-map` | orientation, changes nothing |
| "what's worth doing here", "audit this codebase" | `/codebase-audit` | ranked findings; you pick -> front-ends |
| "here are some links / ingest these / harvest this", a dump of source material for the library | `/source-harvest` | ingests verbatim -> critical synthesis -> library improvements |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "remove better-dev" | `/uninstall` | unwires this repo, keeps your data |
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
  project, `/groundwork` takes the idea to a shared foundation and parallelizable work-items.
- `.better-dev/` holds tracked data (rules, overrides, learnings); `bin/` and `ledger/` are per-machine
  and gitignored. A fresh clone re-runs `/onboard` to rebuild the `bin` bridge.
- Update the tool itself with `git pull` in the global clone; a new session picks it up, and re-run
  `./install.sh` when the pull added or removed a skill.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
```

Then confirm the `.better-dev/` scaffold exists (`bd-mem init` created it), the `bin` bridge resolves,
and the block reads correctly in the entry file.

---

### Phase 5 - Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (tool not yet installed
globally, no integration branch, a memory backend left on files, an unmapped test command) so they can
come back with `/onboard <phase>`. Anything still waiting on the operator's own hands **leads** the
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
loop, not a score. Five signals, each drawn from what the phases above already turned up:

- **Integration branch** - one exists (the `staging`/`develop` or the recorded integration branch) for
  feature worktrees to branch off; without it `/worktree-branching` has no base to start a loop from.
- **Guardrails & CI wired** - a pre-commit hook and a CI check run the repo's real lint/typecheck/test
  (`/guardrails-install`), so the loop's green rests on gates that actually hold.
- **Verify command mapped** - the repo's real verify command is recorded, not guessed (the `verify`
  rules `/guardrails-install` records for `bd-mem` to recall); an unmapped one is a gap the loop can't
  grade against.
- **Memory wired** - `.better-dev/bin/bd-mem` resolves and is initialized to the detected backend, so
  overrides, rules, and the shared ledger survive across sessions.
- **Red-capable-signal discipline** - the operator understands that each work-item names a check already
  seen to go red before the loop drives it; without one, a "green" run proves nothing (`/autonomous-loop`,
  `/diagnose`).

All five clear → the repo is ready to drive the loop. A gap isn't a blocker: name it alongside the
`/onboard <phase>` or `/guardrails-install` that closes it, and let the operator decide when to.

When this was a greenfield or brand-new project, point to
`/groundwork` as the next step - it takes the idea to a shared foundation and a set of parallelizable
work-items before any single feature is grilled. Record a durable rule for anything worth remembering
next session (`.better-dev/bin/bd-mem remember "<rule>"`).

## Composability

Everything here is additive and idempotent. It never disables an installed skill, never rewrites a
shared skill to encode a preference (that's what `.better-dev/overrides.md` is for), and never
clobbers the operator's edits to the entry file. It vendors nothing into the repo - the tool stays
global; the repo keeps only data and a per-machine `bin` bridge. When authoring or revising this
skill, follow `/writing-skills`.
