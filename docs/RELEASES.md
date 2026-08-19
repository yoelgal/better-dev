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








