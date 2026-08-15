---
name: writing-skills
description: Use when authoring, reviewing, or refactoring any better-dev skill - writing or editing a SKILL.md, including when the self-extension flow generates a new one - or when editing any always-loaded block this library ships (a discovery block, the comms block, a routing table) or any sibling reference file a skill body sends the agent off to read.
---

# Writing better-dev skills

Every better-dev practice ships as a `SKILL.md` on the agentskills.io standard, so one skill runs
unchanged across Claude Code, Codex, pi, and hermes. This is the bar to author against, and
everything this library puts in front of an agent is held to it: the skill body, the sibling
reference files it sends the agent off to read, and the blocks that load on every session - not
only what sits inside a `SKILL.md`.

## Frontmatter - minimal on purpose

Required - two keys, nothing else load-bearing:

- `name` - kebab-case, ≤ 64 chars, matches the folder name.
- `description` - the *only* text an agent reads before deciding whether to load the body. Write it as
  **triggering conditions**, third person, starting "Use when …". Do **not** summarize the workflow
  here: a description that reads like a summary tempts the agent to act on it and skip the body. Each
  trigger names a **distinct** situation; a synonym that only renames a branch already listed is
  duplication - collapse it into the branch it renames.

Optional - add only when a skill actually needs it:

- `disable-model-invocation: true` - makes the skill **user-invoked** (`/name` only), with zero standing
  context cost. Use it *only* when a skill should fire at a human's deliberate command: destructive or
  expensive actions, or a reference a person pulls up by hand. Do **not** use it for disciplines the
  *agent* must apply on its own - like this authoring standard, which the self-extension flow needs when it
  writes a skill. Those stay **model-invoked** so the agent can reach them. Omit the key to auto-fire.
- `argument-hint` - e.g. `[feature-slug]`, shown at the `/name` prompt.
- `allowed-tools` - grant exactly the tools the body's steps name, and omit the key when the job
  genuinely needs the whole toolbox. An advise-only skill - a review, an audit, a map - grants
  read-and-run tools and no Write/Edit: a reviewer that can edit the code it judges is one
  rationalization away from doing so. Set the grant from the finished body, not from intent - a grant
  narrower than the body's own steps kills the run mid-skill, which is worse than no grant. A host
  that doesn't honor the key ignores it, so a correct grant costs nothing. When the body dispatches
  host subagents, the dispatcher's name varies by host - grant every name the host family uses
  (`Task`, `Agent`); an unknown name in an allowlist is inert, while an omitted dispatcher kills
  the fan-out.

Never put `version`, `license`, or prose in frontmatter.

## Body - one job, disclosed progressively

- **One skill, one job.** If a second job creeps in, split the skill. The bar for a trivial skill is
  reach, not length: a four-sentence skill that only names a flow's steps in order earns its slot when
  people keep asking "what's the flow" and the answer must be invocable by name; an answer that is only
  ever read, never invoked, belongs in a routing table, not a skill of its own.
- Keep the body to what **every** run needs. Push the rest into sibling `.md` files reached by a **prose
  pointer** ("for the tricky cases, read `edge-cases.md`") - never an `@`-link or import, which force-load
  the file and spend context on every run whether it's needed or not. When the sibling holds a precise
  value - a threshold, a duration, a command - the pointer says to load the sibling whenever a finding
  needs that value; never restate the number inline from memory.
- Keep any always-loaded block lean - a skill body, a routing table, a discovery block is read on every
  turn, so cut a row before you add one. The standing test against additive drift, applied to a line you
  are adding and to one already there: does this sentence change what a reader *does*? A sentence that
  only reassures or restates the sentence above it spends its read cost every run and moves nothing -
  delete it.
- The environment is a source of truth too, and a sentence that restates it is a **cache**: the verify
  command in a manifest, a `--help` surface, the directory layout, a count of what the repo contains. A
  cache passes the deletion test above - it does change what the reader does - and still goes stale on
  its own, silently, because nothing edits the copy when the original moves. Keep one only where the
  lookup is expensive or unwritten - the convention no file states, the reason behind a choice, the
  gotcha the config does not confess - and where one command or one file answers it, name the lookup and
  let the environment carry the value.
