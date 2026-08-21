# Installing better-dev

You are an agent, and someone pasted better-dev's install prompt at you. This file is the procedure.
The library lives at `https://github.com/yoelgal/better-dev`, and that repo is both the marketplace and
the single plugin the marketplace lists.

Work the stages in order. Each one ends in a check, and the check is the load-bearing part: this
library shipped three silent failures in a single day (a green gate over three dropped skills, a
fixture that asserted nothing, an end-to-end that measured the wrong thing), so a stage you complete
without running its check is the known way this goes wrong here.

Three rules hold across the whole run:

- **Ask once, and only on real ambiguity.** Adapt to what the machine already has.
- **A host's settings file is the operator's to write.** `~/.claude/settings.json`,
  `~/.hermes/config.yaml` and their equivalents get handed over as a paste block with one line on why,
  and you carry on once the operator has applied it. Agent writes to Claude Code's settings file are
  refused by the host in any case.
- **Say what did not pass.** Where a check fails, or where the host cannot meet the update bar in stage
  4, tell the operator in plain words and name the repair. Reporting success over a stage that did not
  land is the single outcome this file exists to prevent.

better-dev is one layer. The **plugin** - the skills, the always-applied comms rule, the session hook -
is installed once for the machine and shared by every repo, and it writes nothing into any repo. Stages
1 to 4 install it. Stage 5 establishes the durable memory the practices record into, which is a machine
setting rather than a repo file, and offers `/onboard` to fill it for the repo the operator is standing
in.

## Stage 1. Identify the host, and what is already installed

Ask the machine rather than reasoning from your own name.

```sh
omp --version
claude --version
hermes --version
```

Then look for an existing install with whichever of these the host answers:

```sh
omp plugin list
claude plugin list
hermes skills list
npx skills list -g
```

**Check.** You can name the host from a command's output, and you can say whether better-dev is
already there. Where the skills are already listed, go to stage 3: nothing installs twice. A session
already running keeps the text it loaded at start, so a fresh session is what picks up an install or an
update, and that is worth saying to the operator at the end.

## Stage 2. Install the skills through the host's own channel

Find your host below. Every command here is the host's own, so a host absent from this list still has a
channel: look for its plugin or marketplace verb first, since this repo ships both catalogs
(`.omp-plugin/marketplace.json` and a byte-identical `.claude-plugin/marketplace.json`, each listing one
plugin sourced from the repo root) and a marketplace channel delivers the whole tree.

| Host | Channel | Comms rule arrives | Clears stage 4's bar |
|---|---|---|---|
| omp, marketplace | `omp plugin marketplace add` + `omp plugin install` | injected by the session hook | yes, auto-update |
| omp, git or link root | `omp plugin install <git-url>`, or `omp plugin link <clone>` | injected by omp's own rules provider | no: the operator pulls, and nothing reminds them |
| Claude Code | `claude plugin marketplace add` + `claude plugin install` | not at all: see stage 3 | only once the operator pastes the session-start alert stage 4 writes; wired and unproven until they do |
| hermes | `hermes plugins install` + one `skills.external_dirs` line | not at all: see stage 3 | an `on_session_start` command can run; getting its line to the operator is the work |
| no plugin channel | `npx skills add yoelgal/better-dev --all -g` | nothing on this channel alone | no, and stage 4 says so out loud |

**omp:**

```sh
omp plugin marketplace add yoelgal/better-dev
omp plugin install better-dev@better-dev
```

Take the default user scope. It is the shape the stage 3 measurements cover, and a `--scope project`
install resolves its runtime symlink and its cache from different roots, so on that shape stage 3's
check is the only thing that tells you whether the rule arrived.

**Check.** Which listing you read depends on the channel. A marketplace install appears under
**Marketplace Plugins** as the plugin id, `better-dev@better-dev (0.1.0) (user)`
(`cli/plugin-cli.ts:584`). A git or link install appears under **npm Plugins** as `better-dev@0.1.0`,
name@version rather than name@marketplace (`:555`), so an agent looking for the marketplace spelling on
a link reads a healthy install as a failed one.

