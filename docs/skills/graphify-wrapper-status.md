# /graphify-wrapper-status

## What it does

Prints a table of this worktree's registered domain indexes and whether each one's graph is
built, stale, or missing here - it reads state, it never builds or refreshes anything itself.
A domain reads `current`, `behind`, or `(not built here)` - with a RENDER column beside it
saying whether the human-openable pages next to the graph are `fresh`, `stale`, or `absent` -
and the table only ever tells the
reader what to run next; the freshness read comes from comparing the graph's recorded build
commit against the worktree's current HEAD, so it is only as honest as that comparison.

## When to reach for it

Reach here to check before you trust a graph-backed answer, or when a query or map felt
stale and you want to know why. For a question that should just work off the graph, go
straight to `/graphify-wrapper-query` - it builds a missing graph on first use, so checking
status first is never a precondition. For registering or removing a domain, that's
`/graphify-wrapper-index`; for actually building or refreshing a graph, `/graphify-wrapper-sync`.

## Where it fits

It is the read-only status view that sits beside the graph tools rather than in the build
loop - `/graphify-wrapper-map` and `/graphify-wrapper-index` decide what gets indexed,
`/graphify-wrapper-sync` builds it, `/graphify-wrapper-query` answers questions against it,
and this command reports where each of those stands for the current worktree. It also
replaced an earlier ad hoc freshness hedge that `/codebase-map` used to carry inline - that
check now lives here as a named command with three dispositions instead.

## Prerequisites

Graphify wrapper set up for this machine and repo (`/graphify-wrapper-setup`) with at least
one domain registered (`/graphify-wrapper-map` or `/graphify-wrapper-index`). Without setup,
the command prints "not set up" and exits cleanly rather than erroring.

## Common questions

**Why does a domain show `(not built here)` when I know it was built before?** Graphs are keyed per
worktree, outside the repo itself - a fresh worktree (including one just branched off another) starts
with no graphs of its own, even if a sibling worktree has current ones. Run
`/graphify-wrapper-sync <name>`, or just ask a question through `/graphify-wrapper-query`, which
builds the missing graph on first use.

## It's working if

- Every registered domain in the table shows a disposition (`current`, `behind`, or
  `(not built here)`) plus a RENDER reading (`fresh`, `stale`, or `absent`) rather than a blank
  or an error.
- A domain marked `behind` matches your own sense that the repo moved since that graph was
  last built - a SessionStart hook keeps the AST layer close to HEAD automatically, but the
  semantic layer (community naming) only refreshes when you run `--semantic` yourself, so a
  `behind` semantic read can persist until you ask for it by hand.
