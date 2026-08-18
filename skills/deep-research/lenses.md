# Lenses, source tiers, and blocked fetches

Reference for `/deep-research` section 2. Read it when planning the width wave or when a fetch comes
back empty, blocked, or paywalled.

## The lenses

Each lens is a different phrasing of the same matrix row, and each surfaces a different corpus. Plan
at least the plain and adversarial lenses on every row; add the rest where the row earns them.

| Lens | The phrasing | What it surfaces that the others miss |
|---|---|---|
| Plain | The question as a person would type it | The consensus answer, and whoever ranks for it |
| Term of art | The field's own vocabulary for it | Papers, specs, and vendor docs that never use the plain words |
| Practitioner | Failure-shaped: the error text, "X not working", "why is Y slow" | Issue threads, forum posts, and postmortems - where the real edge cases live |
| Adversarial | The counter-claim as if you believed it: "X does not work", "problems with X", "X considered harmful" | The refutation, the retraction, and the case the promoters leave out |
| Period-pinned | The question plus a version, a year, or `after:<date>` | Whether today's answer differs from the one that ranks - stale answers outrank fresh ones on settled-looking topics |
| Primary source | The originating artifact by name: the paper, the RFC, the changelog, the commit, the docs page | The claim as its author stated it, before the coverage reshaped it |

The primary-source lens is the one most often skipped and most often decisive. Three articles about a
release are one source; the changelog is the source. Where coverage and the primary artifact disagree,
the artifact wins and the disagreement is a row for the tension table.

## Source tiers

Record a tier per source. It is not a score to average, it is what tells you whether a disagreement
is a real tension or one weak source contradicting a strong one.

| Tier | What it is | How far to trust it alone |
|---|---|---|
| `primary` | The artifact itself: source code, the spec, the paper, the changelog, official docs, a dataset | Load-bearing on its own for what it is, though not for its own effectiveness |
| `institutional` | A vendor, standards body, or research org publishing about its own work | Facts about the thing, yes; comparative claims against rivals, no |
| `practitioner` | An engineer reporting what happened in their own repo, with numbers or logs | Strong on failure modes, weak on generality - one repo is n=1 |
| `commentary` | Coverage, roundups, listicles, and any page that read the sources rather than the thing | Never load-bearing. It is a route to a primary source, and it is where single-origin consensus is manufactured |

A "X vs Y 2026" comparison page is `commentary` even when it looks like a benchmark. Several of them
are built off one underlying dataset, so they read as independent corroboration and are not.

## When a fetch is blocked

A blocked fetch is a queued item, not a dead end and not a reason to substitute a summary of the page
you could not read. Record each one with a reason from this closed set: `paywall`, `login_wall`,
`bot_block`, `captcha`, `fetch_failed`, `not_found`.

Then, in order:

1. **Try another route to the same content.** The reader-mode fetch, the print view, an archive copy,
   the preprint, the repository copy, or the primary artifact the page was reporting on. A paper
   behind a paywall is often an open-access preprint one search away.
2. **Decide whether the item is load-bearing.** A blocked `commentary` source is a shrug. A blocked
   `primary` source that a matrix row depends on is a gap the run has to state.
3. **Consolidate the human asks into one message, at a natural pause.** Every credential, every
   captcha, every "open this in your browser" goes into a single list once the width wave is done,
   never one interruption per URL. Captchas, 2FA, and logins are not solved automatically, and
   pretending a blocked page was read is the one outcome worse than reporting the gap.

Whatever stays blocked appears in the output's `Unresolved` line with its reason, so the reader can
see which part of the answer rests on a source nobody opened.

## Credentials

Where authenticated reading is needed, the credential stays outside the research notes: never a
password, cookie, or token pasted into an artifact the answer ships with. A note records that a
source needed authentication, not the means of getting it.
