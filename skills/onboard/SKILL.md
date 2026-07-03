---
name: onboard
description: Use when setting up better-dev in a repository for the first time, or re-running to wire in anything missing — greenfield or existing codebase. Also use when the repo has the better-dev tool installed but no .better-dev/ scaffold, no .better-dev/bin bridge, or no CLAUDE.md discovery block yet.
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

Bring better-dev into this project — greenfield or an existing codebase — by detecting what's
already here, adapting to it, wiring memory, and leaving a discovery block so every later session
knows the practices are available. One job: **get the repo wired, without imposing.**

better-dev installs in two layers, and onboard only touches the second. The **tool** (the skills +
`bd-*` scripts + hooks) is installed once per machine, globally, into your host's native skills dir
(Claude Code: `~/.claude/skills/better-dev`; Codex: `~/.codex/skills/better-dev`) — never vendored
per repo. This repo carries only **data**: `.better-dev/` with tracked rules, overrides, and
learnings, plus a per-machine `.better-dev/bin` symlink back to the global install so the portable
path `.better-dev/bin/bd-mem` resolves here.

## Agent contract

Run the phases in order. If `$ARGUMENTS` names a phase, jump straight to it. At each phase:
**detect → report tersely → confirm → act.** Skip anything already done — this skill is idempotent
and safe to re-run; re-running only fills gaps.

Three rules carry the whole skill:

- **Detection is a premise, not a fact.** Verify it at `file:line` before you build on it. A branch
  named `staging` in `CLAUDE.md` prose isn't a `staging` branch until `git` shows it. Report what you
  actually observed, with where.
- **Never guess a command.** An unmapped capability (test runner, lint, typecheck) is a *gap* to
  record and ask about — not a command to invent. Silence beats a wrong guess.
- **Quiet defaults.** Take the obvious call and keep moving; stop to ask only when a choice genuinely
  matters — no integration branch to base worktrees on, or an entry file that's truly ambiguous.
  Don't batch a wall of questions, and don't ask about a default you can safely pick and record.

You can't drive interactive UIs (a plugin installer, an auth login) or make global machine changes
silently. For those, **emit a paste-ready command block** and let the operator run it (`! <cmd>` runs
in-session); do file ops yourself after confirming.

---

### Phase 1 — Detect

A read-only sweep. Report each as *observed value + where*, then move on:

```bash
ls CLAUDE.md AGENTS.md 2>/dev/null                        # entry file(s)
grep -l '@AGENTS.md' CLAUDE.md 2>/dev/null                # which imports which
ls -d .better-dev .better-dev/bin .mcp.json 2>/dev/null   # prior data scaffold? bin bridge? MCP?
ls -d "$HOME/.claude/skills/better-dev" "$HOME/.codex/skills/better-dev" 2>/dev/null  # tool installed globally?
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
```

