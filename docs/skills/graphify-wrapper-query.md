# /graphify-wrapper-query

## What it does

Answers an architecture or navigation question by traversing a domain's code graph instead of
grepping the subtree - who calls this, what depends on X, the shortest path between two nodes, what
a node means in plain language, where the architecture concentrates. It refuses to let a cold repo be
an excuse: if no registry, no carved domain, or no built graph exists yet, the skill builds what's
missing with an AST-only pass before answering, and never spends an LLM call or an API key to do it.
A `--semantic` layer only ever happens on deliberate request, through `/graphify-wrapper-sync`.

## When to reach for it

Reach here to orient in code before making a change or reviewing one - "who calls this", "what
breaks if I change X", "explain this node", "where does this architecture concentrate". It is the
structural half of `/codebase-map`'s job when a graph already exists or is cheap to build.

For a first-time repo setup (installing the graphify CLI, seeding the registry, picking a semantic
backend), that's `/graphify-wrapper-setup`. For choosing which subtrees are worth indexing at all,
`/graphify-wrapper-map`. For refreshing a graph you know is stale, `/graphify-wrapper-sync`. For
checking what's registered and how fresh, `/graphify-wrapper-status`.

## Where it fits

Reached through `/codebase-map` when `/diagnose` or `/plan-grill` orients before a fix or a feature
is scoped, and composed directly by `/review`'s ripple step and by the gauntlet loop's round record
for blast-radius answers (`--affected`), and by `/codebase-audit` for the leverage question
(`--hubs`). It composes
`/graphify-wrapper-sync`'s AST-only build path as its own healing step, so it never dead-ends into a
plain grep the way its pre-heal behavior once did.

## Prerequisites

None required to invoke it - a cold repo self-heals on first question. `/graphify-wrapper-setup`
having already run makes the first question faster (no CLI install mid-query), but is not required.

## Common questions

**It just printed "graphify: created registry ..." - did it just write outside my repo?**
Yes, and this is the one machine-global write this skill itself makes (as opposed to setup's
writes): healing a missing registry under `~/.claude/graphify/`. It's an authorized, named write with
a stated undo - `rm -rf` the printed directory removes it along with every graph built from any
worktree of this repo on this machine; the next question just rebuilds them.

**A question about code I just moved or renamed comes back wrong - is the graph broken?**
No - the graph reflects the last `/graphify-wrapper-sync` of this worktree, not the live working
tree, so a recently moved or renamed symbol can look stale. Re-run `/graphify-wrapper-sync <name>`
and retry the question.

**I tore down a worktree - does its graph go away too?**
Not automatically. A torn-down worktree's graph directory is left behind under the graphify home
(known limitation, unfixed as of the 0.9.7 relocation). The stopgap is the same undo as above:
`rm -rf` of the graphify home for this repo is safe and costs at most one AST rebuild on the next
question in any live worktree.

## It's working if

- A question about an unfamiliar area gets answered with cited nodes instead of a session grepping
  the whole subtree first.
- A cold repo's first query still returns an answer, with at most a one-line note that a registry or
  graph was just created.
- `--affected` on a changed symbol names test paths, not just callers, when the repo has tests to
  filter against.
- A stale-looking answer resolves after `/graphify-wrapper-sync` and a retry, without any other
  troubleshooting.
