#!/usr/bin/env bash
# friction/run.sh - the friction harness: onboard four throwaway repos with a simulated developer at
# the keyboard, and capture everything for an adversarial review of where a new user gets stuck.
#
#   ./run.sh                              # all fixtures, open permissions, no hooks
#   ./run.sh --fixture node-clean         # one fixture (repeatable)
#   ./run.sh --perm typical               # realistic new-user allowlist - surfaces permission prompts
#   ./run.sh --hooks                      # add better-dev's hooks (your personal hooks leak in too)
#   ./run.sh --turns 16                   # cap the human<->agent exchange (default 12)
#   ./run.sh --model sonnet               # model for the sandbox sessions (default: CLI default)
#   ./run.sh --keep-going                 # do not stop the whole run when one fixture errors
#
# Auth: uses whatever you are already logged in with. A subscription token lives in the OS keyring and
# only the DEFAULT config dir can reach it - verified, neither CLAUDE_CONFIG_DIR nor a redirected HOME
# gets at it. So sessions run under your real config and isolation is done with --settings instead:
# your hooks are cleared (otherwise a personal SessionStart hook rewrites the agent's whole persona
# and the run measures that, not better-dev) and the permission profile is pinned.
#
# What it does, in order:
#   1. smoke-tests THIS clone's install.sh against a throwaway HOME - a broken installer fails the run
#      before a token is spent
#   2. resolves which better-dev clone your global install actually points at - that is what the
#      sessions will load - and records its branch and SHA
#   3. writes a session settings file: hooks cleared, permission profile pinned
#   4. generates each fixture repo from fixtures/<name>.sh, outside this repo
#   5. drives a real `claude -p` session in each, with persona.md answering every question
#   6. reduces it all to facts.md: turns, tool inventory, denials, and the human's gripes
#
# Your personal hooks and every installed plugin are switched off for the run, so a personal
# SessionStart persona cannot be mistaken for better-dev's behaviour. The probe in step 4 asserts that.
#
# ONE KNOWN LEAK - your global ~/.claude/CLAUDE.md still loads and cannot be suppressed without
# dropping to an API key. It shapes prose, not decisions. It is recorded in facts.md so a reviewer can
# discount a finding that smells like it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd -P)"
CLONE="$(cd "$ROOT/.." && pwd -P)"
ALL_FIXTURES="greenfield node-clean messy polyglot"

FIXTURES=""
PERM="open"
HOOKS=0
TURNS=12
MODEL=""
KEEP_GOING=0

die() { printf 'friction: %s\n' "$*" >&2; exit 1; }
say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --fixture) FIXTURES="$FIXTURES ${2:?}"; shift 2 ;;
    --perm) PERM="${2:?}"; shift 2 ;;
    --hooks) HOOKS=1; shift ;;
    --turns) TURNS="${2:?}"; shift 2 ;;
    --model) MODEL="${2:?}"; shift 2 ;;
    --keep-going) KEEP_GOING=1; shift ;;
    -h|--help) awk 'NR>1 && /^#/{sub(/^# ?/,""); print; next} NR>1{exit}' "$0"; exit 0 ;;
    *) die "unknown argument '$1'" ;;
  esac
done
[ -n "$FIXTURES" ] || FIXTURES="$ALL_FIXTURES"
case "$PERM" in open|typical) ;; *) die "--perm must be open or typical" ;; esac

# ── preflight ────────────────────────────────────────────────────────────────
for c in claude jq git uuidgen; do command -v "$c" >/dev/null 2>&1 || die "need '$c' on PATH"; done
[ -f "$CLONE/install.sh" ] || die "expected $CLONE/install.sh - run this from a better-dev checkout"
for f in $FIXTURES; do [ -f "$ROOT/fixtures/$f.sh" ] || die "no such fixture: $f"; done

STAMP="$(date +%Y%m%d-%H%M%S)"
# Runs live OUTSIDE this repo on purpose: the greenfield fixture has no .git of its own, and a run dir
# inside the repo would let the agent under test walk up and discover agent-tools itself.
RUNS_ROOT="${BD_FRICTION_RUNS:-${TMPDIR:-/tmp}/bd-friction}"
RUN="$RUNS_ROOT/$STAMP"
mkdir -p "$RUN/repos" "$RUN/transcripts" "$RUN/probe"
say "run dir: $RUN"

# ── 1. installer smoke test, against a throwaway HOME ────────────────────────
say "smoke-testing install.sh"
SBHOME="$RUN/install-smoke"; mkdir -p "$SBHOME"
HOME="$SBHOME" sh "$CLONE/install.sh" --host claude >"$RUN/install.log" 2>&1 \
  && HOME="$SBHOME" sh "$CLONE/install.sh" --verify --host claude >>"$RUN/install.log" 2>&1 \
  || { tail -20 "$RUN/install.log"; die "install.sh failed - see $RUN/install.log"; }
