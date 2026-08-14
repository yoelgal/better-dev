# /self-extension

## What it does

Turns a capability gap or an unusually good session into one new, tested skill - and refuses to write
anything until it has earned the right to. Sourcing a skill that already exists always beats authoring a
fresh one, so this only runs after that search comes up empty, and even then a candidate lives in a
throwaway staging dir and clears a lint-then-prove check before an explicit human yes lets it reach the
live tree. Nothing half-built - and nothing unapproved - ever lands.

## When to reach for it

| Situation | Route |
|---|---|
| Sourcing an existing skill came up empty and the gap is real | here |
| A session went unusually well and the technique is worth keeping | here |
| The same correction or override keeps recurring and the root cause looks like shipped skill text, not this repo's taste | here - it names a library-defect candidate instead of authoring anything |
| A tool or skill might already do this | `/tool-sourcing` first - this is its fallback, never a parallel path |
| The correction only holds because of this repo's stack or house taste | stays a project override or a memory lesson, not a skill |

## Where it fits

`/tool-sourcing` and `/self-extension` are one ordered flow: sourcing tries discovery, vetting, and
try-before-adopt first, and only hands off here once all three come up empty. From here the output is a
skill, not a work-item - it doesn't feed the build loop the way `/plan-grill` or `/diagnose` do.

## Common questions

**Why didn't it just fix the gap inline instead of writing a whole skill?** Create is the last resort by
design - the agent sources an existing, proven skill first and only writes a new one when nothing
adequate exists, because a fresh skill starts unproven while an installed one is already load-bearing
elsewhere.

**Where does the new skill end up - just this repo, or everywhere I work?** It classifies scope before
landing:

| Case | Destination |
|---|---|
| Project-specific work | Local - this repo's own project skills dir, never seen elsewhere |
| Genuinely repo-agnostic practice | Global - your own global skills dir, still yours, never packaged into the tool itself |
| Unsure | Local by default - promoting local to global later is one move, walking back an unwanted global skill is not |

**What if the thing I keep correcting isn't really this repo's problem?** When the same correction keeps
recurring and its root cause is shipped skill text rather than a preference tied to this repo's stack or
taste, this names it a library-defect candidate for the operator to carry upstream, rather than either
authoring a skill or burying it as a local override.

## It's working if

- A gap you hit mid-task doesn't just start working next time - you're shown a candidate and asked before
  anything runs with full permissions.
- A skill that only makes sense here never shows up as an option in your other repos, and one you deliberately
  made available everywhere does.
- The same capability gap doesn't get rediscovered and re-authored on a later run - it's reused instead.
- A recurring correction that turns out to be the tool's own defect comes back as something to carry
  upstream, not as a bigger pile of local overrides.