On a link the listing settles nothing in either direction, and that is measured rather than reasoned. A
clone linked with `omp plugin link` needs the repo's root `package.json` and its `omp` key; without them
omp prints `Linked better-dev`, lists `better-dev@0.1.0` byte-for-byte as a healthy clone does, and
loads no skills at all, because the listing synthesises a manifest for a package carrying no `omp` or
`pi` key (`plugins/manager.ts:675`) while discovery skips that package outright
(`plugins/loader.ts:126-130`). So on a link the check is `omp plugin doctor`, and specifically its
`plugin:better-dev` line. A healthy link prints `v0.1.0` and nothing after it, since this repo declares
no `description`; the same link without the `omp` key prints
`v0.1.0 - No omp/pi manifest (not an omp plugin)`. Read that line rather than the summary: doctor grades
it a warning, so both installs end `0 errors` and both exit 0.

**Claude Code:**

```sh
claude plugin marketplace add yoelgal/better-dev
claude plugin install better-dev@better-dev
```

**Check.** `claude plugin list` prints `better-dev@better-dev` with a version and an enabled status,
and `claude plugin details better-dev` prints `Skills (33)`. Two details measured on Claude Code
2.1.233, each of which costs a turn if you guess it. Against a **clone on disk** rather than an
install, that command needs the directory flag:
`claude --plugin-dir . plugin details better-dev` prints `Skills (33)` and `Hooks (0)`, and the same
spelling without `--plugin-dir .` returns `Plugin "better-dev" not found`. And the verb list on that
version runs `marketplace add`, `install`, `list`, `update`, `uninstall`, `details`, `enable`,
`disable`, `validate`; read `claude plugin --help` on the machine in front of you before you depend on
one, since the set has moved between builds.

**hermes:**

```sh
hermes plugins install https://github.com/yoelgal/better-dev
```

Measured 2026-08-20: that clones the whole repo to `~/.hermes/plugins/better-dev` and registers nothing
out of it, warning that the tree carries no `plugin.yaml` or `__init__.py`, after which
`hermes plugins list` leaves it out and `hermes skills list` reports zero. hermes reads skills from its
own directories, so one config line is what carries the clone into a session. That file is
settings-class, so hand it to the operator:

```yaml
# ~/.hermes/config.yaml
skills:
  external_dirs:
    - ~/.hermes/plugins/better-dev/skills
```

**Check.** The summary line at the foot of `hermes skills list` counts **33 local**. Read that half
only. The enabled count spans every source, and hermes ships 71 builtin skills of its own with all of
them enabled, so a correct install reads 33 local against 104 enabled: `enabled_count` is incremented
for any skill that is not disabled, whatever its source (`hermes_cli/skills_hub.py:951-963`, summarised
at `:974-979`). Measured on this machine before the config line landed, that line reported 0
hub-installed, 71 builtin, 0 local and 71 enabled, so 33 enabled is unreachable on a stock hermes and
an agent holding a correct install would report this stage as not landed. Hermes separates the counts
from the totals with an em dash, which this file does not reproduce, so match on the numbers rather
than on the punctuation between them.
When the operator asks about updating later, the verb is `hermes plugins update better-dev`. A second
`hermes plugins install` is refused at `hermes_cli/plugins_cmd.py:524-529`, so pointing them at a
repeat install wastes their turn:

```text
Plugin 'better-dev' already exists. Use force reinstall or run `hermes plugins update better-dev`.
```

**A host with no plugin channel at all** (Cursor, Windsurf, Codex today):

```sh
npx skills add yoelgal/better-dev --all -g
```

**Check.** `npx skills list -g` names the skills. Then read stages 3 and 4 before you report anything,
because this channel lands one half of the library. Measured against a **throwaway `HOME`**, that CLI
delivered `skills/` alone, as real directories at `~/.agents/skills/<name>/` symlinked into each host's
own skills directory, and no `rules/` directory and no `comms.md` arrived with it. It leaves no plugin
tree either, so the session hook never loads. Carry that scope whenever you repeat the result: stated
unqualified, "no `comms.md` anywhere on the machine" is false on any machine that also holds a clone or
a plugin-channel install, and acting on the unqualified version stops you asking for the path that
fixes it.

