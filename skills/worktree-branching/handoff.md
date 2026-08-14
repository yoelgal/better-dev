# Handing a half-finished work-item to another machine

The loop's consent gates are per-machine by design: the pinned contract, the approval hash, and the
review verdict live in the primary checkout's gitignored ledger and never travel with a push. Git
carries the commits; consent stays where it was given. So a mid-loop handoff - a colleague picks the
item up on their machine, or you move machines - is a procedure, not a copy: a bundle committed on the
feature branch carries the record, and the receiving side re-establishes consent rather than importing
it.

Hand off at a pass boundary: every step committed, `receipts.md` current. Uncommitted work does not
travel - name it and commit it (or hand it off as explicitly lost) before bundling.

## Sending: the bundle travels on the branch

The bundle rides in git on the feature branch - never the ledger, which is gitignored and local. It
carries exactly four things: the contract bytes, the approval consent hash, the review verdict with its
reviewed-HEAD sha (when one exists), and the receipts so far. Progress needs no file of its own - git
history is the authoritative progress source, and the receiving resume recomputes from `git log` plus
the receipts.

```bash
h=".better-dev/handoff/<work-item>"
mkdir -p "$h"
.better-dev/bin/bd-mem ledger read <work-item> contract.md  > "$h/contract.md"
.better-dev/bin/bd-mem ledger read <work-item> receipts.md  > "$h/receipts.md"
.better-dev/bin/bd-mem ledger read <work-item> .approved    > "$h/consent.hash" 2>/dev/null || rm -f "$h/consent.hash"
.better-dev/bin/bd-mem ledger read <work-item> review.md    > "$h/review.md"    2>/dev/null || rm -f "$h/review.md"
git add "$h" && git commit -m "<work-item>: handoff bundle" && git push origin "<branch>"
```

An item handed off before its contract was approved carries no consent hash - the bundle holds what
exists, and pick-up then starts at the front-end's own confirm-and-approve rather than step 3 below.

Confirm git will actually carry it before committing: `git check-ignore -q "$h"` exiting 0 means the
path is ignored in this repo (a fully-gitignored `.better-dev/` layout) - put the bundle at
`handoff/<work-item>/` in the repo root instead.

## Picking up: re-establish, then trust nothing on the record

1. **Enter the branch.** Fetch, then let this skill's detection find or create the worktree for the
   branch on the receiving machine.
2. **Rebuild the local ledger from the bundle.** `bd-mem ledger init <work-item>`, then `ledger put`
   the bundle's `contract.md`, `receipts.md`, and `review.md` (when present) over the scaffolded
   files. The bundle is the record; a pre-existing local ledger for the same slug is a naming
   collision to resolve first, not something to merge into.
3. **Check the carried consent.** Hash the bundle's contract (`shasum -a 256`, first field) and compare
   it to `consent.hash`. A match proves these are the exact bytes the sending operator approved; a
   mismatch means the contract moved after that approval - name it when asking for the confirm below.
4. **Re-pin consent here.** The receiving operator reads the contract and confirms it, then
   `.better-dev/bin/bd-mem ledger approve <work-item>`. The carried hash is evidence of what was
   approved on the sending machine, never a substitute for this machine's approve - consent is
   per-operator, and the loop's `check-approval` gate only passes on a pin made here.
5. **Re-run the last recorded green before trusting it.** From the receipts, re-run the check for the
   most recently settled criterion. A green recorded on another machine is a claim like any other - the
   same rule resume applies after a crash (`/autonomous-loop`'s restart notes) - and one that comes
   back red resets that criterion to unmet before any new work. Environment differences between the two
   machines surface exactly here, as a red to triage rather than a false floor to build on.
6. **Remove the bundle once ingested.** `git rm -r` the handoff directory in one commit, so transport
   files never ride into the PR. The review verdict carried over stays useful only while HEAD is the
   reviewed sha - `/pr-and-verify` already refuses a stale one - and this removal commit moves HEAD, so
   expect the final review to re-run; the bundle saves the contract and consent conversation, not the
   verdict.

The sending machine's ledger stays as its own record; nothing there is deleted by a handoff. Two
machines driving the same item at once is the one state this procedure cannot make safe - the sender
stops driving at the bundle commit, and says so.
