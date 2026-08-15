# Review lenses - per-surface checklists

A **lens** is a named perspective with its own checkable question block. That definition lives here and
only here - `/plan-grill`'s grill lenses share it and its lens file points at this one. A review lens is
one of the fingerprint surfaces from `reviewer-brief.md`, expanded from a reflex into the checks that
make "a focused look" concrete: each check is a question to settle against the diff, answered with a
quote or a `⚠️ cannot verify from the diff` item - never a bare yes.

How they run:

- At standard effort, the channel that fingerprints a surface runs that surface's checklist inline; a
  hit lands as a finding on that channel's axis.
- At deep effort, each surface the diff touches gets its own fresh lens worker: the same
  `reviewer-brief.md`, that surface's section below as its focus, findings on the same severity ladder,
  printed under its own heading in the aggregate.
- A project lens recorded in `.better-dev/overrides.md` (a name and a file with the same shape) joins
  the dispatch beside these six.

Where no surface fits, invent nothing - the checklists bound the reflex, they don't mandate a walk-through.

## Auth / authz

- Every new entry point (route, handler, RPC method, message consumer) passes through the same auth
  check its siblings do - name the check and quote where the new entry invokes it.
- A moved or refactored check still runs before the protected action, not after a side effect (a write,
  a send, a charge) has already happened.
- Authorization keys off the authenticated principal, not a client-supplied id - quote where the
  resource's owner is compared against the session, not the request body.
- A broadened match (regex, path prefix, role list) still excludes what it excluded before - check the
  anchors, the case handling, and the trailing-segment behaviour.
- Failure is closed: on an auth-service error, a missing claim, or an expired token, the request is
  denied - the error path never falls through to allow.

## Migrations / schema

- The down path exists and restores the prior shape; a migration that can't be reversed says so
  explicitly instead of shipping a silent one-way door.
- A backfill or data rewrite on a table that could be large runs batched, not as one statement over the
  whole table.
- A new `NOT NULL`, a default, or a type change: on the engine in use, does applying it take a table
  lock or rewrite the table? Name the engine's actual behaviour, don't assume.
- A column or table dropped while code - in this diff or outside it - still reads or writes it; the
  deploy order has code stop reading before the schema drops.
- A new `WHERE`, `JOIN`, or `ORDER BY` the diff introduces has an index behind it, or the miss is named
  as a finding.
- Schema and code changes land in an order that leaves every intermediate deploy state working.

## Concurrency

- Check-then-act: a read, a decision on it, then a write, where the state can change between - quote
  both sides of the race.
- A second lock taken while holding a first: is the order consistent with every other site that takes
  both? A new order is a deadlock candidate.
- An `await`, yield, or callback inserted between a check and its use widens a window that used to be
  atomic.
- Shared mutable state (module-level, a singleton, a cache) written from a path that can run
  concurrently, without a guard.
- Something guaranteed to happen once (an init, a connection, a counter, an idempotency key) now
  reachable from two paths at the same time.

## Money / quantities

- A float where integer minor units belong; any arithmetic on currency in floating point is a finding,
  not a style call.
- Rounding has a named mode at each division or percentage, and where a total is split, the parts still
  sum to the whole.
- A refund, reversal, or credit carries the sign the ledger expects - quote where the sign is set, not
  where it is displayed.
- A unit crosses a boundary without conversion: cents vs dollars, seconds vs milliseconds, quantity vs
  amount.
- Anything that charges or credits names what stops a retry from double-applying - an idempotency key,
  a unique constraint, a dedupe check.

## Wire format / serialization

- A field renamed, retyped, or newly required on a shape another service, an older client, or stored
  data consumes - old readers and old payloads still parse.
- An enum value added or removed where a consumer switches on the set exhaustively.
- An optionality flip: a field consumers treat as always-present made optional, or the reverse - name
  who breaks.
- Stored shapes (queue messages, cache entries, serialized blobs): data written by the old code is
  readable by the new, and items in flight survive the deploy.
- A changed default on a serialized field changes what every consumer sees, not just what new writers
  produce.

## Deletions

- Every caller of the removed symbol found and handled - search by name and by dynamic access (string
  keys, reflection, config references), not just the compile or import check.
- A side effect the deleted code carried (logging, cache invalidation, cleanup, a metric) either moved
  somewhere or was deliberately dropped, with the drop named.
- A removed or renamed command, skill, flag, env var, or config key whose old name deployment, docs,
  or another repo still uses - it now silently no-ops or teaches a surface that no longer exists.
- Data the old path produced (rows, files, queued jobs) that still arrives after the deletion - name
  what consumes it now.
- Renamed, not removed: the concept survives under a new name while the contract asked for removal -
  hand this one to the Refuter.
