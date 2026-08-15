# Draw it, when the thing that lost them is a shape

Prose is the wrong instrument for some questions, and re-pitching in shorter prose does not fix an
instrument mismatch - it just says the same wrong-shaped thing again. When the gap is about a shape,
draw it.

## The trigger test

Draw when the question is about **structure** - what talks to what, what crosses a boundary, what
happens in what order, who holds what, where a thing sits in a larger whole. In practice these arrive
as: *what does X actually do here*, *why do we need X at all*, *what's the difference between X and
Y*, *what happens when someone does Z*, *where does the data go*.

The worked case: someone building on AWS KMS asked what KMS's role was. The answer in prose is a
paragraph about envelope encryption that has to hold four moving parts in the reader's head at once.
The answer as a picture is four boxes and three labelled arrows: the app asks KMS to unwrap a data
key, KMS returns the plaintext key, the app encrypts with it, the wrapped key sits beside the
ciphertext. The prose has to be decoded into that picture before it can be understood - so hand over
the picture.

Do **not** draw when the answer is a value, a name, a yes/no, or one causal step ("it failed because
the token expired"). A diagram of one arrow is a slower sentence. Do not draw a picture that only
restates a list you already rendered; a list of five independent items is a list. And never let the
diagram replace the answer - it sits beside two or three plain sentences, never instead of them.

## What earns a picture

- **Roles in a flow** - a component whose purpose is unclear, drawn by what passes through it.
- **Boundaries** - a trust, network, or process boundary, and what crosses it in each direction. Most
  "why do we need this service" questions are boundary questions.
- **Ordering and dependency** - waves, stages, what gates what. A carve's dependency edges are far
  easier to judge wrong from a picture than from a table.
- **State over time** - what a request or record looks like at each hop.

## How to draw it

A fenced ```mermaid block where the host renders one, plain ASCII where it does not - either way it
lands in the message, not in a file the operator has to open. `flowchart` for structure and
boundaries, `sequenceDiagram` for who-asks-whom-in-what-order, and little else; an exotic diagram type
spends the reader's attention on the notation. If the host ships a diagramming or artifact skill, and
the picture is worth a page of its own, compose it (`/tool-sourcing` finds one) - but the default is
inline, because a link is one more thing to click before the answer arrives.

Three rules carry most of the value:

- **Label every arrow with what moves along it** - "wrapped data key", "signed JWT", not a bare line.
  An unlabelled arrow means "these are related somehow", which is what the reader already knew.
- **Draw the mechanism, not the org chart.** Boxes named for teams, layers, or products explain
  nothing; boxes named for the thing that acts, arrows named for the thing that moves, explain it.
- **Seven nodes, hard.** Past that, split into two pictures or pick the sub-question that actually
  lost them. A diagram that needs study is prose with extra steps.

## Ask what did not land, if it is genuinely unclear

Sometimes the question is broad enough that any picture is a guess ("I don't get the auth setup"). One
short question - which part, the login flow or where the session lives - buys a diagram that hits.
Guessing wrong costs a whole second explanation.

## Reaching this from the build skills

The trigger is a confused question, not a slash command, so it fires wherever one lands: mid-grill in
`/plan-grill` or `/groundwork` when the operator questions a component's role, mid-loop when a
reported symptom needs a flow to be explainable, and in `/wait-what` when a reply did not land. A
question about a component's role during a grill is exactly the case this exists for - it is cheaper
to draw the shape than to discover at review that the contract encoded a misunderstanding.
