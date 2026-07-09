---
name: plan-grill
description: Use when the user wants a new feature or capability built and it is not a one-to-two-step change - "I want to add X", "let's build a way to Y", "can we add", "new feature: Z", a rough intent that needs a plan before code, or somebody else's vague feedback or brief ("make it simpler", "we need a chatbot") that needs decoding into a measurable problem first. Checks the baseline, ideates and grills the design watertight, and pins the observable done-criteria the loop drives to. For a bug or "X is broken" reach for /diagnose; for a whole new app or epic, /groundwork; for a trivial one-to-two-step change, just make it - still in its own worktree branch, skipping only the planning.
argument-hint: "[feature-slug or rough intent] [depth: light|full]"
---

# plan-grill - the feature front-end

Turn a rough feature intent into a plan grilled watertight, and emit a **done-contract** with
*observable* done-criteria the autonomous loop can drive to. One job: everything a feature needs
settled *before* code, and nothing the implementation loop already owns.

Read `.better-dev/overrides.md` first (`.better-dev/bin/bd-mem read overrides`). A project override -
a different spec location, a house planning style, a skipped phase - wins over anything below.

The flow is four steps behind one closing gate; a gated step 0 runs first when the brief is
somebody else's words. Work from the feature worktree
(`/worktree-branching` sets it up); the contract lands in the shared ledger, described at the end.

## 0. Decode the brief when the words are somebody else's

Gate: the intent arrives as relayed language - stakeholder feedback, user feedback on the product,
a ticket quoting someone else ("make it simpler", "we need a chatbot", "users say X feels slow").
First-person intent from the user at the keyboard skips this step in one line.

Record the brief verbatim before restating it - the requester's exact words in quotes, with who
said them, carried into the contract above its `## Problem` section; the specific word chosen is
evidence, and a paraphrase destroys it. Then run the six decode moves in `brief-decode.md`. The
decode ends in one measurable problem sentence plus an in-scope and an out-of-scope line; those
seed the contract's Problem, Goal, and Out-of-scope, and the trigger's factual claims become
premises for step 1. A trigger event that turns out to be a defect routes to `/diagnose`; a decode
that uncovers an epic routes to `/groundwork`.

## 1. Check the baseline before planning on it

A feature is built on assumptions - "X doesn't exist yet", "the flow works like Y and we'll extend
it". Grilling a false premise wastes the whole loop, so verify the premise at `file:line` first, in
one bounded observation pass. Locate the code path in the touched area, read what it does *today*,
and look for anything that already provides the capability - `/codebase-map` gives you the callers and
dependents to answer that from the best structural map available.

Land on a verdict backed by receipts (`file:line`, a command run and its output). If the baseline
maps as assumed, proceed. If the capability **already exists**, or a core assumption is plainly
false, stop and reframe with the user rather than planning fiction - point at the evidence. For the
full premise-extraction, cost-ordered observation pass, verdict taxonomy, and receipts rule, read
`ground-truth.md`. The deliverable of this pass is a verdict with receipts, not a change: no fix, no
build, no code until the grill closes. This is observation, not debugging - no root-cause spiral.

## 2. Ideate - propose, then pick one to grill

Before sketching options, put the premise itself on trial in two lines: the outcome this feature
serves - and whether the feature is the most direct path to it or a proxy - and what it costs to
build nothing. A proxy with a cheaper direct path, or a do-nothing cost nobody can name, is the
"not worth building" outcome below: record the one-line reason and stop.

If the intent is still rough, sketch two or three distinct ways to satisfy it - a sentence each,
with the trade-off that separates them - and let the user pick one (or blend). Sketch them as a
verbalized distribution - each option with a stated probability that a typical solution lands there,
at least one under ~0.10 - or the "distinct ways" arrive as the default design plus paraphrases of
it (the *verbalized candidates* shape in `/orchestrating-agents`). Of the sketched options, one is
the minimal build that satisfies the intent and one is the ambitious build that would make it
excellent - both present, equal weight, your pick stated with its reason. The user's choice sets
the scope posture the rest of the grill holds; any expansion surfaced later is offered individually
and opted into, never absorbed - the scope-growth rule in step 3 polices the drift. Skip this when the
user already arrives with a specific design; grilling *is* the work then. The point is to enter the
grill with one candidate design, not a blank page. For each option, name what it bets is true but
hasn't been checked, and what would kill it - the bets become premises for the baseline check, and
the discards become out-of-scope lines. That per-option assumption pass is where ideation usually
fails when skipped. "Not worth building" is a valid outcome here: if no option's bets survive the
baseline or the cost plainly outweighs the payoff, record it with its one-line reason so the user
knows it was weighed, and stop rather than manufacturing a design to justify the work.

