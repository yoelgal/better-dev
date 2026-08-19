# Bootstrap better-dev

This is the front door. Paste the prompt from the README (or this file's URL) into your coding agent
and it follows the steps below: install better-dev once for this machine, then wire the repo you're
sitting in. It works from inside any host - Claude Code, Codex, pi, hermes. Ask the operator only when
something is genuinely ambiguous; adapt to what's already here rather than imposing.

better-dev has two layers, and this bootstrap sets up both:

- **The tool** - the skills, and nothing else that has to run. It installs **globally, once per
  machine**, and every repo shares it. Never copied into a repo.
- **A repo's `.better-dev/`** - this project's *data only* (rules, overrides, loop ledger). Wired per
  repo by `/onboard`.

---

## 1. Detect the host

Work out which coding agent you're running inside - Claude Code (`~/.claude`), Codex (`~/.codex`), or
another. That decides which global skills directory the tool links into.

## 2. Install the tool globally (once per machine)

First check whether it's already installed: look for the `.better-dev-install` marker in the host's
global skills directory (e.g. `~/.claude/skills/.better-dev-install`) or an existing clone. If it's
there, run `git pull` in the clone to update and move to step 3; nothing is installed twice.

Otherwise install it - clone once to a stable location and run its installer:

```sh
git clone https://github.com/yoelgal/better-dev ~/better-dev
~/better-dev/install.sh
```

The installer links each skill into the host's global skills directory one level deep
(`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, and so on), since hosts only discover a skill
at `<skills-dir>/<name>/SKILL.md`; it copies instead of linking where symlinks aren't available. Skills
are the whole install: your host loads `CLAUDE.md` / `AGENTS.md` and resolves skills by itself, so
there is nothing to register in the host's own config.

Updating later is `/update` - a `git pull` in the clone underneath. A session started after the pull
picks up the new text, though a session already running keeps what it loaded at start. A pull that
adds or removes skills needs a re-run of `./install.sh` too, so new ones link and orphans prune. The
full install contract lives in `/packaging`.

Confirm the install rather than assume it - `./install.sh --verify` names any skill that failed to
link, and runs the package gate.

better-dev writes nothing outside a repo. Everything it sets up - the discovery block, the
communication style, the approval policy - lands in the repo you wire in step 3, so a machine carries
no better-dev state of its own beyond the clone and the skill links.

## 3. Wire this repo - run `/onboard`

With the tool globally available, run `/onboard` from inside the current repo. It detects the stack,
memory system, and branching, adapts to what's already there, and sets up:

- **`.better-dev/` - data only, committed:** `rules.md` and `overrides.md`. Loop state under `ledger/`
  stays gitignored.
- **A discovery block** in the entry file (`CLAUDE.md` / `AGENTS.md`) so every later session knows the
  practices are here. This block is the whole of discovery - nothing else announces them - so it names
  where the overrides and rules live, not just that the practices exist.
- **A committed `.omp/config.yml`** naming the shell commands that need the operator's approval, so the
  policy travels with the repo instead of living on one machine.
- **A comms-style block** in the same entry file: an ADHD-adapted communication style that leads with
  the action, one bounded step at a time, no preamble. It ships from `docs/comms-block.md` and is
  written per repo, between its own `<!-- BEGIN better-dev-comms -->` sentinels, so removing it is
  deleting those two lines and everything between them.

Onboard is idempotent and asks one decision at a time only on real ambiguity; it never overwrites your
conventions or your edits.

---

## Good to know

- The tool is global and shared; a repo's `.better-dev/` carries only that repo's data. Update
  everything at once with a `git pull` in the clone.
- Removing better-dev later: `/uninstall` (or `scripts/bd-uninstall`) - dry-run by default, removes
  only what better-dev installed, keeps a repo's `.better-dev/` data unless you pass `--purge-data`.
- Skills you mint later with `/self-extension` are **repo-scoped**: they're committed into this repo's
  own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only here.
  Promoting one to the global tool is a separate, deliberate step.
