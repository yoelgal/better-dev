# What not to encode

A skill outlives the moment it was written in. The agent loads it for months, treating it as a standing
truth - which is exactly why a truth that was only true for one session becomes a liability once it's baked
in. A recorded "the browser tool doesn't work" doesn't stay a note; it hardens into a refusal the agent
cites against itself long after the tool was fixed. So the filter isn't about tidiness. It's about not
teaching yourself a constraint you'll have to unlearn.

Four kinds of lesson look worth saving and aren't:

- **An environment or setup failure.** A missing binary, an unset credential, a `command not found`, a
  path that broke after a migration - these describe the machine's current state, not how the work is done.
  Whoever hit it can fix it. Recording it as a rule just means the agent flinches at a problem that no
  longer exists.
- **A negative claim about a tool or feature.** "X is broken", "Y doesn't work from here", "don't bother
  with Z" - the most tempting and the most corrosive. It reads as hard-won experience and lands as a
  permanent blind spot. The tool gets fixed; the refusal stays.
- **A transient error that resolved.** If the thing failed and then a retry worked, the durable lesson is
  the retry - the pattern that got past it - not the original failure. Encode the way through, if anything.
- **A one-off narrative.** "Summarize this PR", "pull today's numbers" - a single task, not a class of
  work. There's nothing here a future run repeats, so there's nothing to make reusable.

**Capture the fix, never the failure.** When something failed because of setup state, the durable artifact
is the remedy - the install command, the config key, the env var, the retry - and it belongs under a setup
or troubleshooting skill, phrased as "here's how to make it work." Never leave "this doesn't work" standing
on its own; that's the version that bites.

**Route by who-versus-how.** Two different stores hold two different things, and mixing them is how each
gets noisy:

- *How to do a class of task* is a skill - a durable procedure the agent applies whenever that kind of work
  comes up.
- *Who the user is and what the current state of things is* is project memory - recorded through
  `.better-dev/bin/bd-mem` (a rule with `remember`, a lesson with `learn`), not written into a skill.

A preference the user states about how a class of work should go can belong in both: the skill that governs
that work carries the practice, and memory carries the standing preference.

**"Nothing worth saving" is a legitimate outcome - and not the reflex.** A run that went smoothly and
turned up no new technique doesn't owe a skill; say so and stop. But reach for that conclusion only after
looking, not as the easy way out of the work.
