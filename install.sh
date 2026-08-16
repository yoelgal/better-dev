#!/usr/bin/env sh
# install.sh - install better-dev GLOBALLY, per host, from this clone.
#
# better-dev is a set of portable dev practices (SKILL.md) plus bd-* helper scripts. This installs the
# tool ONCE per machine: it links this clone's skills/ dir into each detected host's native global skills
# dir, ONE LEVEL DEEP (~/.claude/skills/<skill>, ~/.codex/skills/<skill>) - hosts discover a skill only at
# <skills-dir>/<name>/SKILL.md, never nested under a namespace folder - so every repo you open sees the
# practices, and nothing is ever vendored per project. Update with /update - a git pull in the clone
# underneath. The per-skill symlinks mean a session started after the pull picks up the new text - a
# session already running keeps the text it loaded at start. A pull that adds or removes a skill
# needs a re-run of ./install.sh too: it links the new one and prunes a link whose skill was removed
# upstream, and also reclaims a moved clone's stale links.
#
# It also registers the SessionStart/SubagentStart awareness hooks in the host's machine-global hook
# target, for every host whose target and format are verified (hosts/<name>'s bd_host_hook_settings).
# The merge is done by the wiring script that host's adapter NAMES in bd_host_hook_wire - default
# scripts/bd-hook-wire, which merges a JSON hook config from its own table of the awareness hooks
# hooks/hooks.json declares. A host whose mechanism is not a JSON config names its own script instead
# (omp's bd-omp-hook-wire installs a TypeScript bridge module), so the installer grows no branch per
# host. A host with no verified target is reported as skipped, and /bootstrap-hooks wires it by hand.
# Pass --no-hooks to skip it.
#
#   ./install.sh [--host <name>|auto]         # <name> = any adapter file in hosts/; default: auto
#                                              # (each host whose CLI is on PATH or home dir exists)
#   ./install.sh --list    [--host ...]       # show current state per host; change nothing
#   ./install.sh --verify  [--host ...]       # assert every better-dev link resolves + bd-package-check passes
#   ./install.sh --dry-run [--host ...]       # print the link / skip / prune plan; touch nothing
#   ./install.sh --no-hooks [--host ...]      # link skills only; leave the host's hook config alone
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
WIRE_HOOKS=1
while [ $# -gt 0 ]; do
  case "$1" in
    --host) HOST="${2:-}"; shift 2 ;;
    --host=*) HOST="${1#--host=}"; shift ;;
    --dry-run) MODE="dryrun"; shift ;;
    --list) MODE="list"; shift ;;
    --verify) MODE="verify"; shift ;;
    --no-hooks) WIRE_HOOKS=0; shift ;;
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
# The hosts/ dir is the single registry: every adapter file is a host, and adding a host is dropping a
# file there - no script edits. Validation is the adapter file existing.
avail=""
for a in "$HOSTS_DIR"/*; do [ -f "$a" ] && avail="$avail $(basename "$a")"; done
if [ "$HOST" = auto ]; then
  hosts="$avail"
else
  [ -f "$HOSTS_DIR/$HOST" ] || { echo "install: no adapter 'hosts/$HOST' (have:$avail)" >&2; exit 1; }
  hosts="$HOST"
fi

# apply skills for one host. arg1: 1 = dry-run (report only), 0 = act.
host_apply() {
  dry="$1"
  # Premise-verify before scaffolding: only a host whose skills-dir convention was verified on a real
  # install carries bd_host_dir_policy="create". Everything else defaults to require-existing - linking
  # into an invented path reports success and delivers nothing, so decline and name the missing dir.
  if [ ! -d "$dir" ]; then
    if [ "${bd_host_dir_policy:-require-existing}" = "create" ]; then
      [ "$dry" = 1 ] || mkdir -p "$dir"
    else
      echo "  $bd_host_display: skills dir $dir absent - this host's convention is unverified; create it (or confirm the real path) and re-run. Not scaffolding blind."
      declined=$((declined + 1))
      return 0
    fi
  fi
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
  [ -n "$skipped" ] && { echo "    skipped (name already used by a non-better-dev skill):$skipped"
    echo "      better-dev's own references to those names now reach the other skill - /review is the"
    echo "      loop's merge gate. Rename or move the other one, then re-run install."; }
  host_hooks "$dry"
  installed=$((installed + 1))
}

# ── register the awareness hooks for one host ────────────────────────────────
# Which script speaks for a host: bd_host_hook_wire is a script BASENAME under scripts/, defaulting to
# bd-hook-wire's JSON-config merge. Resolved in one place because the install path and --verify must
# never disagree about which script wires a host.
hook_wire() {
  if [ -n "${bd_host_hook_wire:-}" ]; then echo "$bd_host_hook_wire"; else echo "bd-hook-wire"; fi
}

# Why this lives in the installer and not in a doc step: an agent told "install better-dev" reads
# BOOTSTRAP and runs this script - it is the only install path there is. If hooks were a separate
# manual step, that install would end hookless in every repo while BOOTSTRAP claims the tool ships
# hooks. So the installer the operator ran does the write.
# Only a host with a VERIFIED hook target carries bd_host_hook_settings; empty means skip and name the
# gap, the same premise-verify posture as bd_host_dir_policy. arg1: 1 = dry-run (report only).
host_hooks() {
  dry="$1"
  [ "$WIRE_HOOKS" = 1 ] || return 0
  if [ -z "${bd_host_hook_settings:-}" ]; then
    echo "    hooks: $bd_host_display has no verified machine-global hook config - skipped (skills still installed)"
    return 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo "    hooks: python3 not found - skipped. Wire them by hand with /bootstrap-hooks."
    return 0
  fi
  # The wiring MECHANISM is the adapter's to name, not a branch here: each such script takes the same
  # argv and prints the same one status word, so a fifth host with a fifth mechanism (omp's is a
  # TypeScript module, not JSON) adds a file rather than a case.
  hookwire="$(hook_wire)"
  if [ ! -f "$SRC/scripts/$hookwire" ]; then
    echo "    hooks: this clone has no scripts/$hookwire, the wiring script $bd_host_display names - skipped. /bootstrap-hooks wires them by hand."
    return 0
  fi
  hookverb=wire; [ "$dry" = 1 ] && hookverb=plan
  hookout=""
  # Pass the copy-mode decision down, do not let the child re-derive it: IS_WINDOWS is already 1 for a
  # real Windows shell as well as for BD_FORCE_COPY=1, and a module-installing script reads that env to
  # choose symlink-or-copy. Without this the skills copy on Windows while the module symlinks and rots.
  if ! hookout="$(BD_FORCE_COPY="$IS_WINDOWS" python3 "$SRC/scripts/$hookwire" "$hookverb" "$SRC" "$bd_host_hook_settings" 2>/dev/null)"; then
    echo "    hooks: could not update $bd_host_hook_settings - skipped. /bootstrap-hooks wires them by hand."
    return 0
  fi
  case "$hookout" in
    wired)      echo "    hooks: SessionStart + SubagentStart registered in $bd_host_hook_settings" ;;
    would-wire) echo "    would register SessionStart + SubagentStart hooks in $bd_host_hook_settings" ;;
    current)    echo "    hooks: already registered in $bd_host_hook_settings" ;;
    unreadable) echo "    hooks: $bd_host_hook_settings is not usable as this host's hook target - left untouched. Fix it and re-run, or use /bootstrap-hooks." ;;
    *)          echo "    hooks: unexpected installer state ('$hookout') - left untouched; /bootstrap-hooks wires them by hand." ;;
  esac
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
  # Hooks are half the install, so verify asserts them too - an install that links every skill and
  # registers no hook is exactly the silent half-install this flag exists to catch.
  if [ -n "${bd_host_hook_settings:-}" ] && [ "$WIRE_HOOKS" = 1 ]; then
    # `plan` is the mechanism-agnostic check: the script that would do the wiring answers whether a
    # fresh install would still have work to do, so a JSON-config host and a module host are each
    # asserted against what their own wiring installs, never against a string that happens to be in a
    # file. A grep can pass over an install the host cannot load, and over a newly added hook.
    hookwire="$(hook_wire)"
    if ! command -v python3 >/dev/null 2>&1; then
      echo "  ? $bd_host_display: awareness hooks UNVERIFIABLE - python3 not found, so scripts/$hookwire cannot answer. /bootstrap-hooks wires them by hand."
      verify_fail=1
    elif [ ! -f "$SRC/scripts/$hookwire" ]; then
      echo "  ? $bd_host_display: awareness hooks UNVERIFIABLE - this clone has no scripts/$hookwire, the wiring script $bd_host_display names."
      verify_fail=1
    else
      hookout="$(python3 "$SRC/scripts/$hookwire" plan "$SRC" "$bd_host_hook_settings" 2>/dev/null)" || hookout="(no answer)"
      case "$hookout" in
        current)
          echo "  ok $bd_host_display: awareness hooks registered" ;;
        would-wire)
          echo "  x $bd_host_display: awareness hooks NOT registered in $bd_host_hook_settings - re-run ./install.sh --host $h (or /bootstrap-hooks)"
          verify_fail=1 ;;
        *)
          echo "  ? $bd_host_display: awareness hooks UNVERIFIABLE - scripts/$hookwire plan said '$hookout' for $bd_host_hook_settings. /bootstrap-hooks wires them by hand."
          verify_fail=1 ;;
      esac
    fi
  fi
}

installed=0
declined=0
verify_fail=0
[ "$MODE" = list ] && echo "== better-dev install state =="
for h in $hosts; do
  adapter="$HOSTS_DIR/$h"
  [ -f "$adapter" ] || { echo "install: no adapter for host '$h'" >&2; continue; }
  bd_host_cli=""; bd_host_display=""; bd_host_skills_dir=""; bd_host_dir_policy=""; bd_host_hook_settings=""; bd_host_hook_wire=""
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
  if [ "$declined" -gt 0 ]; then
    echo "install: nothing linked - $declined host(s) declined for an absent skills dir (named above). Create the real dir or pass --host, then re-run."
  else
    echo "install: no supported host found (no CLI on PATH and no host home dir; adapters available:$avail)."
    echo "  Re-run with --host <name> to install for one anyway."
  fi
  exit 0
fi

if [ "$IS_WINDOWS" -eq 1 ]; then
  echo "Windows: installed as file copies - re-run ./install.sh after every 'git pull' to refresh."
else
  echo "Update any time:  git -C \"$SRC\" pull   (a session already running keeps its loaded text; a"
  echo "  fresh session picks up the pull. Re-run ./install.sh after a pull that adds or removes a skill,"
  echo "  so the new one links and orphans prune)."
fi
echo "Hooks: the SessionStart/SubagentStart nudge is registered above for every host with a verified"
echo "  hook config; a host reported as skipped has none yet, and /bootstrap-hooks wires one by hand."
echo "In a repo, run  /onboard  once to wire it (creates .better-dev/bin -> this clone's scripts)."
echo "To remove better-dev later, run  /uninstall  (or scripts/bd-uninstall; dry-run by default)."
