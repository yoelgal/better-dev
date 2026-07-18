---
name: source-harvest
description: Use when source material is handed into chat to improve a skill library or practices repo - links to GitHub repos, X posts or articles, Instagram reels, screenshots, PDFs - and the job is to ingest it verbatim, analyze it critically against the library's current state, and turn the findings into concrete library improvements. Triggers on "here are some links/materials", "ingest these", "harvest this", any dump of URLs plus a target library - or a single link whose content must be read before the work can be scoped, even when the ask is "implement this" rather than "ingest this": the capture runs here first, and a build ask then routes its captured brief to /plan-grill.
---

# Harvest raw sources into library improvements

Take a dump of raw materials, capture every item verbatim into the target's source
archive, then run a critical synthesis against the target's current skills, and land
the improvements. The pipeline has three stages with a hard boundary between them:
**ingest captures, synthesis judges, execution changes.** Never let capture-stage agents
editorialize into the library, and never start rewriting skills before the synthesis
round has been criticized for completeness.

One arrival is a routing case, not a full harvest: a link handed over as a build ask
("implement this into the library") still gets its Stage 1 capture here - then the
captured brief routes to `/plan-grill` for the build, and this skill's synthesis and
execution stages stand down; they judge harvested material, not feature requests.

The target is the repo the session is in, or the one the user names - never a
remembered default from a previous harvest. Find its archive before the first write:

1. Recall a recorded path: `.better-dev/bin/bd-mem recall "harvest-archive"` - a
   project override in `.better-dev/overrides.md` wins over the recall.
2. No record: detect an existing archive - a sources dir with a filing README
   (`raw/sources/` is the common shape).
3. Neither: create `raw/sources/`, seed a conventions README (folder naming, the
   source.md frontmatter, the manifest), and record the path:
   `.better-dev/bin/bd-mem remember "harvest-archive: <path>"`. A new archive defaults
   to untracked - offer a gitignore entry, never force one; some repos gitignore
   `raw/`, others track it - check, don't assume.

Read the archive's own `README.md` for its filing conventions before writing anything.

## Stage 0 - protocol with the user

- Materials arrive in batches; ingest each batch as it lands, hold synthesis until the
  user says the dump is complete. Ask nothing in between that a convention already
  answers.
- Before ingesting any item, check the archive for an existing entry (match on tweet ID,
  reel ID, repo slug). An unchanged dupe gets one appended "re-submitted <date>" line in
  its existing source.md, never a re-ingest. But a re-submission with a new version, or
  whose prior entry was shallow (stopped at rung 1-2 of the depth ladder), gets the
  note AND a fresh deep diff-ingest as its own entry. "Unchanged" is checked at HEAD,
  not at the last release: an author post clarifying or defending a released version is
  itself evidence of unreleased fixes in flight, so clone and diff the default branch
  against the prior ingest - the changesets sitting ahead of the tag are often the
  answer to the very thread being harvested.
- Dead links, paywalls, private accounts: record the failure in the batch manifest and
  tell the user; never silently skip.

## Stage 1 - ingest (cheap models, verbatim capture)

One folder per item in the archive: `<archive>/<post-date>-<type>-<slug>/` with
`source.md` (frontmatter: title, type, author, url, date, captured, extraction method,
tags + a summary that says what it FEEDS in the library), plus `article.md` /
`transcript.md` / `media/` as the type demands. Concrete extraction recipes (X
syndication API, the full-page browser read, yt-dlp + whisper for reels, image
transcription) are in `extraction-recipes.md` next to this file.

Social posts are pages, not just text. After capturing the canonical post, read the
full rendered page too: it carries what the post body alone cuts - the author's
self-replies continuing the thread, high-signal replies and quote-posts, and the
outbound links. Quote what matters into source.md, and promote each load-bearing link
(the paper, repo, or article the post is really pointing at) to its own ingest item -
one hop deep by default, ask before crawling further.

### The depth ladder - what "extracted" means

Every source has layers, and the gold is usually NOT on the surface one. An item may
only be marked extracted in the manifest when every rung has either been read or is
named in source.md as skipped WITH the reason ("commodity content", "paywalled", "no
such layer") - an unnamed skipped rung is the shallow-ingest bug, not a judgment call.
The rungs:

1. **Canonical text** - post body, README, article text.
2. **Media** - every image transcribed, every video/audio whisper-transcribed. A
   diagram or screen-recording is routinely the payload the text only advertises.
3. **Conversation** - self-replies, the author's answers to users (these often carry
   the canonical usage or intended flow stated nowhere else), and the sharpest
   critical replies - a good objection is harvestable material in its own right.
4. **Linked payloads** - the one-hop promotions above, read from their actual bytes
   (fetch the PDF, clone the repo) - identifying a paper from prior knowledge is not
   capture. source.md records which pages/files were read and marks memory-only
   claims as such until verified.
