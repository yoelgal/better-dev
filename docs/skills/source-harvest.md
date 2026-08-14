# /source-harvest

## What it does

Takes a dump of raw material - links, posts, repos, screenshots, PDFs - and turns it into
landed library improvements through three stages with a hard wall between them: ingest
captures verbatim, synthesis judges critically, execution changes the library. Capture-stage
agents never editorialize, and nothing gets rewritten before the synthesis round has been
checked for completeness. A source only counts as "extracted" once every layer has been read
or explicitly named as skipped with a reason - the text on the surface is routinely not
where the value is.

## When to reach for it

Routes here on any dump of links or materials aimed at improving a skill library or
practices repo - "here are some links", "ingest these", "harvest this" - including a single
link whose content has to be read before work can even be scoped. A link handed over as a
build ask ("implement this") still gets its capture stage here first; the captured brief then
routes to `/plan-grill` for the build, and this skill's synthesis and execution stages stand
down.

Near neighbours:

| Situation | Route |
|---|---|
| Auditing the repo's own existing code, not external material | `/codebase-audit` |
| A capability gap needing a tool or skill, not source material | `/tool-sourcing` |
| The build itself, once a harvest has produced a captured brief | `/plan-grill` |

## Where it fits

Runs standalone, triggered by a materials dump rather than by another skill handing off. It
opens its own worktree (`/worktree-branching`) before the first archive write, composes
`/orchestrating-agents` for every fan-out (extraction agents, dossier agents, matrix
workers), and lands through `/pr-and-verify` like any other work-item. A build ask embedded
in the dump hands its captured brief onward to `/plan-grill`.

## Prerequisites

- A source archive for the target repo - discovered, or created and recorded via
  `bd-mem` on first use; never assumed from a prior harvest's target.
- For any authenticated or social page read (X threads, gated articles, Instagram),
  an operator-exported browser cookie jar. Exporting it is an operator-run step the skill
  hands back as a paste-ready command each batch - it is never something an agent can pull
  from the browser itself.
- The extraction tooling (Playwright/chromium, pandoc, yt-dlp, whisper) - see the skill's own
  `extraction-recipes.md` sidecar for the recipes; [BOOTSTRAP.md](../../BOOTSTRAP.md) covers
  installation only.

## Common questions

**A post's API output looks complete and self-contained (short, no ellipsis, no link) - is that the
whole source?** No. Syndication/API text is the canonical capture, not the whole one - the full-page
read of the post's thread routinely surfaces a self-reply carrying the actual mechanic, a correction in
the replies, or an outbound link that is the real payload. Skipping the page read is only fine for a
genuinely self-contained post with no thread and no links.

**The README and skill files in a harvested repo restate what the library already has - is it a
wash?** Only if you stopped at rung 1. The changelog, linked release notes, ADRs, and open issues
routinely carry the WHY behind a change and real user friction that the README never states -
"extracted" is a claim about every rung, not the surface text.

**Everything the corpus does, the library already does too - is there nothing to take?** Parity and
leverage are different questions. The frontier read (the target's own roadmap and recorded gaps) can
turn a corpus that clears parity into a leverage-ranked extends-us finding the parity lenses alone would
have missed.

**Does a finding a prior batch surfaced but no ruling ever adopted or rejected just get lost?** No.
The frontier read sweeps recent prior batches' FEEDS lists against the rulings record, and anything
neither adopted, rejected, nor covered becomes this batch's input, named with its owner in the
dossier briefs - a capture without an execution trace is not a done finding.

**Harvesting in a repo that isn't the one this skill lives in, with no existing archive - where does
material go?** It is discovered or created-and-recorded per target repo, never inherited from a prior
harvest's path. A fresh archive gets its own conventions README and a recorded key before the first
item lands.

**Sharp edge - does the operator's cookie jar go stale silently?** Yes. A page renders logged-out
(small capture, no reply pane) with no error to flag it. The stopgap is manual: compare capture size
against what a logged-in read should produce, and re-export the jar when a capture looks thin.

## It's working if

- Every source in the batch shows where its value actually lives, and every rung of it is
  either read or named skipped with a reason - no silent gaps.
- Extraction effort visibly tracks each source's complexity - a short self-contained post
  gets a lighter pass than a long thread or a linked repo, not the same treatment applied
  uniformly across the batch.
- A harvest that included a build ask hands off a captured brief, not unreviewed raw links,
  to the next stage.
- The PR that lands carries one coherent change per commit, checkable from `git log` alone -
  any single improvement reverts on its own, with no editorializing baked into the
  capture-stage commits.