- Depend on another skill by **naming it in prose** ("run `/grill` first"), never by reaching into its
  files. Shared knowledge lives inside the skill that owns it and is reached by invoking that skill.
  A cross-skill reference is one of three kinds, and the sentence must show which:

  | Kind | What the sentence does | The form that works |
  |---|---|---|
  | Routing | Sends the reader to a different skill instead of this one | A bare name ("for a bug, `/diagnose`") |
  | Attribution | Names where a rule lives without needing it here | A bare name ("`/security-pass` owns the full rule") |
  | Load-bearing | A step of this skill whose operative mechanics live in the referenced skill | An **imperative enter-step** at the moment the mechanics are needed ("enter `/x` before the first dispatch"), or the operative rule inlined where it executes with the name kept as attribution |

  The middle form - a citation plus a partial paraphrase - fails silently: the executor already
  believes it can do the step, the paraphrase satisfies the need the reference was meant to create,
  and the referenced text never loads (observed: a loop whose every worker inherited the session's
  model because the tier rule lived one un-taken hop away).
- Every stage boundary a skill ships names three moves. Where a run ends by handing to another stage - a
  carve to a front-end, a contract to the loop, a prompt to a fresh session - the text names an **audit
  gate**, the checks the receiving stage confirms before it proceeds; a **hydration step**, that stage
  re-reading the decisions from the durable artifact rather than trusting a summary of them; and an
  **explicit stop** on a failed audit that reports exactly what keeps the boundary closed. Read a
  finished handoff against all three - the one it leaves out is where the receiving stage acts as if the
  work had arrived on its own.
- Voice: firm and precise, never maximalist. State a gate as a plain declarative that names its
  consequence and the move to make instead ("a committed test's assertion stays load-bearing - edit
  the code under test, not the test's expectation; editing a test to reach green hides the very
  regression it exists to catch"), not a caps-locked wall of `MUST / ALWAYS / CRITICAL` - that shouting is the
  blocking tone principle 2 bans, and a firm sentence with a reason holds a gate where raised volume only
  adds noise. Do not soften a real gate into a hedge either: "please try to", "ideally", and "if possible"
  read as optional, and an optional gate is no gate. Say the rule once, at full strength, in a calm voice.
- Steer by stating the target, not the ban. A prohibition names the banned behavior into context, and
  the negation is a weak modifier the activated concept overruns - the ban half-reads as an instruction
  to do the thing. Write the behavior you want ("reach the sibling file by a prose pointer") and reserve
  outright bans for gates you cannot phrase positively; a gate that survives always pairs with the move
  to make instead. The voice rule above governs how a gate sounds; this governs when a ban is the wrong
  shape at all.
- One word, one unit. When a term this skill introduces already denotes a different unit in a skill it
  chains with, qualify the colliding term at first use rather than sharing the bare word - readers meet
  the chain, not one file, and the collision reads as sameness (observed upstream: users worked a
  planning skill's decision questions as build tickets until its unit was renamed "decision ticket",
  because the next skill in the chain also said "ticket"). The everyday word may return once the
  qualified form has fixed the meaning. Reach for a word the model already holds before coining one: a
  pretrained word arrives with its priors attached and costs a token, where a coinage costs the
  sentences that define it and every later reader who half-remembers them. Coin only where no existing
  word carries the unit, and then define it once, in the skill that owns it.
- Read the finished draft for its silences. Every decision a skill declines to make is not left neutral -
  it is delegated to the executor's priors. Walk what the draft never says (output shape, scope boundary,
  the failure path, who approves) and make each omission deliberate: fill it, or leave it open on purpose
  knowing which way the priors default.
- When a skill pins an output shape - a report trailer, a verdict block, a table - show the shape once
  as a filled example, never only a prose description of it. An executor reproduces a shown format; a
  described one drifts into a new shape per run. One example earns its lines; a gallery doesn't.
- A multi-way branch goes in a table or a list, never a paragraph. Where a step forks - three kinds of
  reference, four dispositions, five options at a boundary - the executor is looking for its one case,
  and a paragraph makes it read all of them to find out which. The boundary is who arrives already
  knowing their situation: an executor at a fork mid-run does, so it gets rows; a block that rides in
  context every turn is read whole before any situation exists, so there the paragraph is cheaper and
  stays.
- When you revise a skill rather than write one, cut before you add. Hardcoded process steps and defensive
  repetition written for a weaker model cap a stronger one, so the fix for a skill that under-performs is
  usually a deletion, not another rule. Every instruction you keep pairs with the failure it prevents; one
  that names no failure is a candidate for the cut. When a skill's numbered steps keep fighting real
  runs - executors skip them, reorder them, rationalize around them - demote the body to reference: keep
  the vocabulary and the ordering invariants, drop the choreography, and let the description still fire
  it. A discipline can bind without a prescriptive procedure. When the change removes a recurring
  element, remove what generates it in the same commit - the template, the checklist that asks for it,
  and the worked example each write it back on the next run without anyone deciding to. And a skill
  whose subject is a property of its own text - brevity, clarity, staying on one job - is read as an
  instance of that property, so it fails by growing: a four-hundred-line skill teaching leanness
  teaches the volume, not the rule (`wait-what` is the shipped example, kept to a few lines on
  purpose). Where the two disagree, cut the skill until they agree.