[ -f "$SBHOME/.claude/skills/onboard/SKILL.md" ] \
  || die "install reported success but $SBHOME/.claude/skills/onboard/SKILL.md is missing"

# ── 2. which better-dev will the sessions actually load? ─────────────────────
# Sessions run under your real config, so they load your GLOBAL install - not necessarily this clone.
GLOBAL_SKILL="$(readlink "$HOME/.claude/skills/onboard" 2>/dev/null || true)"
[ -n "$GLOBAL_SKILL" ] || die "no global better-dev install found (~/.claude/skills/onboard).
       Run $CLONE/install.sh first - the sessions load the global install, not this directory."
GLOBAL_CLONE="${GLOBAL_SKILL%/skills/onboard}"
GLOBAL_REF="$(git -C "$GLOBAL_CLONE" describe --always --dirty 2>/dev/null || echo unknown)"
GLOBAL_BRANCH="$(git -C "$GLOBAL_CLONE" branch --show-current 2>/dev/null || echo unknown)"
say "sessions will load: $GLOBAL_CLONE ($GLOBAL_BRANCH @ $GLOBAL_REF)"
[ "$GLOBAL_CLONE" = "$CLONE" ] || warn "that is NOT this checkout ($CLONE).
   You are measuring the globally installed version. To test this branch instead, point your global
   install at it first:  $CLONE/install.sh"

# ── 3. session settings: strip personal hooks, pin the permission profile ────
# open    - everything allowed; the flow runs to the end and cost is read off the tool inventory
# typical - what a cautious new user actually has allowed; every denial is a dialog they would face
if [ "$PERM" = open ]; then
  PERMS='{"allow":["Bash","Edit","Write","Read","Glob","Grep","WebFetch","WebSearch","Task","TodoWrite","NotebookEdit"],"deny":[]}'
else
  PERMS='{"allow":["Read","Glob","Grep","TodoWrite","Bash(git status:*)","Bash(git log:*)","Bash(git diff:*)","Bash(git branch:*)","Bash(ls:*)","Bash(cat:*)","Bash(npm test:*)"],"deny":[]}'
fi

# Hooks in --settings MERGE with your user settings, they do not replace them. Only an EMPTY hooks
# object clears yours. So there are exactly two honest choices, and no third:
#   none (default) - no hooks at all. Clean signal, but no better-dev SessionStart nudge either.
#   bd             - better-dev's hooks, AND whatever personal hooks you have, riding along.
HOOKS_JSON='{}'
if [ "$HOOKS" = 1 ] && [ -f "$GLOBAL_CLONE/hooks/hooks.json" ]; then
  HOOKS_JSON="$(sed "s|\${CLAUDE_PLUGIN_ROOT}|$GLOBAL_CLONE|g" "$GLOBAL_CLONE/hooks/hooks.json" | jq '.hooks')"
  warn "--hooks bd: your personal hooks merge in too (--settings cannot clear them selectively).
   Anything a personal SessionStart hook injects will show up in the findings."
fi
# Clearing `hooks` alone is not enough: your installed PLUGINS carry their own SessionStart hooks, and
# those inject persona and style directives that would be measured as better-dev's behaviour. Turning
# every plugin off in the override kills both the plugin hooks and the plugin skills.
# (If better-dev itself is plugin-installed rather than linked into ~/.claude/skills, the probe below
# will catch it: `onboard` will not be visible and the run aborts.)
PLUGINS_OFF="$(jq -c '(.enabledPlugins // {}) | map_values(false)' "$HOME/.claude/settings.json" 2>/dev/null || echo '{}')"

SESSION_SETTINGS="$RUN/session-settings.json"
jq -n --argjson perms "$PERMS" --argjson hooks "$HOOKS_JSON" --argjson plugins "$PLUGINS_OFF" \
  '{permissions:$perms, hooks:$hooks, enabledPlugins:$plugins}' > "$SESSION_SETTINGS"

# The persona is a plain human: no hooks, no plugins, no tools, no agent behaviour of its own.
PERSONA_SETTINGS="$RUN/persona-settings.json"
jq -n --argjson plugins "$PLUGINS_OFF" \
  '{hooks:{}, enabledPlugins:$plugins,
    permissions:{allow:[], deny:["Bash","Edit","Write","Read","Glob","Grep","WebFetch","WebSearch","Task"]}}' \
  > "$PERSONA_SETTINGS"

