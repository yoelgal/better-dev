# Bootstrap better-dev

Paste this into your agent:

```
Set up better-dev in this repo. Read https://raw.githubusercontent.com/yoelgal/better-dev/main/BOOTSTRAP.md
and follow it exactly: work out which coding agent you are, install the better-dev plugin through that
agent's own channel if it is not installed already, then run /onboard here. Ask me only if something is
genuinely ambiguous.
```

This file is the whole install story and assumes nothing is installed yet. Two steps: install the plugin
once for this machine, then wire the repo you are sitting in. Adapt to what is already here rather than
imposing, and ask the operator only on real ambiguity.

better-dev has two layers, and this bootstrap sets up both:

- **The plugin** - the skills, the always-applied comms rule, and one session hook. Installed once per
  machine through your agent's own plugin channel, and every repo shares it. Never copied into a repo.
- **A repo's `.better-dev/`** - this project's data only: rules, overrides, loop ledger. Written per repo
  by `/onboard` in step 2.

---

## 1. Install the plugin (once per machine)

Find your agent below and run its verbs. The channel table in `README.md` is the matrix behind this list:
which half of the library each channel delivers, and how each one updates.

- **omp, from this repo's own marketplace:**

  ```sh
  omp plugin marketplace add yoelgal/better-dev
  omp plugin install better-dev@better-dev
  ```

  The skills and the session hook load from the installed plugin tree. The hook injects `rules/comms.md`
  itself, which is how the comms rule reaches a session on this channel.

  Then offer the operator `omp config set marketplace.autoUpdate auto`, naming its cost: it upgrades
  plugins at startup, so the rules that shape every reply can change between sessions unasked. The
  shipped default writes update availability to omp's debug log and shows the operator nothing.

- **omp, from the git URL or a clone** - the channel where omp's own rules provider injects
  `rules/comms.md`, because `alwaysApply: true` is honoured for a git or link root:

  ```sh
  omp plugin install https://github.com/yoelgal/better-dev
  ```

  Or clone it and link the clone, which makes `git pull` in that clone the update:

  ```sh
  git clone https://github.com/yoelgal/better-dev ~/better-dev
  omp plugin link ~/better-dev
  ```

  A link needs the repo's root `package.json` and its `omp` key. Without them omp prints success and
  loads no skills and no rules, and `omp plugin doctor` is the only thing that reports it, so reach for
  that if the skills fail to appear.

- **hermes:**

  ```sh
  hermes plugins install https://github.com/yoelgal/better-dev
  ```

  This clones the whole repo to `~/.hermes/plugins/better-dev` and registers nothing out of it on its
  own: it warns that the tree carries no `plugin.yaml` or `__init__.py`, `hermes plugins list` leaves it
  out, and `hermes skills list` still reports zero. hermes reads skills from its own directories, so add
  one config line naming the clone:

  ```yaml
  # ~/.hermes/config.yaml
  skills:
    external_dirs:
      - ~/.hermes/plugins/better-dev/skills
  ```

  `hermes skills list` then reports all 33 as enabled. hermes takes a plugin as a Python module that
  registers itself through `register(ctx)`, so `hooks/pre/bd-session.ts` never runs here and step 2 is
  what gets the comms rule into a session. The clone puts that rule at
  `~/.hermes/plugins/better-dev/rules/comms.md`, which is the path step 2 points at.

- **Claude Code, and any other agent that reads a plugin marketplace:** point it at `yoelgal/better-dev`
  with its own marketplace-add verb, then install the plugin `better-dev@better-dev`. This repo is its
  own marketplace: `.omp-plugin/marketplace.json` and a byte-identical `.claude-plugin/marketplace.json`
  each list one plugin, sourced from the repo root. Claude Code takes plugin hooks as shell-command or
  HTTP entries in `hooks/hooks.json` keyed by event name, which this repo does not ship, so
  `claude plugin details better-dev` reports the skills and `Hooks (0)`, and step 2 is what gets the
  comms rule into a session. The install keeps the whole repo in Claude Code's plugin cache, so
  `rules/comms.md` is on disk there for step 2 to point at.

- **Cursor, Windsurf, Codex, or an agent with no plugin channel at all:**

  ```sh
  npx skills add yoelgal/better-dev --all -g
  ```

  This is a partial install, and the measurement says how partial: run against a throwaway `HOME`, it
  delivered the skills into `~/.agents/skills/` and symlinked them into each host's own skills
  directory, and it landed no `rules/comms.md` anywhere on disk. It leaves no plugin tree either, so the
  session hook never loads. Step 2 has nothing to point at on this path alone. To finish it, put the
  repo on disk as well, through one of the plugin channels above or a plain `git clone`, and tell step 2
  where it is.

Two of these routes deliver the comms rule by injection, so its text is in the context of every call
before your message is answered: the omp marketplace channel through the session hook, and an omp
git or link install through omp's own rules provider. The rest deliver it as a pointer step 2 writes,
which asks your agent to go read the file, costing a tool call and holding only as far as your agent
honours its entry file. Both work, and the stronger one is worth taking where you have the choice.

Already installed, or the skills already listed? Go to step 2; nothing installs twice. A session that is
already running keeps the text it loaded at start, so a fresh session is what picks up an install or an
update.

Nothing of better-dev's lands in your own skills folder on a plugin channel. Plugin skills load through
your agent's plugin provider, so `~/.claude/skills` and `~/.omp/agent/skills` stay yours, and a skill you
wrote under the same name still wins. Removal later runs whichever channel installed it:
`omp plugin uninstall better-dev@better-dev`, `hermes plugins remove`, your agent's marketplace-uninstall
verb, or the `skills` CLI for an `npx skills add` install. That takes the plugin away and leaves a wired
repo's own files alone.

## 2. Wire this repo: run `/onboard`

With the plugin installed, run `/onboard` from inside this repo. Run it even when the install reported
success: on a host the session hook cannot reach, this step is what gets the comms rule into a session,
and it is where a repo's own data comes from on every host.

`/onboard` detects the stack, memory system and branching, adapts to what is already there, and writes:

- **`.better-dev/`, data only, committed:** `rules.md` and `overrides.md`. Loop state under `ledger/`
  stays gitignored.
- **A discovery block** in the entry file (`CLAUDE.md` / `AGENTS.md`), naming where this repo's overrides
  and rules live. This block is the whole of discovery, so a later session that lacks it never learns the
  practices are installed.
- **A committed `.omp/config.yml`** naming the shell commands that need the operator's approval, so the
  policy travels with the repo instead of living on one machine.
- **On a host the session hook cannot reach, a pointer** to the installed `rules/comms.md`, written
  between `<!-- BEGIN better-dev-comms -->` and `<!-- END better-dev-comms -->` in the entry file,
  replacing any existing block in place. It points at the installed rule instead of copying its text, so
  it cannot drift from what shipped. The path gets read back first: where no `rules/comms.md` is on
  disk, which is the `npx skills add` case, `/onboard` writes no block and names the gap instead, since
  a pointer to a file that is not there fails every session in silence.

`/onboard` is idempotent, asks one decision at a time and only on real ambiguity, and never overwrites
your conventions or your edits. Skills you mint later with `/self-extension` are repo-scoped: committed
into this repo's own project skills directory and discovered only here, so a plugin upgrade never touches
them.