## Encode the judgment at the decision point

A skill's process gates only bite if the executor can't rationalize around them. Wherever a skill has a
point where a model under pressure will declare victory early - a check that "basically" passes, a guess
standing in for a missing fact, a green signal read as "it works" - inline the one-line counter *at that
point*. The counter lives in the body, never in a shared file, because it has to survive the skill being
copied to another host alone.

Where a single decision point draws a whole family of excuses - the core loop skills do - give the skill a
sibling `rationalizations.md`: a two-column table of the excuse and its counter, plus a short Red-Flags
list, reached by a prose pointer ("before settling a pass as done, read `rationalizations.md`"). The
sibling travels with the folder, so it survives isolation too, and progressive disclosure keeps it out of
context until a pass is about to declare done. Every row names an excuse that was actually produced,
not one that could be, so go find them before writing any: `docs/TRAPS.md` records the scenarios a
skill-less agent got wrong, a work-item's receipts and `reception.md` record what a run talked itself
into, and `.better-dev/bin/bd-mem recall` carries the lessons a prior run paid for. Size the table to
what the hunt returned - a heavily-run skill earns six rows, and most skills earn two or three inline
counters and no table at all - because an invented excuse teaches the executor a rationalization it had
not thought of.

Write done-criteria as **checkable criteria, not adjectives**. "Share the same understanding" and
"watertight" are destinations an executor reads generously; give it the test that it arrived. "Can I
predict the user's reaction to the next three questions I'd ask?" is a check; "shared understanding" is a
vibe. "For any percentage, find both endpoints and divide, because that's where a flipped sign hides" is a
procedure a model can run; "check your work" is not.

### The disposition menu

These are the reflexes Fable-5 execution runs at each decision point. They are a menu, not a list to paste
whole: inline the two to four a given skill's decision points actually need, in that skill's voice, at the
exact spot the excuse shows up.

| Disposition | The move | The failure it prevents |
|---|---|---|
| Check, don't recall | Read the file before any claim about it; phrase it "I checked X, it says Y", never "probably Y". | A confident answer from training-shaped memory that the file contradicts. |
| Read the real ask | Restate the request in one sentence and surface your assumptions before building. | Building the literal words and missing the intent. |
| Decompose into checkable pieces | Split the problem so each piece has its own runnable check; done-criteria are per-property. | One monolithic "looks done" that hides a wrong piece. |
| Spend effort where the risk lives | Take the narrowest check that changes your confidence: a one-liner goes inline, a money or auth path gets review, verify, and a regression test. | Over-orchestrating trivia; under-verifying a load-bearing change. |
| Verify by re-deriving, behavior not the green | Re-compute the claim yourself and drive the running surface; don't stop at "exit 0". | Passing a smooth-sounding wrong number; "compiled, ship it". |
| Separate known from guessed | Mark anything unverified `UNVERIFIED:`; a missing fact is a question, not a default. | A silent guess baked into the contract and then driven green. |
| Attack your own conclusion | Hand the finding you're surest of to an independent refuter; pass the artifact, never your conclusion. | A plausible-but-wrong result surviving because the reviewer only saw the claim. |
| Root cause at the choke point | grep every caller before editing; one guard in the shared function beats a guard per caller. | Patching the named path and leaving sibling callers broken. |
| Question whether it should exist | Ask whether the thing needs to exist before improving it; deletion over migration, applied to your own prior proposal too. | Polishing something whose right answer was deletion. |
| Change your mind out loud | Concede explicitly when out-argued, then generalize the insight; name the concrete downside, not a vague one. | A yes-machine implementing a bad idea; consistency chosen over correctness. |
| Answer first, report honestly | Lead with the outcome; if a step was skipped or a check failed, say so with the output. | A buried finding, a manufactured green, a hedged non-report. |
| Name the mistakes that look like competence | The rationalization table itself: name the specific excuse that skips a gate under pressure. | The gate that never bit because its excuse went unnamed. |

### The close-out

