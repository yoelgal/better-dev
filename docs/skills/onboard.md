# /onboard

## What it does

Brings better-dev into a repo - greenfield or existing - by detecting what's already there, adapting
to it rather than imposing a house shape, and leaving the repo wired: a `.better-dev/` data directory
holding the repo's overrides, rules, and work-item ledger, and a discovery block in the entry file so
every later session knows the practices are available. It never vendors the skills themselves into the
repo and never overwrites a convention the repo already follows - a detected branch prefix, an
installed skill, an integration branch that isn't `main` - it records the difference as an override
instead. Idempotent by design: a re-run only fills gaps.

## When to reach for it

The first thing you run in a repo that doesn't have `.better-dev/` yet, or a repo whose host already
loads the better-dev plugin but has no scaffold and no discovery block. Re-run any time -
after a release changes what a repo needs wired, after adopting a repo from solo to team, or when a
phase was deferred and the trigger it was waiting on has now landed. It has nothing to install, since
the plugin that carries it is already loaded by the time it runs, and it does not set up a shared
foundation for a brand-new multi-part project (that's `/groundwork`).

It also runs the other direction, on an explicit ask and never as part of a re-run:

| Situation | What it does |
|---|---|
| "wire this repo", a repo with no scaffold or no discovery block | wires it, filling only what is missing |
| "remove better-dev from this repo", "unwire this", or a repo still carrying the managed block after the plugin was uninstalled | takes the block out and, on a second ask, the `.better-dev/` data |
| Uninstalling better-dev from the machine | not this - that is your host's own plugin channel, and a repo can be unwired while the plugin stays installed elsewhere |

## Where it fits

The foundation every other skill in the chain assumes is already in place: worktrees, the loop,
reviews, and releases all read `.better-dev/overrides.md` for the repo's defaults and keep work-item
state under `.better-dev/ledger/`, and onboard is what creates both. The discovery block it writes
carries the utterance-to-skill routing table, so a row a release adds (the wait-what corrective, the
questionnaire unblock) reaches an already-wired repo on the next onboard top-up. It hands off to
`/guardrails-install` for the repo's verify command and safety baseline, and closes by pointing a
greenfield repo at `/groundwork` or `/gauntlet`.

## Common questions

**Why did it ask whether this is a solo or team adoption, and does the answer matter?** A repo with a
remote and other authors in `git log` gets asked once, before anything shared is written - one
developer's yes is not team consent. Answering solo keeps `.better-dev/` out of git entirely (via
`.git/info/exclude`, never a tracked ignore entry), puts the discovery block in a local-only entry
file, and never offers or creates a shared branch. Going team later is a re-run the team answers, not a
flag one person flips.

**Why did the discovery block go in through the file editor instead of a script?** In an interactive
session, an opaque piped write into an always-loaded entry file reads to a host's action classifier as
instruction injection and gets denied. The file-edit tool shows the same marker-bounded block as a
reviewable diff instead, which lands cleanly; the shell writer is kept only for scripted, non-interactive
contexts.

**Will a re-run duplicate the discovery block?** No - it is replaced in place between fixed markers,
byte-stable when nothing changed.

**It removed the block but left `.better-dev/` behind - is that a bug?** No, that is the design. The
recorded rules, the overrides you wrote by hand, and the ledger history are your data, so unwiring the
entry file never licenses deleting them; removing the directory is a second explicit ask, and the two
stay separate even when you say yes to both. When it does remove it, it removes the directory whole
rather than naming files inside it, because a purge that enumerated three files once left six others
sitting in a directory it reported clean.

## It's working if

- The entry file carries a `better-dev` block between `<!-- BEGIN/END better-dev -->` markers naming
  the repo's actual branch convention and integration branch
- `.better-dev/overrides.md` and `.better-dev/rules.md` both open with the `read` tool, so the
  defaults later skills consult are actually on disk
- `git branch --show-current` shows the working tree standing on the branch the block names as the
  integration branch, not a different one left over from before the run
- The closing recap names every deferred or skipped phase by name, rather than reading as fully done
  while something upstream is still waiting on the operator
- After an unwire, a search for `better-dev` in the entry file returns nothing, and the operator's own
  prose above and below where the block sat is untouched
