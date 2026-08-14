# Migrations at promote time - the execution half

Design discipline for a schema change lives upstream: `/plan-grill` pins the one-way door, and
`/review`'s migration lens checks the down path, the batch shape, and that code stops reading
before the schema drops. This file owns what happens after the human approves - getting the
migration applied against production in the right order, with a way back. It runs when the release
gate's diff (main body) finds the promote range touching the recorded migrations glob from the
`safety-denylist` rule.

## Which mechanism runs it

Read the recorded rule first:

```bash
.better-dev/bin/bd-mem recall "deploy-migrate"
```

`deploy-migrate` is recorded by `/guardrails-install` - run it if absent; an unrecorded value is a
`NEEDS_INPUT` naming the recorder, never a guess. Five recorded answers:

- `command: <cmd>` - the promote runs the named command against production, after the snapshot
  check below, in the order the next section fixes.
- `platform-auto` - the deploy pipeline applies migrations itself. Nothing to run, one thing to
  confirm: after the deploy lands, read the schema version (or the platform's migration log) back
  and match it against the migrations in the range - auto is a mechanism, not a receipt.
- `release-step` - a deliberate step in the release runbook. Hand the operator the exact command
  and wait for their confirmation plus the read-back before the deploy-verify pass runs.
- `manual` - an operator applies it by hand outside any runbook. Same contract as `release-step`:
  confirmation plus read-back, never an assumption that it happened.
- `none` - the repo carries migrations but has no path to the production schema (an ops team owns
  it, say). Record the migration range in the release receipt and settle `NEEDS_INPUT` naming who
  applies it.

## Snapshot before destructive DDL

Grep the migration files in the range for destructive statements - `DROP`, `TRUNCATE`,
column-dropping `ALTER`, a data-rewriting `UPDATE`/`DELETE`. On a hit, a snapshot (or the
platform's point-in-time recovery mark) is taken before the migration applies, and its reference
lands in the release receipt - it is what the rollback path restores when a revert can't walk the
schema back:

```
migrations: 2 applied via command (npx prisma migrate deploy)
snapshot: pitr-2026-07-09T14:02Z        # or: none-needed (no destructive DDL in range)
```

A destructive migration with no down path and no snapshot doesn't apply - that combination has no
way back at all, and the promote stops on it rather than betting production data on a clean run.

## Rehearse on prod-shaped data before production sees it

Before a `command`, `release-step`, or `manual` apply, run the migration once against a prod-shaped
copy and read the resulting schema back - the snapshot or PITR mark just taken is the natural
source, or the recorded `seed-reset` surface where it restores one. A migration that fails or lands
an unexpected shape on the copy stops the promote before the production schema carries the cost. A
repo with no prod-shaped copy to rehearse on records that as the reason in the release receipt
(`rehearsal: none - <why>`) rather than silently skipping the step.

## Apply order relative to the deploy

Additive (expand) migrations apply **before** the new code deploys - old code ignores the new
column; new code finds it present. Destructive (contract) migrations apply **after** the new code
is deployed and verified - the schema drops only what nothing deployed still reads. When one
release carries both, the contract half waits for the deploy-verify pass to settle `VERIFIED`, not
just for the deploy to land. A `platform-auto` pipeline usually migrates before the code flips;
confirm that order matches the range - a contract migration in a migrate-first pipeline is exactly
the mismatch this section exists to catch.

## The cross-release hold

An expand/contract pair split across releases carries a sequencing constraint no single promote can
see: the contract migration must not promote until the release that stopped reading the old shape
is deployed and verified. When this release's range holds the *expand* half, record the hold so the
next promote finds it:

```bash
.better-dev/bin/bd-mem remember "migration-hold: <contract-migration> waits for <version> VERIFIED in prod"
```

Before promoting any range that contains a held migration, read the holds back (`bd-mem recall
"migration-hold"`): a hold whose condition isn't yet a verified release receipt is a `BLOCKED`
gate, not a judgment call. Retire the line when the contract half ships.
