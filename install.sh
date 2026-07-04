#!/usr/bin/env sh
# install.sh - install better-dev GLOBALLY, per host, from this clone.
#
# better-dev is a set of portable dev practices (SKILL.md) plus bd-* helper scripts and hooks. This
# installs the tool ONCE per machine: it links this clone's skills/ dir into each detected host's native
# global skills dir, ONE LEVEL DEEP (~/.claude/skills/<skill>, ~/.codex/skills/<skill>) - hosts discover a
# skill only at <skills-dir>/<name>/SKILL.md, never nested under a namespace folder - so every repo you
# open sees the practices, and nothing is ever vendored per project. Update with a plain `git pull` in
# this clone; the per-skill symlinks mean every host picks the new version up at once.
#
#   ./install.sh [--host claude|codex|auto]     # default: auto (link every host whose CLI is on PATH)
#
# A repo opts in later with /onboard, which creates a per-repo .better-dev/bin symlink back to this
# clone's scripts (see scripts/bd-link) so the portable path .better-dev/bin/bd-mem resolves there.
set -eu

SRC="$(cd "$(dirname "$0")" && pwd -P)"
HOSTS_DIR="$SRC/hosts"
[ -d "$SRC/skills" ] && [ -d "$SRC/scripts" ] && [ -d "$HOSTS_DIR" ] || {
  echo "install: run this from a better-dev checkout (need skills/, scripts/, hosts/)." >&2; exit 1; }

HOST="auto"
while [ $# -gt 0 ]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --host=*) HOST="${1#--host=}"; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "install: unknown argument '$1'" >&2; exit 1 ;;
  esac
done

# ── Windows detection + the ONE symlink-or-copy helper ───────────────────────
# Every link this script makes routes through _link_or_copy. On macOS/Linux it symlinks, so `git pull`
# refreshes instantly. On Windows without Developer Mode a symlink silently freezes into a stale copy,
# so we copy explicitly and tell the user to re-run after each pull. (BD_FORCE_COPY=1 exercises this.)
IS_WINDOWS=0
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*|Windows_NT) IS_WINDOWS=1 ;; esac
[ "${BD_FORCE_COPY:-0}" = 1 ] && IS_WINDOWS=1

_link_or_copy() {
  src="$1"; dst="$2"
  rm -rf "$dst"
  if [ "$IS_WINDOWS" -eq 1 ]; then
    cp -R "$src" "$dst"
  else
    ln -snf "$src" "$dst"
  fi
}

# ── Which hosts to install for ───────────────────────────────────────────────
case "$HOST" in
  auto) hosts="claude codex" ;;
  claude|codex) hosts="$HOST" ;;
  *) echo "install: unknown --host '$HOST' (expected claude, codex, or auto)" >&2; exit 1 ;;
esac

installed=0
for h in $hosts; do
  adapter="$HOSTS_DIR/$h"
  [ -f "$adapter" ] || { echo "install: no adapter for host '$h'" >&2; continue; }
  bd_host_cli=""; bd_host_display=""; bd_host_skills_dir=""
  . "$adapter"
  # auto skips a host whose CLI isn't on PATH; an explicit --host installs regardless.
  if [ "$HOST" = auto ] && ! command -v "$bd_host_cli" >/dev/null 2>&1; then
    continue
  fi
  mkdir -p "$bd_host_skills_dir"
  # Migrate off the old whole-dir link: it nested every SKILL.md two levels deep, where hosts never
  # look, so those skills were silently undiscovered. Drop it if it's ours.
  old="$bd_host_skills_dir/better-dev"
  [ -L "$old" ] && case "$(readlink "$old" 2>/dev/null)" in "$SRC"/skills|"$SRC"/skills/) rm -f "$old" ;; esac
  # Link each skill one level deep. Non-destructive: never replace a same-named skill that isn't ours.
  n=0; skipped=""
  for skill in "$SRC"/skills/*/; do
    [ -f "${skill}SKILL.md" ] || continue
    dst="$bd_host_skills_dir/$(basename "$skill")"
    if [ -e "$dst" ] || [ -L "$dst" ]; then
      ours=0
      case "$(readlink "$dst" 2>/dev/null)" in "$SRC"/skills/*) ours=1 ;; esac
      [ -f "$dst/.better-dev-skill" ] && ours=1
      [ "$ours" -eq 1 ] || { skipped="$skipped $(basename "$skill")"; continue; }
    fi
    _link_or_copy "${skill%/}" "$dst"
    [ "$IS_WINDOWS" -eq 1 ] && : > "$dst/.better-dev-skill"   # sentinel so copy-mode re-runs refresh
    n=$((n + 1))
  done
  printf '%s\n' "$SRC" > "$bd_host_skills_dir/.better-dev-install"   # marker: install detection + scripts-dir resolution
  echo "  linked $n skill(s) for $bd_host_display in $bd_host_skills_dir/"
  [ -n "$skipped" ] && echo "    skipped (name already used by a non-better-dev skill):$skipped"
  installed=$((installed + 1))
done

echo
if [ "$installed" -eq 0 ]; then
  echo "install: no supported host CLI found on PATH (looked for: claude, codex)."
  echo "  Re-run with --host claude (or --host codex) to install for one anyway."
  exit 0
fi

if [ "$IS_WINDOWS" -eq 1 ]; then
  echo "Windows: installed as file copies - re-run ./install.sh after every 'git pull' to refresh."
else
  echo "Update any time:  git -C \"$SRC\" pull   (the link means every host sees the new version at once)."
fi
echo "In a repo, run  /onboard  once to wire it (creates .better-dev/bin -> this clone's scripts)."
echo "Claude Code alternative: install the plugin manifest at .claude-plugin/plugin.json instead of this."
