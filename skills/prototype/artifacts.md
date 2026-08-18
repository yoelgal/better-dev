# Branch recipes

Read the row for the branch the fork picked. Both recipes assume the decision card from step 1 is
already written at the top of the artifact.

## Look branch: variants on a real route

### Where the variants live

Prefer mounting them **inside an existing page**. The route already exists, the variants render on
that same route gated by a `?variant=` search param, and the existing data fetching, params, and auth
all stay: only the rendering swaps. Something that has no page yet but would naturally live inside
one - a new section of the dashboard, a new card on the settings screen, a new step in an existing
flow - is still this case. Mount the variants inside the host page.

Build a **throwaway route** only when the thing genuinely has no existing page to live inside: an
entirely new top-level surface, or a flow that cannot be embedded anywhere sensible. Follow whatever
routing convention the project already uses, and put the word `prototype` in the path or filename.
Before committing to it, sanity-check that there is really no existing page this could sit in.

### Wiring

One switcher component on the route, with the data fetching kept above it so only the rendered
subtree changes per variant:

```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

Give each variant a clear exported name (`VariantA`, `VariantB`, `VariantC`) and hold each to the
page's purpose, the data it actually has access to, and the project's existing component library or
styling system.

### The switcher

A small fixed-position bar at the bottom-centre: a left arrow that cycles to the previous variant
(wrapping), a label showing the current key and its name (`B - Sidebar layout`), and a right arrow
that cycles forward (wrapping). Four behaviours matter:

- Clicking an arrow updates the URL search param through the framework's own router, so a variant is
  shareable and survives a reload.
- The left and right arrow keys cycle too, except when an `<input>`, `<textarea>`, or
  `[contenteditable]` has focus.
- The bar is visually distinct from the page - a high-contrast pill, a shadow - so it is obviously
  not part of the design being evaluated.
- It is hidden in production builds. Gate it on `process.env.NODE_ENV !== 'production'` or the
  project's equivalent, so a stray prototype merge cannot ship the bar to users.

When the design has meaningful states - an inbox full versus empty, a form mid-error - add buttons to
the bar that toggle the mock between them. A variant judged only in its happy state is judged in a
smaller vacuum than a variant judged on a blank route.

Keep the switcher in one shared component wherever shared UI lives, so both placements reuse it.

### Anti-patterns

- **Variants that differ only in colour or copy.** That is a tweak, not a prototype. Real variants
  disagree about structure.
- **Sharing too much code between variants.** A shared `<Header>` is fine; a shared `<Layout>`
  defeats the point. Each variant should be free to throw out the layout.
- **Wiring variants to real mutations.** Read-only prototypes are fine. If a variant needs to mutate,
  point it at a stub: the question is what this should look like, not whether the backend works.
- **Promoting the prototype directly to production.** The variant code was written under prototype
  constraints. Rewrite it properly when folding it in.

## Logic branch: one shareable HTML file

One self-contained file, plain HTML/CSS/JS, everything inline, so it opens by double-click and
survives being emailed around. No framework, no bundler, no server: a React app or a dev server
defeats "shareable". Because there is nothing to install, it can go to a designer, a PM, or a domain
expert, so it speaks their language rather than the code's.

### The pure module is the part that is not throwaway

Put the logic answering the question in a single `<script>` block, written as a small pure module
that could be lifted out and dropped into the real codebase later. The page around it is throwaway;
this module is not. Four shapes are worth considering, and the pick is made by the question, not by
whichever is easiest to wire to a page:

| Shape | Fits when |
|---|---|
| A pure reducer, `(state, action) => state` | Actions are discrete events and state is a single value |
| An explicit state machine | "Which actions are even legal right now" is part of the question |
| A small set of pure functions over a plain data type | There is no implicit current state, just transformations |
| A class or module with a clear method surface | The logic genuinely owns ongoing internal state |

Keep it pure: no DOM, no `document`, no button handlers reaching inside it. The page calls into the
module and nothing flows the other way. That purity is what lets the validated model lift into the
real code once the question is answered.

### The page, top to bottom

1. **Title and one-line explanation** of what this demo lets you explore: the decision card's
   question, in plain words.
2. **Current state**, the full relevant state rendered as a readable panel with labelled fields
   rather than a raw JSON dump, re-rendered after every click. Where it helps, call out what just
   changed.
3. **Free-play buttons**, one per action, always available, so anyone can poke at the model in any
   order.
4. **Guided walkthroughs**, a set of scenarios one per tab. Each tab holds a short plain-language
   description of the situation it sets up and what to watch for, and underneath it the ordered
   buttons to press. Each step is a real button: clicking it performs that action and moves to the
   next step. Opening a tab resets to a known initial state, so a scenario runs identically however
   often it is replayed.

Choose scenarios that demonstrate the awkward cases: the happy path, a tricky edge case, and an
attempt at something that should be illegal. Every label is in domain language, not code, so the
buttons and the state read like the business rather than like the reducer.

Keep it beautiful but restrained: clean typography, generous spacing, one accent colour. No
animations and no gimmicks, nothing that competes with the state and the buttons.

The moments worth waiting for are "wait, that should not be possible" and "huh, I assumed X would be
different". Those are bugs in the idea, which is the whole point. If they want a new action or a new
scenario, add it.

### Anti-patterns

- **Do not add tests.** A prototype that needs tests is no longer a prototype.
- **Do not wire it to the real database.** In-memory state, unless the question is specifically about
  persistence.
- **Do not generalise.** No "what if we wanted to support X later". The prototype answers one
  question.
- **Do not blur the logic and the page together.** If the pure module references the DOM,
  `document`, or button handlers, it is no longer liftable. The page is a thin shell over it.
- **Do not ship the HTML shell into production.** The page is optimised for being clicked through by
  hand; the module behind it is the bit worth keeping.
