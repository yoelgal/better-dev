---
name: graphify-wrapper-status
description: Use when someone wants to see the registered domain indexes and their freshness for this worktree - "graphify status", "which graphs are built", "are my indexes stale".
allowed-tools:
  - Bash
---

# /graphify-wrapper-status

```bash
. .better-dev/bin/bd-gfx 2>/dev/null || . "${CLAUDE_PLUGIN_ROOT}/scripts/bd-gfx"
reg=$(gfx_registry)
[ -f "$reg" ] || { echo "not set up - run /graphify-wrapper-setup"; exit 0; }

this=$(gfx_this_worktree)
echo "repo_key   : $(gfx_repo_key)"
echo "backend    : $(gfx_backend)"
echo "this wt    : $this"
echo "graphs     : $(gfx_out_dir)"
echo "registry   : $reg"
echo

head=$(git -C "$this" rev-parse HEAD 2>/dev/null)
printf '%-14s %-28s %-9s %-8s %-8s %-8s %s\n' INDEX PATH SEMANTIC GRAPH FRESH RENDER BUILT
for name in $(gfx_index_names); do
  idx_path=$(gfx_index_field "$name" path)
  sem=$(gfx_index_field "$name" semantic)
  out="$(gfx_out_dir "$name")"
  g="$out/graph.json"
  if [ -f "$g" ]; then
    read -r nodes built <<<"$(jq -r '"\(.nodes|length) \(.built_at_commit // "?")"' "$g" 2>/dev/null)"
    ts=$(date -r "$g" '+%Y-%m-%d %H:%M' 2>/dev/null)
    if [ -z "$head" ] || [ "$built" = "?" ]; then fresh="?"
    elif [ "$built" = "$head" ]; then fresh="current"
    else fresh="behind"; fi
    # Judge the OLDEST page present: graph.html regenerates with every update,
    # so checking it alone would mask a stale atlas (the page NOT on the glob).
    render="absent"
    for cand in "$out/graph.html" "$out/${name}-callflow.html" "$out/${name}-atlas.html"; do
      [ -f "$cand" ] || continue
      if [ "$g" -nt "$cand" ] || [ "$fresh" = "behind" ]; then render="stale"; break
      else render="fresh"; fi
    done
    printf '%-14s %-28s %-9s %-8s %-8s %-8s %s\n' "$name" "$idx_path" "$sem" "${nodes}n" "$fresh" "$render" "$ts"
  else
    printf '%-14s %-28s %-9s %-8s %-8s %-8s %s\n' "$name" "$idx_path" "$sem" "-" "-" "-" "(not built here)"
  fi
done
```

- `(not built here)` → run `/graphify-wrapper-sync <name>`, or just ask a
  question: `/graphify-wrapper-query` builds a missing graph on first use. Graphs
  live under `graphs:` above, outside this or any repo, keyed per worktree - a
  fresh worktree starts with none.
- `FRESH = behind` → the graph's `built_at_commit` is behind HEAD. A
  SessionStart hook auto-runs an AST `graphify update` on drifted, affected
  domains; or run `/graphify-wrapper-sync <name>` now. The semantic layer isn't
  auto-refreshed - use `--semantic` when you need fresh community naming.
- `RENDER` → whether the rendered pages (`graph.html`, `<name>-callflow.html`,
  `<name>-atlas.html`) beside the graph are current: `absent` (none rendered
  yet - run `/graphify-wrapper-sync <name>` or a one-time `graphify export`),
  `stale` (ANY present page is older than graph.json, or the graph itself sits
  `behind` HEAD - the atlas is the usual culprit, since only `*-callflow.html`
  rides graphify's auto-regen glob), or `fresh`. Computed here at read time
  from page mtimes and graph.json's `built_at_commit`, never stored - nothing
  here accumulates.