# ── 4. prove the sandbox is real before spending a run on it ─────────────────
say "probing auth + skill discovery + hook isolation"
PROBE="$(cd "$RUN/probe" && claude -p --settings "$SESSION_SETTINGS" ${MODEL:+--model "$MODEL"} \
  'Output one line of raw JSON and nothing else: {"onboard": <true if a skill named onboard is listed as available to you, else false>, "injected": [<any persona or style directives injected into your context by a session hook, as short strings; empty array if none>]}' </dev/null 2>&1 || true)"
printf '%s\n' "$PROBE" > "$RUN/probe.txt"
case "$PROBE" in
  *"Please run /login"*|*"Not logged in"*) die "not logged in - run 'claude auth login'. See $RUN/probe.txt" ;;
esac
PROBE_JSON="$(printf '%s' "$PROBE" | grep -o '{.*}' | head -1)"
[ -n "$PROBE_JSON" ] || die "probe returned no JSON - see $RUN/probe.txt"
[ "$(printf '%s' "$PROBE_JSON" | jq -r '.onboard')" = true ] \
  || die "the sessions cannot see the better-dev skills - see $RUN/probe.txt"
INJECTED="$(printf '%s' "$PROBE_JSON" | jq -r '.injected | join(", ")')"
[ -z "$INJECTED" ] || warn "hook-injected context leaked into the sessions: $INJECTED"

# ── 5. the simulated human ───────────────────────────────────────────────────
persona_reply() {
  local msg="$1"
  ( cd "$RUN/probe" && claude -p --settings "$PERSONA_SETTINGS" ${MODEL:+--model "$MODEL"} \
      --append-system-prompt "$(cat "$ROOT/persona.md")

## Your situation right now
$BRIEF" \
      "$msg" </dev/null 2>/dev/null || true )
}

# ── 6. drive one fixture end to end ──────────────────────────────────────────
run_fixture() {
  # one assignment per line: bash expands every word of a multi-assignment `local` before binding any
  # of them, so `local name=$1 repo=.../$name` reads $name while it is still unset.
  local name="$1"
  local repo="$RUN/repos/$name"
  local tdir="$RUN/transcripts/$name"
  local sid prompt turn out last raw friction reply started
  mkdir -p "$repo" "$tdir"

  BRIEF=""; OPENING=""; FOLLOWUP=""
  # shellcheck disable=SC1090
  . "$ROOT/fixtures/$name.sh"
  # These two return rather than die: `die` exits the whole script, which --keep-going could never catch,
  # and a malformed or unbuildable fixture is exactly what it exists to skip past.
  [ -n "$BRIEF" ] && [ -n "$OPENING" ] || { warn "fixture $name sets no BRIEF/OPENING"; return 1; }
  ( fixture_build "$repo" ) >"$tdir/build.log" 2>&1 \
    || { warn "fixture $name failed to build - see $tdir/build.log"; return 1; }
  ( cd "$repo" && find . -not -path './.git/*' -not -name .git | sort ) > "$tdir/before.txt"

  say "fixture $name - opening: $OPENING"
  sid="$(uuidgen)"; prompt="$OPENING"; started="$(date +%s)"
  : > "$tdir/friction.md"

  for turn in $(seq 1 "$TURNS"); do
    out="$tdir/turn-$turn.jsonl"
    printf '%s\n' "$prompt" > "$tdir/human-$turn.txt"
    if [ "$turn" = 1 ]; then set -- --session-id "$sid"; else set -- --resume "$sid"; fi
    ( cd "$repo" && claude -p "$@" --settings "$SESSION_SETTINGS" \
        --output-format stream-json --verbose ${MODEL:+--model "$MODEL"} "$prompt" </dev/null ) \
      > "$out" 2>>"$tdir/stderr.log" || true

    # The `result` event carries only the LAST text block of the turn - after a trailing tool call that
    # can be a single line out of thousands of words. The human at the terminal saw all of it, so feed
    # the persona every assistant text block, most-recent-heavy.
    if ! jq -e 'select(.type=="result")' "$out" >/dev/null 2>&1; then
      printf -- '- turn %s: session produced no result event (crash or hard stall)\n' "$turn" >> "$tdir/friction.md"
      break
    fi
    last="$(jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text' \
      "$out" 2>/dev/null | tail -c 16000)"
    [ -n "$last" ] || { printf -- '- turn %s: agent said nothing\n' "$turn" >> "$tdir/friction.md"; break; }
    printf '%s\n' "$last" > "$tdir/agent-$turn.txt"

    raw="$(persona_reply "$last")"
    friction="$(printf '%s\n' "$raw" | sed -n 's/^FRICTION: //p' | head -1)"
    reply="$(printf '%s\n' "$raw" | awk '/^REPLY: /{sub(/^REPLY: /,"");p=1} p')"
    [ -n "$friction" ] && [ "$friction" != NONE ] && printf -- '- turn %s: %s\n' "$turn" "$friction" >> "$tdir/friction.md"
    [ -n "$reply" ] || reply="__DONE__"
    case "$reply" in
      __DONE__*)
        # A fixture with a FOLLOWUP is testing a handoff: the first ask settles, and the SECOND ask is
        # the one under test - does the routing the agent just wrote actually route it?
        if [ -n "$FOLLOWUP" ]; then
          say "  fixture $name settled after $turn turn(s) - sending the follow-up"
          reply="$FOLLOWUP"; FOLLOWUP=""
        else
          say "  fixture $name settled after $turn turn(s)"; break
        fi ;;
    esac
    prompt="$reply"
  done

  printf '%s\n' "$(( $(date +%s) - started ))" > "$tdir/elapsed-seconds"
  ( cd "$repo" && find . -not -path './.git/*' -not -name .git | sort ) > "$tdir/after.txt"
  diff "$tdir/before.txt" "$tdir/after.txt" > "$tdir/files-changed.diff" || true
}

