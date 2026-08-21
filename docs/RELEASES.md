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

0.2.0 reonboard - **The comms rule reaches your sessions again, and it now ships inside the plugin tree.** Deleting the installer took three of its jobs with it: better-dev's response-style rule arriving in the session, an update-available alert, and a nudge to run `/onboard` in an unwired repo. `hooks/pre/bd-session.ts` restores all three from inside the installed plugin - discovered by listing the tree, every path resolved relative to itself, versioned with the plugin and gone when the plugin is removed, so nothing here can repeat the old hook's failure of being registered by absolute path into machine-global config and then breaking on a `git pull`. Placement is decided by the model's own `supportsMidConversationSystem` compat signal rather than assumed: where the host promotes it the rule reaches the wire as a genuine `system` block, and where it does not the rule is placed around the last user turn and never last, because Cursor, GitHub Copilot and GitLab Duo each read a trailing entry as the request itself. **Only omp runs that hook, which is why this release owes you a re-run.** Claude Code loads plugin hooks from `hooks/hooks.json` as shell or HTTP entries and hermes wants a Python `register(ctx)` module, so on both hosts that file ships and never runs - measured, not inferred. `/onboard` now checks whether the rule reaches the session at all, on the one observable that proves it (the `better-dev:comms` sentinel in context, then whether the rule is already standing from a native provider), and where nothing delivers it, writes a new managed block - `<!-- BEGIN better-dev-comms -->` - into your entry file pointing at the installed `rules/comms.md`. It is a pointer, never a copy, so it cannot go stale. **Re-run `/onboard` once per wired repo.** On an omp marketplace install it will see the sentinel and write nothing; on Claude Code, hermes or a skills-only install it writes the pointer, and that is the difference between your replies in that repo following better-dev's comms rule and following nothing at all. Install is one copy-pasteable prompt now: `README.md` carries it and `BOOTSTRAP.md` is the agent-executed procedure behind it, with a named check per stage and a per-host table saying what each channel delivers and what it does not.
