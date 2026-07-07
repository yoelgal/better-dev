# Lenses - the attack pass, four ways a plan is wrong

A lens is what `skills/review/lenses.md` defines - a named perspective with its own checkable
question block; that file states the definition once, this one applies it to plans.

Run all four in order; worth goes first because it can kill the plan cheapest. Each lens's
objections resolve like any attack-pass objection: died-against-evidence, promoted-to-open-concern,
or promoted-to-out-of-scope - and a promoted objection lands its contract line in the same pass (an
open concern, an out-of-scope pair, or a criterion). A disposition with no matching contract line
is unresolved.

## Worth - is this the right build at all

- Name the outcome this feature serves, in one sentence. If the feature is a proxy for that
  outcome, name the more direct path and why it wasn't chosen.
- Name what it costs to build nothing. A do-nothing cost nobody can state is the "not worth
  building" stop from step 2 - record it and stop.
- Name the cheaper reframe the ground-truth pass surfaced, if any (an `ALREADY_SUPPORTED`
  near-miss is a reframe candidate, not just a proceed).

## Engineering - will this hold and can we back out

- Every new dependency, service, or piece of infrastructure the plan introduces carries one line:
  what it is for, why the existing stack can't cover it, and the reimplementation test - a
  capability writable in roughly twenty lines is written, not depended on. The decision is
  recorded either way (contract: Implementation decisions).
- Every hard-to-reverse choice - schema, data migration, wire format, public API - is named
  one-way, beside its rollback path or the sentence "none - irreversible".
- State the worst-case blast radius in files and systems if the plan's central assumption is
  wrong.

## Design - what does the user see (gated: UI surface)

- The contract names the user-visible state for every screen state the feature touches - empty,
  loading, error, success. A plan that specifies backend behavior with no user-visible state named
  fails this lens.
- State what complete looks like for *this plan's* design, name the gap between that and the
  contract as written, and resolve or record it. Direction and tokens come from `/design-brief`;
  this lens only checks the plan carries them.

## Developer experience (gated: a surface another developer consumes - API, CLI, SDK, config format, skill)

- Count the steps from a fresh consumer's start to their first working call or command. Each step
  defends itself or is removed.
- Name the first error a new consumer will actually hit, and the exact message they see.

At light depth, run worth and engineering only; the gates above still decide the other two.
