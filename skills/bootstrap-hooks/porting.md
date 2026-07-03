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
  works for a session silently injects nothing here — the failure is invisible, so this shape is the
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
- **Single-pass JSON escape.** Each `${s//old/new}` is one C-level pass — fast enough to run on every
  session start without a perceptible delay.

## Adding a subagent hook for another host

A host earns per-worker re-injection only if it exposes a subagent-spawn hook. If it does: register a
command that runs `bd-subagent-start`, and confirm the host reads a nested
`hookSpecificOutput.additionalContext` (or find the field it does read and add a branch in `emit`).
If it exposes no such event, leave it at session-level awareness — that note still lands on the parent
thread, and forcing a workaround isn't worth the complexity.