## Stage 3. Confirm the comms rule reaches a session

The skills are text the host lists, so stage 2's check settles them. The comms rule shapes every reply
and reaches a session on one host family only. Establish whether it reached this one, because the answer
is a line the operator is owed in stage 6 rather than a detail.

**Injected.** On an omp marketplace install the session hook delivers `rules/comms.md` as a `developer`
turn led by the literal marker `<!-- better-dev:comms source=hooks/pre/bd-session.ts -->`. omp treats
every `.ts` under a plugin's `hooks/pre/` as an extension entry point, which is why the hook runs there.
On an omp git or link root, omp's own rules provider loads `rules/` natively and the hook stays
deliberately quiet, so the rule is in context with no marker.

**Check.** Answer whether a `developer` or `system` turn in this session carries the marker
`better-dev:comms` - a turn you did not read out of a file, and did not author yourself. The delivery
shape is the observable, not the token's presence: this file names that marker in the paragraph above,
so finding the string proves only that you read this file. What proves delivery is the marker standing
on a turn nothing in this session put there. That injection is context-only, re-supplied per call and
never written to the transcript, so no file and no command prints it and there is nothing to send the
operator grepping for. Absence answers only its own negation: the rule did not arrive by injection,
which on the hosts in the next paragraph means it did not arrive.

**Not delivered.** Claude Code and hermes ship the hook file and never run it. Claude Code loads plugin
hooks from `hooks/hooks.json`, or from an inline `hooks` key in `plugin.json`, as shell-command or HTTP
entries keyed by event name, and this repo carries neither, which is why `Hooks (0)` is the honest
reading of stage 2's check rather than a broken install. hermes takes a plugin as a Python module that
registers itself through `register(ctx)`. Neither host reads a plugin's `rules/` either, so on both of
them the comms rule is on disk and in no session.

This is a known open gap, not a step you can complete. better-dev used to close it by writing a pointer
to `rules/comms.md` into the repo's own entry file, and that write was removed with every other repo
write: a library that promises no repo footprint cannot keep one delivery route that needs one. So the
honest report on these hosts is that the skills arrived and the rule did not.

**Check.** Say which of the two answers you reached, in one sentence, and carry it into stage 6. Where
the answer is that the rule did not arrive, name the one repair that exists: an omp install gets it, by
the hook on a marketplace channel and by omp's own rules provider on a git or link one. Do not offer the
operator a workaround you have not run, and do not report the install as fully landed when this half is
missing.

## Stage 4. Wire the update route, or say the host cannot

The bar the operator set: **a channel is worth wiring when it can auto-update or raise an update
alert.** These rules shape every reply, so a copy that ages in silence is experienced as the practices
not working. Meet the bar on this host, or tell the operator plainly that it cannot be met here.

**omp** meets it by auto-updating. Offer `omp config set marketplace.autoUpdate auto` and name the cost
in the same breath: it upgrades plugins at startup, so the rules that shape every reply can change
between one session and the next unasked.

**Check.** `omp config get marketplace.autoUpdate` prints `auto`. The shipped default prints `notify`,
which writes availability to omp's debug log and shows the operator nothing on screen. On a marketplace
install better-dev's own hook also puts the upgrade command in the status line when the cached catalog
copy runs ahead of the installed version; it reads local state only, so an offline session stays quiet.
A git or link root updates when the operator pulls that clone, with nothing reminding them, so prefer
the marketplace channel unless they want the clone.

