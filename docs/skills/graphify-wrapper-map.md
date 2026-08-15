# /graphify-wrapper-map

## What it does

Turns a sprawling repo into a small, deliberate set of domains worth indexing - discover,
propose, refine, register - rather than a graph over the whole tree. The defining constraint is
focus: it caps a proposal at roughly six coherent domains and names what it is deliberately
leaving unindexed (vendored deps, generated code, build output, docs, fixtures), because a graph
over everything answers nothing precisely and costs a serial semantic pass nobody asked for.

## When to reach for it

Reach here to turn "index the repo" or "map this codebase" into a concrete, approved domain
list - the guided front door before anything gets built. It does not build or refresh a graph
itself and does not answer questions against one; those are `/graphify-wrapper-sync` and
`/graphify-wrapper-query`. Registering or dropping one named domain by hand, without the guided
walkthrough, is `/graphify-wrapper-index`. First-time setup of the graphify tool and registry on
a machine is `/graphify-wrapper-setup`, and this skill refuses to run ahead of it.

## Where it fits

Sits at the top of the graphify chain: this skill proposes and registers domains, `-sync` builds
their graphs, `-query` answers structural questions against a built graph, and `-status` reports
freshness. `/codebase-map` is the caller that reaches for graphify as one instance of a
structural-tool class, not the only entry point - a repo can also arrive here directly on "index
the repo" or "build the code graph".

## Prerequisites

Graphify must already be set up on the machine and this repo's registry file must exist -
`/graphify-wrapper-setup` does both. The skill checks for the registry itself and stops with a
pointer back to setup rather than proceeding without one.

## Common questions

Nothing in the trap, decision, or release record names this skill yet, so there is no sharp edge
to warn you about here.

## It's working if

- A repo with no domains registered yet gets a proposal capped near six subtrees, each with a
  stated reason and a stated semantic/AST choice, rather than one graph over the whole tree
- The proposal names what it left out (vendored deps, generated code, docs, fixtures) instead of
  silently omitting it
- Nothing lands in the registry before you've approved or edited the proposed set
- A sync run afterward reports a domain's cross-subtree edge count, giving you a second read on
  whether that domain's boundary was drawn in the right place