5. **Author's rationale** - the WHY layer: changelogs, ADRs, release videos/posts,
   design notes, anything explaining what changed, what it replaced, and what failure
   drove it. Rationale routinely outvalues the artifact itself; hunt for it
   explicitly - a repo announcement post usually links a video or writeup that IS
   this rung.
6. **Reception** - user friction where the source's users live: repo issues and
   discussions, quote-posts, reply complaints. Someone else's users hitting a seam
   our skills also have is a finding.
7. **Negative space** - what the source deliberately lacks (no security story, no
   a11y, no failure handling). Captured, it becomes confidence we are ahead or a
   named rejection; uncaptured, it gets re-litigated next harvest.

The FEEDS summary in source.md names which rung the best content lives on. A
re-submitted source with a new version, or whose prior ingest stopped at rung 1-2 (a
name-map or README-level pass), gets a fresh deep ingest - a prior shallow entry is
itself a finding to upgrade, not a dupe to skip.

Repos: shallow-clone to scratch, then one extraction agent per repo writing `source.md`
+ `extraction.md` into the archive. The extraction brief that works:

- Read the ACTUAL files, never summarize from memory of the repo's name.
- Complete inventory (every skill/prompt, one line each), then per relevant item: what
  it does, its best instructions QUOTED VERBATIM with file paths, and one line
  "steal for <library>: <target skill or new-skill candidate>".
- The meta/process layer (rung 5), read as deliberately as the content: CHANGELOG,
  ADRs or decision records, out-of-scope or non-goals files, setup/install skills,
  contributing docs, deprecation handling. How the author RUNS the library transfers
  as often as what is in it.
- Reception (rung 6): skim recent issues/discussions for recurring user friction and
  quote the sharpest 2-3 items.
- A closing "Security & edge-case coverage" section - production-hardening content is
  easy to under-collect and the library always wants it. Where coverage is thin, say
  so explicitly: negative space (rung 7) is a capture, not an omission.
- Pass the library's house style rules into every agent prompt (e.g. the no
  em/en dash rule) - agents will not infer them.

Model economy for this stage: small repos get a cheap model, large or user-flagged
("look especially at this") repos get a mid tier. The top tier is never spent on
extraction. Images the main agent transcribes itself - subagents cannot see them.

## Stage 2 - synthesis (the expensive judgment, spent once)

When the dump closes, ground the synthesis in two reads before any dossier launches.
First the constitution read: the library's PLAN/DECISIONS or equivalent and its core
skill files - the gap analysis is only as good as your grip on the current state. Then
the frontier read, repo-side: the target's stated goals and roadmap (PLAN or roadmap
files, open issues or discussion threads where present), recorded gaps and TODOs, and
known weaknesses. When an input is absent, name the absence in every dossier brief
("no roadmap found") and proceed on what exists - the frontier read reports the repo's
stated direction, it never invents one.

A single-source harvest with a handful of findings takes inline
synthesis at the top tier; the fan-out below is for multi-source dumps. Fan out one
critical dossier agent per skill cluster, plus one per cross-cutting gap theme (themes
that recur: QA/verification, security and production-hardening, activation/routing,
memory and self-improvement, model economy, design). Every ingested source gets a named
owner dossier, and the critic's brief lists any source left unowned - orphans are where
the best findings die. A source that arrives AFTER dossiers launch is never back-filled
into them: ingest it, let the critic map its mechanics to owners, then commission one
dedicated dossier that reads the siblings' TOP ACTIONS so it converges instead of
re-drafting. Claims flagged verify-before-citing at ingest are closed (one search each)
WHILE dossiers run, never after - a dossier written against unverified receipts goes
stale the moment the receipt closes. Each dossier must contain, in order: a verdict on the current state, ranked
weaknesses quoting the weak lines, verbatim evidence from the sources with paths, each
finding marked reimplement/adapt/verbatim per the library's licensing rule, proposed
changes with drafted key language, and a ranked TOP ACTIONS list of one-liners. Dossiers
are working papers - file them in a synthesis dir beside the archive (e.g.
`raw/synthesis/` beside `raw/sources/`), not in the library product.

Every dossier answers four distinct lenses, in this order, and says explicitly when a
lens comes up empty:
1. **Better-than-us**: where the corpus does something we already do, but sharper -
   quote our weak line beside their strong mechanic. This is the per-skill dossiers'
   home turf.
2. **Absent-from-us**: what the corpus does that we have no story for at all. The
   gap-theme dossiers and the completeness critic own this lens; a per-skill dossier
   that trips over one reports it rather than forcing it into its own skill.
