# /graphify-wrapper-sync

## What it does

Builds or refreshes the graphs for a worktree's registered domains - the only skill that writes
a graph. It runs an AST-only `update` by default, cheap and free of any model call, and only runs
the full LLM `extract` pass when asked for `--semantic`. Each sync also keeps the human-openable
pages beside the graph current - the callflow page and the atlas re-render with the build, so what
a person opens never trails what an agent queries. The defining constraint: output never
lands in the indexed tree - every graph is written to an absolute path under this repo's central
home, keyed per worktree and per domain, so a build leaves the code it indexed byte-unchanged.

## When to reach for it

Reach here on "sync the index", "rebuild the graph", or "refresh graphify" - for one named
domain or, with no argument, every domain registered for this worktree. It does not decide what
counts as a domain (that is `/graphify-wrapper-map`'s guided proposal, or `/graphify-wrapper-index`
for registering one by hand) and it does not answer questions against a graph once built (that is
`/graphify-wrapper-query`, which builds on first use if nothing is there yet, so a cold repo is
not on its own a reason to run this skill first).

## Where it fits

Sits below `-map`/`-index` and above `-query` in the graphify chain: domains get proposed and
registered first, this skill turns the registration into an actual graph on disk, then `-query`
and `-status` read what it built. `/graphify-wrapper-query` calls this skill itself when a domain
has no graph yet, so most of the time nothing invokes it directly.

## Prerequisites

Graphify must already be set up on this machine and this repo's registry file must exist -
`/graphify-wrapper-setup` does both, and this skill stops with a pointer back to setup rather
than proceeding without a registry. At least one domain must already be registered
(`/graphify-wrapper-map` or `/graphify-wrapper-index`); with nothing registered it stops rather
than indexing the whole tree.

## Common questions

**Why did the community naming on my domain go stale even though I keep syncing?** A `--semantic`
build's named/semantic layer only comes from the LLM extract pass. Every plain sync after that
reconciles the graph with a free AST `update`, which does not re-run naming - so the semantic layer
quietly ages behind the code until the next `--semantic` run. There is no fix for this; the stopgap is
running `--semantic` again whenever you need the naming current, not just whenever you need the graph
current.

## It's working if

- A first sync on a freshly registered domain reports "build from scratch," and every sync after
  that reports "refresh" instead
- Each domain reports two lines, page first: a path a person can open in a browser, then the
  action taken (refresh or scratch, AST or semantic) with node and edge counts - and a query
  against that domain right after answers without triggering a rebuild, never a bare "done"
- A domain that spans more than one top-level subtree gets a cross-subtree edge count in the
  report, so a carve that bought nothing is visible without opening the graph
- A build that fails is reported as a failure with no count attached, never papered over with a
  stale number
- Re-running sync on the same worktree never changes anything inside the repo itself - the diff
  is empty because the graph lives outside the tree entirely
