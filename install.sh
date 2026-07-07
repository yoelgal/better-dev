#!/usr/bin/env sh
# install.sh - install better-dev GLOBALLY, per host, from this clone.
#
# better-dev is a set of portable dev practices (SKILL.md) plus bd-* helper scripts. This installs the
# tool ONCE per machine: it links this clone's skills/ dir into each detected host's native global skills
# dir, ONE LEVEL DEEP (~/.claude/skills/<skill>, ~/.codex/skills/<skill>) - hosts discover a skill only at
# <skills-dir>/<name>/SKILL.md, never nested under a namespace folder - so every repo you open sees the
# practices, and nothing is ever vendored per project. Update with a plain `git pull` in this clone; the
# per-skill symlinks mean every host picks the new version up at once, and a re-run reconciles: it prunes
# a link whose skill was removed upstream and reclaims a moved clone's stale links.
#
# This script installs skills only. It does NOT wire the SessionStart/SubagentStart awareness hooks -
# those ride the Claude Code plugin (hooks.json) or the bootstrap-hooks skill. A clone install gets the
# practices; wire the hooks separately if you want the session nudge.
#
#   ./install.sh [--host claude|codex|auto]   # default: auto (each host whose CLI is on PATH or home dir exists)
#   ./install.sh --list    [--host ...]       # show current state per host; change nothing
#   ./install.sh --verify  [--host ...]       # assert every better-dev link resolves + bd-package-check passes
#   ./install.sh --dry-run [--host ...]       # print the link / skip / prune plan; touch nothing
#
# A repo opts in later with /onboard, which creates a per-repo .better-dev/bin symlink back to this
# clone's scripts (see scripts/bd-link) so the portable path .better-dev/bin/bd-mem resolves there.
set -eu

SRC="$(cd "$(dirname "$0")" && pwd -P)"
HOSTS_DIR="$SRC/hosts"
[ -d "$SRC/skills" ] && [ -d "$SRC/scripts" ] && [ -d "$HOSTS_DIR" ] || {
  echo "install: run this from a better-dev checkout (need skills/, scripts/, hosts/)." >&2; exit 1; }

HOST="auto"
MODE="install"   # install | dryrun | list | verify
while [ $# -gt 0 ]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --host=*) HOST="${1#--host=}"; shift ;;
    --dry-run) MODE="dryrun"; shift ;;
    --list) MODE="list"; shift ;;
    --verify) MODE="verify"; shift ;;
    -h|--help) awk 'NR>1 && /^#/{sub(/^# ?/,""); print; next} NR>1{exit}' "$0"; exit 0 ;;
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

# ── enumerate-and-classify core (shared shape with bd-uninstall) ─────────────
# Classify one host skills-dir entry by name. This is the single arbiter of "is this ours?": a live
# symlink into THIS clone (live), a copy-mode dir carrying our sentinel (copy), a broken symlink whose
# target still names a skill (dangling - a moved clone or a removed skill), else foreign or absent.
# bd-uninstall applies the same ours-test; keep the two in step.
# ponytail: dangling/orphan detection keys off the target path containing /skills/<name>; only
# better-dev's own installer writes links in that shape, so the false-positive risk is a hand-made
# broken symlink to some other /skills/<name>, which is already non-functional. Tighten only if it bites.
classify() {
  _d="$1"; _n="$2"
  if [ -L "$_d" ]; then
    if [ -e "$_d" ]; then
      case "$(readlink "$_d" 2>/dev/null)" in
        "$SRC"/skills/"$_n"|"$SRC"/skills/"$_n"/) echo live; return 0 ;;
      esac
      echo foreign; return 0
    fi
    case "$(readlink "$_d" 2>/dev/null)" in
      */skills/"$_n"|*/skills/"$_n"/) echo dangling; return 0 ;;
    esac
    echo foreign; return 0
  fi
  if [ -d "$_d" ]; then
    [ -f "$_d/.better-dev-skill" ] && { echo copy; return 0; }
    echo foreign; return 0
  fi
  [ -e "$_d" ] && { echo foreign; return 0; }
  echo absent; return 0
}

# ── Which hosts to install for ───────────────────────────────────────────────
case "$HOST" in
  auto) hosts="claude codex" ;;
  claude|codex) hosts="$HOST" ;;
  *) echo "install: unknown --host '$HOST' (expected claude, codex, or auto)" >&2; exit 1 ;;
esac

