# Ground-truth - checking the premise before the grill

Step 1 of plan-grill in full. Downstream planning is loyal to the premise: a wrong assumption baked
in now is invisible later, and the loop will dutifully build on it. One bounded pass settles whether
reality matches what the feature assumes - then you grill, or you reframe.

## Extract the premise

A feature stands on assumptions about current behavior. Name them, one per bullet:

- a capability is **absent** ("there's no way to X today") - or **present** and being extended,
- the current flow has a shape ("requests route through Y"),
- the current data or contract is in some state.

Each becomes something to confirm or refute against the code.

## One observation pass, cheapest first

Not debugging - one pass, in order of cost, stopping when the verdict is supportable:

1. **Locate the code path** in the touched area (grep/read) and read what it actually does on the
   assumed flow.
2. **Find intent contracts** - tests, specs, validation, docs - that assert the current behavior is
   deliberate, or that already provide the capability the feature wants to add.
3. **A cheap live check** only if one is cheap: run an existing test over the path, or a one-off
   probe through the repo's wired tooling. Anything needing env spin-up or prod data is a named cost,
   not paid silently - that lands `EVIDENCE_LIMITED`.

Read the area's decision docs before you propose - ADRs, design or intent docs, RFCs that bear on the
feature. A plan that re-litigates a decision already recorded, or that misses that the code has drifted
from one, fails its baseline. Cite any decision that touches the feature in the verdict; a recorded
tradeoff is settled ground, and drift between the code and what the doc says is itself a finding to
surface, not something the doc suppresses.

## Verdict

Compare observed reality to the premise and pick one. The first three proceed to the grill; the last
three stop it.

| Verdict | Meaning | Effect |
|---|---|---|
| `BASELINE_MAPPED` | Current state observed; the feature's assumptions hold (nothing already provides this). | proceed |
| `EVIDENCE_LIMITED` | Code-reading evidence only; a full check needs a named cost. | proceed, naming the gap |
| `DEVIATION_CONFIRMED` | The premise included a "this is broken" claim, and the deviation is real with receipts. | proceed |
| `ALREADY_SUPPORTED` | The requested capability already exists, maybe under a different surface. | **stop** - point at it, reframe |
| `EXPECTATION_SUSPECT` | Observed reality contradicts the premise, and an intent contract says the current behavior is deliberate. | **stop** - the premise is probably wrong |
| `NOT_REPRODUCED` | A claimed defect the feature assumes doesn't actually occur. | **stop** - the assumption may be false |

The three stop verdicts mean reframing with the user beats grilling a false premise - take the
evidence back, don't build. The user can still choose to proceed deliberately; that choice is theirs
to make with the evidence in front of them.

## Receipts or it didn't happen

Every verdict cites evidence - `file:line`, commands run and their output digest, the intent
contract found. A verdict without receipts is invalid. When uncertain, say `EVIDENCE_LIMITED` rather
than dress a guess as a finding. A `file:line` handed up by a recon worker or `/codebase-map` is a
lead, not a fact - re-read it yourself before it enters a verdict or the contract; a wrong excerpt
becomes a wrong plan. Observe the cause if it surfaces, but change no code and draft no
plan yet - that's later work.

## Output shape

A short `ground-truth.md` in the ledger beside the contract captures it:

```markdown
# Ground truth - <work-item>

## Premise
- <assumption the feature stands on, one per bullet>

## Observed
- baseline: <one sentence>
- evidence:
  - <file:line - what the code does>
  - <command run → output digest>
  - <intent contract found, or existing surface providing the capability>

## Verdict
<VERDICT> - <one paragraph tying premise to evidence>

## Limits
- <what wasn't observed and why - omit if none>
```
