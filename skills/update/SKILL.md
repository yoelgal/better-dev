---
name: update
description: Use when the better-dev tool itself needs updating - "update better-dev", "is there an update", a session-start update or reonboard nudge naming /update, or after a git pull in the global clone to reconcile skill links and this repo's wiring.
---

# /update - bring the tool and this repo current

One verb, six steps, in order. The tool lives in one global clone every repo shares; this repo
carries only its wiring. /update pulls the clone, reconciles what the pull changed, tops up this repo
when a release changed the repo surface, and sweeps this repo's own stale records - it is the repo's
one recurring upkeep pass, which is why the ledger sweep lives here rather than waiting for someone
to remember it.

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
    [ -L "$s" ] || continue
    t="$(readlink "$s")"; clone="${t%/skills/onboard}"   # strip, never cd: a moved clone's link is DANGLING, and cd into it fails
    [ "$clone" != "$t" ] && break
    clone=""
  done
fi
if [ -n "$clone" ] && [ ! -d "$clone/skills" ]; then
  if [ -d "$clone/better-dev/skills" ]; then
    clone="$clone/better-dev"   # 0.7.0 monorepo layout: the tool lived one level down, not yet re-pulled
  elif [ "${clone##*/}" = better-dev ] && [ -d "${clone%/*}/skills" ]; then
    clone="${clone%/*}"         # moved clone: recorded one level down, but the pull flattened it away
  fi
fi
if [ -n "$clone" ] && [ -d "$clone/skills" ] && git -C "$clone" rev-parse --git-dir >/dev/null 2>&1; then   # git -C "" acts on the cwd; pull only a resolved clone
  old="$(git -C "$clone" rev-parse HEAD)"
  git -C "$clone" pull --ff-only
else
  echo "no better-dev clone found - install it first (see BOOTSTRAP.md)" >&2
fi
```

The clone dir a host resolves may be the repo root (current), or the `better-dev/` subdir inside it -
either because the clone is still on the 0.7.0-era monorepo layout, or because it has already pulled
the flatten and the recorded path now points at a directory that no longer exists. The guard
normalizes all three to the dir that holds `skills/`, stepping down and up, which is also why the git
probe is not a `.git` dir check: a subdir of a checkout has none of its own. The link is read as a
string rather than followed with `cd` for the same reason - the third case's link is **dangling**, so
`cd` into it fails and the whole resolution silently reports no clone found on exactly the install
that most needs updating.

Where the host gates machine-touching commands, hand the pull to the operator paste-ready
(`git -C <clone> pull --ff-only`). `--ff-only` never clobbers local edits: a refused pull means
the clone carries local work - report that and stop rather than merging or resetting on the
operator's behalf. A pull that fails offline: report it and stop; never guess what the remote holds.

One shape is not local work and is not updatable either: a clone resolved from a **legacy plugin
install** - the marketplace channel better-dev shipped from 0.7.0 until D32 deleted it.
A plugin checkout is not a supported install. Do not report a dirty clone, and do not try to
update it in place. It is host-managed and version-pinned, which is why the pull is refused, and the
same pinning means `.better-dev/bin` cannot bridge to it - so every skill that calls through
`.better-dev/bin/bd-mem` is already broken there, update or no update. Say that plainly and hand the
operator the clone install from `BOOTSTRAP.md`; the migration is the remedy, not a re-pull.

The full install contract lives in `/packaging`.

## 2. Reconcile links only when needed

```bash
git -C "$clone" diff --diff-filter=ADR --name-only "$old"..HEAD -- 'skills/*/SKILL.md'
```

Non-empty output means the pull added, removed, or renamed a skill dir - hand the operator the
clone's installer paste-ready (it touches the machine's global skills dir, so the operator runs
it). Resolve the installer, never assume its path: `ls "$clone/install.sh"` - a pull that moved the
tool (0.7.0 moved it to `<repo>/better-dev/install.sh`) leaves the normalized `$clone` from step 1
pointing at the right one, but a stale hand-typed path will not be. Empty output means content-only changes; the existing links already serve them - skip this step.

Content-only is the right verdict for skill links and the wrong one for the always-loaded blocks this
library installs into a host's own entry file, because those are copies rather than links: a pull that
edits `docs/comms-block.md` changes nothing on a machine whose `CLAUDE.md` still carries the copy
written at install. Nothing else reconciles them - the two writers (`BOOTSTRAP.md` globally,
`/onboard` per repo) each run once - so a block installed months ago silently drifts, and the
operator experiences it as the practices not working rather than as a stale file. Compare the marked
block against the shipped body wherever one is installed:

The whole check sits inside one `if` on the clone, because step 1 reports a failed resolve to stderr
without exiting: with `$clone` empty, `diff` cannot open the shipped body, exits 2, and an exit-code
test that only distinguishes zero from non-zero prints `STALE` for every entry file it finds. Scope is
the guard rather than an early return, which would end an interactive or persistent shell instead of
skipping a step.

```bash
if [ ! -f "$clone/docs/comms-block.md" ]; then
  echo "clone unresolved - skipping the block check"
