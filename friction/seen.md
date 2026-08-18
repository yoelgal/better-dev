# seen - what the harness has already found

The harness's memory. Every finding a friction review ever filed has a row here, whatever was decided
about it. `review.md` reads this file before it writes a finding, and a finding already here is not
filed again.

This is not a backlog. Nothing here is waiting to be worked: an accepted finding's work lives in the
papercut queue (`.better-dev/bin/bd-mem papercut list`), and this table only records that the harness
has seen the thing, so the next run stops re-reporting it.

## Status vocabulary

| status | what it means | what a recurrence is |
|---|---|---|
| `ACCEPTED` | routed to the papercut queue; the `papercut` column carries its id | already queued, not a new finding |
| `DECLINED` | adjudicated and not worth fixing | still declined, whatever a later run's transcript looks like |
| `FIXED` | the text or script that caused it was changed - in the library, or in this directory for a `HARNESS` finding | a regression: file it fresh, and cite this row's id in the new row's title |

A row is never deleted and a status is never blanked. `DECLINED` earns its row precisely because a
later run will hit the same thing and want to file it again.

## Row shape

One row per finding, appended at the end, ids ascending. The title is the finding's title from
`review.md`, unchanged, so the two surfaces can be matched by eye:

```
| id | date | status | title | where | papercut |
|---|---|---|---|---|---|
| F-001 | 2026-08-02 | ACCEPTED | onboard reports success while leaving the checkout on the wrong branch | `skills/onboard/SKILL.md:212` | 481223907 |
```

## Findings

| id | date | status | title | where | papercut |
|---|---|---|---|---|---|

No rows yet. The first review to run against this harness fills them.
