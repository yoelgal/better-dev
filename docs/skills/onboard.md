# /onboard

## What it does

Brings better-dev into a repo - greenfield or existing - by detecting what's already there, adapting
to it rather than imposing a house shape, and leaving the repo wired: a `.better-dev/bin` bridge to
the globally-installed tool, memory pointed at whatever backend the repo already has (or the files
default), and a discovery block in the entry file so every later session knows the practices are
available. It never vendors the skills themselves into the repo and never overwrites a convention the
repo already follows - a detected branch prefix, an installed skill, an existing memory server - it
records the difference as an override instead. Idempotent by design: a re-run only fills gaps.

## When to reach for it

The first thing you run in a repo that doesn't have `.better-dev/` yet, or a repo that has the tool
installed on the host but no scaffold, no `bin` bridge, or no discovery block. Re-run any time -
after a release changes what a repo needs wired, after adopting a repo from solo to team, or when a
phase was deferred and the trigger it was waiting on has now landed. It only wires the repo; it does
not set up a shared foundation for a brand-new multi-part project (that's `/groundwork`) and it does
not install the tool on a machine that has never seen it before on its own - it hands the operator
the one paste for that and picks up from there.

## Where it fits

The foundation every other skill in the chain assumes is already in place: worktrees, the loop,
reviews, and releases all reach for `.better-dev/bin/bd-mem`, which only resolves once onboard has
run. The discovery block it writes carries the utterance-to-skill routing table, so a row a release
adds (the wait-what corrective, the questionnaire unblock) reaches an already-wired repo on the
next onboard top-up. It hands off to `/guardrails-install` for the repo's verify command and safety
baseline, and closes by pointing a greenfield repo at `/groundwork` or `/gauntlet`.

## Common questions

**Why did it ask whether this is a solo or team adoption, and does the answer matter?** A repo with a
remote and other authors in `git log` gets asked once, before anything shared is written - one
developer's yes is not team consent. Answering solo keeps `.better-dev/` out of git entirely (via
`.git/info/exclude`, never a tracked ignore entry), puts the discovery block in a local-only entry
file, and never offers or creates a shared branch. Going team later is a re-run the team answers, not a
flag one person flips.

**Why did it hand me a paste block for a permission grant instead of writing it itself?** A permission
or settings file is operator-run at either scope, so the two `bd-mem`/`bd-guard` allow rules always
come as a paste-ready snippet, never a direct edit. Known unfixed sharp edge: before offering it,
onboard tries to check whether the grant is already there - and that check itself can be refused by the
host's own classifier, which treats a permission file as off-limits to any read. The stopgap is to
spend exactly one cheap attempt, treat a refusal as *unknown* rather than *absent*, and offer the grant
anyway with a note that the check couldn't run - a redundant paste is cheaper than a host left prompting
on every `bd-mem` call for the rest of the repo's life. There is no fix that makes the probe reliable;
the workaround stands until the host stops classifying its own settings file as unreadable.

**Why did the discovery block go in through the file editor instead of a script?** In an interactive
session, an opaque piped write into an always-loaded entry file reads to a host's action classifier as
instruction injection and gets denied. The file-edit tool shows the same marker-bounded block as a
reviewable diff instead, which lands cleanly; the shell writer is kept only for scripted, non-interactive
contexts.

**Will a re-run duplicate the discovery or comms block?** No - both are replaced in place between fixed
markers, byte-stable when nothing changed. The comms block specifically also checks whether the host
already carries a global copy (from taking that option at install) before writing a per-repo one, so a
solo repo on an already-styled machine gets no redundant second copy.

## It's working if

- The entry file carries a `better-dev` block between `<!-- BEGIN/END better-dev -->` markers naming
  the repo's actual branch convention and memory backend
- `bd-mem --help` resolves without a broken-symlink or missing-command error
- The repo's wired version matches the installed clone's version, so a re-run reports up to date
  instead of behind
- `git branch --show-current` shows the working tree standing on the branch the block names as the
  integration branch, not a different one left over from before the run
- The closing recap names every deferred or skipped phase by name, rather than reading as fully done
  while something upstream is still waiting on the operator
