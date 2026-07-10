# A work-item spanning two repositories

Every coordination surface in this library is per-repo: the ledger, the worktree, the PR, the deploy
surface. Inside one repo - a monorepo's services included - provider-before-consumer sequencing is
carving and review-lens work and needs nothing from this page. Across two separate repositories nothing
shared exists, so a spanning item runs as two work-items - one per repo, each with its own worktree,
contract, loop, and `/pr-and-verify` - tied together by three contract lines. The lines are duplicated
into both contracts on purpose: there is no shared ledger to point at, so the record each side needs
travels inside the contract each side already reads.

- **The mirrored contract line.** One line, written verbatim into both repos' contracts at seal:
  `cross-repo: pairs with <other-repo>/<slug>; interface: <the wire shape being changed>`. Each side's
  loop and reviewer see the constraint without reaching into the other repo, and an amendment that
  changes the interface re-opens both sides - edit the mirrored line in both contracts, each edit
  re-opening that repo's approval pin, never one side alone; a one-sided edit leaves the other repo
  driving against an interface that no longer exists.
- **The deploy-order line.** The provider lands before the consumer. The consumer's contract carries
  `deploy-order: after <provider-repo>/<slug> is live`, and its `/pr-and-verify` holds at that line
  until the provider's change is deployed - a consumer merged first ships calls into an interface that
  isn't there yet. Expand-contract inside the provider keeps its deploy safe for the old consumer
  during the window between the two landings.
- **The spanning done-criterion.** The item closes at the *last* repo's `/pr-and-verify`: its runtime
  verify drives the end-to-end flow across both deployed surfaces - the provider's real deploy, never a
  local mock of it. The first repo's `DONE` is a constituent, not the item's done; a spanning criterion
  graded any earlier grades a mock. That last contract carries the criterion explicitly, so the item
  cannot settle done on two green halves that were never driven together.