**Claude Code** meets it by alert, wired as a `SessionStart` hook. The entry is a `type: command` hook
in `settings.json`, in this shape, read live from a machine running 2.1.233:

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "<your check>", "timeout": 10 } ] }
    ]
  }
}
```

Your command compares the installed version against upstream. What the host keeps on disk, measured the
same day: `~/.claude/plugins/installed_plugins.json` holds `.plugins["<plugin>@<marketplace>"][]` with a
`version` (a semver, for a plugin from a third-party marketplace) beside a `gitCommitSha`. Two
properties of that local state were measured too, and each one on its own is enough to make a naive
comparison useless:

- `plugin-catalog-cache.json` carried plugin records for `claude-plugins-official` only. Three plugins
  installed from third-party marketplaces were all absent from it, so for better-dev it holds no version
  to compare against.
- Every marketplace clone under `~/.claude/plugins/marketplaces/` sat at exactly the commit its own
  install record named, with no fetch since that install. Local state does not advance on its own, so a
  command that only reads it can never fire.

Both were read on a machine where better-dev was installed through omp rather than through Claude Code,
so treat them as the shape to expect and confirm each against the install you just made.

So the command refreshes before it compares: `claude plugin marketplace update better-dev` updates that
clone from source, and the comparison then has something to see. Read the actual plugin key back out of
`installed_plugins.json` after installing rather than assuming its spelling.

**Check.** Run your command by hand twice before you hand over the settings block. Once as installed,
where it stays silent. Once against a version you know differs, where it has to print the alert. A check
whose alerting branch has never run is the same shape as the fixture that asserted nothing, named at the
top of this file. Then hand the settings block over and ask the operator to start a fresh session and
tell you whether the line appeared: you are inside the session that ran this install, the block is
still with them as a paste, and the hook fires for a session you never see. Where you cannot get that
confirmation before you finish, say so plainly - the alert is wired and nobody has seen it fire - and
carry that wording into stage 6 rather than reporting the route as proven.

**hermes** updates by verb: `hermes plugins update better-dev`, run by the operator. It does run shell
commands at session start, and the shape of that mechanism decides what an alert can be. Read from
hermes 0.16.0 on this machine: shell hooks are declared under `hooks:` in `~/.hermes/config.yaml` as an
event name holding entries with `command` and `timeout`, the event names come from `VALID_HOOKS`
(`hermes_cli/plugins.py:128`), and `on_session_start` is one of them, firing once per new session.
That event's return value is ignored, so the command runs and its stdout reaches nobody. An alert here
has to be a command that puts its own line in front of the operator, by a desktop notification or a
file they already watch.

**Check.** Trigger the hook and confirm the operator saw the line, by asking them. Where you cannot
get that confirmation, say so plainly: hermes then updates when they run the verb, and nothing reminds
them it is due. That sentence is the deliverable on this host, and it beats a hook nobody has seen fire.

**A skills-only install misses the bar, and that is the report.** The `skills` CLI carries `update`,
with no check verb and no notification mechanism (its own `--help`, read on 1.5.23). So this
channel can neither auto-update nor alert. Tell the operator in as many words, and name the repair:
install through one of the plugin channels above, which gives the update route something to pull.

**Cursor's own `.cursor/hooks.json`** does carry a `sessionStart` event, and it is IDE-only. Read
2026-08-21: its `additional_context` is reported as merged in the Hooks log and then absent from the
agent's own context, in the IDE and in the Cursor SDK at 1.0.28. Three open reports, by forum thread
id - `158452`, `167274`, `168441`, each at `https://forum.cursor.com/t/topic/<id>`. So leave it out of
your plan rather than presenting it as a delivery route, and re-read those three before you revisit the
call: fixed upstream, this row becomes a real channel.

## Stage 5. Establish durable memory, then offer `/onboard`

Stages 1 to 4 changed the machine and no repo. This stage keeps it that way. What better-dev records
about a project - its stack, its verify command, its branch model, and every standing correction the
operator makes in flow - goes into the agent's own durable memory rather than into a file in the repo.
That surface has to exist before anything can record into it, and on omp it ships switched off.

**Read the setting first.**

```sh
omp config get memory.backend
```

