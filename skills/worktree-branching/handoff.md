# Handing a half-finished work-item to another machine

The record stays where it was written: the contract with the operator's approval on it, the receipts,
and the review verdict all sit in the primary checkout's `.better-dev/ledger/<work-item>/`, which no
push carries. Git carries the commits; consent stays where it was given. So a mid-loop handoff - a
colleague picks the item up on their machine, or you move machines - is a procedure, not a copy: a
bundle committed on the feature branch carries the record, and the receiving operator confirms the
contract themselves rather than inheriting someone else's yes.

Hand off at a pass boundary: every step committed, `receipts.md` current. Uncommitted work does not
travel - name it and commit it (or hand it off as explicitly lost) before bundling.

## Sending: the bundle travels on the branch

The bundle rides in git on the feature branch - never the ledger directory, which is local. It carries
three files copied out of it: `contract.md` (the operator's approval line rides inside it),
`receipts.md`, and `review.md` where a verdict exists. Progress needs no file of its own - git history
is the authoritative progress source, and the receiving resume recomputes from `git log` plus the
receipts.

```bash
l="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/.better-dev/ledger/<work-item>"
h="handoff/<work-item>"
mkdir -p "$h"
cp "$l/contract.md" "$l/receipts.md" "$h/"
cp "$l/review.md" "$h/" 2>/dev/null || true
git add "$h" && git commit -m "<work-item>: handoff bundle" && git push origin "<branch>"
```

An item handed off before its contract was approved carries no approval line - the bundle holds what
exists, and pick-up then starts at the front-end's own confirm rather than step 3 below.

The bundle sits at the repo root, never under `.better-dev/`. That directory holds the ledger, which is
local by design and commonly gitignored whole, so a bundle placed inside it is a bundle git refuses to
carry - and the failure is silent, because `git add` on an ignored path succeeds and commits nothing.
Confirm it anyway before committing: `git check-ignore -q "$h"` exiting 0 means this repo ignores the
root path too, and the handoff needs a path it does not.

## Picking up: re-establish, then trust nothing on the record

1. **Enter the branch.** Fetch, then let this skill's detection find or create the worktree for the
   branch on the receiving machine.
2. **Rebuild the local ledger from the bundle.** Copy the bundle's files into this machine's
   `.better-dev/ledger/<work-item>/`, resolving the primary checkout the same way the send did. The
   bundle is the record; a pre-existing local ledger for the same slug is a naming collision to
   resolve first, not something to merge into.
3. **Re-confirm the contract here.** The receiving operator reads it and says yes, and that yes is
   written into `contract.md` as a fresh approval line quoting them, dated. The sending operator's
   line is evidence of what *they* approved, never a substitute: consent is per-operator. Nothing
   checks this mechanically, which is exactly why the line is written rather than assumed - an item
   driving on the sender's approval alone has nobody on this machine who agreed to it.
4. **Re-run the last recorded green before trusting it.** From the receipts, re-run the check for the
   most recently settled criterion. A green recorded on another machine is a claim like any other - the
   same rule resume applies after a crash (`/autonomous-loop`'s restart notes) - and one that comes
   back red resets that criterion to unmet before any new work. Environment differences between the two
   machines surface exactly here, as a red to triage rather than a false floor to build on.
5. **Remove the bundle once ingested.** `git rm -r` the handoff directory in one commit, so transport
   files never ride into the PR. The review verdict carried over stays useful only while HEAD is the
   reviewed sha - `/pr-and-verify` already refuses a stale one - and this removal commit moves HEAD, so
   expect the final review to re-run; the bundle saves the contract and consent conversation, not the
   verdict.

The sending machine's ledger stays as its own record; nothing there is deleted by a handoff. Two
machines driving the same item at once is the one state this procedure cannot make safe - the sender
stops driving at the bundle commit, and says so.
