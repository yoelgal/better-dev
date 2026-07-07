# Removing a worktree when the work-item is done

better-dev's default finish is **push and open a PR into the integration branch, keeping the worktree
alive** so review feedback can be addressed in place. Removal comes later - only once the work is
merged or deliberately abandoned. Getting the order and the ownership check right is what keeps a
teardown from deleting the wrong tree.

## First, the safe order

Three ordering facts, each of which git enforces the hard way if ignored:

- **`cd` to the primary checkout before removing.** `git worktree remove` fails when run from inside
  the tree it's removing.
  ```bash
  primary=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
  cd "$primary"
  ```
- **Remove the worktree before deleting its branch.** `git branch -d` refuses while a worktree still
  has the branch checked out.
- **Prune afterwards.** `git worktree prune` clears any stale registration left behind.

## Then, the ownership proof

Plain `git worktree remove` already refuses a dirty or unregistered tree - reach for it first and let
git guard you. Only escalate to `--force` (or, worse, `rm -rf`) after the guard confirms the target is
genuinely a linked worktree of *this* repo:

```bash
.better-dev/bin/bd-worktree-guard guard "$path" && git worktree remove --force "$path"
```

The guard resolves the real path and refuses unless the target holds a `.git` *file* (a linked
worktree's gitdir pointer, never the primary's `.git` directory) and appears in `git worktree list`
for this repo. Any doubt refuses: a wrongly-refused removal costs a re-run, a wrongly-allowed one costs
a working tree. Never remove a worktree this skill didn't create - a harness-owned or detached-HEAD
workspace belongs to the platform; leave it and let a workspace-exit tool handle it.

## Confirm each destructive step on its own

Removal, `git branch -D`, `rm -rf`, and force-removing a tree are destructive and hard to reverse.
Before running one, state exactly what you're about to run and why, and get confirmation for that
specific action. A yes you got for one destructive step doesn't carry to the next - each `--force`,
each branch delete, each discard is its own gate. The clean test for what needs the gate: anything
you couldn't undo with a `git revert` or a re-clone.

If you realize you already caused data loss - removed the wrong tree, deleted an unmerged branch -
say so immediately and plainly. A quiet repair hides the blast radius; an honest report lets the
operator recover from reflog or a backup while the trail is still warm.

## The finish menu

When the work-item is done and tests are green, offer the choice rather than assuming:

1. **Push + PR into the integration branch** - keep the worktree (default; needed to iterate on
   review).
2. **Merge locally into the base** - then teardown: `cd` primary, merge, re-run tests, remove
   worktree (guard first), delete branch, prune.
3. **Keep as-is** - leave the worktree untouched.
4. **Discard** - destructive. Name what will be lost (branch, unmerged commits, worktree path) and
   wait for the operator to type `discard` before removing the worktree (guard first) and
   `git branch -D`.

## Restart-from-contract note

When the autonomous loop resets a stuck work-item, it removes and recreates the worktree off the base
recorded in the ledger (`worktree.md`), then replays the contract. That reset routes through the same
guard and the same safe order - it never force-removes a path it hasn't proven it owns.
