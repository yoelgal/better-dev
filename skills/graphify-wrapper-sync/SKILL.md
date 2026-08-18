---
name: graphify-wrapper-sync
description: Use when a worktree's domain graphs need building or refreshing - "sync the index", "rebuild the graph", "refresh graphify" - AST-only by default, --semantic for the full extract.
argument-hint: "[<name> - defaults to all registered] [--semantic]"
allowed-tools:
  - Bash
---

# /graphify-wrapper-sync

This is the only thing that builds graphs.

```bash
. .better-dev/bin/bd-gfx 2>/dev/null || . "${CLAUDE_PLUGIN_ROOT}/scripts/bd-gfx"
reg=$(gfx_registry)
[ -f "$reg" ] || { echo "run /graphify-wrapper-setup first"; exit 1; }
this=$(gfx_this_worktree)
sem=false; case "$*" in *--semantic*) sem=true;; esac
target="${1:-}"; case "$target" in --*) target="";; esac   # ignore flags as name
names=$(if [ -n "$target" ]; then echo "$target"; else gfx_index_names; fi)
[ -n "$names" ] || { echo "no indexes registered - run /graphify-wrapper-index"; exit 1; }
```

## Per-index loop

For each name, resolve its subtree and its output dir, then build. The rule:

- **Refresh** if a graph already exists at `gfx_out_dir <name>`.
- **Build from scratch** otherwise.

Output never lands in the tree being indexed: `gfx_out_dir` returns an absolute
path under this repo's central home, keyed per worktree and per domain, and it is
exported as `GRAPHIFY_OUT` **on each build command**. An absolute `GRAPHIFY_OUT`
is a single global destination, so exporting it once for the shell would collapse
every domain and every repo into one dir. Never set it outside the loop.

```bash
backend=$(gfx_backend)
# Image/asset files graphify would otherwise read as text "docs" - token noise
# with no architectural signal, and the source of oversized chunks that time out.
exc_args=(); while IFS= read -r p; do [ -n "$p" ] && exc_args+=(--exclude "$p"); done < <(gfx_extract_excludes)
for name in $names; do
  idx_path=$(gfx_index_field "$name" path)
  [ -n "$idx_path" ] || { echo "skip '$name': not registered"; continue; }
  want_sem=$(gfx_index_field "$name" semantic)
  if [ "$sem" = true ] || [ "$want_sem" = true ]; then do_sem=true; else do_sem=false; fi
  dst="$this/$idx_path"; out=$(gfx_out_dir "$name") || continue
  [ -d "$dst" ] || { echo "skip '$name': $idx_path absent in this worktree"; continue; }

  # Repair a torn graph.json (a killed prior build) so this run treats the domain
  # as missing rather than complete - graphify's shrink guard would otherwise
  # refuse `update` on an unparsable graph.
  if [ -f "$out/graph.json" ] && ! jq -e . "$out/graph.json" >/dev/null 2>&1; then
    echo "[$name] trashing unparsable graph.json (will rebuild)"
    trash="$out/.trash-$(date +%s)"; mkdir -p "$trash"
    mv "$out/graph.json" "$trash/"  # rm on a just-created path trips destructive-action gates on hardened hosts
  # A graph left by a DIFFERENT tree at this worktree path parses fine, so only
  # provenance catches it (state 2). Refreshing on top of one would carry a dead
  # codebase forward, so the graph and every cache go - but `memory/` stays, which
  # is why this calls the shared helper rather than its own `rm -rf`.
  elif [ -f "$out/graph.json" ]; then
    st=0; gfx_graph_state "$out/graph.json" "$idx_path" || st=$?
    if [ "$st" = 2 ]; then
      echo "[$name] discarding a graph built by a different tree at this path (will rebuild)"
      gfx_discard_graph "$out" || { echo "[$name] discard failed - skipping"; continue; }
    fi
  fi

  if [ "$do_sem" = true ]; then
    # claude-cli defaults to Opus; pin the registry model (sonnet) for extraction.
    # Its subprocess timeout is a fixed 600s, so cap chunk size for this backend.
    budget_args=()
    if [ "$backend" = claude-cli ]; then
      export GRAPHIFY_CLAUDE_CLI_MODEL="$(gfx_cli_model)"
      budget_args=(--token-budget "$(gfx_cli_token_budget)")
    fi
    echo "[$name] semantic extract ($backend${GRAPHIFY_CLAUDE_CLI_MODEL:+/$GRAPHIFY_CLAUDE_CLI_MODEL}) on $idx_path -> $out"
    GRAPHIFY_OUT="$out" graphify extract "$dst" --backend "$backend" "${exc_args[@]}" "${budget_args[@]}"; built=$?
  else
    echo "[$name] AST update on $idx_path -> $out"
    GRAPHIFY_OUT="$out" graphify update "$dst"; built=$?
  fi

  # Check the carve against the graph just built, not against the proposal that
  # recommended it: how many edges cross the domain's own top-level subtrees. Only
  # when the build succeeded - a failed one leaves the stale graph in place, and
  # it parses, so a count off it reads as a fresh measurement.
  [ "$built" = 0 ] || { echo "[$name] build failed (rc=$built) - no carve check"; continue; }
  cross=$(gfx_cross_edges "$out/graph.json") && echo "[$name] cross-subtree edges: $cross"

  # `graphify update` returns before re-stamping built_at_commit when a commit range
  # changed no graph topology (watch.py:1583), so a domain that keeps drifting without
  # topology changes reads `behind` forever and the refresh hook re-extracts it every
  # session for no state change. A build that exited 0 re-extracted every drifted file,
  # so the graph does describe HEAD: stamp it, same-dir temp then mv, so a killed write
  # never leaves a torn graph.json behind.
  stamp=$(mktemp "$out/.stamp.XXXXXX")
  if jq --arg h "$(git -C "$this" rev-parse HEAD)" '.built_at_commit=$h' \
       "$out/graph.json" > "$stamp"; then mv "$stamp" "$out/graph.json"
  else rm -f "$stamp"; echo "[$name] stamp failed - freshness will read behind"; fi

  # One-time callflow page, default filename only - never --output. The default
  # name sits on graphify's *-callflow.html auto-regen glob, so every later sync
  # refreshes the page for free; a custom name is correct once, then silently stale.
  if ! ls "$out"/*-callflow.html >/dev/null 2>&1; then
    if GRAPHIFY_OUT="$out" graphify export callflow-html --graph "$out/graph.json"; then
      echo "[$name] callflow page created"
    else
      echo "[$name] callflow export refused (semantic-only build, or zero-node/single-community graph) - page skipped"
    fi
  fi

  # The atlas page and flows.json lost their producer (D35) and sit on no regen
  # glob, so a copy left by an older sync would outlive every refresh and read as
  # current. Sweep the orphans here, on the sync everyone already runs.
  rm -f "$out"/*-atlas.html "$out"/flows.json
done
```

