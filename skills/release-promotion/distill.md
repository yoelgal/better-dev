# Distill the loop's memory

Read this once a release has settled. A release is a natural threshold - a cycle's worth of lessons
has piled up, so this is where the loop consolidates them instead of letting the promoted rules only
ever grow. It runs at this checkpoint, not on a clock. Do it as a review pass, not an edit: read the
lessons against the current rules and propose a diff for the operator to confirm.

Read both tiers out of your harness's durable memory (see `/overrides`): the lessons the sessions
recorded, and the rules already promoted.

Read one against the other and propose, per lesson or rule, one of four moves - the reconcile verbs
a memory-consolidation pass uses:

- **ADD** - a lesson that recurred across two or more work-items, or that a verified fix confirmed,
  has earned a rule: promote it to a durable rule. The negative-lesson filter
  still binds - promote the durable cause-and-fix, never a transient "X is broken" (a one-off
  timeout, a flake, a machine-specific path).
- **UPDATE** - a rule a later lesson refined; propose the sharper wording.
- **DELETE** - a rule nothing has leaned on across the last several work-items is stale; surface it
  for the operator to retire.
- **NOOP** - most lessons; leave them where they are.

One class of lesson leaves the learnings-and-rules plane entirely: a recurring lesson whose cause
is the shipped skill text itself - a default that misled every run it touched, a step executors
keep rationalizing around - is a library-defect candidate, not a house rule. Surface it to the
operator to carry upstream (`/self-extension`'s recent-sessions clustering mines exactly this
shape); a local override would bury a defect every adopter still hits.

Two things keep this honest. Present the moves as a reviewable diff and light-confirm before applying
any of them - propose, never auto-edit someone's memory. And leave the lessons alone:
consolidation happens on the rules side, by promoting a lesson to a rule and retiring stale rules
there, never by rewriting what the sessions recorded. Nothing recurred or went stale? That's a
clean NOOP - the pass isn't obliged to change anything.
