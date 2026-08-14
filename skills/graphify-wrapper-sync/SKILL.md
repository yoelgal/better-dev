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
# The wired path first, the plugin dir as the dev/unwired fallback - the same split as the
# bd-gfx source line above. `better-dev/scripts/bd-atlas` exists only in the source repo.
atlas=.better-dev/bin/bd-atlas; [ -x "$atlas" ] || atlas="${CLAUDE_PLUGIN_ROOT}/scripts/bd-atlas"
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
  # codebase forward, so the graph and every cache go - but `memory/` and the
  # operator-authored `flows.json` stay, which
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

  # bd-atlas isn't on graphify's auto-regen glob (deliberately) - re-render it
  # here or the atlas page goes silently stale after this sync. Unconditional, unlike
  # the callflow export: the page is a pure function of the graph (0.11s on a
  # 1929-node graph), so re-rendering is always safe and this is also what creates
  # the first one. if/fi, not `&&`, so the loop's status stays the build's.
  if "$atlas" "$out/graph.json" >/dev/null; then
    echo "[$name] atlas page rendered"
  else
    echo "[$name] atlas render failed - the atlas page may be stale"
  fi
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

## Report

Two lines per index, page first - the page is what a human opens, the JSON is
what an agent reads - with the action taken, node+edge counts, and the
cross-subtree edge count on the second line:

    [api] page: ~/.claude/graphify/acme__mono/worktrees/9f2c1a7b40de/api/graph.html (+ api-callflow.html, api-atlas.html)
    [api] refresh, AST - 812 nodes / 3104 edges - ~/.claude/graphify/acme__mono/worktrees/9f2c1a7b40de/api/graph.json - cross-subtree edges: 1

graph.html and the callflow page are serverless single-file pages whose
renderer is fetched from a CDN on first open - call them that, never
self-contained: that word is earned only by a page that opens with the
network disabled, and graphify's own output doesn't (bd-atlas does).

For a domain spanning several subtrees that count is the carve check
`/graphify-wrapper-map` deferred here: zero means the carve bought no
cross-subtree edges and a split would cost nothing - say so plainly. A domain
whose build failed has no count: report the failure, never a stale number.