Read (don't guess) six things:

1. **Is the tool installed for this host** — a `better-dev` entry in the host's global skills dir
   above. Absent → Phase 3 helps the operator install it before anything else can work.
2. **Entry file** — `CLAUDE.md`, `AGENTS.md`, both, or neither. If both exist, the convention is that
   one `@`-imports the other (papers.town: `CLAUDE.md` opens `@AGENTS.md`); the **importer is the
   entry file** and the block goes there. Neither → create `CLAUDE.md`.
3. **Installed skills / MCP** — note them so you never disable or replace them. better-dev only adds.
4. **Existing memory system** — an MCP memory server in `.mcp.json`, claude-mem, Mem0/Graphiti, or a
   host-native store. Found → that becomes the memory backend. None → the zero-infra files default.
5. **Git + branching** — does an integration branch (`staging`/`develop`) exist, what's the feature
   prefix in use (`feat/` vs `feature/`), is there a remote. Read it from branch names and the entry
   file, not from an assumption.
6. **Prior better-dev data** — `.better-dev/` or a discovery block already present → this is a
   top-up run; a missing `.better-dev/bin` is the common gap to fill.

---

### Phase 2 — Adapt, don't impose

Reconcile better-dev's defaults with what the repo already does. **What's already here wins**, and is
recorded as an override rather than overwritten:

- Repo uses `feat/* → staging → main`? Keep it. Record `feature branch prefix = feat/` and
  `integration branch = staging` via `.better-dev/bin/bd-mem persist-override "<line>"`. Don't force
  `feature/`.
- No integration branch anywhere? Under quiet defaults, greenfield gets `main` + `staging` scaffolded;
  an existing repo with real history is the case worth a quick confirm before creating `staging` off
  the default branch (this is a choice that genuinely matters).
- Installed skills stay installed. better-dev complements them.

Present real decisions one at a time; skip the ones you can default.

---

### Phase 3 — Ensure the tool, then wire this repo

**First, make sure the tool is installed for this host.** If Phase 1 found no `better-dev` entry in
the host's global skills dir, the practices can't load. Hand the operator the one-paste bootstrap and
let them run it — you can't change their machine globally on your own:

```bash
git clone https://github.com/yoelgal/better-dev ~/better-dev && ~/better-dev/install.sh
```

On Claude Code, installing the plugin manifest (`.claude-plugin/plugin.json`, added as a plugin
marketplace) is an equally valid path. Either way, updates are a plain `git pull` in that clone.

**Then wire this repo's `.better-dev/bin` bridge.** The scripts live beside the globally-linked
skills; resolve them and let `bd-link` create the per-machine symlink (or a copy where symlinks don't
refresh):

```bash
for s in "$HOME/.claude/skills/better-dev" "$HOME/.codex/skills/better-dev"; do
  [ -e "$s" ] && sd="$(cd -P "$s/../scripts" 2>/dev/null && pwd)" && [ -n "$sd" ] && break
done
"$sd/bd-link" link          # creates .better-dev/bin -> the global install's scripts
```

Now `.better-dev/bin/bd-mem` resolves. **Point the memory contract at what Phase 1 found, then
initialize it:**

- Files default (nothing else detected) → `.better-dev/bin/bd-mem init`.
- A detected backend → record it (`export BETTER_DEV_MEMORY=mcp:<server>` or `cmd:<command>`) so
  `bd-mem` routes there, then `.better-dev/bin/bd-mem init`. Note the export in the discovery block so
  it persists.

**Keep `.better-dev/` data-only.** The bridge is per-machine and the ledger is transient loop state;
both stay out of version control, while rules, overrides, and learnings are tracked and shared:

```bash
printf 'bin/\nledger/\n' > .better-dev/.gitignore   # rules.md / overrides.md / learnings.jsonl stay tracked
```

---

### Phase 4 — Self-describe

Write the discovery block into the **entry file** from Phase 1 with the shared writer — it replaces
the block in place and never touches the operator's own text:

```bash
printf '%s\n' "$BLOCK" | .better-dev/bin/bd-block CLAUDE.md better-dev
```

Fill the block from what you actually detected (branching, memory backend). Shape:

```markdown
## better-dev is wired here

This repo uses **better-dev** — portable dev practices that run inside your agent (installed globally
for your host, not vendored here). On non-trivial work:

- **Feature** → `/plan-grill`, then the autonomous loop. **Bug/fix** → `/diagnose`, then the loop.
- Each feature/fix runs in its **own git worktree** off `<integration-branch>`; branching is
  `<detected convention>`.
- Durable rules & lessons: `.better-dev/bin/bd-mem` (backend: `<detected>`). Project overrides live in
  `.better-dev/overrides.md` and **win over defaults** — read them first.
- `.better-dev/` holds tracked data (rules, overrides, learnings); `bin/` and `ledger/` are per-machine
  and gitignored. A fresh clone re-runs `/onboard` to rebuild the `bin` bridge.
- Hit a capability gap? **Source a skill** (`find-skills`) before writing one. A skill you author here
  is repo-scoped — it lands in this repo's own project skills dir, not the global tool.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive — it complements, never replaces, whatever else is installed.
```

Then confirm the `.better-dev/` scaffold exists (`bd-mem init` created it), the `bin` bridge resolves,
and the block reads correctly in the entry file.

---

### Phase 5 — Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (tool not yet installed
globally, no integration branch, a memory backend left on files, an unmapped test command) so they can
come back with `/onboard <phase>`. Record a durable rule for anything worth remembering next session
(`.better-dev/bin/bd-mem remember "<rule>"`).

## Composability

Everything here is additive and idempotent. It never disables an installed skill, never rewrites a
shared skill to encode a preference (that's what `.better-dev/overrides.md` is for), and never
clobbers the operator's edits to the entry file. It vendors nothing into the repo — the tool stays
global; the repo keeps only data and a per-machine `bin` bridge. When authoring or revising this
skill, follow `/writing-skills`.
