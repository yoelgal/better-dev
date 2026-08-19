#!/usr/bin/env sh
# install.sh - install better-dev GLOBALLY, per host, from this clone.
#
# better-dev is a set of portable dev practices (SKILL.md) and nothing else that has to run. This
# installs the tool ONCE per machine: it links this clone's skills/ dir into each detected host's
# native global skills dir, ONE LEVEL DEEP (~/.claude/skills/<skill>, ~/.codex/skills/<skill>) -
# hosts discover a skill only at <skills-dir>/<name>/SKILL.md, never nested under a namespace folder -
# so every repo you open sees the practices, and nothing is ever vendored per project. Update with
# /update - a git pull in the clone underneath. The per-skill symlinks mean a session started after
# the pull picks up the new text - a session already running keeps the text it loaded at start. A pull
# that adds or removes a skill needs a re-run of ./install.sh too: it links the new one and prunes a
# link whose skill was removed upstream, and also reclaims a moved clone's stale links.
#
# Skills are the whole install. There is no hook to register and no per-repo bridge to create: the
# host loads CLAUDE.md / AGENTS.md on its own and resolves skills itself, so what a repo needs from
# better-dev is text a host already reads.
#
#   ./install.sh [--host <name>|auto]         # <name> = a host in the table below; default: auto
#                                              # (each host whose CLI is on PATH or home dir exists)
#   ./install.sh --list    [--host ...]       # show current state per host; change nothing
#   ./install.sh --verify  [--host ...]       # assert every better-dev link resolves + bd-package-check passes
#   ./install.sh --dry-run [--host ...]       # print the link / skip / prune plan; touch nothing
#
# A repo opts in later with /onboard, which writes the discovery block a fresh session reads and
# creates .better-dev/ for that repo's own overrides and rules.
set -eu

SRC="$(cd "$(dirname "$0")" && pwd -P)"
[ -d "$SRC/skills" ] || {
  echo "install: run this from a better-dev checkout (need skills/)." >&2; exit 1; }

# ── the host table ───────────────────────────────────────────────────────────
# name|display|skills dir under $HOME|dir policy
#
# One line per host, and adding a host is adding a line. The name doubles as the PATH probe because
# every host here ships a CLI of its own name; a host that breaks that gets a fifth field, not a
# branch. `create` means the skills-dir convention was verified on a real install, so this script may
# scaffold it; `require-existing` means link only into a directory the host itself made - linking into
# an invented path reports success and delivers nothing.
#
# Named coverage limit: an omp PROFILE (`omp --profile <name>`) relocates its skills dir to
# ~/.omp/profiles/<name>/agent/skills, which this static path does not cover. Pass --host with the
# real dir created beforehand, or link by hand.
#
# scripts/bd-uninstall carries this block byte for byte, because undoing an install has to enumerate
# exactly the hosts that were installed for; bd-package-check compares the two so they cannot drift.
BD_HOST_TABLE='claude|Claude Code|.claude/skills|create
codex|OpenAI Codex CLI|.codex/skills|create
hermes|Hermes|.hermes/skills|require-existing
omp|Oh My Pi (omp)|.omp/agent/skills|create'

host_field() {
  printf '%s\n' "$BD_HOST_TABLE" | awk -F'|' -v n="$1" -v f="$2" '$1 == n { print $f; exit }'
}

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
avail=""
for h in $(printf '%s\n' "$BD_HOST_TABLE" | awk -F'|' '{print $1}'); do avail="$avail $h"; done
if [ "$HOST" = auto ]; then
  hosts="$avail"
else
  [ -n "$(host_field "$HOST" 1)" ] || { echo "install: no host '$HOST' (have:$avail)" >&2; exit 1; }
  hosts="$HOST"
fi

# apply skills for one host. arg1: 1 = dry-run (report only), 0 = act.
host_apply() {
  dry="$1"
  # Premise-verify before scaffolding: a require-existing host declines and names the missing dir
  # rather than inventing one.
  if [ ! -d "$dir" ]; then
    if [ "$policy" = "create" ]; then
      [ "$dry" = 1 ] || mkdir -p "$dir"
    else
      echo "  $display: skills dir $dir absent - this host's convention is unverified; create it (or confirm the real path) and re-run. Not scaffolding blind."
      declined=$((declined + 1))
      return 0
    fi
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
      [ -f "$SRC/skills/$nm/SKILL.md" ] && continue   # still a shipped skill
      case "$(classify "$entry" "$nm")" in
        copy|dangling) pruned="$pruned $nm"; [ "$dry" = 0 ] && rm -rf "$entry" ;;
      esac
    done
  fi
  # The marker records which clone installed here. /update reads it to find the clone it has to pull,
  # so it is the one piece of state an install leaves behind besides the links themselves.
  [ "$dry" = 0 ] && printf '%s\n' "$SRC" > "$dir/.better-dev-install"
  if [ "$dry" = 1 ]; then
    echo "  would link $n skill(s) for $display in $dir/"
    [ -n "$reclaimed" ] && echo "    would reclaim (moved clone / stale link):$reclaimed"
    [ -n "$pruned" ]    && echo "    would prune (skill removed upstream):$pruned"
  else
    echo "  linked $n skill(s) for $display in $dir/"
    [ -n "$reclaimed" ] && echo "    reclaimed (moved clone / stale link):$reclaimed"
    [ -n "$pruned" ]    && echo "    pruned (skill removed upstream):$pruned"
  fi
  [ -n "$skipped" ] && { echo "    skipped (name already used by a non-better-dev skill):$skipped"
    echo "      better-dev's own references to those names now reach the other skill - /review is the"
    echo "      loop's merge gate. Rename or move the other one, then re-run install."; }
  installed=$((installed + 1))
}

