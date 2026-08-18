# Purpose-locked subtraction - the cut pass

A normal sweep finds what is wrong with the code that exists. This pass finds what should not exist at
all, which a sweep cannot surface on its own: a wrong line has a `file:line` to grep for and a
superfluous one has nothing, so the code that fails the area's purpose reads exactly like the code that
serves it. Run it when the ask names complexity ("this got complicated", "what can we delete"), when the
purpose sentence turns out narrower than what the area contains, or when a mature area has come back
with no `cut` rows at all.

Entry precondition: the purpose sentence from step 1 exists and the human has not contested it. Run this
pass without one and it is a kill list - it will produce cuts, and every one of them argues that a piece
is bad rather than that it fails a stated job, which is the argument nobody can close.

## 1. Inventory every piece

List every piece of the area: every module, route, endpoint, flag, config key, script, CI job,
dependency, migration. Enumerate from a source that cannot skip - `git ls-files <area>`, the dependency
manifest, the route table, the workflow directory - and name the enumeration command in the report so
the reader sees the frame this pass judged inside.

This is the step a run under pressure drops, and it drops invisibly. A pass that samples instead of
enumerating still returns cut rows; they are just the cuts it happened to read, and nothing in the
output admits the rest was never listed. The inventory is the whole difference between "these three
things are dead" and "these three of forty-one are dead" - only the second tells the reader whether the
area is bloated or fine.

## 2. Tag each piece against the purpose sentence

Three tags, no fourth: **keep** (it earns its place against the stated job), **cut** (it does not),
**uncertain** (you suspect dead weight and cannot yet tell).

Two defaults do most of the work:

- **Nice to have counts as a cut.** A piece defended only by "it's nice to have" or "someone might want
  it" has no answer to the purpose sentence. Stating that as a default before the tagging starts settles
  the largest borderline class in one move; leaving it unstated means arguing that class one piece at a
  time, with a different standard each time.
- **Working and in place is a keep unless the sentence says otherwise.** A cut names the clause of the
  purpose sentence the piece fails. Code that has been running has already survived contact with real
  use, and that is evidence a fresh preference does not have, so "I would not have built this" is a
  taste report, not a cut. This default is what keeps the pass from being reflexive deletion.

## 3. Force the uncertain ones

No piece leaves this pass still tagged uncertain. Each one gets a predicted downside and a disposition,
in one row:

| Piece | If it goes, what breaks | Cut? |
|---|---|---|
| `lib/legacy-export.ts` | the quarterly CSV job; no other path produces that file | no |
| `--verbose-legacy` flag | nothing named; the only two references are in its own tests | yes |

A "maybe" left standing hands the call to the next reader with none of the context you have right now,
which is how a piece survives four audits without anyone once defending it.

## The name-the-failure test, and where it stops working

An inability to name what breaks is itself information - and it is worth very different amounts
depending on what the piece is, so it never applies flat:

| Piece | An unnamed failure means | What settles it |
|---|---|---|
| Prose - a doc, a README section, a comment | Decisive. The reader is the only consumer, so a section whose absence you cannot describe was not being read. | The test settles the cut. |
| Config - a key, a feature flag, an env var | Near-decisive, once you have looked. The consumer set is greppable and finite. | Grep the key across source and runners first; then the test settles it. |
| Code | Weak. The consumer is a caller nobody remembers, so the inability measures your memory of the codebase rather than the code's deadness. | Callers first, per the main skill's `cut` block: the source sweep plus the runners read. An unnamed failure lowers the row's Confidence and never settles the cut. |

## Exit

Every piece from step 1 is now keep, cut, or a decided row from step 3. The cuts enter step 5's ranked
table as `cut` rows and carry the verify command that step requires - one per piece, not one for the
whole pass: a suite that stays green after eleven deletions has not shown which of the eleven was safe.

The keeps are not reported. An audit that lists what it decided to leave alone spends the reader's
attention on the part with no action in it. Where the pass finds nothing to cut, say so in one line and
name the count you inventoried - that is a real finding about the area, and it is the honest output
instead of a manufactured cut.
