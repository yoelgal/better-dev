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
if [ -n "$clone" ] && [ ! -d "$clone/skills" ] && [ -d "$clone/better-dev/skills" ]; then
  clone="$clone/better-dev"   # pre-0.7.0 install: the tool moved one level down in the monorepo
fi
if [ -n "$clone" ] && [ -d "$clone/skills" ] && git -C "$clone" rev-parse --git-dir >/dev/null 2>&1; then   # git -C "" acts on the cwd; pull only a resolved clone
  old="$(git -C "$clone" rev-parse HEAD)"
  git -C "$clone" pull --ff-only
else
  echo "no better-dev clone found - install it first (see BOOTSTRAP.md)" >&2
fi
```

Since the 0.7.0 monorepo move the clone dir a host resolves may be the repo root (pre-0.7.0
install) or the `better-dev/` subdir inside it (fresh install, plugin root) - the snippet's first
guard normalizes either to the dir that holds `skills/`, which is also why the git probe is not a
`.git` dir check: a subdir of a checkout has none of its own.

Where the host gates machine-touching commands, hand the pull to the operator paste-ready
(`git -C <clone> pull --ff-only`). `--ff-only` never clobbers local edits: a refused pull means
the clone carries local work - report that and stop rather than merging or resetting on the
operator's behalf. A pull that fails offline: report it and stop; never guess what the remote holds.

Where the resolved clone is a host-managed plugin checkout rather than your own clone, a refused
or unavailable pull is the channel working as designed, not local work in the way - say so and
move to step 3 rather than reporting a dirty clone. The full channel contract lives in
`/packaging`'s "Two ways in".

## 2. Reconcile links only when needed

```bash
git -C "$clone" diff --diff-filter=ADR --name-only "$old"..HEAD -- 'skills/*/SKILL.md'
```

Non-empty output means the pull added, removed, or renamed a skill dir - hand the operator the
clone's installer paste-ready (it touches the machine's global skills dir, so the operator runs
it). Resolve the installer, never assume its path: `ls "$clone/install.sh"` - a pull that moved the
tool (0.7.0 moved it to `<repo>/better-dev/install.sh`) leaves the normalized `$clone` from step 1
pointing at the right one, but a stale hand-typed path will not be. Empty output means content-only changes; the existing links already serve them - skip this step.

## 3. Read the release ledger

`docs/RELEASES.md` in the clone holds one line per release, newest first:
`<version> <flags> - <summary>`, flags a comma-joined subset of `install,reonboard,offer`. A version
with no line is pull-only; a clone with no file at all declares nothing pending.

This repo's baseline is `.better-dev/wired-version`; a missing file means wired before 0.6.0, older
than every listed version. Collect the flags of every listed version strictly greater than the
baseline - compare numerically, field by field on the dots (awk or IFS): a version-like identifier
never sorts correctly as a plain string (`2026-07-23.10` reads before `2026-07-23.2`), and `sort -V`
itself differs across the BSD/GNU userlands this runs on, so neither is a shortcut here. A pending
`install` flag that step 2's diff did not
already surface still means a one-time `install.sh` re-run; a pending `reonboard` flag goes to
step 4, and so does a pending `offer` flag - collect its summary line, it is the question's text.

The stamp is not this repo's version of the tool, and the gap between the two is not a pending
update. `plugin.json` says which version this machine runs; `wired-version` says which version's
**repo surface** was last wired in, so it only has to move when a release changed something inside
the repo - which is exactly what a `reonboard` flag marks. A pull-only release therefore leaves the
stamp behind the manifest on purpose, and nothing is owed. Answering "what version is better-dev
here" by diffing the two numbers reports a top-up that no flag asked for; read the flags between
the stamp and the manifest instead, and where none are pending, say so rather than prescribing a
run. Step 5 still re-stamps on any run that gets there, so a synced number is a side effect of
updating, never the reason to. This is the general shape any "am I up to date" check needs: two
sources of truth, each moved by a different human act - a maintainer's release, this skill's own
top-up - read both, and let the newer one govern rather than trusting either alone.

## 4. Top up this repo only

When a reonboard flag is pending, run the `/onboard` top-up for the current repo - a re-run is
idempotent and only fills gaps. Current repo only: every other wired repo carries its own
session-start nudge and reaches here lazily on its own consent, so a sweep across repos imposes a
top-up nobody in those repos asked for.

**Pending `offer` flags are asked, not applied.** An offer names a capability the release added that
nobody has opted into; the other flags restore what the operator already chose, so they run on their
own, and this one never does. Put each pending offer to the operator once - the release line's
summary is the question's text, and the summary names where the capability is enabled so the answer
is actionable rather than a pointer to go hunting. Ask them together in one pass when several are
pending, take a no as a no, and apply only what they accept. The offer is a question about this
machine, so it stands whether or not the reonboard top-up above had anything to fill.

The `wired-version` stamp in step 5 is what closes an offer, which is why stamping last matters here
too: an offer declined this run is not re-asked next run, and an offer never reached because the run
stopped early is still pending when the operator comes back.

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
