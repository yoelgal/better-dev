---
name: graphify-wrapper-setup
description: Use when a repo or machine needs graphify-wrapper wired up for the first time - installing the graphify CLI, seeding the per-repo registry, and picking a semantic backend - the one-time "set up graphify" step before any mapping or indexing.
allowed-tools:
  - Bash
  - Read
---

# /graphify-wrapper-setup

Make a repo ready for graphify-wrapper. Idempotent - safe to re-run.

```bash
. .better-dev/bin/bd-gfx 2>/dev/null || . "${CLAUDE_PLUGIN_ROOT}/scripts/bd-gfx"
```

## 1. Ensure the CLI

The PyPI package is `graphifyy` (double-y); the binary is `graphify`. Pin the
version: below the 0.9.18 floor graph writes are non-atomic (the refresh hook's
own floor is far older - `built_at_commit`, 0.7.0). `--default-index` is
best-effort and bounds nothing: it sets uv's **lowest-priority** index, so it
turns back a `UV_DEFAULT_INDEX` / `UV_INDEX_URL` redirect of the base index and
nothing more. `UV_INDEX` and `UV_EXTRA_INDEX_URL` add indexes uv searches first
and they still decide whose build backend runs here (measured, uv 0.11.7).

```bash
# --with matplotlib: svg export is the only renderer-free visual and ImportErrors without it.
floor=0.9.18; idx=(--default-index https://pypi.org/simple); withs=(--with matplotlib)
gfxver() { graphify --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1; }
gfxlow() { [ -z "$1" ] || [ "$(printf '%s\n%s\n' "$floor" "$1" | sort -V | head -1)" != "$floor" ]; }
if command -v graphify >/dev/null; then echo "graphifyy: already present"
else uv tool install "graphifyy>=$floor" "${withs[@]}" "${idx[@]}" && echo "graphifyy: INSTALLED"; fi
have=$(gfxver); echo "graphify ${have:-unknown}"
if ! command -v graphify >/dev/null; then echo "graphifyy: NOT ON PATH"
elif gfxlow "$have"; then
  uv tool upgrade graphifyy "${idx[@]}" || true; now=$(gfxver)
  [ "$now" = "$have" ] || echo "graphifyy: UPGRADED from $have to $now"
  if gfxlow "$now"; then echo "graphifyy: BELOW FLOOR $floor (still ${now:-unknown})"; fi
fi
```

`uv tool upgrade` has no `--with` flag; it re-reads the `--with matplotlib`
recorded at install time from the tool's own receipt, so it stays consistent
without repeating it. `uv tool upgrade` exits 0 on a no-op, so the announce is
the observed version change, never the exit code. Two stops, and both skip
steps 2-3. `BELOW FLOOR` means the upgrade did not clear it (an exact `==` pin
does that): hand the operator `uv tool install 'graphifyy@latest' --with
matplotlib`. `NOT ON PATH` means the version was
never read, because the binary uv installed is not resolvable here - a re-install
cannot fix that, so hand `uv tool update-shell` instead (uv warns about this on a
fresh machine). No `uv` at all: stop and say `brew install uv` - never a global
`pip install`.

## 2. Init the per-repo registry

The central home holds the registry and every graph this repo builds. Keyed by
git identity, so every worktree of this repo shares it, and graphs sit under a
per-worktree key inside it (`gfx_out_dir`) - outside the tree they index, which
is why no gitignore of any kind is needed.

```bash
# gfx_home refuses (printing why) where it would land inside the tree being
# indexed - a repo checked out at $HOME. Stop there rather than writing into it.
home=$(gfx_home) && reg=$(gfx_registry) || exit 1
mkdir -p "$home"
if [ ! -f "$reg" ]; then
  jq -n --arg key "$(gfx_repo_key)" \
    '{repo_key:$key, backend:"claude-cli", cli_model:"sonnet", indexes:{}}' \
    > "$reg" && echo "registry: CREATED $home"
fi
cat "$reg"
```

## 3. Pick a semantic backend

`--semantic` builds need a backend. Default is `claude-cli` (the local `claude` CLI
on the operator's plan - **no API key**, billed to the plan), pinned in the registry
to `cli_model: "sonnet"` because that path otherwise defaults to Opus, overkill for
structured-JSON extraction; `/graphify-wrapper-sync --semantic` exports that pin as
`GRAPHIFY_CLAUDE_CLI_MODEL`. Prefer an API key already in the env:

```bash
if   [ -n "${ANTHROPIC_API_KEY:-}" ]; then b=claude
elif [ -n "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}" ]; then b=gemini
elif [ -n "${OPENAI_API_KEY:-}" ]; then b=openai
elif [ -n "${DEEPSEEK_API_KEY:-}" ]; then b=deepseek
else b=claude-cli; fi
reg=$(gfx_registry); tmp=$(mktemp "$(dirname "$reg")/.reg.XXXXXX")
jq --arg b "$b" '.backend=$b' "$reg" > "$tmp" && mv "$tmp" "$reg"
echo "semantic backend: $b"
```

## 4. Report

Name what this run changed outside the repo, so a machine-global write is visible
rather than silent (D26). Steps 1 and 2 each printed which branch they took: report
a bullet for every line below that fired, with its undo, and none for the rest. A
run that stopped in step 1 reports no bullet for a write it never made.

- `graphifyy: INSTALLED` - installed `graphifyy` (undo: `uv tool uninstall graphifyy`)
- `graphifyy: UPGRADED from <v> to <w>` - replaced the machine's `graphifyy` (undo:
  `uv tool install 'graphifyy==<v>'`, an exact pin; `graphifyy@latest` unpins)
- `registry: CREATED <dir>` - created this repo's registry and graph home under
  `~/.claude/graphify/` (undo: `rm -rf` that directory)

Then hand the operator the next verbs: `/graphify-wrapper-index <name> <path>` to
register a domain (no args = I analyze the repo and suggest them),
`/graphify-wrapper-sync` to build this worktree's indexes, and
`/graphify-wrapper-query <name> "<question>"` to ask something now. Do **not**
build any index here - that is `-index` + `-sync`.
