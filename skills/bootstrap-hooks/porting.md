# Porting the awareness hooks

Everything a session needs is in `SKILL.md`. This is the detail you need only when adapting the hooks
to a new host or debugging why a note isn't landing.

## Wiring mechanisms

Registering a hook is a different problem per host, and there are two shapes of it. Most hosts keep a
machine-global JSON config of hook entries, so wiring is a merge: `scripts/bd-hook-wire` reads the
file named by `bd_host_hook_settings`, adds the entries its `WANT` table declares, and leaves the rest
of the operator's file alone. omp keeps no hook config at all - its hooks are TypeScript modules it
loads out of a directory - so wiring is an install: `scripts/bd-omp-hook-wire` writes a real
three-line stub at `$HOME/.omp/agent/hooks/pre/bd-awareness.ts` whose body re-exports the bridge,
`export { default } from "<clone>/hooks/omp/bd-awareness.ts"`. A stub and not a symlink, because
omp's hook discovery silently skips a symlinked module - it never loads, with no warning and no log
line to say so - while a byte-identical real file at the same path loads normally. Re-exporting is
what buys back what the symlink was for: the logic stays in the clone, so a `git pull` refreshes it
without a re-install, and `import.meta.url` inside the module still resolves into the clone, which
is where the bridge looks for the shell hooks it runs.

`install.sh` picks between them by name rather than by branch: `bd_host_hook_wire` in `hosts/<name>`
is a script basename under `scripts/` and defaults to `bd-hook-wire`, so a host with a third
mechanism adds a script plus one adapter line and the installer does not change. What such a script
must match is the CLI, because both the installer and the SessionStart hook's own hook nudge call it
blind:

`python3 scripts/bd-<host>-hook-wire <wire|plan|unwire> <clone-dir> <target-path>`

It prints exactly one status word on stdout - `wired`, `would-wire`, `current`, `unwired`, or
`unreadable` - and never raises at the caller, because a caller that has to interpret a traceback is
a caller that will get it wrong. `plan` writes nothing, which is what makes the nudge safe to run on
every session start. The target path is always argv and never computed inside the script, so the same
script answers for a fixture in a test and for the operator's real home.

Two rules keep a new mechanism honest. It needs an ours-test that reads the installed artifact
rather than the path that produced it: for omp that is the module's literal second line,
`// better-dev-omp-hook`, which answers the same for a stub this version wrote and for a symlink an
older one left behind, so an upgrade reclaims its own target instead of refusing it. And an unusable
target is reported, never clobbered - a foreign file already sitting at the target path comes back
`unreadable` and stays byte-identical, because that path belongs to the operator and a wiring step
that overwrites it has done more damage than the missing hook was worth.

## Output shapes differ by event and host

The note is the same paragraph; the JSON envelope around it is not.

- **SessionStart, Claude Code:** `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}`.
- **SessionStart, Cursor:** top-level `{"additional_context":"…"}` (snake_case).
- **SessionStart, Copilot / other SDK hosts:** top-level `{"additionalContext":"…"}`.
- **SubagentStart, Claude Code:** the note is dropped unless wrapped in
  `{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"…"}}`. Raw stdout that
  works for a session silently injects nothing here - the failure is invisible, so this shape is the
  single most important thing to get right when adding a subagent hook.
- **SubagentStart, Codex:** same nested shape, plus a top-level `systemMessage`.
- **omp:** no envelope branch at all. omp has no command hooks, so a TypeScript bridge module
  subscribes to `session_start`, runs `bd-session-start` itself, and parses the stdout, which means it
  consumes the existing default top-level `{systemMessage, additionalContext}` branch and `emit` gained
  no omp case. That distinction is the one to apply to a new host: a host that reads a JSON envelope off
  the hook's stdout needs its own branch, because the host is doing the parsing and only it knows which
  field name it honors; a host whose bridge does the parsing needs none, because the bridge is ours and
  can be written against a shape that already exists. A branch there would be a second spelling of the
  same payload with no reader.

