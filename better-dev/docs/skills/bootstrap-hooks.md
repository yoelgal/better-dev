# /bootstrap-hooks

## What it does

Wires the two awareness hooks - session start and subagent dispatch - that tell an agent
better-dev is installed here before it has had a chance to read `CLAUDE.md` on its own. The
defining constraint: these hooks add awareness only. They never gate a tool call, never fail
loudly, and stay completely silent in any repo without a `.better-dev/` scaffold.

## When to reach for it

Reach here to **repair** a host, not to complete a routine install: since 0.11.0 both install
channels register these hooks themselves - the plugin from `hooks.json`, `install.sh` through
`scripts/bd-hook-wire`. That leaves three cases for this skill: a host whose hook config exists
but has no `bd_host_hook_settings` entry in its adapter yet, a machine with no `python3` (the
installer says so and skips), and a config the installer refused to parse. Also reach here when
adapting the hook pair to a host other than Claude Code. It is not the enforcement layer - a host
that needs to veto or ask before a risky tool call wants the `bd-guard` pair described in
`porting.md`, not this skill.

## Where it fits

Sits in the meta-and-upkeep layer alongside packaging and update. `/onboard` writes the
`.better-dev/` scaffold and discovery block these hooks look for; the subagent hook points a
dispatched worker at `/orchestrating-agents` for how fan-out actually works.

## Common questions

**What happens on a host with no subagent-spawn hook?** Per-worker re-injection depends on the
host exposing one. Without it, a dispatched worker gets no subagent-level note - only the
session-level awareness the parent thread already received. This is a named coverage limit
rather than a bug: the stopgap is that the session note still lands, and porting an equivalent
hook for that host is the only real fix, tracked in `porting.md`.

## It's working if

- A session opened inside an onboarded repo shows the better-dev awareness note (and the
  overrides pointer, if the project has one) before you've asked it to read anything.
- A session opened in a repo with no scaffold present shows nothing extra and no error.
- A dispatched subagent's context includes the short better-dev note and does not re-run
  onboarding on its own.