## Notes

- `update` is AST-only and free; `extract` runs the LLM backend. `claude-cli` is
  serial - a large `--semantic` domain is slow and consumes plan quota.
- `extract` sends docs **and images** to the LLM as text; SVG markup and decoded
  binary bytes are token noise and the cause of chunks that time out, so semantic
  builds drop image/asset globs (`gfx_extract_excludes`; override per-repo with an
  `.extract_excludes` array in the registry, which replaces the default set).
- `claude-cli`'s per-chunk subprocess timeout is a hardcoded 600s (`--api-timeout`
  only affects HTTP backends), so semantic builds on it cap `--token-budget`
  (`gfx_cli_token_budget`, default 20000; override with `.cli_token_budget` in the
  registry).
- A semantic build is reconciled by AST `update` on later plain syncs; the
  named/semantic layer goes stale until the next `--semantic` run. Re-run with
  `--semantic` when you need fresh community naming.
- Graphs live outside the repo entirely, under `~/.claude/graphify/<repo key>/`,
  so a build leaves the indexed tree byte-unchanged and there is nothing here to
  commit or ignore. A fresh worktree has no graph until its first build.

## Freshness

A graph answers about the commit it was built at, never about the working tree, so a domain nobody
re-syncs hands back a map that is well-structured and wrong - the loudest objection graphify gets
in public, and this skill is the whole answer to it. Name the build commit with every report, and
sync a domain under active change before anything queries it.

One predicate gap sits under that. `graphify update` returns early when a commit range changed no
graph topology, without re-stamping `built_at_commit`, so a graph that does describe HEAD can
report `behind` indefinitely while the refresh hook re-extracts it every session for no state
change. The loop above closes that on this path by stamping HEAD after a build that exits 0; a
domain the SessionStart hook refreshed is still unstamped. Load `graph-trust.md` for the
one-command fix in that case, and for the per-domain coverage check that decides whether a domain's
graph is worth querying at all - run that check on a domain's first build.

## Report

Two lines per index, page first - the page is what a human opens, the JSON is
what an agent reads - with the action taken, node+edge counts, and the cross-subtree edge count
plus the edge-confidence split on the second line:

    [api] page: ~/.claude/graphify/acme__mono/worktrees/9f2c1a7b40de/api/graph.html (+ api-callflow.html)
    [api] refresh, AST - 812 nodes / 3104 edges - 3091 EXTRACTED / 13 INFERRED / 0 AMBIGUOUS - ~/.claude/graphify/acme__mono/worktrees/9f2c1a7b40de/api/graph.json - cross-subtree edges: 1

The split comes from `jq -r '.links[]|.confidence' "$out/graph.json" | sort | uniq -c`. An AST
build is near-fully `EXTRACTED`, which is what makes its edges facts rather than leads; `INFERRED`
climbing, or any `AMBIGUOUS` at all (only a `--semantic` build emits that tag), is the cue that
answers off this graph need confirming at `file:line`.

graph.html and the callflow page are serverless single-file pages whose
renderer is fetched from a CDN on first open - call them that, never
self-contained: that word is earned only by a page that opens with the
network disabled, and graphify's own output doesn't.

For a domain spanning several subtrees that count is the carve check
`/graphify-wrapper-map` deferred here: zero means the carve bought no
cross-subtree edges and a split would cost nothing - say so plainly. A domain
whose build failed has no count: report the failure, never a stale number.
