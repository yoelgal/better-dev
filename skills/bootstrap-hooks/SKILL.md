---
name: bootstrap-hooks
description: Use when installing better-dev into a host so sessions and dispatched workers automatically notice the practices are present - wiring the SessionStart and SubagentStart awareness hooks, or adapting them for a non-Claude-Code host.
---

# Bootstrap awareness hooks

A skill only helps if the agent knows it's there. better-dev leaves a discovery block in the
project's `CLAUDE.md` (or `AGENTS.md`) for exactly that, but a fresh session - or a subagent spun up
mid-task - may start before it reads that file. These hooks close the gap: on session start, and
again when a worker is dispatched, they emit a short note that better-dev's practices are installed
here and where the project's overrides live. One job: **keep the agent aware that better-dev is
present, without ever blocking it.**

They add awareness only. They never gate a session, never fail loudly, and stay silent in any repo
that doesn't have better-dev installed.

## What ships

Two extensionless bash scripts and a manifest, all under `hooks/`:

- `bd-session-start` - fires on session `startup`, `resume`, `clear`, and `compact`. If the working
  directory sits inside a repo with a `.better-dev/` scaffold, it emits a one-paragraph pointer to
  the better-dev discovery block and, when the project has one, to `.better-dev/overrides.md` so the
  agent reads project overrides before applying any built-in default. It also appends a one-line
  update nudge when the installed better-dev clone (its plugin root) is behind its origin - a bounded,
  best-effort `git fetch` and behind-count that degrades to a silent no-op when the clone isn't a git
  checkout, is offline, or can't be time-boxed. The nudge only suggests `git -C <clone> pull`; it never
  pulls on its own, honoring never-blocking. A project that wants hands-off updates can opt in with a
  `better-dev auto-update: ff-only` line in its overrides, which lets the clone fast-forward itself -
  and only fast-forward, so it can never clobber local work.
- `bd-subagent-start` - fires when the host dispatches a subagent. SessionStart context reaches the
  parent thread only, so a fresh worker would otherwise run better-dev-unaware. This re-injects a
  *short* note - the practices and overrides still apply, see `/orchestrating-agents` for how
  dispatch works - and deliberately tells the worker not to re-run onboarding. A dispatched worker
  should do its briefed task, not re-orient.
- `hooks.json` - the Claude Code manifest registering both, each with a `commandWindows` fallback
  and a 5-second timeout.

## Always on when installed, silent otherwise

Both scripts walk up from the working directory looking for `.better-dev/`. Find it, emit the note;
don't, exit 0 with no output. That single check is the whole install detection - there is no flag
file, no mode, no per-session state to manage. Installing better-dev turns the hooks on; a repo
without it never hears from them.

The scripts never read stdin (a hook that blocks on stdin can freeze a session), never write outside
their own stdout, and swallow their own failures - a hook error must never surface as a session
error. The one non-obvious mechanic worth knowing if you touch these: a subagent hook's raw stdout
is dropped by the host, so `bd-subagent-start` wraps its note in
`hookSpecificOutput.{hookEventName,additionalContext}` where the session hook can emit the platform's
plain field. The `selftest` subcommand on each script checks both the install-aware and no-op paths
and that the emitted JSON parses.

## Installing and adapting to other hosts

On Claude Code, point the plugin at `hooks/hooks.json` (the packaging step wires this) and the two
events register themselves. For the mechanics of why the payloads are shaped the way they are, and
how to port them, read `porting.md` in this folder.

The SessionStart script already branches its output field for Cursor, Claude Code, and Copilot, so
session-level awareness is cross-host today. SubagentStart is a Claude-Code (and Codex) event; hosts
that expose no subagent-spawn hook get session awareness but not per-worker re-injection until an
equivalent hook is sourced for them. That's a coverage limit to name, not a failure - the session
note still lands.

## How this fits

`onboard` writes the discovery block and the `.better-dev/` scaffold these hooks look for; without
that scaffold the hooks stay silent, which is the correct behavior before a repo is onboarded. The
subagent note points dispatched workers at `/orchestrating-agents`, which owns how better-dev fans
work out to fresh-context subagents. The overrides these hooks surface are the ones the `/overrides`
layer persists.

## Done when

A session started in an onboarded repo receives the awareness note; a session in a plain repo
receives nothing and sees no error; a dispatched worker gets the short subagent note in the shape the
host actually reads; and both scripts pass `selftest`.
