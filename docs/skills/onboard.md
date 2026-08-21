# /onboard

## What it does

Reads a repo - greenfield or existing - and establishes its actual shape, then records what it found
as standing facts in your harness's durable memory: the stack, the real test and lint commands, the
branch model and its integration branch, whether this is a team project or your own, and whether
guardrails already exist. A later session in the repo then starts already holding them, and a
dispatched worker gets them in its brief - instead of every step re-deriving the same facts from
whatever files it happened to open.

It writes no files into your repo. No entry file, no scaffold, no ignore line, no directory. The one
mutation it can make is a git branch, and only on a yes: where a staged branch model resolves and the
integration branch does not exist, it offers once to create it, because a recorded model naming a
branch git does not have is the exact premise-versus-fact mistake the skill exists to prevent.
Idempotent by design - a re-run fills gaps and refreshes a fact that went stale.

## When to reach for it

The first better-dev session in a project, and any later one after the repo's shape moved - a new
integration branch, a stack that landed, a verify command that changed - so the recorded facts stop
matching the repo. It has nothing to install, since the plugin that carries it is already loaded by
the time it runs, and it does not set up a shared foundation for a brand-new multi-part project
(that's `/groundwork`).

Skipping it costs re-derivation, not function: every skill downstream can detect what it needs on its
own, more slowly and without the operator's confirmation on any of it.

It also runs one cleanup path, on an explicit ask and never as part of a re-run:

| Situation | What it does |
|---|---|
| a repo whose shape has never been established, or whose recorded facts went stale | detects, confirms, records, and hands off to `/guardrails-install` |
| a repo still carrying a managed better-dev block written by an older version | takes both marker pairs out of whatever files hold them, and names anything left over for the operator to drop |
| uninstalling better-dev from the machine | not this - that is your host's own plugin channel |

## Where it fits

It runs first because everything after it needs what it recorded: `/worktree-branching` needs the
integration branch, `/release-promotion` needs the branch model, `/autonomous-loop` needs the verify
command, `/review` needs the safety baseline. It records the repo-shape facts itself and hands the
command facts to `/guardrails-install`, which owns the verify, `dev-run`, and `seed-reset` keys and
the safety baseline. It closes by pointing a greenfield repo at `/groundwork` or `/gauntlet`, and a
repo that already has history at `/vision`.

## Common questions

**Why did it ask whether this is a solo or team project?** Because it decides one thing that cannot be
taken back quietly: whether the run may offer to create a shared branch at all. A repo with a remote
and other authors in `git log` gets asked; one developer's yes is not team consent, so a solo repo
gets no shared-branch offer and records the trunk model on its default branch.

**Why did it ask before recording anything?** A recorded fact is a standing claim about your project,
and standing claims are yours to approve. It is one ask for the whole batch, not one per fact - correct
a line, strike a line, or say yes to the list.

**It found my test command but did not record it - why?** Because `/guardrails-install` owns that key.
Onboard spots the command with its `file:line` and hands it over, so there is exactly one writer per
recorded key and a re-run of either skill cannot produce two disagreeing values.

**It reported a command as a gap when the README names one.** That is the rule working. A command in
prose is a premise; it counts as detected only once it is verified where it actually lives. An
unverified command is a gap to ask about, never one to invent - a wrong verify command makes every
later "green" meaningless.

**It removed an old block but left `.better-dev/` behind - is that a bug?** No. Anything left there is
your data, and `ledger/` is live loop state a running work-item depends on - removing it destroys the
only record that survives a compaction. So cleanup names what is there and leaves the decision to you,
as a second and separate ask.

## It's working if

- A later session in the repo already knows the branch model, the integration branch, and the verify
  surface without re-deriving any of it - `/worktree-branching` names the base without asking
- Every fact it recorded was one you saw in the confirm list first, and any fact you struck is absent
  from the record and named once in the close-out
- A fact it could not settle is recorded as an explicit unknown rather than left blank, so a later
  session can tell "nobody could determine this" from "nobody ever looked"
- `git status` after the run is identical to before it - no new file, no modified file
- The integration branch it recorded is one `git branch` actually lists, not one a doc mentioned
- The closing recap leads with the one thing still waiting on your hands, and names every deferred
  item by the step that closes it, rather than reading as fully done
- After a cleanup, a search for `better-dev` in each entry file returns nothing, and your own prose
  above and below where the block sat is untouched