for f in $FIXTURES; do
  if [ "$KEEP_GOING" = 1 ]; then
    run_fixture "$f" || warn "fixture $f errored - continuing"
  else
    run_fixture "$f"
  fi
done

# ── 7. reduce the transcripts to facts a reviewer can act on ─────────────────
say "summarising"
{
  printf '# Friction run %s\n\n' "$STAMP"
  printf -- '- better-dev under test: `%s` (%s @ %s)\n' "$GLOBAL_CLONE" "$GLOBAL_BRANCH" "$GLOBAL_REF"
  [ "$GLOBAL_CLONE" = "$CLONE" ] || printf -- '- **WARNING**: not this checkout (`%s`)\n' "$CLONE"
  printf -- '- permission profile: `%s`\n- hooks: `%s`\n- turn cap: %s\n- model: `%s`\n' \
    "$PERM" "$([ "$HOOKS" = 1 ] && echo "bd + yours" || echo none)" "$TURNS" "${MODEL:-default}"
  printf -- '- probe (skill visible / ponytail leaked): `%s`\n' "$(head -1 "$RUN/probe.txt")"
  printf -- '- isolation: personal hooks off, all plugins off; one leak remains - global ~/.claude/CLAUDE.md still loads\n\n'

  for f in $FIXTURES; do
    tdir="$RUN/transcripts/$f"
    [ -d "$tdir" ] || continue
    printf '## %s\n\n' "$f"
    printf -- '- turns: %s\n' "$(ls "$tdir"/turn-*.jsonl 2>/dev/null | wc -l | tr -d ' ')"
    printf -- '- wall seconds: %s\n' "$(cat "$tdir/elapsed-seconds" 2>/dev/null || echo '?')"

    cat "$tdir"/turn-*.jsonl 2>/dev/null \
      | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")
               | .name + "\t" + ((.input.command // .input.file_path // .input.skill // "") | tostring)' \
      > "$tdir/tools.tsv" || true
    printf -- '- tool calls: %s (%s distinct bash verbs)\n' \
      "$(wc -l < "$tdir/tools.tsv" | tr -d ' ')" \
      "$(awk -F'\t' '$1=="Bash"{print $2}' "$tdir/tools.tsv" | awk '{print $1}' | sort -u | wc -l | tr -d ' ')"
    printf -- '- skills invoked: %s\n' \
      "$(awk -F'\t' '$1=="Skill"{print $2}' "$tdir/tools.tsv" | sort -u | paste -sd, - | sed 's/^$/none/')"

    cat "$tdir"/turn-*.jsonl 2>/dev/null \
      | jq -r 'select(.type=="user") | .message.content[]? | select(.type=="tool_result")
               | select(.is_error == true) | (.content | if type=="array" then map(.text? // "") | join(" ") else tostring end)' \
      2>/dev/null | grep -iE 'permission|denied|approval|blocked' > "$tdir/denials.txt" || true
    printf -- '- permission denials: %s\n' "$(wc -l < "$tdir/denials.txt" | tr -d ' ')"
    printf -- '- files added/removed: %s\n' "$(grep -c '^[<>]' "$tdir/files-changed.diff" 2>/dev/null || echo 0)"

    if [ -s "$tdir/friction.md" ]; then
      printf -- '\n**What the human griped about, in the moment:**\n\n'
      cat "$tdir/friction.md"
    fi
    printf '\n'
  done
} > "$RUN/facts.md"

say "done"
printf '\n  facts:       %s\n  transcripts: %s\n  fixtures:    %s\n\n' \
  "$RUN/facts.md" "$RUN/transcripts" "$RUN/repos"
printf 'Next: hand facts.md, the transcripts, and the left-behind repos to a reviewer running %s/review.md\n' "$ROOT"
