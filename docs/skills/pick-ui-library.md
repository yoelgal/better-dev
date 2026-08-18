# /pick-ui-library

## What it does

Decides one thing before a UI component gets built: whether it takes a dependency, and of what kind.
It guards two failures that both ship looking like done - a hand-rolled component whose hard part was
keyboard, focus, and assistive-technology behaviour rather than looks, and the first search result
installed without anyone checking whether it still runs against this framework version. The defining
constraint is that it ships no curated package list: a list of trusted packages pinned inside a skill
is one author's taste with a shelf life, so the trusted list lives in this project's own recorded
overrides and the skill only supplies the checks.

## When to reach for it

| Situation | Route |
|---|---|
| A toast, command palette, combobox, date picker, focus trap, virtualized list, or drag and drop is about to be built | `/pick-ui-library` |
| A candidate package's maintenance has to be judged before installing | `/pick-ui-library` |
| A second library is about to be added for a component this repo already solved | `/pick-ui-library` - and the answer is usually the incumbent |
| What it should look like, the tokens, the direction | `/design-brief` |
| Building the component | the plan and the loop |
| Dependency policy for the rest of the stack | out of scope, and stated as such |
| Sourcing a *skill* rather than a package | `/tool-sourcing`, which owns the same discipline for a different artifact |

## Where it fits

Ahead of the contract, never inside the build. It reads the design system `/design-brief` recorded, so
a system that already owns this component owns it and gets extended rather than installed beside. Its
one decision block is what `/plan-grill` carries into the contract, and where the answer is to
hand-roll, the keyboard model, the focus behaviour, and the assistive-technology behaviour become named
done-criteria there - hand-rolling moves that work into the work-item rather than deleting it.

## Prerequisites

Enough of the component's behaviour known to name its class (what it must do, not the package somebody
mentioned), and the repo's dependency manifest, lockfile, and component layer readable. Step 1 lands
before any proposal reaches you, because a recommendation written before the manifest was read is how a
repo acquires its second toast system.

## Common questions

**The installed library is worse than the one I would pick.** That does not license the second install:
two systems is worse than either alone. The recommendation gets flagged, and a genuinely wrong incumbent
- abandoned by the maintenance checks, or unable to meet a done-criterion - becomes a migration with its
own work-item and a removal inside it, proposed to you rather than added quietly.

**How does it tell "quiet because it is finished" from "abandoned"?** Not by the README's tone, which
reads the same either way. The tie-break is version fit: an issue open against the framework version
this repo runs today, with no maintainer answer, settles it as abandoned. Every other check returns a
value too - releases in the trailing year, how many of the last five issues drew a maintainer reply and
when, measured size against the real hand-rolled alternative, whether the docs name the ARIA pattern
and keyboard model.

**When is hand-rolling actually right?** Three cases, each with a test rather than a preference: the
component implements no ARIA pattern at all (a badge, a static banner, a spinner), the candidate cannot
reach the recorded token set without overriding most of what it ships, or a dependency ceiling the build
actually enforces. Absent a recorded budget, "we should keep dependencies low" is a preference, not a
budget.

**Why does the decision get recorded rather than just used?** So the next feature inherits it at step 1
instead of re-deciding, which is where a second library for the same class comes from. The pick is
written as a project override, not kept in the run that made it.

**What is the real cost of an install?** Not disk. Installing runs the package's own install scripts
with your permissions, so adopting a dependency is a supply-chain surface - the same reason
`/tool-sourcing` vets before it adopts.

## It's working if

- A component whose hard part is behaviour arrives on a vetted dependency, or arrives hand-rolled with
  its keyboard, focus, and screen-reader behaviour written into the done-criteria
- The repo does not end up with two toast roots, two dialog primitives, or two virtualizers
- Every maintenance claim behind a recommendation is a date, a count, or a size with its source beside
  it, and no proposal rests on "well maintained"
- One recommendation arrives with its reason, rather than a menu of packages for you to compare
- The next feature in the same class inherits the pick instead of reopening the question
