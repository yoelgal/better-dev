# Writing briefs and reviewer prompts

The dispatch verb is only as good as the file you hand the worker. These are the details that keep a
brief and a reviewer prompt clean — read this when you're constructing one, not on every run.

## A brief is one task, not the run's story

A dispatch prompt describes a single task; it is not a place to summarize the session. Pasting
accumulated prior-task context is the classic bloat — a real controller's dispatch once reached tens of
thousands of characters, almost all of it pasted history the worker didn't need. A fresh worker needs
only: its task, the interfaces it touches, the global constraints, and any decision from earlier work
that the brief itself can't know. Nothing else.

What belongs in the brief:

- One line on where this task fits in the project — enough scene-setting to orient, no more.
- The task itself, and the exact values it must use verbatim: numbers, magic strings, signatures, test
  cases. These live in the brief, not in your prose around it.
- Interfaces and decisions from earlier tasks that the brief can't derive on its own.
- Your resolution of any ambiguity you noticed while writing it — don't pass a known ambiguity through.
- The report file path and the report contract (terminal state, commits, one-line verify summary,
  concerns).

Don't make a worker read a whole plan file to find its slice — extract the slice into the brief. A worker
that has to hunt for its task in a large document wastes turns and often grabs the wrong part.

## The reviewer prompt: hand it a lens, not a verdict

The reviewer's job is to find what's wrong; your job is to point its attention, not to pre-decide the
outcome.

- The constraints block is the reviewer's attention lens. Copy the binding requirements verbatim from the
  spec — exact values, exact formats, and the stated relationships between parts ("same layout as X,"
  "matches Y"). The process rules (test hygiene, no over-building, read-only method) already live in the
  reviewer's own discipline; the block you add is for what this project's spec demands.
- Don't add open-ended directives — "check all uses," "run the race tests if useful" — without a
  concrete, task-specific reason. They send the reviewer crawling the codebase instead of checking the
  named risks.
- Don't ask the reviewer to re-run tests the implementer already ran on the same code. The report carries
  that evidence.
- Don't pre-judge a finding. No "don't flag X," no "treat this as Minor at most," no "the plan chose
  this so it's fine." If you're about to write any of those, stop — you're sparing yourself a review loop,
  and a plan's example code is a starting point, not proof its weaknesses were chosen. Let the reviewer
  raise it and adjudicate it in the loop.

Hand the reviewer three files — the same brief, the report file, and the diff package — plus the
constraints block. The diff never enters your own context; the reviewer reads the commit list, the stat
summary, and the full diff with context in one read.

## Seed one risk map before fanning out review channels

When a review fans out — several channels, or several lenses over one diff — each worker otherwise
spends its opening turns rediscovering the same thing: where this change is likeliest wrong. Do that work
once, before you dispatch. From the diff itself — the touched paths, the +A/-D shape, the stack position —
derive 3-5 concrete hot-spots, each anchored to a real path or area, not a category. "The retry loop in
`client.go` — off-by-one on the final attempt" earns its place; "concurrency" doesn't. Seed that one
shared map into every channel's brief. Channels still hunt freely past it; the map just spares each of
them the same discovery cost and keeps a risky spot from slipping through the gap between two channels'
assumed scope.

## When the reviewer can't verify something from the diff

A reviewer may flag requirements it can't confirm from the diff alone — things that live in unchanged
code or span several tasks. Those don't block the rest of the review, but you resolve each one yourself:
you hold the cross-task context the reviewer lacks. If you confirm it's a real gap, treat it as a failed
spec review — send it back to the implementer and re-review.

A finding that conflicts with what the plan's own text mandates is the human's call, like any plan
contradiction: present the finding beside the plan text and ask which governs. Don't dismiss the finding
because the plan mandated it, and don't dispatch a fix that contradicts the plan without asking.

## Handling a worker's terminal state

When a worker comes back short of done, something has to change before you re-dispatch — never force the
same worker to retry unchanged:

- `NEEDS_INPUT` — it's missing context you can supply. Provide it and re-dispatch.
- `BLOCKED` — read the blocker. A context problem gets more context and the same worker; a reasoning
  problem gets a more capable worker; a too-large task gets broken into smaller pieces; a wrong plan gets
  escalated to the human.
- `DONE_WITH_CONCERNS` — read the concerns first. If they touch correctness or scope, address them before
  review; if they're observations, note them and proceed.

## Fix dispatches carry the implementer contract

A fix worker re-runs the tests covering its change and reports the command and its output — name the
covering test files in the brief so a one-line fix doesn't drag in the whole suite. Before you re-dispatch
the reviewer, confirm the fix report contains the covering tests, the command, and the output. Record
lower-severity findings in the ledger as you go and point the final broad review at that list, so it can
triage which must be fixed before merge — a roll-up nobody reads is a silent discard.

## Two standing guardrails

- Don't start writing on `main`/`master` without explicit consent — dispatch into an isolated worktree
  (`/worktree-branching`).
- Run one implementer at a time when tasks share files. Parallel writers to the same surface conflict;
  fan-out is for genuinely independent slices only.
