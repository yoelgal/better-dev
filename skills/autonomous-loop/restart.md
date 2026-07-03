# Restart-from-contract

Two different things can happen to a loop that isn't currently green, and they call for opposite
responses. Telling them apart is the whole of this page.

- **Resume** — the loop was interrupted (a crash, a compaction, a clean pause). The work still stands.
- **Restart** — the loop kept running but stopped getting anywhere, and a stuck-check confirmed it.
  The work no longer stands.

Both read the same ledger. They differ only in whether the branch's implementation is kept.

## Resume — the work stands

Read the recovery map and continue from where it left off:

```
.better-dev/bin/bd-mem ledger resume <work-item>
```

That prints `contract.md`, the tail of `progress.md`, and the last receipt. Progress is written to
disk precisely because a context window can't be trusted after a compaction — a missing entry is data
(that step didn't settle), not an error. Compute the earliest step the contract still calls unmet, and
carry on from there. Trust the ledger and `git log` over anything you think you remember; the commits
named in `progress.md` exist in git whether or not the session recalls making them. Nothing is reset,
nothing is thrown away.

## Restart — the work does not stand

When a loop has genuinely stalled, patching the same code further tends to pile confusion on
confusion. Past a certain point the cheaper path is to keep the thing that's still good — the contract
on disk — and rebuild the implementation against it from a clean base. A restart isn't the loop
breaking; it's the loop spending a confirmed dead end instead of grinding it deeper.

Restart only on a **confirmed** `NO_PROGRESS` — a stuck-check hard trip with a named root cause (read
`stuck-check.md`). A suspected verdict, or a long-but-still-moving loop, is not grounds to reset;
that would throw away real work over a false alarm.

The steps:

1. **Keep the map.** `contract.md`, `progress.md`, and `receipts.md` stay — they live in the primary
   checkout, untouched by anything that happens in the feature worktree. Read what the stalled attempt
   learned. Fold any durable lesson into `contract.md` and record it (`bd-mem learn "<lesson>"`) so the
   rebuild doesn't re-enter the same dead end. Append a line to `progress.md` naming the restart and
   why.

2. **Reset the feature worktree off the integration branch.** Discard the branch's stalled work and
   bring the worktree back to a clean base off the integration branch (`staging`, or whatever the
   project detected). This is the one point where the loop's standing rule against destructive git ops
   is deliberately set aside — and only here: only after a confirmed stuck, only inside the *feature*
   worktree, never the primary checkout, and never a force-push to a shared branch. Name that ceiling
   out loud when you do it.

3. **Replay the contract.** Re-enter the loop from the top against the same `contract.md`. The premise
   gate and the already-run red-capable signal still hold — they were about reality, not about the
   implementation you just discarded. Fresh build, same target.

## When to stop restarting

A restart rebuilds the *build*. If a second restart still can't converge on the same contract, the
evidence has stopped pointing at the implementation and started pointing at the done-criteria: they may
be unachievable, self-contradictory, or aimed at the wrong thing. Rebuilding again won't fix a target
that's wrong. That is the one case that goes back to a human — the contract was settled with them in
`/plan-grill` or `/diagnose`, so revising it is theirs to do — and it settles `NEEDS_INPUT`, not
another loop.