else
  found=0
  # Global entry files come from the host adapters, never a hardcoded path: hosts/claude names
  # ~/.claude/CLAUDE.md, hosts/codex names ~/.codex/AGENTS.md, and hermes and omp name "" to decline.
  # Read every adapter rather than detecting the host - a machine may run more than one, and inlining
  # one host's answer would report "clean" on every other.
  globals=$(for a in "$clone"/hosts/*; do
    ( . "$a" >/dev/null 2>&1; printf '%s\n' "${bd_host_global_entry:-}" )
  done | grep . | sort -u)
  for entry in $globals ./CLAUDE.md ./CLAUDE.local.md ./AGENTS.md; do
    [ -f "$entry" ] || continue
    grep -q 'BEGIN better-dev-comms' "$entry" || continue
    found=$((found + 1))
    if diff <(sed -n '/BEGIN better-dev-comms/,/END better-dev-comms/p' "$entry" | sed '1d;$d') \
            "$clone/docs/comms-block.md" >/dev/null; then
      echo "current: $entry"
    else
      echo "STALE: $entry"
    fi
  done
  [ "$found" -gt 0 ] || echo "no better-dev-comms block installed anywhere"
fi
```

An adapter that names no global entry file is declining one, not missing it: `grep .` drops the empty
answers, so those hosts contribute nothing to the list and the per-repo files are still checked.

Three readings, and the third is the one silence would hide. `current` everywhere means nothing is
owed. Any `STALE` line is drift, handled below. `no better-dev-comms block installed anywhere` means
the block was never installed on this machine, which is `/onboard` or `BOOTSTRAP.md` territory rather
than drift - say which, because an empty loop reads as clean and that is exactly the failure this step
exists to close.

**Every `STALE` line is repaired here, including the host-global one.** One command each, idempotent and
marker-aware, writing only between its own two markers so operator text in that file is untouched:

```bash
"$clone"/scripts/bd-block "$entry" better-dev-comms < "$clone"/docs/comms-block.md
```

D26 names this write on its authorized list, so it runs rather than being handed over. That is the
point: a drift check ending in a paste block is a check whose fix waits on the operator noticing the
output, and this particular drift is invisible from their side - a months-old block reads as the
practices not working, never as a stale file. Announce each refresh with its undo
(`scripts/bd-block remove "$entry" better-dev-comms`), which is what D26 requires of a write on that
list, so the change is visible rather than silent.

Report which entry files were current and which were refreshed. A silent refresh reads the same as no
drift and teaches nobody that the copy had rotted.

One thing to say out loud when refreshing, rather than after: the write rewrites the whole marked
block, so it also drops anything that copy carried which the shipped body no longer does. A rule the
operator added inside the markers by hand is not distinguishable from a rule this library retired, and
only they can tell those apart. Where a refresh would discard a line the shipped body lacks, show the
diff first and ask; where the copy is a clean older version of ours, refresh it and move on.

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
run. Step 6 still re-stamps on any run that gets there, so a synced number is a side effect of
updating, never the reason to. This is the general shape any "am I up to date" check needs: two
sources of truth, each moved by a different human act - a maintainer's release, this skill's own
top-up - read both, and let the newer one govern rather than trusting either alone.

**The plain version question has a plain answer: the session-start welcome names it** ("better-dev
0.14.1 ready - ..."), read from the resolved clone's manifest. Reach for that before deriving
anything, because deriving it is what produces the wrong answer - the two numbers are sitting right
there, and every reader who has diffed them prescribed a `/update` that owed nothing. The welcome
deliberately stops at naming the version and never claims "up to date": the session-start fetch is
bounded and best-effort, so currency is reported by the update nudge that measured it - a clone
behind its origin appends "update available, run /update" to that same line, whether or not the
release carries a flag.

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

The `wired-version` stamp in step 6 is what closes an offer, which is why stamping last matters here
too: an offer declined this run is not re-asked next run, and an offer never reached because the run
stopped early is still pending when the operator comes back.

## 5. Sweep this repo's stale ledger rows

Every run, pending flags or not. A work-item's terminal state is written by the session that finishes
it, so a session that ends at the merge - or crashes, or hands off - never writes one, and the row
reads `in-flight` forever while its branch and worktree are long gone. Nobody notices on their own:
this is the repo's only recurring upkeep verb, so it is the only place the sweep will actually
happen. One repo had 12 such rows open for up to 13 days with every one of their PRs merged.

```bash
.better-dev/bin/bd-mem ledger reap          # preview: one row per item, with its evidence
.better-dev/bin/bd-mem ledger reap --apply  # settle the ones it could prove
```

**Show the preview's `reap` lines, then apply, in the same pass.** The preview output *is* the
evidence (`landed as PR #78 (568a5f6 in main)`), so putting it in front of the operator costs one
line and needs no round trip; applying without showing it settles records nobody read. A run that
offers nothing says nothing - `/update` runs in every repo, and a clean ledger has no news.

Reap proves each row from this repo's own history and refuses everything else: the row's own `pr.md`
must name a PR, a commit ending `(#N)` must be in the integration branch, and a branch it recorded
must carry nothing that branch lacks - a branch still ahead is a live lane and is kept even though
its PR landed. So it cannot settle a judgment call, only a fact. Anything needing a human - an
unstarted item, an epic whose item a later decision cancelled, a lane abandoned on purpose - has no
mechanical proof and is left exactly as it was.

Two properties that make this safe to run unattended, both worth stating when reporting it:

- **Reversible.** `settle` appends, and `ledger status` reads the last line's terminal token - so
  appending any ordinary progress line after it puts the row back to `in-flight`. Nothing is deleted.
- **Not gated on the pull.** This step reads *this repo's* records, never the clone's, so run it even
  when step 1 reported a refused or offline pull and stopped. A repo whose ledger is stale should not
  stay stale because a remote was unreachable.

No `.better-dev/bin/bd-mem` (a repo wired before the bridge) means skip the step silently - there is
nothing to run and nothing to report.

## 6. Stamp the wired version

After the top-up - or directly, when only the pull and install tiers applied - write the clone's
current manifest version to this repo's stamp:

```bash
sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$clone/.claude-plugin/plugin.json" \
  > .better-dev/wired-version
```

The next session's nudge compares against this stamp, so a skipped stamp re-nags forever and a
stamp written before the top-up ran hides a pending reonboard - stamp last, and only after the
steps the flags demanded actually happened.
