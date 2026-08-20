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

  The session hook carries the comms rule here too.

- **Claude Code, and any other agent that reads a plugin marketplace:** point it at `yoelgal/better-dev`
  with its own marketplace-add verb, then install the plugin `better-dev@better-dev`. This repo is its
  own marketplace: `.omp-plugin/marketplace.json` and a byte-identical `.claude-plugin/marketplace.json`
  each list one plugin, sourced from the repo root. The session hook carries the comms rule.

- **Cursor, Windsurf, Codex, or an agent with no plugin channel at all:**

  ```sh
  npx skills add yoelgal/better-dev --all -g
  ```

  This is a partial install: it delivers the skills into your global skills directory and leaves no
  plugin tree, so the session hook never loads. Cursor and Windsurf read the shipped `rules/` directory
  natively, so the comms rule is live there. On Codex and anything else, step 2 is what gets the comms
  rule into a session.

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
success: on an agent the session hook cannot reach, this step is the only thing that gets the comms rule
into a session, and it is where a repo's own data comes from on every agent.

`/onboard` detects the stack, memory system and branching, adapts to what is already there, and writes:

- **`.better-dev/`, data only, committed:** `rules.md` and `overrides.md`. Loop state under `ledger/`
  stays gitignored.
- **A discovery block** in the entry file (`CLAUDE.md` / `AGENTS.md`), naming where this repo's overrides
  and rules live. This block is the whole of discovery, so a later session that lacks it never learns the
  practices are installed.
- **A committed `.omp/config.yml`** naming the shell commands that need the operator's approval, so the
  policy travels with the repo instead of living on one machine.
- **On an agent the session hook cannot reach, a pointer** to the installed `rules/comms.md`, written
  between `<!-- BEGIN better-dev-comms -->` and `<!-- END better-dev-comms -->` in the entry file,
  replacing any existing block in place. It points at the installed rule instead of copying its text, so
  it cannot drift from what shipped.

`/onboard` is idempotent, asks one decision at a time and only on real ambiguity, and never overwrites
your conventions or your edits. Skills you mint later with `/self-extension` are repo-scoped: committed
into this repo's own project skills directory and discovered only here, so a plugin upgrade never touches
them.
