---
name: update
description: Use when the better-dev tool itself needs updating - "update better-dev", "is there an update", a session-start update or reonboard nudge naming /update, or after a git pull in the global clone to reconcile skill links and this repo's wiring.
---

# /update - bring the tool and this repo current

One verb, five steps, in order. The tool lives in one global clone every repo shares; this repo
carries only its wiring. /update pulls the clone, reconciles what the pull changed, and tops up
this repo when a release changed the repo surface.

Two preconditions, checked first:

- This repo has no `.better-dev/` - it was never wired. Point at `/onboard` and stamp nothing.
- No installed clone resolves below - the tool is not installed for this host. Point at the
  install bootstrap (the README quick start / `BOOTSTRAP.md`) and stop.

## 1. Locate the clone and pull it

```bash
setopt no_nomatch 2>/dev/null || true
clone="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$clone" ]; then   # fall back to reading a host skill symlink back to the clone
  for s in "$HOME"/.*/skills/onboard "$HOME"/.config/*/skills/onboard; do
    [ -L "$s" ] && clone="$(cd "$(dirname "$(readlink "$s")")/.." && pwd)" && break
  done
fi
old="$(git -C "$clone" rev-parse HEAD)"
git -C "$clone" pull --ff-only
```

Where the host gates machine-touching commands, hand the pull to the operator paste-ready
(`git -C <clone> pull --ff-only`). `--ff-only` never clobbers local edits: a refused pull means
the clone carries local work - report that and stop rather than merging or resetting on the
operator's behalf. A pull that fails offline: report it and stop; never guess what the remote holds.

## 2. Reconcile links only when needed

```bash
git -C "$clone" diff --diff-filter=ADR --name-only "$old"..HEAD -- 'skills/*/SKILL.md'
```

Non-empty output means the pull added, removed, or renamed a skill dir - hand the operator
`<clone>/install.sh` paste-ready (it touches the machine's global skills dir, so the operator runs
it). Empty output means content-only changes; the existing links already serve them - skip this step.

## 3. Read the release ledger

`docs/RELEASES.md` in the clone holds one line per release, newest first:
`<version> <flags> - <summary>`, flags a comma-joined subset of `install,reonboard`. A version with
no line is pull-only; a clone with no file at all declares nothing pending.

This repo's baseline is `.better-dev/wired-version`; a missing file means wired before 0.6.0, older
than every listed version. Collect the flags of every listed version strictly greater than the
baseline - compare numerically, field by field on the dots (awk or IFS), because `sort -V` differs
across the BSD/GNU userlands this runs on. A pending `install` flag that step 2's diff did not
already surface still means a one-time `install.sh` re-run; a pending `reonboard` flag goes to
step 4.

## 4. Top up this repo only

When a reonboard flag is pending, run the `/onboard` top-up for the current repo - a re-run is
idempotent and only fills gaps. Current repo only: every other wired repo carries its own
session-start nudge and reaches here lazily on its own consent, so a sweep across repos imposes a
top-up nobody in those repos asked for.

## 5. Stamp the wired version

After the top-up - or directly, when only the pull and install tiers applied - write the clone's
current manifest version to this repo's stamp:

```bash
sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$clone/.claude-plugin/plugin.json" \
  > .better-dev/wired-version
```

The next session's nudge compares against this stamp, so a skipped stamp re-nags forever and a
stamp written before the top-up ran hides a pending reonboard - stamp last, and only after the
steps the flags demanded actually happened.
