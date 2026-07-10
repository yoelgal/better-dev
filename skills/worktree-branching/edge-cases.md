# Worktree detection - the trickier cases

## Submodule vs worktree

`GIT_DIR != GIT_COMMON` is also true inside a git submodule, which is *not* a worktree. Before
concluding "already isolated," rule out a submodule:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```

If that prints a path, this is a submodule - treat it as a normal checkout and continue to Step 1.
Only an empty result confirms a real linked worktree.

## Detached HEAD

An externally-managed workspace can be on a detached HEAD with no branch. Don't try to branch off it
or remove it - report it as an isolated, externally-managed workspace; a branch gets created at finish
time, and teardown defers to the platform's workspace-exit tool rather than `git worktree remove`.

## Native tool present - don't double up

When the harness provides its own worktree primitive (`EnterWorktree`, `WorktreeCreate`, a
`/worktree` command, a `--worktree` flag), it already handles directory placement, branch creation,
and cleanup. Running `git worktree add` next to it creates a second, phantom worktree the harness
can't track. Use the native tool and skip the git fallback entirely - this holds even under time
pressure, where reaching for the familiar `git worktree add` is the tempting mistake.

Placement belongs to the native tool too: its own default directory wins (Claude Code:
`.claude/worktrees/`), and `.worktrees/` is the git fallback's default - passing it to the native
tool trips the host's permission gate on a model-supplied location, friction for zero gain. The
one legitimate hybrid is honoring the base: when native creation can only branch off the repo's
default branch and the base is the integration branch, look for a host knob first (Claude Code:
`worktree.baseRef: head` while the session sits on the base - worth recording at onboard); only
without one create via git off the base and enter the result by path, naming the relocation
prompt as expected when it fires.

## Placement override - sibling directory

The default is `.worktrees/<slug>` inside the repo (gitignored, easy to discover). Some workflows
prefer a sibling of the primary checkout instead - `../<repo>-<slug>` - which keeps the repo tree
clean. If an override or an existing sibling layout is present, honor it:

```bash
main_root=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
repo=$(basename "$main_root")
path="$(dirname "$main_root")/$repo-$slug"
```

A sibling path lives outside the repo, so it needs no `.gitignore` entry - but it also isn't
discoverable from inside the repo, which is why `.worktrees/` is the default.

## Sandbox denial

If `git worktree add` fails with a permission error (a sandbox blocking directory creation), say so
plainly and work in the current directory instead - run setup and a baseline check in place. Don't
retry with force; the isolation simply isn't available in that environment.

## Dirty in-place re-run

When Step 0 lands you already inside the target worktree and there are uncommitted changes, don't
reset or recreate anything - surface the dirty state and let the operator decide whether to commit or
stash. A re-run fills only what's missing; it never discards work sitting in the tree. And a diff you
did not author isn't a re-run to fill in at all - it's the concurrent-actor case from the skill body:
leave it, don't fold it into your commit, don't reset it away.