# print current state for one host; change nothing.
host_list() {
  if [ ! -d "$dir" ]; then echo "  $display ($dir/): absent"; return 0; fi
  live=0; copy=0; dangling=0; foreign=0
  for entry in "$dir"/*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    nm="$(basename "$entry")"
    case "$(classify "$entry" "$nm")" in
      live) live=$((live + 1)) ;; copy) copy=$((copy + 1)) ;;
      dangling) dangling=$((dangling + 1)) ;; foreign) foreign=$((foreign + 1)) ;;
    esac
  done
  marker="no"; [ -f "$dir/.better-dev-install" ] && marker="yes"
  echo "  $display ($dir/): ours-live=$live copy=$copy dangling=$dangling foreign=$foreign marker=$marker"
}

# assert every shipped skill resolves for one host. Sets verify_fail=1 on any miss.
host_verify() {
  if [ ! -d "$dir" ]; then echo "  - $display: not installed ($dir absent)"; return 0; fi
  vbad=0
  for skill in "$SRC"/skills/*/; do
    [ -f "${skill}SKILL.md" ] || continue
    nm="$(basename "$skill")"
    case "$(classify "$dir/$nm" "$nm")" in
      live|copy) : ;;
      *) echo "  x $display: $nm not linked or not resolving"; vbad=1 ;;
    esac
  done
  if [ "$vbad" = 0 ]; then echo "  ok $display: all skills resolve"; else verify_fail=1; fi
}

