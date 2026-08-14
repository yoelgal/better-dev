# Earned autonomy - propose the standing line the record already supports

A re-run on a repo that has been working for weeks reads more than the tree. The system keeps a
record - each work-item's `approvals.log` in the ledger, the release receipts, the integration
branch's merge history (`gh pr list --state merged` where the remote is GitHub). When that record
shows a non-safety gate answered yes, unmodified, across a real streak - five or more consecutive
occurrences, counted from the record, never estimated - propose the matching standing allowance once,
with the count and where it came from:

> The last seven green PRs held for you and you merged each one unchanged. Record
> `merge-policy: auto-on-green` so the next earned green merges without the wait - or keep the hold?

The proposal changes nothing by itself. Consent stays what it is everywhere in this skill: a yes
writes the standing line through its owning recorder - `merge-policy` here, a workflow preference
through `/overrides`' persist - and silence or "not now" declines. Mark the offer
(`.better-dev/bin/bd-mem remember "autonomy-offered: <gate>"`) so a later re-run that finds the line
stays quiet; the operator who changes their mind reaches the same allowance through `/overrides`.
This skill asks once, not per run.

The safety exclusion in the main body binds here without exception: no gate in the safety class is
ever proposed, whatever its streak.
