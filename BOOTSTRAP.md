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

Otherwise install it - clone once to a stable location and run its installer:

```sh
git clone https://github.com/yoelgal/better-dev ~/better-dev
~/better-dev/install.sh
```

The installer links each skill into the host's global skills directory one level deep
(`~/.claude/skills/<skill>`, `~/.codex/skills/<skill>`, and so on), since hosts only discover a skill
at `<skills-dir>/<name>/SKILL.md`; it copies instead of linking where symlinks aren't available. It
then registers the SessionStart/SubagentStart awareness hooks in the host's machine-global hook
config, for each host whose config file and format are verified - so the session note fires from the
next session on. Read its output: a host reported as *skipped* (no verified hook config, or no
`python3`) got skills but no hooks, and `/bootstrap-hooks` is the by-hand path. `--no-hooks` opts out.

Updating later is `/update` - a `git pull` in the clone underneath. A session started after the pull
picks up the new text, though a session already running keeps what it loaded at start. A pull that
adds or removes skills needs a re-run of `./install.sh` too, so new ones link and orphans prune. The
full install contract lives in `/packaging`.

Confirm the install rather than assume it - `./install.sh --verify` fails when a host has skills
linked but no awareness hooks registered, which is the one half-install that otherwise looks entirely
successful.

## 2b. Offer the communication style, machine-wide (ask once)

better-dev ships an ADHD-adapted communication style: lead with the action, one bounded step at a time,
no preamble. `/onboard` writes it into each repo it wires. Ask the operator once, here, whether they
want it on **every** session on this machine instead - including repos that never get onboarded:

> Style every session on this machine, or per repo? (global / per-repo)

This is the one thing better-dev writes outside a repo, into the operator's own global entry file, so
it happens only on an explicit yes - never as a side effect of installing. On a yes, read the host's
`bd_host_global_entry` from its `hosts/*` adapter and write the shipped body into it. `bd` is the
clone step 2 produced, not a fixed location:

```sh
bd=~/better-dev
entry=$(. "$bd/hosts/<host>" && printf %s "$bd_host_global_entry")
if [ -n "$entry" ]; then
  mkdir -p "$(dirname "$entry")"                               # the host's config dir may not exist yet
  "$bd/scripts/bd-block" "$entry" better-dev-comms < "$bd/docs/comms-block.md"
else
  echo "this host has no verified machine-global entry file - skipping, /onboard still offers it per repo"
fi
```

The `mkdir -p` is load-bearing, not defensive: `bd-block` creates the file but not its parent, so on a
machine where the host has been installed but never run, the write fails without it. An empty
`bd_host_global_entry` means this host has no verified machine-global entry file: decline and name the
gap rather than inventing a path. On a no, write nothing - `/onboard` still offers it per repo. To
remove it later: `bd-block remove "$entry" better-dev-comms`.

## 2c. Offer the standing permission allowance, machine-wide (ask once)

Nearly every skill leans on `bd-mem` for recall/remember/learn/ledger on almost every step, and
`bd-guard` fires at worktree creation. Without an allow rule the operator is prompted by better-dev's
own memory spine, on their own repo, several times per work-item. Both rules name a repo-relative
path, so **one grant here covers every repo this machine ever wires** - and the alternative is
`/onboard` asking the same question again in each of them, forever:

> Allow better-dev's own memory scripts to run without prompting, on every repo? (yes / no)

On a yes, emit this paste-ready and let the operator run it. The write stays operator-run: a
permission file is a settings-class mutation, and that write class is classifier-blocked for the agent
(observed 2026-07-16), so proposing to make it directly buys a denial rather than a shortcut.

```sh
python3 - <<'PY'
import json, pathlib
p = pathlib.Path.home() / ".claude/settings.json"          # host's global permission config
d = json.loads(p.read_text()) if p.exists() else {}
a = d.setdefault("permissions", {}).setdefault("allow", [])
for r in ("Bash(.better-dev/bin/bd-mem:*)", "Bash(.better-dev/bin/bd-guard:*)"):
    if r not in a:
        a.append(r)
p.write_text(json.dumps(d, indent=2) + "\n")
print("allow rules:", a)
PY
```

The rules are narrow on purpose: these scripts write only inside `.better-dev/`. A host with no global
permission config skips this - `/onboard` still offers the repo-local grant. On a no, write nothing.

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
- Removing better-dev later: `/uninstall` (or `scripts/bd-uninstall`) - dry-run by default, removes
  only what better-dev installed, keeps a repo's `.better-dev/` data unless you pass `--purge-data`.
- Skills you mint later with `/self-extension` are **repo-scoped**: they're committed into this repo's
  own project skills directory (`.claude/skills/<name>` on Claude Code) and discovered only here.
  Promoting one to the global tool is a separate, deliberate step.