3. **Rejected-with-reasons**: what we examined and deliberately do not adopt (an
   architecture that violates the constitution, a pattern outside scope). Name the
   rejection and the reason in the master plan's non-goals - an unnamed rejection gets
   re-litigated every future harvest; a named one sharpens the boundary.
4. **Extends-us**: capability extensions the corpus suggests the target could grow -
   a combination of two mechanics, an adjacency to a skill already shipped, a
   new-skill candidate - judged against the frontier read, not free-floating
   brainstorm. Every extends-us finding carries an upgrade path (the concrete steps
   from here to there), a rough price, and a leverage rank; a finding missing any of
   the three is a musing, not a finding.

Instruct dossier agents to be adversarial, not additive-only: what would a mid-tier
model executing this skill under pressure rationalize around? Which lines are adjectives
where procedures belong? Do not rewrite what already works.

After the fan-out barrier, run one completeness critic over all dossiers: coverage holes
against the library's stated goals, sources whose best content nobody used,
contradictions between dossiers, proposals that fail the laziness test (new skill where
a section would do), and the decisions only the human can make. Put those human calls
(a principle's reinterpretation, a locked decision's format, scope/new-skill questions,
licensing-adjacent policy) to the user as options with a recommendation each; ratified
answers open the master plan. Only then does the main agent - at the highest available
tier - write the master plan itself. Synthesis is the one stage that must not be
delegated below the best model in the room.

The master plan opens with explicit numbered RULINGS resolving every collision the
critic surfaced (which new skills exist, where each shared clause lives and who owns
its full form, one vocabulary for any knob several dossiers name differently, how much
eval machinery ships). Execution before the rulings land layers five wordings of the
same clause into one paragraph. After the rulings, a leverage-ranked opportunities
section collects the extends-us findings across all dossiers - each with its upgrade
path and rough price - so the ranked list survives the harvest even when only its top
items execute now. Then a branch matrix where every file appears in
exactly ONE branch, phased: B = parallel-safe single-owner branches; C = hot files
(4-5 dossiers each) get one INTEGRATOR worker per file that folds all proposals into
one coherent edit, with the canonical-clause-written-once rule stated in its brief;
D = new skills; E = close-out the main agent does itself (front door, constitution
updates, attribution sweep, package gate, trap validation).

## Stage 3 - execution

A harvest landing is a work-item, not an in-place edit: it gets its own worktree off the
integration branch (`/worktree-branching`), the commits land there, and it comes home
through `/pr-and-verify`. Never commit directly to the integration branch. Open the
worktree at the START of the harvest, before the first archive write - not when
execution begins. Ingest, synthesis papers, and library edits all belong to the same
work-item; opening the worktree late means any tracked archive (some repos gitignore
`raw/`, others track it - check, don't assume) accumulates on the integration branch's
working tree while the "real" work waits for a branch. The repo's
log is not the contribution process - a prior commit straight to the integration branch
records an exception, not a standing override; only `.better-dev/overrides.md` grants
those. When the target repo doesn't run better-dev, follow that repo's own documented
process with the same default: branch and review, never straight to the trunk. Rules
that keep the landing honest:

- One coherent change per commit, so any single improvement can be reverted alone.
  Workers EDIT ONLY, never commit - the orchestrator commits per matrix row, so
  parallel workers never race the git index.
- Before trusting any reviewer output, fetch the integration branch and rebuild the
  review package if it moved (renumbering appended entries) - a stale base reads a
  parallel harvest's merged additions as this branch's deletions, and an orientation
  pass claiming "the diff deletes shipped rules" is the tell.
- Run the library's package gate BEFORE the review pass - a style lint catches what
  authors reading their own prose miss.
- Rewrites express findings as checkable criteria, never adjectives ("a command that
  exits 0", "a table with these three columns" - not "be thorough").
- Every behavioral skill change gets a trap test: a rigged scenario a model WITHOUT the
  change fails and one WITH it passes. Record the trap in the target library's trap
  record (better-dev's is `docs/TRAPS.md`). If you cannot
  name the trap, the change is probably prose, not behavior - reconsider it.
- Close the loop: fold what the harvest taught you about harvesting into this skill's
  procedure text - a rule at the decision point where it binds, worded so a future run
  can be graded against it. No dated narrative entries: if the lesson cannot be stated
  as a rule, it is an anecdote, not a lesson.

## Subagent hygiene (learned the hard way)

- Verify, don't trust, the model your subagents actually run on: grep
  `'"model":"[^"]*"'` in the task transcript. A launch arg is a request, not a fact.
- A dead model-pinned agent gets a fresh relaunch with the model re-specified; resuming
  it with a message silently inherits the session's (expensive) model.
- An agent that returns instantly with zero tool uses did nothing - relaunch it, and
  tell the replacement to overwrite any partial files, trusting nothing on disk.
