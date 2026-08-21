# Releases

Read by the operator, never by a script. One line per release, newest first:
`<version> <flags> - <summary>`, where `<flags>` is a comma-joined subset of `reonboard,offer`.
Three tiers: **upgrade-only** (the default - the host's own plugin upgrade is the whole update),
**reonboard** (a repo surface changed - re-run `/onboard` once per wired repo), and **offer** (the
release added something opt-in - the operator decides whether they want it). A version with no line
here is upgrade-only; flags are never empty. One line covers everything in its release, so its flags
are the **union** of what each change in it needs, never the mildest one. A line that removes or
renames a skill also names where its job went - the skill that absorbed it, or "retired, nothing
replaces it" - since the upgrade drops the skill silently and the operator's next question is what to
reach for instead.

Nothing collects these flags on anybody's behalf. A plugin upgrade carries the new text and says
nothing about what a wired repo owes, so this file is the only place that says it: a release that
owed a flag and shipped without its line tells every reader that nothing is owed, and no later edit
reaches an operator who already upgraded past it. That is why absence is a contract (upgrade-only)
rather than a blank.

**An `offer` line always carries `reonboard` too.** An opt-in capability is enabled by something
`/onboard` writes into a repo, so an offer without that marker names a decision with nowhere to land.

0.1.2 reonboard - **Re-run `/onboard` once more if you wired a repo under 0.1.1.** That release picked the entry file from whichever agent you happened to run `/onboard` in, so a repo wired from omp holds no block Claude Code can read, and the reverse. The adoption tier now decides instead and both of its files are always written: root `AGENTS.md` and root `CLAUDE.md` when the wiring is committed, `.omp/AGENTS.md` and `CLAUDE.local.md` when it is local only. A re-run adds the missing copy and changes nothing else.
0.1.1 reonboard - **Re-run `/onboard` in every repo you wired under 0.1.0.** The discovery block was written to a file your agent may never read. Measured with two probes: omp loads a root `AGENTS.md` and loads neither a root `CLAUDE.md` nor `CLAUDE.local.md`, while Claude Code 2.1.233 loads both of those and not `AGENTS.md`. The hosts read disjoint files, so a repo onboarded on omp carried its block somewhere invisible, every session there had no discovery at all, and the session hook's nudge to fix it never stopped firing. `/onboard` now writes one copy per host and reads each path back. A re-run replaces the block in place, adds the copy your host reads, and clears the nudge. Nothing else in a wired repo changes.