The SessionStart hook also emits an unlinked-skill nudge (a clone skill the host never linked), and
the directory it checks is host-declared rather than Claude's: `BD_HOST_SKILLS_DIR`, default
`$HOME/.claude/skills`. Two siblings scope the hook nudge the same way, `BD_HOST_HOOK_SETTINGS`
(default `$HOME/.claude/settings.json`) and `BD_HOST_HOOK_WIRE` (default `bd-hook-wire`, a basename
under the clone's `scripts/`). Every default is today's Claude value, so an unset environment is
Claude Code behaving exactly as it did before the parameterization; a bridge for another host exports
all three, and that export is the whole of what makes the nudges answer for the host that invoked
them instead of always for Claude.

The scripts pick the field from environment markers the host sets (`CURSOR_PLUGIN_ROOT`,
`CLAUDE_PLUGIN_ROOT`, `COPILOT_CLI`, `PLUGIN_DATA`). A host that reads several fields without
de-duplicating is why the scripts branch to emit exactly one, rather than emitting all of them.

## Gotchas already handled

- **printf, not heredoc.** bash 5.3+ can hang on a heredoc in this context; the scripts build JSON
  with `printf`.
- **Extensionless script names.** On Windows, Claude Code auto-prepends `bash` to any command
  containing `.sh`. Naming the scripts without an extension avoids that. If you want full Windows
  parity, route the manifest command through a `.cmd`/bash polyglot wrapper (a `: << 'CMDBLOCK'` file
  whose batch half locates Git-Bash and whose shell half `exec`s bash) and drop the `commandWindows`
  line; on macOS/Linux the direct `bash "…"` command in `hooks.json` is enough.
- **Never read stdin.** A hook that blocks reading stdin can freeze the session, so detection uses the
  working directory, not the JSON the host would pipe in.
- **Single-pass JSON escape.** Each `${s//old/new}` is one C-level pass - fast enough to run on every
  session start without a perceptible delay.
- **A throw in omp's `tool_call` handler blocks the tool call.** omp swallows handler errors on every
  event except that one, and that one is the event a bridge has to use for per-worker re-injection,
  since omp exposes no subagent-spawn event. So a `bd-subagent-start` that is missing, unreadable, or
  exits non-zero would deny every dispatch on the machine rather than dropping a note. The handler is
  total: any failure returns undefined and the tool call proceeds unannotated. Confirm which way a new
  host falls before relying on its swallow, because this failure mode is the inverse of the usual one.
- **omp imposes no hook timeout.** The 5-second budget the awareness hooks live inside is Claude
  Code's, declared per entry in its config; a host that loads a module simply awaits whatever the
  module awaits. The bridge therefore re-creates the bound itself, so a hook that hangs costs the note
  and not the session. Any module-style bridge has to do the same, or the first wedged `git fetch`
  stalls session start indefinitely with no error to read.

## Porting the enforcement hooks

The awareness hooks inject a note; the enforcement pair (`bd-guard check-bash`, `bd-guard check-edit`)
vetoes or asks before a tool runs, so a host earns them only if it exposes a pre-tool-execution hook that
can return a deny/ask decision. Claude Code's is `PreToolUse`: `check-bash` on the Bash-equivalent tool,
`check-edit` on the edit/write tools. omp's is a `tool_call` handler, which earns the pair too - it returns
`{block: true, reason}` to refuse the call, and `ctx.hasUI` with `ctx.ui.confirm(title, message)` gives the
ask somewhere to land.

Whether a host needs its own branch in `bd-guard`'s `emit_decision` is the same distinction `## Output
shapes` above draws: a host that parses the decision off the hook's stdout needs one, a host whose bridge
parses needs none, because the bridge is ours. So `bd-guard` gained no omp case - omp's enforcement bridge
translates Claude's `hookSpecificOutput.{permissionDecision, permissionDecisionReason}` shape unchanged.

Three translations, none of them a free choice. A `deny` becomes a blocked call carrying the reason. An
`ask` with a UI becomes a confirm, and a declined confirm blocks, because a refused prompt read as
approval is worse than no gate at all. An `ask` with no UI blocks too: a headless session has nobody to
escalate to, so allowing it would silently self-approve the one class the policy escalates.

omp inverts the failure direction, and that is what makes this the dangerous hook to port: the `tool_call`
gotcha above holds with its consequence turned up. The runner converts a handler that throws or outruns its
bound into a block itself, so a broken guard denies every bash, write and edit on the machine rather than
failing open the way `bd-guard`'s check-* subcommands do. Hence a guard bound well inside the runner's, and
every path total.

Where the tools are not named `Bash`/`Edit`/`Write`, feed `check-bash` the command string and `check-edit`
the paths the host already derives for its own approval gate, never a re-parse of its patch language - one
parser, judging what the host itself gates on. A target carrying a URI scheme is not a filesystem path: a
host that dispatches internal devices through its write tool (omp writes to `xd://<device>`) denies every
device call if the boundary check reads the scheme as a path, so pass those through and cover the device's
real paths under its own tool name.

Three traps a porter hits after the wiring works, all found by review rather than by testing, and all
about the *reader* of a decision rather than the decision itself. **Escape the envelope for control
characters, not just quotes.** A decision reason embeds a model-chosen path, so a path carrying a
newline emits a raw control character inside a JSON string; the envelope is then invalid, and any
reader that treats a parse failure as no-decision performs the write. An attacker picks the filename.
**Split silence from an answer you cannot read.** Fail-open belongs to *not hearing* the guard - a
missing script, a non-zero exit, a bound that expired. An answer that arrived and would not decode is
the opposite case and must refuse, or the two failures share one bucket and the safe one legitimizes
the unsafe one. **And judge what will actually run, not the field that looks like the command.** Where
the host's exec tool carries an environment map beside the command string, a command of `$X` with the
payload in `env` reaches the shell fully formed while a bare-`command` submission sees nothing: feed
the check the shell spelling of the whole call.

One more that only bites a host whose refusal can prompt: if the hook has its own time bound, the
operator's deliberation must not be billed against it. omp's runner pauses a handler's budget across
a UI dialog for exactly this reason, and a bridge that does not copy that behavior lets a slow answer
silently spend the budget every later path needed - the batch then proceeds unjudged, which looks
like an approval and is not one.

Unlike the awareness hooks above, these two read the tool call on stdin - that is how they see the command
or the path to judge. So the host must pipe the tool-input JSON in; one that registers them without
feeding stdin stalls every tool call to the hook timeout (`INPUT="$(cat)"` blocks with nothing to read).
Confirm that before registering them, and keep the timeout short (the `hooks.json` entries set one) so a
misconfigured host costs a bounded delay rather than a hang.

A host with genuinely no pre-execution hook gets prose policy: record it
(`.better-dev/bin/bd-mem remember "safety-enforcement: prose"`) and say so - a named coverage limit,
not a failure. The loop's escalation discipline carries the same policy alone there.

## Adding a subagent hook for another host

A host earns per-worker re-injection cleanest through a subagent-spawn hook. If it exposes one:
register a command that runs `bd-subagent-start`, and confirm the host reads a nested
`hookSpecificOutput.additionalContext` (or find the field it does read and add a branch in `emit`).
If it exposes no such event there is one route left before giving up: a pre-tool hook that can rewrite
tool *input* can prepend the note to the dispatch call's own context field, which is how omp earns
re-injection from a `tool_call` handler on its `task` tool. That route costs the totality discipline
in the gotcha above, so it is worth taking only where the dispatch tool is a single named tool whose
input carries a context field. With neither event, leave it at session-level awareness - that note
still lands on the parent thread, and forcing a workaround isn't worth the complexity.
