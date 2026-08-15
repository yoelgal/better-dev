# Distill the loop's memory

Read this once a release has settled. A release is a natural threshold - a cycle's worth of lessons
has piled up, so this is where the loop consolidates them instead of letting `rules.md` only ever
grow. It runs at this checkpoint, not on a clock. Do it as a review pass, not an edit: read the
lessons against the current rules and propose a diff for the operator to confirm.

```bash
.better-dev/bin/bd-mem read learnings   # the append-only lesson stream
.better-dev/bin/bd-mem read rules       # the promoted rules
```

Read one against the other and propose, per lesson or rule, one of four moves - the reconcile verbs
a memory-consolidation pass uses:

- **ADD** - a lesson that recurred across two or more work-items, or that a verified fix confirmed,
  has earned a rule: `bd-mem remember "<rule>"`. The negative-lesson filter still binds - promote the
  durable cause-and-fix, never a transient "X is broken" (a one-off timeout, a flake, a
  machine-specific path).
- **UPDATE** - a rule a later lesson refined; propose the sharper wording.
- **DELETE** - a rule no recall has matched across the last several work-items is stale; surface it
  for the operator to retire. The sweep anchors here, and `ledger init` carries its between-release
  trigger: once the store passes its threshold, a new work-item nudges the operator to run this full
  pass - the lessons prune *and* this rule disuse sweep, never compaction alone - so a repo that
  rarely releases accumulates neither stale lessons nor never-matched rules waiting for one.
- **NOOP** - most lessons; leave them where they are.

One class of lesson leaves the learnings-and-rules plane entirely: a recurring lesson whose cause
is the shipped skill text itself - a default that misled every run it touched, a step executors
keep rationalizing around - is a library-defect candidate, not a house rule. Surface it to the
operator to carry upstream (`/self-extension`'s recent-sessions clustering mines exactly this
shape); a local override would bury a defect every adopter still hits.

Two things keep this honest. Present the moves as a reviewable diff and light-confirm before applying
any of them - propose, never auto-edit someone's memory. And never rewrite `learnings.jsonl` in
place: it's append-only, so consolidation happens by promoting into `rules.md` and retiring stale
rules there, not by editing the lesson stream. The one sanctioned shrink of `learnings.jsonl` is
`.better-dev/bin/bd-mem prune` at exactly this checkpoint: preview first, and `prune --apply` only
on the operator's confirmation - nowhere else, and never unattended. Nothing recurred or went
stale? That's a clean NOOP - the pass isn't obliged to change anything.
