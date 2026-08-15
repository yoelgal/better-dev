# friction - the first-run harness

A throwaway machine, a real install, four repos that are not this one, and a simulated developer who
has never heard of better-dev. It exists to answer one question before a release goes out: **where
does a new user get stuck?**

Nothing here is used at runtime. It is a release gate you point at a version.

```sh
friction/run.sh                     # all four fixtures
friction/run.sh --fixture messy     # just one
friction/run.sh --perm typical      # the permission audit (see below)
friction/run.sh --help
```

## What it actually does

1. Smoke-tests **this clone's** `install.sh` against a throwaway `HOME`, then `--verify`. A broken
   installer fails the run before a token is spent.
2. Resolves which better-dev clone your global install actually points at - that is what the sessions
   load - and records its branch and SHA in `facts.md`. Warns loudly if it is not this checkout.
3. Writes a session settings override: your hooks cleared, every plugin disabled, permission profile
   pinned.
4. Probes it - auth reachable, `onboard` skill visible, nothing injected into context - and aborts if
   any of that is untrue.
5. For each fixture: generates the repo under `$TMPDIR/bd-friction/<stamp>` (override with
   `BD_FRICTION_RUNS`), then drives a real `claude -p` session in it, with `persona.md` answering
   every question the agent asks, up to `--turns` exchanges.
6. Reduces everything to `facts.md`: turn counts, tool inventory, skills invoked, permission denials,
   files the agent added or removed, and the human's in-the-moment gripes.

Then hand `facts.md`, the transcripts, and the left-behind repos to a reviewer running `review.md`.

## The fixtures

| fixture | the repo | what it is trying to break |
|---|---|---|
| `greenfield` | empty dir, no git, no files | discovery from a plain ask; does it init git; does it invent a stack |
| `node-clean` | git, `main` + `staging`, vitest, CI | the happy path - how many questions does the *easiest* repo cost? |
| `messy` | one `master` branch, no tests, no CI, dirty tree, hand-written CLAUDE.md | no-integration-branch path; gap recording; does it rewrite the user's notes |
| `polyglot` | Python `api/` + React `web/`, no root test command, stale Makefile | the "never guess a command" rule under real pressure |

The greenfield fixture has no `.git` of its own. That is why runs live outside this repo - inside it,
the agent under test would walk up and discover `better-dev`, and the fixture would be a lie.

## Permission profiles

`--perm open` (default) allows every tool. The flow runs to the end, and permission cost is read off
the tool inventory afterwards.

`--perm typical` seeds the sandbox with what a cautious new user actually has allowed - reads, greps,
`git status`, `npm test` - and nothing else. Every denial in `denials.txt` is a dialog a real user
has to click through, in order. Run this one when the question is "how many times does better-dev
interrupt me", and expect sessions to end early.

Both are ordinary `settings.json` allowlists. The harness never passes
`--dangerously-skip-permissions`.

## Auth and isolation

Uses whatever you are already logged in with. No token setup, no API key.

That constrains the design. A subscription OAuth token lives in the OS keyring and **only the default
config dir can reach it** - verified both ways, neither `CLAUDE_CONFIG_DIR` nor a redirected `HOME`
gets at it. So sessions run under your real config, and isolation is done with a `--settings` override
instead:

| leak | how it is closed |
|---|---|
| your `hooks` in `~/.claude/settings.json` | `"hooks": {}` - an **empty** object is the only thing that clears them |
| plugin hooks (a persona-injecting SessionStart) | `"enabledPlugins"` with every plugin set to `false` |
| plugin skills competing for triggers | same switch |
| your permission allowlist | the profile's `allow`/`deny` |
| your global `~/.claude/CLAUDE.md` | **not closeable** - only `--bare` suppresses it, and that needs an API key |

Step 4 asserts the first two actually took: it asks a probe session to list anything a hook injected,
and warns if the list is not empty. The remaining `CLAUDE.md` leak shapes prose, not decisions, and is
recorded in `facts.md` so a reviewer can discount a finding that smells like it.

One caveat: `--settings` **merges** hooks rather than replacing them, so `--hooks` (which adds
better-dev's own SessionStart/PreToolUse hooks) necessarily drags your personal hooks back in. There
is no third option. Default is no hooks at all, which is also the harsher discovery test.

## Cost

Four fixtures at a 12-turn cap is up to 48 agent turns plus 48 short persona turns, and `/onboard`
turns are not small. Start with `--fixture node-clean --turns 8` to check the harness works, then run
the set.

## When the harness is what broke

The reviewer classifies findings `FRICTION` / `MODEL` / `HARNESS`. A `HARNESS` finding - the persona
misread a question, the turn cap cut a session short, a fixture is unrealistic - is a bug in this
directory, not in the library. Fix it here before it pollutes the next run.
