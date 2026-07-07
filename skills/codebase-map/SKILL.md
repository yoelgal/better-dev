---
name: codebase-map
description: Use when you need structural orientation in an unfamiliar area before scoping, diagnosing, or reviewing - to find a symbol's callers and dependents, the real schema or API surface, or the blast radius of a change. Reach here on "who calls this", "what depends on this", or "what would this change break".
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Orient in the code before you act on it

Structural orientation - who calls this, what depends on it, what the schema really is, how far a
change reaches - makes every other practice sharper: a tighter baseline, a root cause seated at the
right seam, a review that knows the blast radius. One job: **get that orientation from the best map
available, and never block when there isn't one.**

This is one concrete instance of a general practice - on a capability gap, source the map rather than
hand-roll it. better-dev ships no code-graph engine and keeps no index of its own: that's mature
ecosystem territory, and a stale index you maintain by hand is worse than none. The practice ships; the
structural tool underneath stays swappable.

Read `.better-dev/overrides.md` first. A repo often settles this already - it may pin a code-graph
skill, an LSP setup, or a convention for how the team navigates. Honor that and use what it names;
don't source a second tool alongside one the project already runs.

## 1. Use the map that's already here

Look for a structural source the project or host already provides, and prefer it over blind grep for
"callers / dependents / schema / blast-radius" questions:

- A structural-search or knowledge-graph skill - `/graphify-wrapper-query` for a monorepo, or a host
  code-graph agent suite such as `understand-anything`.
- The language's own index - an LSP / IDE symbol index, `ctags`, or a framework's route and schema
  introspection.

Ask it the concrete question: every caller of `X` (who reaches in), what's affected *by* `X` (the
reverse direction - that's the blast radius), the shortest path between two symbols, the columns of
table `Z`. Carry the answer into whatever you're doing with `file:line` receipts.

A structural map reflects its last build, not the live working tree, so treat its answer as a lead to
confirm at the source, not gospel - and if a symbol looks moved or renamed, refresh the index before
you trust it. The receipts are what keep a lagging graph honest. If the tool records the commit each graph
was built at, that's a concrete freshness signal: compare it to `HEAD` to see whether the graph is current
or behind, and when it's behind, refresh only the areas the diff since then actually touched rather than
rebuilding the whole thing.

## 2. Source one on a real gap

Nothing structural is installed, and the area is large or you'll be back in it repeatedly: treat it as
a capability gap and **source a structural tool** through `/tool-sourcing` (graphify-wrapper or an
equivalent) rather than hand-rolling an index. Ride the tool; don't vendor an engine.

Sourcing one isn't free - it means installing the tool, registering the area as a domain, and building
the graph (the AST pass is cheap; a semantic pass spends model calls). That setup cost is exactly why a
small one-off doesn't justify it: the fallback below is cheaper than the build. In autonomous mode,
adopting the tool passes the same risk-gate as any sourced tool before it's added - `/tool-sourcing`
owns that gate.

On a large repo, scoping is the real decision. Rather than index everything, split it into a handful of
coherent domains - each a name and a repo-relative subtree, none nested inside another - so each graph
stays small and a query stays focused, and spend the semantic pass only on the domains you'll actually ask
architecture questions about. Then name what you're leaving unindexed and why: vendored dependencies,
generated code, build output, fixtures, docs. That explicit "here's what this map does *not* cover" is the
honest front door; a silently partial index reads as complete and sends the next query hunting in a map
that never held the answer. In a fresh worktree, seed the branch's graph from the main worktree's
already-built one and reconcile only the branch diff, if the tool supports it, rather than rebuilding from
scratch (`/worktree-branching`).

## 3. Fall back to disciplined search

No tool and no reason to source one: orient by hand, deliberately, not by skimming.

- **Locate**, don't guess - find where a thing is defined and read what it actually does.
- **Grep every caller** before you decide a symbol's behavior or where a fix lands - the shared seam
  all callers route through is usually the right one, and the grep is what reveals it. This is the same
  discipline `/diagnose` applies to a fix.
- **Trace the edges** - imports in, dependents out - to bound the blast radius.

This path needs no setup and no graph, so a missing map never blocks the work.

## What it feeds

Orientation is an input to other practices, not a phase of its own:

- `/plan-grill` - the baseline check: what already provides the capability, and what the feature will
  touch.
- `/diagnose` - the callers and dependents that seat the root cause at the correct seam.
- `/review` - the blast radius of the diff: who the changed or removed symbols reach.

It adds to whatever search and tooling you already have, and never replaces them.
