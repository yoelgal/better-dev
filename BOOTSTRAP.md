# Bootstrap better-dev

This is the front door. Paste the prompt from the README (or this file's URL) into your coding agent and
it follows the steps below: install the better-dev plugin once for this machine, then wire the repo
you're sitting in. Ask the operator only when something is genuinely ambiguous; adapt to what's already
here rather than imposing.

better-dev has two layers, and this bootstrap sets up both:

- **The tool** - the skills and rules, shipped as one plugin. Installed **once per machine** through the
  host's own plugin channel, and every repo shares it. Never copied into a repo.
- **A repo's `.better-dev/`** - this project's *data only* (rules, overrides, loop ledger). Wired per
  repo by `/onboard`.

---

## 1. Install the plugin (once per machine)

better-dev ships as one plugin holding both halves of the library: the skills, and the rules that are
injected into every session. Work out which coding agent you're in - the host owns the verbs, and the
channel that carries **both** halves differs per host.

- **omp** - link a clone. This is the channel measured to deliver skills *and* rules on omp 17.3.8:

  ```sh
  git clone https://github.com/yoelgal/better-dev ~/better-dev
  omp plugin link ~/better-dev
  ```

  Keep that clone; a linked install loads from it. `omp plugin doctor` is what reports a link that
  registered but delivered nothing. **Do not use the marketplace verbs on omp** (`/marketplace add`
  then `/marketplace install better-dev@better-dev`): they install the skills and silently drop the
  rules, so the comms block never reaches a session and the install looks complete.

- **hermes** - its own channel:

  ```sh
  hermes plugins install https://github.com/yoelgal/better-dev
  ```

  Whether rules load on hermes has not been checked. If the comms block is absent from a session after
  this, that is the reason, and `/onboard` writing it into the repo's entry file is the way round it.

- **Any other host that reads a plugin marketplace** (Claude Code among them) - point it at
  `https://github.com/yoelgal/better-dev` and follow that host's own plugin documentation. The repo is
  its own marketplace: it carries `.omp-plugin/marketplace.json` and a byte-identical
  `.claude-plugin/marketplace.json`, each listing one plugin, `better-dev`, sourced from the repo root.
  Rules delivery through a catalog install is untested outside omp, where it does not work.

Already installed, or the skills already listed? Nothing is installed twice - go to step 2. Updating
later is whatever the install channel makes it: a `git pull` in the linked clone on omp, since a linked
install loads from that clone; a re-run of `hermes plugins install` on hermes; `/marketplace upgrade` on
a catalog install. A session already running keeps the text it loaded at start, so a fresh session is
what picks up an update.

Nothing of better-dev's lands in your own skills folder: plugin skills load through the host's plugin
provider, so `~/.claude/skills` and `~/.omp/agent/skills` stay yours, and a skill you wrote under the
same name still wins.

## 2. Wire this repo - run `/onboard`

With the plugin installed, run `/onboard` from inside the current repo. It detects the stack, memory
system, and branching, adapts to what's already there, and sets up:

- **`.better-dev/` - data only, committed:** `rules.md` and `overrides.md`. Loop state under `ledger/`
  stays gitignored.
- **A discovery block** in the entry file (`CLAUDE.md` / `AGENTS.md`) so every later session knows the
  practices are here. This block is the whole of discovery - nothing else announces them - so it names
  where the overrides and rules live, not just that the practices exist.
- **A committed `.omp/config.yml`** naming the shell commands that need the operator's approval, so the
  policy travels with the repo instead of living on one machine.
- **A comms-style block** in the same entry file: an ADHD-adapted communication style that leads with
  the action, one bounded step at a time, no preamble. It is written per repo, between its own
  `<!-- BEGIN better-dev-comms -->` sentinels, so removing it is deleting those two lines and
  everything between them.

Onboard is idempotent and asks one decision at a time only on real ambiguity; it never overwrites your
conventions or your edits.

---

## Good to know

- The tool is global and shared; a repo's `.better-dev/` carries only that repo's data. Update
  everything at once through the host's plugin channel.
- Removing better-dev later is the same channel that installed it: `omp plugin uninstall better-dev` on
  omp, `hermes plugins remove` on hermes, `/marketplace uninstall` on a catalog install. That takes the
  tool away and leaves a wired repo's own files alone, so delete `.better-dev/` and the two managed
  blocks in the entry file yourself when you want the repo unwired too.
- Skills you mint later with `/self-extension` are **repo-scoped**: they're committed into this repo's
  own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only here.
  Promoting one to the plugin is a separate, deliberate step.