# apply skills for one host. arg1: 1 = dry-run (report only), 0 = act.
host_apply() {
  dry="$1"
  [ "$dry" = 1 ] || mkdir -p "$dir"
  # Migrate off the old whole-dir link: it nested every SKILL.md two levels deep, where hosts never look,
  # so those skills were silently undiscovered. Drop any better-dev -> */skills link, live or stale.
  old="$dir/better-dev"
  if [ -L "$old" ]; then
    case "$(readlink "$old" 2>/dev/null)" in
      */skills|*/skills/) [ "$dry" = 1 ] || rm -f "$old" ;;
    esac
  fi
  n=0; skipped=""; reclaimed=""
  for skill in "$SRC"/skills/*/; do
    [ -f "${skill}SKILL.md" ] || continue
    nm="$(basename "$skill")"; dst="$dir/$nm"
    case "$(classify "$dst" "$nm")" in
      foreign) skipped="$skipped $nm"; continue ;;
      dangling) reclaimed="$reclaimed $nm" ;;
    esac
    if [ "$dry" = 0 ]; then
      _link_or_copy "${skill%/}" "$dst"
      [ "$IS_WINDOWS" -eq 1 ] && : > "$dst/.better-dev-skill"   # sentinel so copy-mode re-runs refresh
    fi
    n=$((n + 1))
  done
  # Reconcile: remove an ours-link whose skill no longer ships (removed/renamed upstream). A live link
  # to a removed skill dangles; a copy-mode dir keeps its sentinel. Foreign entries are never touched.
  pruned=""
  if [ -d "$dir" ]; then
    for entry in "$dir"/*; do
      [ -e "$entry" ] || [ -L "$entry" ] || continue
      nm="$(basename "$entry")"
      [ "$nm" = "better-dev" ] && continue
      [ -f "$SRC/skills/$nm/SKILL.md" ] && continue   # still a shipped skill
      case "$(classify "$entry" "$nm")" in
        copy|dangling) pruned="$pruned $nm"; [ "$dry" = 0 ] && rm -rf "$entry" ;;
      esac
    done
  fi
  [ "$dry" = 0 ] && printf '%s\n' "$SRC" > "$dir/.better-dev-install"   # marker: detection + scripts-dir resolution
  if [ "$dry" = 1 ]; then
    echo "  would link $n skill(s) for $bd_host_display in $dir/"
    [ -n "$reclaimed" ] && echo "    would reclaim (moved clone / stale link):$reclaimed"
    [ -n "$pruned" ]    && echo "    would prune (skill removed upstream):$pruned"
  else
    echo "  linked $n skill(s) for $bd_host_display in $dir/"
    [ -n "$reclaimed" ] && echo "    reclaimed (moved clone / stale link):$reclaimed"
    [ -n "$pruned" ]    && echo "    pruned (skill removed upstream):$pruned"
  fi
  [ -n "$skipped" ] && echo "    skipped (name already used by a non-better-dev skill):$skipped"
  installed=$((installed + 1))
}

# print current state for one host; change nothing.
host_list() {
  if [ ! -d "$dir" ]; then echo "  $bd_host_display ($dir/): absent"; return 0; fi
  live=0; copy=0; dangling=0; foreign=0
  for entry in "$dir"/*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    nm="$(basename "$entry")"; [ "$nm" = "better-dev" ] && continue
    case "$(classify "$entry" "$nm")" in
      live) live=$((live + 1)) ;; copy) copy=$((copy + 1)) ;;
      dangling) dangling=$((dangling + 1)) ;; foreign) foreign=$((foreign + 1)) ;;
    esac
  done
  marker="no"; [ -f "$dir/.better-dev-install" ] && marker="yes"
  echo "  $bd_host_display ($dir/): ours-live=$live copy=$copy dangling=$dangling foreign=$foreign marker=$marker"
}

# assert every shipped skill resolves for one host. Sets verify_fail=1 on any miss.
host_verify() {
  if [ ! -d "$dir" ]; then echo "  - $bd_host_display: not installed ($dir absent)"; return 0; fi
  vbad=0
  for skill in "$SRC"/skills/*/; do
    [ -f "${skill}SKILL.md" ] || continue
    nm="$(basename "$skill")"
    case "$(classify "$dir/$nm" "$nm")" in
      live|copy) : ;;
      *) echo "  x $bd_host_display: $nm not linked or not resolving"; vbad=1 ;;
    esac
  done
  if [ "$vbad" = 0 ]; then echo "  ok $bd_host_display: all skills resolve"; else verify_fail=1; fi
}

installed=0
verify_fail=0
[ "$MODE" = list ] && echo "== better-dev install state =="
for h in $hosts; do
  adapter="$HOSTS_DIR/$h"
  [ -f "$adapter" ] || { echo "install: no adapter for host '$h'" >&2; continue; }
  bd_host_cli=""; bd_host_display=""; bd_host_skills_dir=""
  . "$adapter"
  dir="$bd_host_skills_dir"
  # auto installs for a host whose CLI is on PATH OR whose home dir already exists (GUI-managed CLI,
  # renamed binary). An explicit --host acts regardless.
  if [ "$HOST" = auto ] \
     && ! command -v "$bd_host_cli" >/dev/null 2>&1 \
     && [ ! -d "$(dirname "$dir")" ]; then
    continue
  fi
  case "$MODE" in
    list)   host_list ;;
    verify) host_verify ;;
    dryrun) host_apply 1 ;;
    *)      host_apply 0 ;;
  esac
done

if [ "$MODE" = list ]; then exit 0; fi

if [ "$MODE" = verify ]; then
  if "$SRC/scripts/bd-package-check" >/dev/null 2>&1; then echo "  ok bd-package-check passes"
  else echo "  x bd-package-check failed"; verify_fail=1; fi
  echo
  if [ "$verify_fail" = 0 ]; then echo "verify: OK"; exit 0; else echo "verify: FAILED" >&2; exit 1; fi
fi

echo
if [ "$installed" -eq 0 ]; then
  echo "install: no supported host found (no CLI on PATH and no host home dir; looked for: claude, codex)."
  echo "  Re-run with --host claude (or --host codex) to install for one anyway."
  exit 0
fi

if [ "$IS_WINDOWS" -eq 1 ]; then
  echo "Windows: installed as file copies - re-run ./install.sh after every 'git pull' to refresh."
else
  echo "Update any time:  git -C \"$SRC\" pull   (a re-run of ./install.sh reconciles links after a pull)."
fi
echo "Hooks: this installer wires skills only. For the SessionStart/SubagentStart nudge, use the Claude"
echo "  Code plugin (.claude-plugin/plugin.json + hooks.json) or the bootstrap-hooks skill."
echo "In a repo, run  /onboard  once to wire it (creates .better-dev/bin -> this clone's scripts)."
echo "To remove better-dev later, run  /uninstall  (or scripts/bd-uninstall; dry-run by default)."
