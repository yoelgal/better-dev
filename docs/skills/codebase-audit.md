# /codebase-audit

## What it does

Points at an existing codebase, or one area of it, and returns a leverage-ranked list of what is
worth doing - each finding grounded in a confirmed `file:line`. It builds nothing: no edit lands, no
findings file persists between runs, and the output ends with a one-line handoff to `/plan-grill` or
`/diagnose` for the human to pick up. The defining constraint is what it refuses - it never touches
the repo it is reading, and it keeps no state of its own, so a repeat audit starts cold every time
rather than reconciling against a backlog it never created.

## When to reach for it

Reach here when the ask is "what's worth doing" over a codebase or an area, with no feature or
symptom named yet - "audit this repo", "where's the leverage here", "what should we improve". The
near neighbours:

| Situation | Route |
|---|---|
| A feature or improvement is already chosen | `/plan-grill` |
| A symptom is already reported ("X is broken/slow") | `/diagnose` |
| Structural orientation alone, no ranked findings wanted | `/codebase-map` |
| A greenfield project with no existing code to sweep | `/groundwork` |

## Where it fits

Sits above the loop, not inside it: it is one of the entry front-ends, alongside `/plan-grill` and
`/diagnose`, but it never itself feeds a work-item forward - the human reads its report and chooses
which downstream front-end to enter. It composes `/codebase-map` for structure,
`/orchestrating-agents` to fan the sweep out across areas, and `/security-pass` for the content and
secret-handling rules a worker's brief must carry.

## Common questions

**Why didn't the audit flag deleting the thing nobody imports?** A directory with no source-level
caller can still be live if a CI job runs its tests or a build script references it - a sweep that
only greps the source tree misses that. The stopgap the skill now runs before filing any `cut`: open
the CI workflows, build scripts, and dependency manifest and grep the candidate's path and name across
them before recommending deletion, and say in the Evidence column which runners were checked (or that
they couldn't be). This is a known unfixed sharp edge in the source sweep, not in the discipline
around it - the discipline exists because a run recommended dropping a directory whose own tests were
still wired into CI, and the fix is procedural (always check the runners) rather than a fix to the
sweep itself.

**Why does the top of the ranked list skip the ugliest, oldest code in the repo?** The sweep follows
edit history, not eyeballed ugliness - a hot, actively-churned path outranks a dormant module nobody
has touched in years, because leverage on dead code never pays. The dormant module still surfaces if
a risk lens (security, correctness) earns it a line; it just doesn't win the ranking on ugliness
alone.

## It's working if

- The report is a table of findings, each with a `file:line` you can open and confirm yourself - no
  finding without a location.
- At least one finding on a mature, over-built codebase carries Move = cut; an all-fix/all-add table
  on such a repo is itself worth a second look.
- The repo's working tree is unchanged after the run - `git status` shows nothing the audit touched.
- The report ends with a single handoff line naming `/plan-grill` or `/diagnose`, not a build already
  under way.
- Running the same audit again starts fresh - no backlog file, no per-item status carried over from
  the last run.