Two arrival shapes get named before any option is sketched. An intent that arrives as a fix or an
upgrade to an existing mechanism gets the requirement interrogated before the implementation: name
the requirement the mechanism serves, and when the honest answer is a case that doesn't exist, the
plan is to cut the requirement, not to build its code better. And an intent that arrives just after
the previous goal was reached - a rewrite or a vision upgrade of a thing that only just started
working - gets the growth named out loud and one question asked: which user does the expansion
serve? A rewrite of a working product rests on a user-visible justification; reaching the goal is
not, by itself, a reason to raise it.

If the feature has UI surface and its visual direction isn't settled, run `/design-brief` before the
grill closes - the design read and system choice belong in the plan, not discovered mid-implementation.

## 3. Grill - one question at a time

Interview the design down every branch of its decision tree, resolving dependencies between
decisions one by one. At **full** depth (the default) you walk every branch; at **light** depth -
passed as `[depth]` for a small, well-understood feature - you grill only the decisions the
done-criteria will turn on and skip exhaustive branch-walking.

- **One question, then wait.** A wall of questions is bewildering; ask, get the answer, ask the
  next. Order them so a decision that unblocks others comes first. One at a time is the interactive
  rule with the user present; questions surfacing from parallel workers batch through the
  orchestrator's question budget instead (`/orchestrating-agents`).
- **Carry a recommended answer.** Every question ships with the answer you'd pick and why - the user
  corrects a default faster than they fill a blank. If the user answers "whatever you think," they
  lack confidence too - don't take it as a blank cheque; re-ask as a choice between two concrete options.
- **Ask only what you can't discover.** A fact about this repo or system is yours to find, not the
  user's to answer - go read it (this is where premise-checking pays off again). Type each remaining
  ambiguity by one key: would its readings change a done-criterion? If yes, it is a must-ask, asked
  before the gate closes - two readings that grade differently are two different contracts. If no,
  pick one and record the pick as a named assumption in the contract. On a must-ask, offer
  two to four mutually exclusive options with the one you'd pick marked; with five or more real
  options, chain a second question rather than dropping or merging options to fit. If a preference
  question goes unanswered, proceed on your default and record it as a named assumption in the
  contract rather than stalling or guessing silently. That path is for two-way doors only -
  decisions a later edit reverses. A one-way door - a schema or data-model fork, a destructive or
  irreversible action, a security or trust-boundary choice, an addition to the committed goal set -
  is asked regardless of the key above and never proceeds on an invented default: with no answer from the user and no recorded override
  answering that question, the state is `NEEDS_INPUT`. An override can carry the user's standing
  answer to a one-way question - that is an answer, deliberately given once - but no override makes
  one-way doors auto-decidable in general. The grill is human-in-the-loop by construction: the agent
  never stands in for the user's side of it, and a must-ask answered by the same session that asked
  it is a broken grill, not a fast one. The only non-user answers a must-ask accepts are a recorded
  override or, for a two-way door, a default recorded as a named assumption; with neither, it parks
  as `NEEDS_INPUT`.
- **Confirm as each decision locks.** When a decision settles, reflect it back in a line and move on
  once it holds. If a decision reads like a standing policy for this project (a convention, not a
  one-off), offer to persist it - "make this the default here?" - and on a yes record it with
  `.better-dev/bin/bd-mem persist-override "<line>"`. Don't persist transient facts. Keep the
  settled decisions on disk, not in conversation: as each decision locks, append its one-line form
  to a running `decisions.md` in the work-item's ledger
  (`.better-dev/bin/bd-mem ledger put <work-item> decisions.md`). Step 4 synthesizes from that
  file - a grill long enough to compact loses nothing.
- **An answer that contradicts a receipt gets the receipt, not a nod.** When an answer conflicts
  with something the baseline pass already established, don't fold it into the contract and don't
  argue in the abstract: concede what's right in their reasoning, put the `file:line` or command
  output beside it, and re-ask. The user can still overrule deliberately - with the evidence in
  front of them, and the override recorded in the contract - but a contradiction absorbed silently
  plans fiction over your own receipt.
- **Watch "done" grow inside the user's own answers.** Their answers are evidence too. When the
  definition of done expands mid-grill - "works for our team" becomes "handles anything anyone
  throws at it" within a sentence - name the growth out loud, pin which version this contract
  commits to, and park the rest as out-of-scope or a follow-up item. Scope caught in the sentence
  it grew in is a one-line correction; absorbed silently, it's how a three-goal contract becomes a
  rewrite.
- **When prose stops discriminating, prototype.** A must-ask that turns on how something should look
  or behave, whose options read the same written down, gets a cheap concrete artifact to react to
  instead of a fourth paraphrase - for a look-question, several radically different variants rendered
  on one route and toggled by a URL param, so the user reacts to each in place rather than one mockup
  at a time; for a logic question, a terminal run of the state machine or a filled example. The
  artifact is throwaway from its first line and marked so, runs with one command, and persists
  nothing. When it answers, keep the answer, not the code: the decision goes to `decisions.md`, the
  decision-rich snippet may inline into the contract (the step-4 exception), and the artifact is
  deleted or absorbed before the gate closes - a prototype still sitting in the tree at contract seal
  is an unfinished decision. UI direction still belongs to `/design-brief`; this move settles a
  single question, not the aesthetic.
