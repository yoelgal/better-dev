# Standards smell baseline

The Standards channel carries the repo's own conventions first. On top of them - and even when the repo
documents nothing - it also carries this fixed baseline, so the axis always has something to judge against.
The set is the classic Fowler refactoring smells (Martin Fowler, _Refactoring_, ch. 3), plus comment slop -
a modern addition of our own for the AI-slop era; the readings below are our own.

Two rules bind the whole baseline:

- **The repo wins.** A documented project standard always overrides a baseline smell. Where the repo
  endorses something the baseline would flag, suppress it.
- **Every smell is a judgement call.** Flag it as "possible Feature Envy", never a hard violation - and skip
  anything a linter or formatter already enforces.

Match each against the diff. The reading is *the signal* → *the move*.

- **Mysterious Name** - a name that doesn't say what the thing does or holds. → Rename it; if no honest name
  comes, the design underneath is unclear.
- **Duplicated Code** - the same logic shape shows up in more than one hunk or file in the change. → Pull the
  shared shape out and call it from both sites.
- **Feature Envy** - a function that leans on another object's data more than its own. → Move it onto the
  data it keeps reaching for.
- **Data Clumps** - the same handful of fields or parameters keep travelling together. → That's a type
  waiting to exist; bundle them and pass the one type.
- **Primitive Obsession** - a string or int standing in for a domain concept that deserves its own type. →
  Give the concept a small type of its own.
- **Repeated Switches** - the same `switch` or `if`-cascade on the same type recurs across the change. →
  Replace it with polymorphism, or a single map both sites share.
- **Shotgun Surgery** - one logical change forces scattered edits across many files. → Gather what changes
  together into one place.
- **Divergent Change** - one module gets edited for several unrelated reasons. → Split it so each part
  changes for one reason.
- **Speculative Generality** - abstraction, parameters, or hooks added for a need the spec doesn't have. →
  Delete it; inline back until a real need appears.
- **Message Chains** - long `a.b().c().d()` walks the caller shouldn't depend on. → Hide the walk behind one
  method on the first object.
- **Middle Man** - a class or function that mostly just forwards to something else. → Cut it out; call the
  real target directly.
- **Refused Bequest** - a subclass or implementer that ignores most of what it inherits. → Drop the
  inheritance; use composition instead.
- **Comment slop** - a comment that restates what the code already says, narrates the obvious, or reads as
  auto-generated scaffolding. → Delete it. Keep only the comment carrying what the code can't - a
  non-obvious *why*, a gotcha, an invariant - and hold each survivor to one line. (Not a Fowler smell;
  ours.)
