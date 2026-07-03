#!/usr/bin/env sh
# install.sh — vendor better-dev into a target repo (agent-agnostic).
#
# better-dev travels *with* the repo so every collaborator and any agent (Claude Code, Codex, pi,
# hermes) picks it up — not as a host-specific plugin. This copies the helpers and skills into the
# target's .better-dev/, and, when a .claude/ directory is present, links the skills into
# .claude/skills/ so Claude Code discovers them. Then you run /onboard once to wire the project.
#
#   ./install.sh [TARGET_REPO]      # default: the current git repo root, else cwd
#
# Idempotent: re-running refreshes the vendored copy.
set -eu

SRC="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$(git -C "${1:-$PWD}" rev-parse --show-toplevel 2>/dev/null || pwd)}"
BD="$TARGET/.better-dev"

[ -d "$SRC/skills" ] && [ -d "$SRC/scripts" ] || { echo "install: run from a better-dev checkout" >&2; exit 1; }

mkdir -p "$BD/bin" "$BD/skills"

# Helpers → .better-dev/bin/ (skills reference them at this path).
cp "$SRC"/scripts/bd-* "$BD/bin/"
chmod +x "$BD"/bin/*

# Skills (SKILL.md + sibling .md) → .better-dev/skills/ as the one canonical copy.
for d in "$SRC"/skills/*/; do
  n="$(basename "$d")"
  rm -rf "$BD/skills/$n"
  cp -R "$d" "$BD/skills/$n"
done

# Hooks (optional session/subagent awareness) → .better-dev/hooks/.
[ -d "$SRC/hooks" ] && { rm -rf "$BD/hooks"; cp -R "$SRC/hooks" "$BD/hooks"; chmod +x "$BD"/hooks/bd-* 2>/dev/null || true; }

# Keep transient loop state out of version control; vendored code + durable memory stay tracked.
[ -f "$BD/.gitignore" ] || printf 'ledger/\n' > "$BD/.gitignore"

# Claude Code discovery: link each skill into .claude/skills/ (additive — never removes yours).
if [ -d "$TARGET/.claude" ] || [ "${BD_LINK_CLAUDE:-}" = 1 ]; then
  mkdir -p "$TARGET/.claude/skills"
  for d in "$BD"/skills/*/; do
    n="$(basename "$d")"
    ln -sfn "../../.better-dev/skills/$n" "$TARGET/.claude/skills/$n"
  done
  linked=" and linked into .claude/skills/"
else
  linked=""
fi

echo "better-dev vendored into $BD$linked."
echo "Next: open $TARGET in your agent and run  /onboard  to wire the project."