`off` is the shipped default, verified against omp's own settings table: "Memory is disabled by
default". The other values are `local`, `mnemopi` and `hindsight`, and any of them is a memory that
persists, so a value other than `off` means this is already established and you move on. Where the host
is not omp, read its own equivalent and apply the same rule; where it has none, that is the answer and
the paragraph below on declining is what you report.

**Where it reads `off`, offer to turn it on and name the cost in the same breath.** Same shape as stage
4's auto-update offer: the operator decides, you do not set it quietly.

```sh
omp config set memory.backend local
```

The cost, and they are owed it in one sentence: durable memory means the agent keeps facts about their
project across sessions without asking again, and it also means it keeps things they may not want kept.

**Check.** `omp config get memory.backend` prints the value they chose. Read it back rather than
trusting the set: this is the one setting the rest of the library assumes.

**Where they decline, say what they lose, plainly.** A correction they make in flow does not survive
the session, so they restate it the next time. Recorded project facts go the same way, and every skill
that would have read them derives them again. That is a real half of the library missing, so it goes in
the stage 6 report the way a wired-but-unproven alert does, and the install is not reported as
complete-and-fine without it.

**Then offer `/onboard`, once, for the repo they are standing in.** It writes nothing into that repo. It
reads the stack, the test and lint commands, the branch model and integration branch, and the
team-or-solo shape, and records them to durable memory so later sessions and every other skill get
those facts without re-deriving them.

Two questions before you offer it, both answerable from the shell:

- **Is this directory inside a git repo?** Where it is not, do not offer. Say the install landed, name
  that `/onboard` records a repo's facts whenever they want one recorded, and stop. That is a complete,
  successful run.
- **Is durable memory on?** Where the operator declined it above, say that `/onboard` would have nowhere
  to record and offer it anyway only if they ask - its findings then last one session.

`/onboard` is recommended rather than required. Skipping it costs re-derivation, not function. Its one
possible repo mutation is a git branch: on a staged branch model with no integration branch it offers
once to create one, and only on a yes.

**Check, where `/onboard` ran.** Two observations, and neither may be something this stage created:

- Read back one recorded fact that belongs to *this* repo - its stack, its verify command, its branch
  model - and quote it. The recording having been asked for is not evidence that it landed.
- Quote `/onboard`'s own recap clause naming what it recorded, verbatim, rather than reporting that a
  recap appeared. Where that quote and the fact you read back disagree, the disagreement is the
  finding: report it rather than picking the friendlier one.

**Check, where nothing ran.** The observation is the absence: name the directory, say it is not a repo
or that the operator declined, and confirm you wrote nothing into it. A run that installs and records
nothing is complete, and reporting it as complete is the honest outcome rather than a shortfall.

`/onboard` is idempotent, asks one decision at a time and only on real ambiguity, and never overwrites
the operator's conventions or edits.

## Stage 6. Report

Give the operator six lines, and no more than six:

- the host, and the channel you installed through
- how the comms rule reaches a session here: injected, or not at all on this host
- how it stays current: auto-update, an alert you have seen fire, an alert wired that nobody has yet
  seen fire, or neither, in which case name the repair
- whether durable memory is on, and where it is not, that a correction does not survive the session
- anything you handed over as a paste block and are waiting on
- any check that did not pass, with what it means for them

Then tell them a running session keeps the text it loaded at start, so their next fresh session is the
one that carries all of this.

## Removal

Removal runs whichever channel installed it: `omp plugin uninstall better-dev@better-dev`,
`claude plugin uninstall better-dev@better-dev`, `hermes plugins remove better-dev`, or `skills remove`
for a skills-only install. Also remove anything you had the operator paste into a settings file, since a
`SessionStart` entry pointing at a plugin that has gone fails every session afterwards. There is nothing
else to undo: the install wrote into no repo, so removing the plugin removes better-dev.

On a plugin channel nothing of better-dev's lands in the operator's own skills folder. Plugin skills
load through the host's plugin provider, so `~/.claude/skills` and `~/.omp/agent/skills` hold only what
they put there, and a skill they wrote under the same name still wins.
