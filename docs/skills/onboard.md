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

The first thing you run in a repo that doesn't have `.better-dev/` yet, or a repo that has the tool
installed on the host but no scaffold and no discovery block. Re-run any time -
after a release changes what a repo needs wired, after adopting a repo from solo to team, or when a
phase was deferred and the trigger it was waiting on has now landed. It only wires the repo; it does
not set up a shared foundation for a brand-new multi-part project (that's `/groundwork`) and it does
not install the tool on a machine that has never seen it before on its own - it hands the operator
the one paste for that and picks up from there.

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

**Will a re-run duplicate the discovery or comms block?** No - both are replaced in place between fixed
markers, byte-stable when nothing changed.

## It's working if

- The entry file carries a `better-dev` block between `<!-- BEGIN/END better-dev -->` markers naming
  the repo's actual branch convention and integration branch
- `.better-dev/overrides.md` and `.better-dev/rules.md` both open with the `read` tool, so the
  defaults later skills consult are actually on disk
- The repo's wired version matches the installed clone's version, so a re-run reports up to date
  instead of behind
- `git branch --show-current` shows the working tree standing on the branch the block names as the
  integration branch, not a different one left over from before the run
- The closing recap names every deferred or skipped phase by name, rather than reading as fully done
  while something upstream is still waiting on the operator
