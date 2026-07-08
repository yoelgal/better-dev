#!/bin/sh
# check-upstream.sh - red on upstream drift in the kept security files.
#
# Compares the CURRENT upstream copy of each `pin`-listed file in ../UPSTREAM
# against the sha256 recorded at vendor time. A changed upstream security file
# is the cherry-pick priority; everything else is fork-and-drift by default.
#
# Usage:
#   scripts/check-upstream.sh            network check against upstream HEAD
#   scripts/check-upstream.sh selftest   offline self-check (parsing + hashing
#                                        + every pinned path exists locally)
# Exit codes: 0 in sync | 1 drift in a pinned security file | 2 cannot check.
#
# Reimplemented for better-dev (pattern credit: gstack-auto's sync check;
# no upstream lines reused - that repo ships no license).
set -u

DIR=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
UPSTREAM_FILE="$DIR/UPSTREAM"

[ -f "$UPSTREAM_FILE" ] || { echo "check-upstream: missing $UPSTREAM_FILE" >&2; exit 2; }

repo=$(sed -n 's/^repo: //p' "$UPSTREAM_FILE")
commit=$(sed -n 's/^commit: //p' "$UPSTREAM_FILE")
[ -n "$repo" ] && [ -n "$commit" ] || { echo "check-upstream: UPSTREAM missing repo:/commit: lines" >&2; exit 2; }

hash_file() {
  # portable sha256 of a file -> stdout
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

pins=$(grep '^pin ' "$UPSTREAM_FILE") || { echo "check-upstream: no pin lines in UPSTREAM" >&2; exit 2; }

if [ "${1:-check}" = "selftest" ]; then
  fail=0
  # 1. hashing works and is stable
  tmp=$(mktemp) || exit 2
  printf 'bd-browse selftest\n' > "$tmp"
  h1=$(hash_file "$tmp"); h2=$(hash_file "$tmp")
  rm -f "$tmp"
  [ -n "$h1" ] && [ "$h1" = "$h2" ] || { echo "selftest FAIL: hashing unstable"; fail=1; }
  # 2. every pin line parses and its path exists locally
  echo "$pins" | while read -r _kw pinned path; do
    case "$pinned" in
      *[!0-9a-f]*|'') echo "selftest FAIL: bad hash for $path"; exit 1 ;;
    esac
    [ -f "$DIR/$path" ] || { echo "selftest FAIL: pinned path missing locally: $path"; exit 1; }
  done || fail=1
  # 3. drift detection actually goes red: compare a pin against wrong content
  tmp=$(mktemp) || exit 2
  printf 'not the pinned content\n' > "$tmp"
  first_pin=$(echo "$pins" | head -1 | awk '{print $2}')
  [ "$(hash_file "$tmp")" != "$first_pin" ] || { echo "selftest FAIL: drift compare inert"; fail=1; }
  rm -f "$tmp"
  [ "$fail" -eq 0 ] && echo "selftest OK" && exit 0
  exit 1
fi

# Network mode: fetch each pinned file from upstream HEAD and compare.
raw_base=$(printf '%s' "$repo" | sed 's|https://github.com/|https://raw.githubusercontent.com/|; s|\.git$||')
drift=0
unreachable=0
tmpdir=$(mktemp -d) || exit 2
trap 'rm -rf "$tmpdir"' EXIT

echo "$pins" > "$tmpdir/pins"
while read -r _kw pinned path; do
  # local src/X mirrors upstream browse/src/X
  url="$raw_base/HEAD/browse/$path"
  out="$tmpdir/fetched"
  if ! curl -fsSL --max-time 30 "$url" -o "$out" 2>/dev/null; then
    echo "UNREACHABLE: $url"
    unreachable=1
    continue
  fi
  current=$(hash_file "$out")
  if [ "$current" = "$pinned" ]; then
    echo "in sync: $path"
  else
    echo "DRIFT: upstream changed security file browse/$path (pinned at commit $commit)"
    drift=1
  fi
done < "$tmpdir/pins"

[ "$drift" -eq 1 ] && { echo "RESULT: RED - upstream security drift; review and cherry-pick."; exit 1; }
[ "$unreachable" -eq 1 ] && { echo "RESULT: UNKNOWN - could not reach upstream."; exit 2; }
echo "RESULT: in sync with pinned security files."
exit 0
