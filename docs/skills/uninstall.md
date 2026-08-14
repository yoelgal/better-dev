# /uninstall

## What it does

Removes what better-dev installed - this repo's `.better-dev/bin` bridge, the managed
discovery block in `CLAUDE.md` / `AGENTS.md`, or the global per-host skill install - and
leaves everything else untouched. It never deletes your rules, overrides, or learnings
unless you explicitly ask for that too; the default unwire keeps your project's accumulated
data in place.

## When to reach for it

Reach here when you want better-dev gone, either from one repo or from the host entirely.
It does not fire on its own: this is the one skill in the library a person invokes by name,
never something the model routes to for you.

## Where it fits

It sits outside the work-item chain - there is no front-end that leads here and nothing it
hands off to. It wraps one script, `bd-uninstall`, and stops once that script's report is
read.

## Common questions

**I asked Claude to "remove better-dev" and it said the skill isn't installed - now what?** On a
desktop or web session (coordinator mode), any skill that is user-invoked-only drops out of the
model's own skill listing, and the model can genuinely believe there's nothing to invoke. The fix is
the fallback the routing block itself carries for this case: run `.better-dev/bin/bd-uninstall repo`
directly (it dry-runs by default). Don't let the agent improvise a manual unwiring or guess at a
similarly-named skill instead - this is a known, unfixed gap in how that surface lists user-invoked
skills, and the script is the working path around it.

## It's working if

- A dry-run (the default, no `--yes`) prints exactly what would be removed and changes
  nothing on disk.
- After a repo unwire, your recorded rules, overrides, learnings, and loop history are still
  there unless `--purge-data` was passed.
- After a global uninstall, a foreign skill sharing better-dev's name is still there, and the
  report says so.
