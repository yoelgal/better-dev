---
name: pick-ui-library
description: Use when a UI component is about to be built and the dependency question is still open - a toast, a command palette, a combobox, a date or time picker, focus management for a dialog or menu, a virtualized list, drag and drop - or when a candidate package's maintenance has to be judged before it is installed, or when a second library is about to be added for a component this repo already solved. Not the visual direction (/design-brief), not building the component, and not dependency policy for the rest of the stack.
---

# Take the dependency, or hand-roll it, on purpose

Two outcomes ship as done and both are wrong. An agent hand-rolls a component whose hard part is
behavior rather than looks - a `<div>` dropdown that traps no focus, a toast stack with no live region
and no dismissal model - and the screenshot looks right. Or it installs the first search result, and
the repo now depends on a package whose last release predates the framework version it runs. This
skill decides one thing: whether this component takes a dependency, and of what kind.

It does not choose the look (`/design-brief` owns direction and the token set), does not build the
component, and is not dependency policy for the rest of the stack.

Read `.better-dev/overrides.md` first and honor any project override before applying anything below.
The steps run in order, and step 1 lands before any proposal reaches the user: a recommendation
written before the manifest was read is how a repo acquires its second toast system.

## 1. The repo has usually already decided - read that first

Four observable lookups, cheapest first:

- **The dependency manifest and its lockfile** - `package.json`, or this stack's equivalent. Which UI
  libraries are installed, at which version, and which of them already cover a class in step 2.
- **The component layer** - a `components/ui/` tree, a primitives module the app re-exports, a design
  system package in the workspace. A component already wrapped there is this project's answer, with
  its own styling contract attached.
- **The recorded pick** - `.better-dev/bin/bd-mem recall "ui-library"` and `.better-dev/overrides.md`.
  Per-project trusted lists live there, set by the operator; this skill ships none. A curated list of
  packages is one author's taste with a shelf life, and a list pinned inside a skill goes stale
  without anyone editing it.
- **The recorded design system** - `/design-brief` records the named system and the token source. A
  system that already owns this component owns it; extend it rather than installing beside it.