- **Attack the plan before you close.** The grill so far argued *for* the design - it walked the
  tree and filled each node with your recommended answer. Spend one pass arguing against it, through
  the four lenses in `lenses.md` - worth, engineering, design, and developer experience; the last two
  run only when the feature has that surface, and each skipped lens says so in one line. Each lens is
  a short block of checkable questions, not a persona to perform. Each objection has to
  resolve - it dies against evidence you can cite, or it promotes to an open concern or an out-of-scope
  line, never just noted and dropped. If you can't mount one real objection, you don't yet understand
  the design well enough to have attacked it; keep grilling. The contract records at least one attempted
  refutation with its disposition (died-against-evidence / promoted-to-open-concern /
  promoted-to-out-of-scope) - an empty Open-concerns section with no recorded refutation fails this.
- **Know when the grill is done.** Before closing it, run one honesty check: *can you predict the
  user's reaction to the next three questions you would ask?* If yes, the decisions are settled and
  the plan is decision-complete - the implementer will make none. If no, you still have open
  questions; keep going. Shared understanding is that prediction coming true, not a feeling that
  you're finished.

## 4. Capture the done-contract

Synthesize what the grill settled - no fresh interview, just write down what you already know. The
contract's spine is its **done-criteria**: each one is a *runnable check* (a command or test) plus
the **seam** it attaches to, phrased so it is red now and goes green exactly when the criterion is
met. "Done" is a check going green, never a claim - this is what the loop drives to and refuses to
fake. Prefer an existing seam, use the highest one that observes the behavior, and keep the count
low; check the seams with the user before locking them. Those seams are the plan's test anchors:
naming where each check bites *before* any implementation is what lets a check exist to go red first,
then go green when code arrives.

Done-criteria prove the goal works; the contract also has to say what it does when the goal doesn't.
At contract seal run the failure-behavior pass over the eight categories, and where the feature
crosses a trust boundary - auth, money, PII, an upload, an external fetch, or any untrusted input -
the threat-surface pass beside it; both live in `done-contract.md`, and any load-bearing row they
surface promotes to a done-criterion. Where the foundation already settled a category (the
reconciliation stance, idempotency, units), inherit its policy rather than re-deciding. A scenario
the contract leaves silent is a decision the loop will make for you at 2am. A visual property is a
done-criterion too, phrased observably - renders at the target widths, uses the token set, passes the
guideline audit - and proven by a screenshot plus an audit over what it shows (`/browser-capability`),
never a self-report.

Give the goal one clear shape (a capability, an end-state, an invariant, or a removal) so its proof
is obvious, and keep the committed goal set small - a main goal plus at most two secondary end-states,
three in all; when the grill surfaces a fourth, halt before code and split into focused work items so
each stays reviewable. Right-size the criteria too: one per property the goal claims, dropping any whose
removal would miss nothing. Keep file paths and code snippets out of the prose - they go stale - with one exception:
inline a small prototype-derived type, schema, or state-machine when it pins a decision more
precisely than words. For the full template (problem, goal shape, user stories, done-criteria,
implementation decisions, out-of-scope) read `done-contract.md`.

## Close the gate, then hand off

Present the contract and wait for the user's confirmation before treating the plan as locked -
nothing downstream should run on an un-agreed contract. On confirmation, pin the approval to the
contract's content hash (via `.better-dev/bin/bd-mem`) so a later edit re-opens this gate rather than
letting the loop advance on a stale sign-off - `done-contract.md` covers the pinning. If a question
can't be settled and blocks
the plan, that's a `NEEDS_INPUT` state, not a guess: record it and stop rather than inventing an
answer.

A `NEEDS_INPUT` record is a handoff, not a shrug. It names the blocked question, who answers it, and
exactly what unblocks it - a decision to make, or manual work spelled as a precise checklist (sign up
for the service, provision the access, move the data) - plus the facts the answer must come back with
and the re-entry point that resumes the grill when it does.

Write the contract to the **primary checkout's** shared ledger so every worktree sees it. Resolve the
item's ledger directory with `.better-dev/bin/bd-mem ledger dir <work-item>` - it returns the
primary-checkout path even when you run it from a feature worktree - and write `contract.md` there.
Then hand the work-item to `/autonomous-loop`, which drives the done-criteria red-to-green.

If `/domain-modeling` is installed and the feature turns on domain vocabulary, run the grill through
it so glossary terms and decision records get written as they crystallize - optional, not required.