A skill whose run can settle something durable ends with a close-out at its terminal moment - `DONE`, a
fresh diagnosis, an incident, an adoption - never mid-run. The close-out is one call or one sentence:
record the single keyed lesson (`.better-dev/bin/bd-mem learn "<lesson>" <0..1> "<key>" [<source>]`)
or write an explicit `no durable lesson` line saying why. Two tests gate the write, and failing either
means the `no durable lesson` line is the correct output: the line names a cause, technique, or standing
fact - an event of this run ("fixed the typo", "CI was slow today", "PR merged") is a ledger receipt, not
a lesson; and it would save a future session more time than it costs every future recall it appears in.
The negative-lesson filter binds here as everywhere: never a transient "X is broken". A lesson recalled
and used during the run is cited in the receipt as
`prior lesson applied: <key> (confidence <c>, from <date>)` so the operator can audit what the store
contributed. Each skill inlines only its own one-line close-out at its exit point; this section is the
full form it points to.

## Composability & overrides

- A skill **adds**; it never disables or replaces what the project already has installed.
- Never name a specific third-party skill or plugin as if it were installed - the authoring
  environment's tools leak into portable text that way. Detect by capability ("a code-graph skill,
  whatever the host ships"), compose better-dev's own skills by slug, and route real gaps through
  `/tool-sourcing`. The same discipline keeps host-specific commands (`pbcopy`, `gh`) framed as
  where-available, not assumed.
- Any file the model both reads and rewrites - a contract's done-criteria, a progress ledger, a pass/fail
  list - carries an explicit typed status field per item (a boolean or enum in a table or JSON shape), not
  a prose bullet. A model tidies prose and leaves `"passes": false` alone. Surrounding prose may stay, but
  free-form narrative belongs in an append-only file the model never rewrites.
- When a skill leans on recorded per-repo config, split hard from soft. If a missing record makes the
  output *wrong*, not just less sharp - a deploy command, the verify command, the safety policy - carry
  an explicit one-line pointer to the recorder ("recorded by `/guardrails-install`; run it if absent").
  If a missing record only dulls the output, vague prose is correct; a setup pointer there is cargo cult
  that spends tokens on every run for no consumer that needs it.
- A fact that appears verbatim on more than one surface gets one canonical file and a pointer from every
  other, named in the text so the next editor knows where to start: change it there first, then
  propagate. The failure is not the second copy, it is the third edit, which reaches two of the three
  and leaves the reader holding a current instruction and a stale one at the same time.
- Read `.better-dev/overrides.md` first and honor any project override before applying a default.
- Record durable rules and lessons through the memory contract (`.better-dev/bin/bd-mem`), never by
  hand-writing state files. A lesson is one atomic insight with a recall key on the front, not a
  paragraph of narrative - one insight per `learn` call. The long write-up belongs in the ledger
  receipt; the reusable line belongs in `learnings.jsonl`, keyed so a future `recall` finds it.

## How this standard reaches skills

better-dev writes a new skill only as a **fallback**: on a capability gap it first tries to *source* an
existing skill with `/tool-sourcing`, and only when nothing adequate turns up does
**`/self-extension`** draft one - read state, draft a `SKILL.md` in a staged dir, test it, then promote. No engine. That flow -
and the `review` skill - **apply this standard by referencing this file**, never by inlining a copy of its
rules (one source of truth). This skill is model-invoked only so the agent *also* reaches it when it edits
or refactors a skill outside that flow.

## Proving a skill works

Lint proves a skill is well-formed. It does not prove the skill works. Three cheap checks close the gap -
no harness, no fixtures, one manual run each - and the last two are what `/self-extension` runs before it
promotes:

- **Well-formed** - `bd-skill-stage lint` passes: valid frontmatter, a kebab name matching the folder, a
  description that states its trigger, no `@`-links or stray keys.
- **It fires** - write one realistic prompt that should route here and one near-neighbor prompt that
  should route to a *different* skill; confirm the description carries the first without over-claiming the
  second. A skill that won't trigger has a wrong description, not a wrong body - fix the description, not
  the prose.
- **It changes behavior** - run one realistic input with the skill loaded and confirm the agent does what
  the skill promises, judged on what it *did* (the tool calls, the diff), not what it narrated. For a
  fragile or judgment-heavy skill, use a trap: an input a skill-less agent gets wrong (the rigged scenarios
  in `docs/TRAPS.md` are built for exactly this). If the skill doesn't catch it, the body was too vague -
  make that step procedural and re-run.

A skill is done when it passes all three and composes cleanly with whatever else is installed: an agent
decides whether to run it from the `description` alone, the body does exactly one job, and every path has
what it needs inline or a prose pointer to it.
