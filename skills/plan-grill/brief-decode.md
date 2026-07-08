# Brief decode - the mechanics

Step 0 of plan-grill in full. The gate and the routing live in the skill body; this file is the
decode itself: six moves and the artifact they end in. Everything the decode records lands in the
contract or the receipts - it keeps no side ledger.

## The six moves

- **Verbatim capture.** Check: the contract carries the requester's words in quotes, with who said
  them and when, above `## Problem`; a decode with no quoted brief fails the step.
- **Trigger, not wish.** The first question to the requester is what happened right before this was
  asked and what made it matter now - never "what do you want". When the requester is unreachable,
  hypothesize two to three candidate triggers and carry each as a premise into the step-1 baseline
  check instead of picking one silently. Check: the decode names one confirmed trigger event or the
  candidate triggers as listed premises.
- **Candidate meanings per vague word.** For each subjective word, write two to three concrete
  readings down where they can be pointed at. Type each reading fork by the key step 3 owns: a
  must-ask fork consumes one of the capped questions below, or goes `NEEDS_INPUT` if it blocks and
  no answer comes; a picked fork lands as a named assumption in the contract, with the readings
  seen in the receipts. Check: every subjective word in the quoted brief has either a named
  assumption or a question tied to it.
- **Smuggled-solution translation.** A brief that names an artifact ("chatbot", "dashboard",
  "redesign") is a solution dressed as a requirement: write two to three candidate outcomes it
  could serve, each with its cheapest build in one line. The picked outcome - not the named
  artifact - is what step 2 ideates against; the artifact enters step 2 as one sketch among the
  options, never the pre-decided winner. Check: when the brief names an artifact, the problem
  sentence contains an outcome and no artifact name.
- **Honest TBDs.** Every number in the problem sentence is a receipt (source named: a command, a
  dashboard, a document) or `TBD(<owner>)`. An estimated or plausible number is neither - an
  invented baseline becomes a planning fact the moment someone quotes it. Check: no bare number in
  the Problem section without a trailing source or a `TBD(` marker; the pre-seal checklist enforces
  it (`done-contract.md`).
- **The capped question batch.** A requester who is not at the keyboard breaks the
  one-question-at-a-time rule: batch instead - at most five questions, each tied by name to a
  specific TBD or a must-ask fork, delivered beside the draft problem sentence so the requester
  reacts to a draft instead of filling a blank page. Check: the outbound batch has five or fewer
  questions and each names its TBD or fork; a question tied to neither is cut.

## The artifact

One measurable problem sentence in the shape *<who> experiences <condition with baseline>; target
<value> by <when> without <constraint>*, one in-scope line, one out-of-scope line, and the question
batch - small enough to send back to the requester whole. Check: the four parts exist and the
sentence carries a baseline slot and a target slot, each a receipt or a TBD.
