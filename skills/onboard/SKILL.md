---
name: onboard
description: Use when setting up better-dev in a repository for the first time, or re-running to wire in anything missing — greenfield or existing codebase. Also use when the repo has better-dev skills but no .better-dev/ scaffold or CLAUDE.md discovery block yet.
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

## Agent contract

Run the phases in order. If `$ARGUMENTS` names a phase, jump straight to it. At each phase:
**detect → report tersely → confirm → act.** Skip anything already done — this skill is idempotent
and safe to re-run; re-running only fills gaps.

Two rules carry the whole skill:

- **Detection is a premise, not a fact.** Verify it at `file:line` before you build on it. A branch
  named `staging` in `CLAUDE.md` prose isn't a `staging` branch until `git` shows it. Report what you
  actually observed, with where.
- **Never guess a command.** An unmapped capability (test runner, lint, typecheck) is a *gap* to
  record and ask about — not a command to invent. Silence beats a wrong guess.

You can't drive interactive UIs (a plugin installer, an auth login). For those, **emit a paste-ready
command block** and let the operator run it (`! <cmd>` runs in-session); do file ops yourself after
confirming.

---

### Phase 1 — Detect

A read-only sweep. Report each as *observed value + where*, then move on:

```bash
ls CLAUDE.md AGENTS.md 2>/dev/null                      # entry file(s)
grep -l '@AGENTS.md' CLAUDE.md 2>/dev/null              # which imports which
ls -d .better-dev .claude/skills .mcp.json 2>/dev/null  # already onboarded? installed skills/MCP?
git rev-parse --is-inside-work-tree 2>/dev/null && git branch --format='%(refname:short)'
git remote -v 2>/dev/null | head -1
```

Read (don't guess) five things:

1. **Entry file** — `CLAUDE.md`, `AGENTS.md`, both, or neither. If both exist, the convention is that
   one `@`-imports the other (papers.town: `CLAUDE.md` opens `@AGENTS.md`); the **importer is the
   entry file** and the block goes there. Neither → create `CLAUDE.md`.
2. **Installed skills / MCP** — note them so you never disable or replace them. better-dev only adds.
3. **Existing memory system** — an MCP memory server in `.mcp.json`, claude-mem, Mem0/Graphiti, or a
   host-native store. Found → that becomes the memory backend. None → the zero-infra files default.
4. **Git + branching** — does an integration branch (`staging`/`develop`) exist, what's the feature
   prefix in use (`feat/` vs `feature/`), is there a remote. Read it from branch names and the entry
   file, not from an assumption.
5. **Prior better-dev state** — `.better-dev/` or a discovery block already present → this is a
   top-up run.

---

### Phase 2 — Adapt, don't impose

Reconcile better-dev's defaults with what the repo already does. **What's already here wins**, and is
recorded as an override rather than overwritten:

- Repo uses `feat/* → staging → main`? Keep it. Record `feature branch prefix = feat/` and
  `integration branch = staging` via `scripts/bd-mem persist-override "<line>"`. Don't force
  `feature/`.
- No integration branch anywhere? *Offer* to create `staging` off the default branch (confirm first);
  greenfield gets `main` + `staging`, an existing repo adapts to what it has.
- Installed skills stay installed. better-dev complements them.

Present these as decisions one at a time; don't batch a wall of questions.

---

### Phase 3 — Wire memory

Point the memory contract at what Phase 1 found, then initialize it:

- Files default (nothing else detected) → `scripts/bd-mem init`.
- A detected backend → record it (`export BETTER_DEV_MEMORY=mcp:<server>` or `cmd:<command>`) so
  `bd-mem` routes there, then `bd-mem init`. Note the export in the discovery block so it persists.

Keep transient loop state out of version control:

```bash
printf 'ledger/\n' > .better-dev/.gitignore   # promoted rules + overrides stay tracked; loop scratch doesn't
```

---

### Phase 4 — Self-describe

Write the discovery block into the **entry file** from Phase 1 with the shared writer — it replaces
the block in place and never touches the operator's own text:

```bash
printf '%s\n' "$BLOCK" | scripts/bd-block CLAUDE.md better-dev
```

Fill the block from what you actually detected (branching, memory backend). Shape:

```markdown
## better-dev is wired here

This repo uses **better-dev** — portable dev practices that run inside your agent. On non-trivial work:

- **Feature** → `/plan-grill`, then the autonomous loop. **Bug/fix** → `/diagnose`, then the loop.
- Each feature/fix runs in its **own git worktree** off `<integration-branch>`; branching is
  `<detected convention>`.
- Durable rules & lessons: `scripts/bd-mem` (backend: `<detected>`). Project overrides live in
  `.better-dev/overrides.md` and **win over defaults** — read them first.
- Hit a capability gap? **Source a skill** (`find-skills`) before writing one.
- Re-run `/onboard` any time to wire in what's missing.

better-dev is additive — it complements, never replaces, whatever else is installed.
```

Then confirm the `.better-dev/` scaffold exists (`bd-mem init` created it) and that the block reads
correctly in the entry file.

---

### Phase 5 — Confirm & close

Recap what changed, then list any phase the operator skipped or deferred (no integration branch, a
memory backend left on files, an unmapped test command) so they can come back with `/onboard <phase>`.
Record a durable rule for anything worth remembering next session
(`scripts/bd-mem remember "<rule>"`).

## Composability

Everything here is additive and idempotent. It never disables an installed skill, never rewrites a
shared skill to encode a preference (that's what `.better-dev/overrides.md` is for), and never
clobbers the operator's edits to the entry file. When authoring or revising this skill, follow
`/writing-skills`.
