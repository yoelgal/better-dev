# When a built graph is worth querying

Three questions a sync can answer that the graph itself will not volunteer: is it current, does
it cover this repo's wiring, and what its edges are worth. Load this when a freshness signal, a
thin traversal result, or a benefit claim needs a number behind it.

## Why a domain can report `behind` forever

Two different predicates both call themselves staleness, and the wrapper's is the wider one.
`gfx_graph_state` (and the SessionStart refresh hook) treat "the commit range from
`built_at_commit` to HEAD touched this domain" as stale. `graphify update` treats "the extraction
changed graph topology" as stale, and when it did not, it prints
`No code-graph topology changes detected; outputs left untouched` and returns before
`built_at_commit` is rewritten (`graphify/watch.py:1583`, the write is at `:1674`). Upstream tests
that early return, so it is intended.

The consequence is a signal that cannot clear itself: any commit range that moves files without
changing topology leaves the domain `behind` for good, the refresh hook re-extracts it at every
session start for no state change, and `/graphify-wrapper-status` computes `RENDER` as stale off
the same reading. Measured on this repo: 25 commits and 339 changed files of drift, a hook run
that reached `graphify update`, and a stamp that did not move.

A build that exits 0 has re-extracted every drifted file, so the graph describes HEAD whichever
predicate fired, and the sync loop stamps it there. The SessionStart refresh hook does not, so a
domain it refreshed still reads `behind`. Stamp that one by hand, same-dir temp then `mv` so a
killed write leaves no torn `graph.json`:

```bash
out=$(gfx_out_dir <name>); tmp=$(mktemp "$out/.stamp.XXXXXX")
jq --arg h "$(git -C "$(gfx_this_worktree)" rev-parse HEAD)" '.built_at_commit=$h' \
  "$out/graph.json" > "$tmp" && mv "$tmp" "$out/graph.json"
```

`graphify check-update` does not answer this: it only reports a pending *semantic* re-extraction
flag for non-code changes (`graphify/watch.py:1818`).

## Does this domain's graph cover the repo's wiring

The two verbs other skills reach for (`--affected` for a blast radius, `--path` between two
symbols) are only as good as the share of the real change surface that carries a traversal-bearing
edge. Measure it, per domain, in under a second:

```bash
G=$(gfx_out_dir <name>)/graph.json
jq -r '.nodes[]|select(.source_file!=null)|"\(.id)\t\(.source_file)"' "$G" | sort > /tmp/idf
jq -r '.links[]|select((.relation//"")|test("^(calls|indirect_call|method|inherits|re_exports|imports|imports_from)$"))|.source,.target' "$G" | sort -u > /tmp/navids
join -t$'\t' /tmp/navids /tmp/idf | cut -f2 | sort -u > /tmp/navfiles
git diff --name-only HEAD~20..HEAD | sort -u > /tmp/chg
tot=$(wc -l < /tmp/chg); cov=$(comm -12 /tmp/chg /tmp/navfiles | wc -l)
awk -v c="$cov" -v t="$tot" 'BEGIN{p=100*c/t; printf "ripple coverage: %.1f%% (%d/%d) -> %s\n", p, c, t, (p>=70?"PASS":"FAIL")}'
```

The relation filter is the load-bearing part: counting `contains`, `defines` and doc-to-doc
`references` too takes this repo from 40.0 percent to 84.4 percent while answering nothing about
blast radius, because a markdown link makes almost every doc look covered.

At or above 70 percent, `--affected` sees more of the change surface than it misses. Below it, the
graph answers blast-radius questions worse than `grep` and does so silently, so the honest move is
to say the coverage number and grep instead, and to re-carve or drop the domain in
`/graphify-wrapper-map`. A repo can pass on `services/backend` and fail on `docs`, which is the
correct answer in both places.

## What the edges and the benefit claim are worth

Every edge carries a `confidence` of `EXTRACTED` (explicit in the source), `INFERRED` (graphify
resolved it), or `AMBIGUOUS` (resolved but uncertain). `AMBIGUOUS` is emitted only by the LLM
semantic pass (`graphify/llm.py:457`; zero occurrences across the tree-sitter extractors), so an
AST-only build can never produce one: measured here, 3682 `EXTRACTED` and 17 `INFERRED` out of
3699 edges. That is a strong trust property and a narrow one - the advertised
"explicit versus guessed" nuance lives on the semantic layer.

Upstream's own code-intelligence result is +11.2 points of key-fact coverage over a grep-and-read
baseline on a 1M-LOC repo, on a graded set of **six** questions (`BENCHMARKS.md:145`). One question
is worth 16.7 points there, so the lift sits inside a single-question swing: quote it as the only
measurement that exists, never as an established benefit. `graphify benchmark`'s
"77.8x fewer tokens" is not evidence at all - its corpus denominator is `nodes * 50`
(`graphify/benchmark.py:106`), so the ratio is arithmetic on the node count and can never fail.

Three classes where the graph genuinely beats grep plus a language server, and they are what the
consumer skills reach for:

- **Reverse traversal of a blast radius.** `affected` walks a fixed relation set at depth 2, which
  follows an aliased import, a re-export, and a lazy `require(...)` inside a function body. Text
  search reaches none of those.
- **Shortest path between two named things.** A graph operation with no grep formulation.
- **Hub ranking by degree over the whole graph.** A sweep approximates it by reading.

Compression is not one of them on a small corpus: upstream measures `~1x` on a six-file library and
says so, calling the value "structural clarity, not compression" (`docs/how-it-works.md:63`).
