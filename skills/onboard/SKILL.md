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
vendored per repo. This repo carries only **data**: `.better-dev/` with tracked rules, overrides, and
learnings, plus a per-machine `.better-dev/bin` symlink back to the global install so the portable
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
ls CLAUDE.md AGENTS.md 2>/dev/null                        # entry file(s)
grep -l '@AGENTS.md' CLAUDE.md 2>/dev/null                # which imports which
ls -d .better-dev .better-dev/bin .mcp.json 2>/dev/null   # prior data scaffold? bin bridge? MCP?
ls "$HOME/.claude/skills/.better-dev-install" "$HOME/.codex/skills/.better-dev-install" 2>/dev/null  # tool installed? (marker holds clone path)
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
```

Read (don't guess) six things:

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
   prefix in use (`feat/` vs `feature/`), is there a remote. Read it from branch names and the entry
   file, not from an assumption.
6. **Prior better-dev data** - `.better-dev/` or a discovery block already present → this is a
   top-up run; a missing `.better-dev/bin` is the common gap to fill.

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

- Repo uses `feat/* → staging → main`? Keep it. Record `feature branch prefix = feat/` and
  `integration branch = staging` via `.better-dev/bin/bd-mem persist-override "<line>"`. Don't force
  `feature/`.
- **Only `main`, no integration branch?** The common case - most fresh repos start `main`-only.
  Suggest the integration + feature-branch mechanism: a `staging` branch off `main` that feature/fix
  worktrees branch from and merge back into, promoted to `main` on release, with work on `feat/*`
  (`fix/*`). Greenfield: scaffold it under quiet defaults. An existing repo with real history: confirm
  once before creating `staging` off the default branch (a choice that genuinely matters). Either way,
  record `integration branch = staging` and `feature branch prefix = feat/` via
  `.better-dev/bin/bd-mem persist-override "<line>"`.
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
sd=""
for m in "$HOME/.claude/skills/.better-dev-install" "$HOME/.codex/skills/.better-dev-install"; do
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

**Keep `.better-dev/` data-only.** The bridge is per-machine and the ledger is transient loop state;
both stay out of version control, while rules, overrides, and learnings are tracked and shared:

```bash
mkdir -p .better-dev
for p in 'bin/' 'ledger/'; do   # append only what's missing; never clobber a project's own entries
  grep -qxF "$p" .better-dev/.gitignore 2>/dev/null || printf '%s\n' "$p" >> .better-dev/.gitignore
done
```

**Wire the minimum base.** With memory live, hand off to `/guardrails-install` - it records this repo's
real verify command and its safety baseline (the denylist, the gated classes, the scope number) through
`bd-mem`, filling only what's missing, so Phase 5's "guardrails/CI wired" and "verify command mapped"
signals rest on something recorded rather than assumed.

---

### Phase 4 - Self-describe

Write the discovery block into the **entry file** from Phase 1 with the shared writer - it replaces
the block in place and never touches the operator's own text:

```bash
printf '%s\n' "$BLOCK" | .better-dev/bin/bd-block CLAUDE.md better-dev
```

The block is written in place and byte-stable across re-runs (bd-block replaces, never appends), which
keeps the prompt cache below it valid - preserve that property when changing the block shape.

Fill the block from what you actually detected (branching, memory backend). Shape:

```markdown
## better-dev is wired here

This repo uses **better-dev**: portable dev practices that run inside your agent (installed globally
for your host, not vendored here). Say what you want; the right skill enters, and the chain runs itself:

| You say... | Enters | Then, on its own |
|---|---|---|
| "add / build feature X", "I want Y" (non-trivial) | `/plan-grill` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "X is broken / failing / slow", "why is prod down" | `/diagnose` | -> `/autonomous-loop` -> `/pr-and-verify` |
| "let's build an app that does Y", a new project or epic | `/groundwork` | sets the foundation, then per-item front-ends |
| "ship it", "open a PR", "let's land this" | `/pr-and-verify` | -> `/release-promotion` on green |
| "release this", "promote to main", "hotfix prod" | `/release-promotion` | tags and double-merges the hotfix |
| "make it look good", "design the page" | `/design-brief` | -> `/plan-grill` or the loop |
| "is this safe", a security pass on a risky diff | `/security-pass` | composed by `/review` automatically |
| "is there a tool or skill for X" | `/tool-sourcing` | -> `/self-extension` only if discovery is empty |
| "who calls this / what breaks if I change X" | `/codebase-map` | orientation, changes nothing |
| "just push to the PR / use feat/ / skip the grill" | `/overrides` | records the standing default |
| "remove better-dev" | `/uninstall` | unwires this repo, keeps your data |
| a one-to-two-step change | no front-end - just make it | verify before calling it done |

You name the entry, not every step: each front-end hands to `/autonomous-loop`, which hands a DONE
result to `/pr-and-verify`, which hands a green PR to `/release-promotion`. Each feature or fix runs in
its own git worktree, off `<integration-branch>` (`/worktree-branching` sets it up first); branching is
`<detected convention>`.

- Durable rules and lessons: `.better-dev/bin/bd-mem` (backend: `<detected>`). Project overrides in
  `.better-dev/overrides.md` **win over defaults**, so read them first.
- Hit a capability gap? Source an existing skill with `/tool-sourcing` before building anything; author
  one with `/self-extension` only when discovery genuinely comes up empty. A skill you author here is
  repo-scoped: it lands in this repo's own project skills dir, not the global tool.
- `/guardrails-install` records this repo's real verify command and safety baseline; on a greenfield
  project, `/groundwork` takes the idea to a shared foundation and parallelizable work-items.
- `.better-dev/` holds tracked data (rules, overrides, learnings); `bin/` and `ledger/` are per-machine
  and gitignored. A fresh clone re-runs `/onboard` to rebuild the `bin` bridge.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive: it complements, never replaces, whatever else is installed.
```

Then confirm the `.better-dev/` scaffold exists (`bd-mem init` created it), the `bin` bridge resolves,
and the block reads correctly in the entry file.

---

### Phase 5 - Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (tool not yet installed
globally, no integration branch, a memory backend left on files, an unmapped test command) so they can
come back with `/onboard <phase>`.

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
