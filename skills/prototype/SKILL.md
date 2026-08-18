---
name: prototype
description: Use when a decision would be settled faster by building something throwaway than by arguing about it - competing options that read identically once written down, a "show me a few versions before I commit" or "mock it up first", a state model or data shape that looks fine on paper and needs pushing through its awkward cases, a foundation choice with several viable shapes, or a grill question a fourth paraphrase has not moved. Not for choosing the aesthetic (/design-brief), writing the plan (/plan-grill), or building the real thing (/autonomous-loop).
---

# Prototype - throwaway code that answers one question

A prototype is throwaway code that answers a question. The question decides the shape, the answer
ends the run, and the code goes in the bin.

## 1. Name the decision, or do not start

No named decision, no prototype. A prototype with nothing riding on it is a side project that will
absorb a day and produce a demo. Write the card first, in the conversation and again at the top of
the artifact where anyone driving it can read it:

```
Decision:     does an invite need a pending state, or can it be accepted straight from the email link?
Answered when: both models have been driven through resend, expiry, and already-a-member, and I can
               say which one ships and why.
Owner of the answer: the plan-grill contract for invite-flow (decisions.md).
```

Three answers arrive here that are not decisions, and each has somewhere better to go:

| What you were handed | Why it is not this skill's question | Where it goes |
|---|---|---|
| "Let's see what it could look like" | That is visual direction, and a variant set cannot settle a direction that was never stated | `/design-brief` first, then come back with the direction as a constraint |
| "Prototype the whole app so we can demo it" | A prototype here is scoped to one question, and "what is the whole app?" is not one. A full-app prototype has no natural stopping point, so it becomes the production app by momentum: the cleanup pass never happens, and code written under prototype rules ends up in front of users | `/groundwork`, or `/gauntlet` if the ask is really a built demo |
| "We'll know it when we see it" | Not an answer condition, so the run cannot end | Ask what they will be able to say afterwards that they cannot say now, and write that as the card's second line |

The run is done when the question is answered and recorded. It is not done when the prototype is
good: a beautiful variant set with the decision still open is a failed run, and the tell is a report
that describes the artifact instead of stating the verdict.

## 2. Fork on the question: look, or logic

| The question | The artifact |
|---|---|
| "What should this look like / how should this be laid out?" | Several structurally different variants rendered on one real route, switched by a URL param and a floating bar |
| "Does this logic, state model, or data shape hold up?" | One self-contained HTML file over a pure module: free-play buttons plus tabbed guided walkthroughs, full state rendered after every click |

The two branches produce very different artifacts, and getting the fork wrong wastes the whole
prototype. If the question is genuinely ambiguous and the user is not reachable, default to whichever
branch better matches the surrounding code (a backend module goes to logic, a page or component goes
to look) and state that assumption at the top of the artifact.

Once the branch is picked, read `artifacts.md` beside this file for that branch's recipe: the
switcher spec and its production gate, the four logic shapes, the demo page's layout, and the
per-branch anti-patterns.

## 3. Diverge before you converge

Several genuinely different attempts, not one attempt iterated. Before generating them, enter
`/orchestrating-agents` and apply its verbalized-candidates rule: one generator producing k
candidates each with a stated probability, at least one tail candidate under roughly 0.10. Asking k
times independently, or asking once for "a few options", returns the model's one modal answer wearing
three hats, which is exactly the failure a variant set exists to escape.

Default to 3 variants. More than 5 stops being radically different and starts being noise, so cap
there.

The bar is structural difference: different layout, different information hierarchy, different
primary affordance, not just different colours. Three slightly-tweaked card grids is not a UI
prototype, it is wallpaper. If two drafts come out too similar, redo one with explicit "do not use a
card grid" guidance. The logic branch has the same bar and forgets it more often: three reducers with
the same state tree are one candidate, and the tail candidate there is usually the shape nobody
proposed (an explicit machine where everyone assumed a flag, a set of pure functions where everyone
assumed ongoing state).

## 4. Judge it in context, one zoom per round

A prototype is much easier to judge when it is butting up against the rest of the app: real header,
real sidebar, real data, real density. A throwaway route on its own is a vacuum, where every variant
looks fine. Host the variants inside the existing page whenever there is a plausible one, and only
build a throwaway route when the thing genuinely has no nearby home. An empty route hides the
problems a populated one would expose.