If a library for this class is installed, use it. A second library for a problem the repo already
solved is the defect this step exists to catch - two dialog primitives, two virtualizers, two toast
roots - and "the installed one is worse" does not license the second install: two systems is worse
than either one alone. Where the incumbent is a competitor of the candidate you would have picked,
flag the recommendation but don't churn the dependency without being asked. A genuinely wrong
incumbent (abandoned by step 3's checks, or unable to meet a done-criterion) is a migration with its
own work item and a removal inside it, proposed to the user, never an addition made quietly.

## 2. Resolve the component class, never the package name

**Identify the task**, not the library the user named. A **solved-problem class** is one where the
hard part is keyboard, focus, and assistive-technology behavior rather than appearance, so a
hand-rolled version is a defect even when it looks correct. Resolve the class from what the component
must do: "show a message after saving" is the toast row, and "a dropdown" is usually the
focus-management row.

| Component class | What the hand-rolled version gets wrong |
|---|---|
| Toast / notification stack | one live region, expiry and pause-on-hover, stacking, swipe and keyboard dismissal |
| Command palette | the arrow / Home / End / Escape model, `aria-activedescendant`, result ranking, long-list scroll |
| Combobox / autocomplete | the listbox pattern, typeahead, mobile keyboards, announcing the selected value |
| Date or time picker | grid keyboard navigation, locale and first day of week, time zone and DST edges |
| Focus management (dialog, popover, menu) | focus trap and restore, scroll lock, inert background, outside-click versus Escape |
| Virtualized list or table | measured variable row heights, scroll anchoring, focus on off-screen rows |
| Drag and drop | keyboard-operable reordering, pointer and touch parity, drop announcements |

The class is the search query; the package is what the search returns, and step 3 is what grades it.
If the task isn't covered by the table, say so explicitly and recommend from your own knowledge, but
be clear you have left it - and outside these classes a dependency is the heavier choice, so step 4
is usually the answer.

## 3. Grade the candidate on facts that have values

Every check below returns a date, a count, a size, or a named pattern. Write the value beside the
check with where it came from. "Well maintained" is a vibe, and a vibe is what installs an abandoned
package.

- **Release cadence, not a single date** - the last release date and how many shipped in the trailing
  twelve months (`npm view <pkg> time.modified dist-tags versions`, or the repo's releases page).
- **Whether a maintainer answers** - of the last five issues opened, how many drew a maintainer reply,
  and the date of the most recent one. Stars and download counts lag by years; a tracker whose last
  maintainer comment is months old is unmaintained regardless of either number.
- **More than one hand** - recent commits from more than one account, and a changelog with dated
  entries. A single-maintainer package is not disqualified by this; it is a named risk in the
  decision line.
- **Bundle cost against what it replaces** - the minified-and-compressed size, measured, versus the
  real size of the hand-rolled alternative. A number, not "lightweight".
- **Whether it owns its accessibility story** - the docs name the ARIA pattern implemented and the
  keyboard model. A library that leaves those to the caller has moved the work in step 2's row rather
  than removing it, which was the whole reason to install it.
- **Version fit** - peer dependencies resolve against the framework and runtime versions this repo
  installs today, with no issue open against that version.

"Quiet because it is finished" and "abandoned" look identical from outside, so do not settle it by
reading the README's tone. The tie-break is the version-fit check: an issue open against the framework
version this repo runs today, with no maintainer answer, settles it as abandoned.

`/tool-sourcing` owns the same discipline for sourcing a *skill*; the checks differ because the
artifacts do. What carries across unchanged is that installing runs the package's own install scripts
with the developer's permissions, so the real cost of adopting is a supply-chain surface, not disk.

## 4. Hand-rolling is sometimes the right answer

Three cases earn it. Each has a test, and the test is what separates the case from the excuse.

| Case | The test it has to pass |
|---|---|
| Trivial component | Name the ARIA pattern it implements. "None" - a badge, a static banner, a spinner - means no step-2 row covers it, and a dependency costs more than it removes. |
| Hard design-system constraint | The candidate cannot reach the recorded token set without overriding most of what it ships. `/design-brief` bans that from the other side: importing a system's tokens and then overriding them. |
| A real dependency budget | A recorded ceiling - a size budget the build enforces, an audited dependency count, a vendored or air-gapped build. Absent a recorded one, "we should keep dependencies low" is a preference, not a budget. |

Choosing to hand-roll does not delete the work in that class row; it moves the work into this work
item. Name the keyboard model, the focus behavior, and the assistive-technology behavior as
done-criteria in the contract (`/plan-grill` step 4), or they do not get built.

## 5. One decision, written down

**Recommend one library**, state what it's for in one sentence, and don't present a menu of options
when steps 1 to 4 have a clear answer. The decision is a single block, and it is what `/plan-grill`
carries into the contract:

```
component:  toast on save and publish
class:      toast / notification stack (solved-problem)
repo has:   no toast in package.json; components/ui/ has none; no recorded pick
decision:   take a dependency
candidate:  <pkg>@<version>
  releases    last 2026-07-02, 9 in the trailing year
  maintainer  3 of last 5 issues answered, most recent 2026-08-04
  size        4.1 kB min+gzip, against ~2 kB hand-rolled with no live region or dismissal
  a11y        docs name the aria-live pattern and the swipe / keyboard dismissal model
  fit         peer react ^18 || ^19 against installed 19.1; no issue open on 19.x
  risk        single maintainer
hand-roll:   no - one live region and keyboard dismissal are the work, not the styling
criteria:    a screen reader announces each toast once; Escape dismisses the focused toast
```

Close out by making the pick the project's rather than this run's:
`.better-dev/bin/bd-mem persist-override "<class>: <package> - <one-line reason>"`, so the next
feature inherits it at step 1 instead of re-deciding. If the vetting taught something durable about a
source, record it (`.better-dev/bin/bd-mem learn "<lesson>" <0..1> "ui-library"`); otherwise write one
line saying there was no durable lesson.
