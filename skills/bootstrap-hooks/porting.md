# Porting the awareness hooks

Everything a session needs is in `SKILL.md`. This is the detail you need only when adapting the hooks
to a new host or debugging why a note isn't landing.

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

## Porting the enforcement hooks

The awareness hooks inject a note; the enforcement pair (`bd-guard check-bash`, `bd-guard check-edit`)
vetoes or asks before a tool runs, so a host earns them only if it exposes a pre-tool-execution hook
that can return a deny/ask decision. If it does: register `check-bash` on the Bash-equivalent tool and
`check-edit` on the edit/write tools, then confirm the host's decision envelope - `bd-guard` emits
Claude Code's nested `hookSpecificOutput.{permissionDecision, permissionDecisionReason}` shape, and a
host that reads a different field ignores the decision without an error (the same silent-failure trap
as the `SubagentStart` shape above). Add the host's envelope as a branch in the script's `emit_decision`
and prove both decisions land: pipe one destructive fixture through `check-bash` and one out-of-boundary
edit through `check-edit`, and confirm the host asks and denies rather than proceeding.

Unlike the awareness hooks above, these two read the tool call on stdin - that is how they see the
command or the file path to judge. So the host must pipe the tool-input JSON to the hook; a host that
registers them without feeding stdin stalls every tool call to the hook timeout (the `INPUT="$(cat)"`
read blocks with nothing to read). Confirm the host pipes tool input before registering them, and keep
the timeout short (the `hooks.json` entries set one) so a misconfigured host fails to a bounded delay
rather than a hang.

A host with no pre-execution hook gets prose policy: record it
(`.better-dev/bin/bd-mem remember "safety-enforcement: prose"`) and say so - a named coverage limit,
not a failure. The loop's escalation discipline carries the same policy alone there.

## Adding a subagent hook for another host

A host earns per-worker re-injection only if it exposes a subagent-spawn hook. If it does: register a
command that runs `bd-subagent-start`, and confirm the host reads a nested
`hookSpecificOutput.additionalContext` (or find the field it does read and add a branch in `emit`).
If it exposes no such event, leave it at session-level awareness - that note still lands on the parent
thread, and forcing a workaround isn't worth the complexity.