Zoom one level per round, and keep rendering inside the whole. Round one varies the overall shape;
the winner becomes the frame round two varies component groups inside; round three varies a single
component inside that. The variants stay at three because the question narrows, and every round is
still judged against the real surrounding surface rather than in isolation. This is the community
variant's insight (WillNessAI's `grill-design`, built on the upstream skill), and it is what keeps a
detailed surface tractable without ever showing the user a component on a blank page.

## 5. The picker, and what the losers leave behind

Hand over the URL and the variant keys, or the file, and let the user drive it. The pick is rarely
"variant B": the interesting feedback is "I want the header from B with the sidebar from C", and that
is the actual design they want. Treat every round as one winner plus a named list of what each
runner-up did better, folded into the winner before the next round starts. `/orchestrating-agents`'
judge panel is the same shape.

A runner-up's better idea that was noticed and not written down is lost by the next round. Each round
closes with one line per losing variant: what it did better, and why it still lost. That list is part
of the exit artifact, not chat.

## 6. The exit - what crosses into the real work

The leverage is here, not in the demo. Three things cross the boundary; everything else is thrown
away.

| What crosses | Where it lands |
|---|---|
| The verdict: the decision, which option won, and why | One line appended to the work-item's `decisions.md` (`.better-dev/bin/bd-mem ledger put <work-item> decisions.md`) |
| The constraints and the discarded directions: each runner-up, what it did better, why it lost | The same record, under the verdict, so the next reader does not re-propose a direction already killed |
| A decision-rich snippet - a type, a schema, a reducer, a state machine - only when it pins the decision more precisely than prose can | Inlined in the contract and marked as prototype-derived, trimmed to the decision (`/plan-grill` step 4's exception) |

Thrown away: the page shell, the switcher, the losing variants, and every line written under
prototype rules. The winner is rewritten properly when it is folded in, because it was written with
no tests and minimal error handling, and promoting the variant code directly is how throwaway code
becomes production without anyone deciding that it should. On the logic branch the pure module is the
one exception, and only because it was written to be liftable: the shell around it still goes.

When re-deriving the set would cost real time - a multi-variant UI set is the usual case - park it
rather than deleting it: commit the full set onto a throwaway `prototype/<slug>` branch, off the
integration branch, and record that branch pointer beside the verdict. Variant components and a
switcher left in the main line rot fast and confuse the next reader.

The working tree is clean of prototype code before the calling skill's gate closes. A prototype still
sitting in the tree at contract seal is an unfinished decision.

**The boundary is checked, not assumed.** The stage that picks this up - `/plan-grill` sealing a
contract, `/groundwork` freezing a foundation, `/autonomous-loop` building the thing - confirms three
things before it proceeds: the verdict line exists in the record, the tree carries no prototype code
(parked or deleted), and any inlined snippet is marked prototype-derived. It hydrates from the record
itself, re-reading `decisions.md` rather than trusting this run's summary. A failed check stops that
stage and names which of the three is missing, rather than building on a decision nobody wrote down.

## Rules that hold on both branches

- **Throwaway from day one, and clearly marked.** Put the prototype next to the module or page it is
  prototyping for so the context is obvious, and name it so a casual reader can see it is a
  prototype. For a throwaway route, obey whatever routing convention the project already uses; do not
  invent a new top-level structure.
- **Trivial to run.** One command in the project's task runner, or one double-click on a single HTML
  file. No thinking required to start it, or the person whose answer you need never opens it.
- **No persistence by default.** State lives in memory. Persistence is the thing the prototype is
  checking, not something it should depend on. If the question is explicitly about a database, use a
  scratch one with a clear "PROTOTYPE, wipe me" name.
- **Skip the polish.** No tests, no error handling beyond what makes it runnable, no abstractions. A
  prototype that needs tests is no longer a prototype.
- **Surface the state.** After every action, and on every variant switch, render the full relevant
  state so the change is visible.

Close out in one line: record the keyed lesson if the run taught one that outlives this decision
(`.better-dev/bin/bd-mem learn "<lesson>" <0..1> "<key>"`), else say `no durable lesson` and why. The
verdict itself is not the lesson; it already lives in `decisions.md`.
