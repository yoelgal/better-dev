# Stuck-check - the rabbit-hole detector

A read-only check that answers one question for the loop: still making progress, or spinning? It reads
cheap signal only - the tail of `receipts.md`, `git log --oneline`, and `git diff --stat` since the
loop began. No deep re-reads; a long loop is not the same as a stuck one, and finding out shouldn't
cost more than a pass.

Run it when a signal trips, not every iteration. It returns a verdict and a next move:

```
signal trips → stuck-check → none      → keep going at the current threshold
                            → suspected → raise that signal's threshold once, keep going
                            → confirmed → settle NO_PROGRESS → restart-from-contract
```

## Signals the loop accumulates

Each pass, the loop notices these in its own receipts. A soft trip is worth a log line and nothing
more; a hard trip is what calls this check.

| Signal | Hard | Soft | Usually means |
|---|---|---|---|
| Same failure signature repeats | ≥3 | 2 | wrong assumption |
| Same file edited, result unchanged | ≥4 | 3 | oscillation / missing context |
| Diff grows, pass-count flat | trend | - | bloat / wrong assumption |
| No new learning recorded across iterations | ≥3 | 2 | spinning / missing context |
| Search churn, no new files touched | trend | - | dead-end / missing context |
| Decisions logged, no behavior moved | trend | - | over-deciding / unclear goal |

## Score the cause

Score each root cause 0-3 against the evidence, then name the top one if it leads the next by at least
1. A tie is `ambiguous`.

| Root cause | Evidence |
|---|---|
| `missing-context` | search churn, re-reads, no learning recorded, a named unknown |
| `wrong-assumption` | failure signature unchanged, same file edited, an "it should be X" that keeps not holding |
| `unclear-goal` | the target reads two ways; decisions oscillate between the readings |
| `un-solveworthy` | over half the budget spent, diff growing, nothing moving |
| `out-of-scope` | the edits don't touch the thing that's failing |

## Verdict

- **confirmed** - top score ≥2, leads by ≥1, and a hard signal tripped. Settle `NO_PROGRESS`; the loop
  restarts from the contract (`restart.md`).
- **suspected** - top ≥2, or a soft signal tripped, with no hard trip. Keep going, and raise the
  tripped signal's threshold by one so a benign streak isn't mistaken for a wall.
- **none** - top ≤1 across the board. Keep going.

## Honesty

The named finding is one concrete line - "assumes the token is set before the handler runs; the failure
says it never arrives," not "something's off." If the finding can only be stated vaguely, the verdict
is lower than it looked. Soft signals never reach `confirmed` on their own; confirming takes a hard trip
plus a cause that scores. High counters with no cause that fits are `none` - sometimes a loop is just
long. When in doubt, keep going and look again next signal; a false `confirmed` throws away good work.