# BEGIN pre-cutover-migration - names below are deleted on purpose; bd-package-check skips this region
# One-time migration for the cutover that removed better-dev's hooks. Until this release the
# installer wrote a SessionStart and SubagentStart pair into Claude Code's settings, a module stub
# into omp's agent hooks dir, and permission allowances for CLIs that shipped in scripts/. All of
# those are deleted from the clone, which is exactly why this function has to name them: nothing
# else in the shipped tree remembers they existed, so nothing else can clean them up.
#
# Why it cannot be left to self-heal. A hook is registered by ABSOLUTE path into the clone. After a
# pull the target is missing, so Claude Code fails the hook on every session start and omp logs a
# module load error on every session, forever, and the code that wrote those entries is gone with
# the pull. Skill links are different and need no help: host_apply already prunes an ours-link whose
# skill stopped shipping, so the removed skills disappear on the same re-run.
#
# Delete this function once the release it bridges is old enough that no install predates it. It is
# the one place in the tree where naming a deleted path is correct, and bd-package-check exempts it
# by name for that reason.
prune_legacy_footprint() {
  dry="$1"; hit=0

  # omp: a stub whose only content is a re-export of a module in this clone. Matched by better-dev's
  # own marker or by this clone's path, never by filename alone, so a same-named foreign hook stays.
  for stub in "$HOME"/.omp/agent/hooks/pre/bd-*.ts "$HOME"/.omp/agent/hooks/bd-*.ts; do
    [ -f "$stub" ] || continue
    grep -q 'better-dev-omp-hook' "$stub" 2>/dev/null || grep -q -- "$SRC" "$stub" 2>/dev/null || continue
    hit=1
    if [ "$dry" = 1 ]; then echo "  would remove stale omp hook stub: $stub"
    else rm -f "$stub" && echo "  removed stale omp hook stub: $stub"; fi
  done

  cs="$HOME/.claude/settings.json"
  [ -f "$cs" ] || return 0

  # A missing jq is reported, never skipped silently: leaving a broken hook registered while printing
  # nothing is the failure mode this whole migration exists to prevent.
  if ! command -v jq >/dev/null 2>&1; then
    echo "  ! jq not on PATH, so stale Claude Code entries were NOT removed. Remove by hand from $cs:"
    echo "      any hooks entry whose command contains $SRC/hooks/"
    echo "      any permissions.allow entry naming .better-dev/bin"
    return 0
  fi

  # Matched by better-dev's OWN hook basenames as well as by this clone's path, and deliberately not
  # by path alone. A registration records the ABSOLUTE path of the clone that wrote it, so a clone
  # that has since moved - which every clone did at 0.13.0, when the repo was renamed and flattened -
  # carries a path that no longer matches $SRC, and a path-only filter would leave those entries
  # registered and broken forever. The three names are better-dev's and appear nowhere else.
  bd_hooks='/hooks/bd-(session-start|subagent-start|graphify-refresh-stale)'
  stale_hooks="$(jq -r --arg src "$SRC" --arg names "$bd_hooks" '[(.hooks // {}) | to_entries[] | .value[]?
      | (.hooks // [])[] | select(((.command // "") | contains($src + "/hooks/"))
                               or ((.command // "") | test($names)))] | length' "$cs" 2>/dev/null)"
  stale_perms="$(jq -r '[(.permissions.allow // [])[]
      | select(test("[.]better-dev/bin"))] | length' "$cs" 2>/dev/null)"
  [ -n "$stale_hooks" ] || stale_hooks=0
  [ -n "$stale_perms" ] || stale_perms=0
  [ "$stale_hooks" = 0 ] && [ "$stale_perms" = 0 ] && return $hit

  hit=1
  if [ "$dry" = 1 ]; then
    echo "  would remove $stale_hooks stale hook registration(s) and $stale_perms stale permission(s) from $cs"
    return 0
  fi

  # Filter by this clone's hooks path and by better-dev's own CLI paths only. An event that still
  # holds a foreign hook keeps the event; an event left empty is dropped so the file does not grow
  # husks. Written through a temp file next to the original, then renamed, so a reader never sees a
  # half-written settings file.
  bak="$cs.bak-$(date +%Y%m%d%H%M%S)"
  cp "$cs" "$bak" || { echo "  ! could not back up $cs - nothing changed" >&2; return 1; }
  tmp="$cs.tmp.$$"
  if jq --arg src "$SRC" --arg names "$bd_hooks" '
        (if .hooks then .hooks |= (
            with_entries(.value |= (
                map(.hooks |= map(select((((.command // "") | contains($src + "/hooks/"))
                                       or ((.command // "") | test($names))) | not)))
              | map(select(((.hooks // []) | length) > 0))))
          | with_entries(select((.value | length) > 0)))
         else . end)
      | (if .permissions.allow
         then .permissions.allow |= map(select(test("[.]better-dev/bin") | not))
         else . end)
     ' "$cs" > "$tmp" 2>/dev/null && [ -s "$tmp" ] && jq -e . "$tmp" >/dev/null 2>&1; then
    mv -f "$tmp" "$cs"
    echo "  removed $stale_hooks stale hook registration(s) and $stale_perms stale permission(s) from $cs"
    echo "    backup: $bak"
  else
    rm -f "$tmp"
    echo "  ! rewriting $cs failed, so it is unchanged (backup at $bak). Remove the entries by hand." >&2
    return 1
  fi
  return 0
}
# END pre-cutover-migration

installed=0
declined=0
verify_fail=0
[ "$MODE" = list ] && echo "== better-dev install state =="
for h in $hosts; do
  display="$(host_field "$h" 2)"
  dir="$HOME/$(host_field "$h" 3)"
  policy="$(host_field "$h" 4)"
  # auto installs for a host whose CLI is on PATH OR whose home dir already exists (GUI-managed CLI,
  # renamed binary). An explicit --host acts regardless.
  if [ "$HOST" = auto ] \
     && ! command -v "$h" >/dev/null 2>&1 \
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

# Runs regardless of whether any host linked: the stale entries live outside the skills dirs, so a
# machine whose hosts all declined still needs them gone. Reports under its own heading only when it
# actually found something, so a clean machine stays quiet.
case "$MODE" in
  list)   : ;;
  verify) if prune_legacy_footprint 1 | grep -q .; then
            echo "  x stale pre-cutover hook or permission entries are still registered (run install to clear)"
            verify_fail=1
          else
            echo "  ok no stale pre-cutover entries"
          fi ;;
  dryrun) legacy_out="$(prune_legacy_footprint 1)"
          [ -n "$legacy_out" ] && { echo; echo "Pre-cutover cleanup:"; printf '%s\n' "$legacy_out"; } ;;
  *)      legacy_out="$(prune_legacy_footprint 0)"
          [ -n "$legacy_out" ] && { echo; echo "Pre-cutover cleanup:"; printf '%s\n' "$legacy_out"; } ;;
esac

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
    echo "install: no supported host found (no CLI on PATH and no host home dir; hosts:$avail)."
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
echo "In a repo, run  /onboard  once to wire it (writes the discovery block and .better-dev/)."
echo "To remove better-dev later, run  /uninstall  (or scripts/bd-uninstall; dry-run by default)."
