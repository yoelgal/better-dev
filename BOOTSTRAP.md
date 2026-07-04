# Bootstrap better-dev

This is the front door. Paste the prompt from the README (or this file's URL) into your coding agent
and it follows the steps below: install better-dev once for this machine, then wire the repo you're
sitting in. It works from inside any host - Claude Code, Codex, pi, hermes. Ask the operator only when
something is genuinely ambiguous; adapt to what's already here rather than imposing.

better-dev has two layers, and this bootstrap sets up both:

- **The tool** - the skills, the `bd-*` scripts, and the hooks. It installs **globally, once per
  machine**, and every repo shares it. Never copied into a repo.
- **A repo's `.better-dev/`** - this project's *data only* (rules, overrides, learnings, loop ledger),
  plus a per-machine link back to the global tool. Wired per repo by `/onboard`.

---

## 1. Detect the host

Work out which coding agent you're running inside - Claude Code (`~/.claude`), Codex (`~/.codex`), or
another. That decides the install command and which global skills directory the tool links into.

## 2. Install the tool globally (once per machine)

First check whether it's already installed: look for the `.better-dev-install` marker in the host's
global skills directory (e.g. `~/.claude/skills/.better-dev-install`) or an existing clone. If it's
there, run `git pull` in the clone to update and move to step 3; nothing is installed twice.

Otherwise install it. Two paths:

- **Claude Code** - install it as a plugin: add this repo as a plugin marketplace, then install
  `better-dev`. That clones and registers the skills and hooks for you. (Or use the clone path below -
  the skill contract is identical.)
- **Any host, including Claude** - clone once to a stable location and run its installer:

  ```sh
  git clone https://github.com/yoelgal/better-dev ~/better-dev
  ~/better-dev/install.sh
  ```

  The installer links each skill into the host's global skills directory one level deep
  (`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, and so on), since hosts only discover a skill
  at `<skills-dir>/<name>/SKILL.md`; it copies instead of linking where symlinks aren't available.

Updating later is just `git pull` in the clone - the global link picks it up. You can't drive an
interactive plugin installer as the agent; when one is needed, hand the operator a paste-ready command
and continue once they confirm.

## 3. Wire this repo - run `/onboard`

With the tool globally available, run `/onboard` from inside the current repo. It detects the stack,
memory system, and branching, adapts to what's already there, and sets up:

- **`.better-dev/` - data only, committed:** `rules.md`, `overrides.md`, `learnings.jsonl`. Loop state
  under `ledger/` stays gitignored.
- **`.better-dev/bin` - a per-machine symlink** to the global install's scripts, so the portable path
  `.better-dev/bin/bd-mem` resolves in this repo. It's gitignored - each machine links its own.
- **A discovery block** in the entry file (`CLAUDE.md` / `AGENTS.md`) so every later session knows the
  practices are here.

Onboard is idempotent and asks one decision at a time only on real ambiguity; it never overwrites your
conventions or your edits.

---

## Good to know

- The tool is global and shared; a repo's `.better-dev/` carries only that repo's data and its link
  back to the tool. Update everything at once with a `git pull` in the clone.
- Skills you mint later with `/self-extension` are **repo-scoped**: they're committed into this repo's
  own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only here.
  Promoting one to the global tool is a separate, deliberate step.
