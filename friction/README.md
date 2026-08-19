# friction - the first-run harness

A throwaway machine, a real install, four repos that are not this one, and a simulated developer who
has never heard of better-dev. It exists to answer one question before a release goes out: **where
does a new user get stuck?**

Nothing here is used at runtime. It is a release gate you point at a version.

```sh
friction/run.sh                     # all four fixtures
friction/run.sh --fixture messy     # just one
friction/run.sh --perm typical      # the permission audit (see below)
friction/run.sh --ask 41            # pin the drawn ask instead of sampling (see below)
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
   every question the agent asks, up to `--turns` exchanges. Three asks in order: the fixture's
   opening ask, its own handoff ask, then one drawn from the corpus.
6. Reduces everything to `facts.md`: turn counts, the ask each fixture drew, tool inventory, skills
   invoked, permission denials, files the agent added or removed, and the human's in-the-moment gripes.

Then hand `facts.md`, the transcripts, and the left-behind repos to a reviewer running `review.md`,
which reads `seen.md` before it files anything.

## The fixtures

| fixture | the repo | what it is trying to break |
|---|---|---|
| `greenfield` | empty dir, no git, no files | discovery from a plain ask; does it init git; does it invent a stack |
| `node-clean` | git, `main` + `staging`, vitest, CI | the happy path - how many questions does the *easiest* repo cost? |
| `messy` | one `master` branch, no tests, no CI, dirty tree, hand-written CLAUDE.md | no-integration-branch path; gap recording; does it rewrite the user's notes |
| `polyglot` | Python `api/` + React `web/`, no root test command, stale Makefile | the "never guess a command" rule under real pressure |

The greenfield fixture has no `.git` of its own. That is why runs live outside this repo - inside it,
the agent under test would walk up and discover `better-dev`, and the fixture would be a lie.

## The sampled ask

The four fixtures are the terrain. The ask is drawn, so the harness is not measuring how well the
library handles four remembered jobs: once the agent believes a fixture is finished, the human sends
one more ask, drawn from `fixtures/asks.txt` by the system RNG, or the one you pinned with `--ask N`.

The corpus is append-only. A pin is a position among the drawable lines, so inserting a line in the
middle silently repoints every `--ask` a past run recorded.

A drawn ask can land in a repo that cannot support it - a test-suite complaint in the fixture with no
tests. That is the interesting case rather than a bug, and `review.md` says what to do with it.

**What makes two runs comparable**: the better-dev SHA is the only difference between them. Same
fixture set, same permission profile, same turn cap, same model, and the same drawn lines - which is
what `--ask` is for. All of it is recorded in `facts.md`, so any run you keep is replayable from its
own record. Two unpinned runs are two different questions, and their turn counts do not compare.

## The dedup ledger

`seen.md` carries every finding a review has ever filed, and the status it was given. The review
reads it first and does not file what is already there, whatever the status says - `review.md` owns
that rule and the routing that follows it. Confirmed friction is recorded as a lesson in the host's
own memory store, where the next recall of that area surfaces it. The ledger is the harness's memory,
not a second queue: a standing harness that re-reports what was declined last time trains its reader
to skip the whole report.

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

`--settings` **merges** hooks rather than replacing them, so the override always sends an empty
`hooks` object, which is the only value that clears yours. There is nothing of better-dev's to put
back: the practices reach a session as skills and as the discovery block in the fixture repo's own
CLAUDE.md, and the host loads both without a hook.

## No write access to what it audits

Nothing this harness drives gets write access to what it is judging. A driven session touches only its
own throwaway repo: no branch, no commit, no issue, no pull request anywhere else, and no edit to the
library text under test. The reviewer writes exactly two records - a lesson and a row in `seen.md` -
and never the skill text it is forming findings about, because a reviewer that can edit what it judges
is one rationalization away from doing so.

The reason is the loop this directory's sampling and dedup came from: a standing swarm of synthetic
users holding git credentials, pushing to a fork, filing issues and PRs at roughly eighteen write
actions an hour against a live repo, with two stated rails. The mechanics are worth taking. The write
access is what makes that design unrepeatable here.

What the boundary rests on, stated plainly: `run.sh` writes only under `$BD_FRICTION_RUNS`, and every
session it drives runs in a fixture repo outside this clone that never names it. The tools do not
enforce that. Under `--perm open` a session holds `Write` and `Bash`, so it could reach the global
better-dev clone it loaded if it went looking - the containment is where the run dir sits, not a deny
rule. A profile that denies writes outside the run dir would turn it into one.

## Cost

Four fixtures at a 12-turn cap is up to 48 agent turns plus 48 short persona turns, and `/onboard`
turns are not small. The drawn ask does not raise that ceiling; it spends the turns a fixture used to
leave unspent by settling early. Start with `--fixture node-clean --turns 8` to check the harness
works, then run the set.

## When the harness is what broke

The reviewer classifies findings `FRICTION` / `MODEL` / `HARNESS`. A `HARNESS` finding - the persona
misread a question, the turn cap cut a session short, a fixture is unrealistic - is a bug in this
directory, not in the library. Fix it here before it pollutes the next run.
