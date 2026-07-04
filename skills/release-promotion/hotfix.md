# Hotfixes - land the fix on both branches

A hotfix skips the integration branch because production can't wait for the soak. That shortcut has
one cost: the fix now lives on the release branch but not on integration, and the **next** promote
fast-forwards the release branch onto integration - which doesn't have the fix - quietly undoing it.
So a hotfix isn't done when it reaches production; it's done when it reaches *both* branches.

Branch names come from the overrides read in the main body (`release` defaults to `main`,
`integration` to `staging`).

## The shape

1. **Branch off the release branch.** `/worktree-branching` already bases `hotfix/<slug>` on
   `main` - let it create the worktree rather than hand-rolling `git worktree add`.
2. **Fix and prove it.** Drive the change with `/autonomous-loop` to a real green check, and run
   `/review` before it lands - a hotfix under incident pressure is exactly when a skipped review
   bites.
3. **Merge to the release branch and tag.** Same fail-closed discipline as a normal promote: CI
   green on the fix, then fast-forward or merge into `main` and tag the patch release.

   ```bash
   git switch "$release" && git merge --no-ff "hotfix/$slug" -m "hotfix: $slug"
   hotfix_sha=$(git rev-parse HEAD)
   git tag -a "$version" -m "hotfix $version" && git push origin "$release" "$version"
   ```

4. **Back-merge into integration - the step that's easy to forget.** Bring the release branch's new
   history into integration so the fix survives the next promote:

   ```bash
   git switch "$integration" && git merge --no-ff "origin/$release" -m "back-merge hotfix $version"
   git push origin "$integration"
   ```

   Merging the whole release branch (rather than cherry-picking the fix commit) keeps the two
   branches' histories reconciled, so the later `main`-is-ancestor-of-`staging` gate passes cleanly
   instead of reporting `DIVERGED`.

## Prove the fix reached both

Don't assume the merges took - confirm the fix commit is an ancestor of each branch:

```bash
git merge-base --is-ancestor "$hotfix_sha" "origin/$release"     && echo "on release"
git merge-base --is-ancestor "$hotfix_sha" "origin/$integration" && echo "on integration"
```

Both lines have to print. If integration is missing it, the back-merge didn't land - resolve it now,
while the context is fresh, not at the next promote when the gate blocks and no one remembers why.

## Record it

```bash
printf 'hotfix: %s\ncommit: %s\non: %s + %s\n' "$version" "$hotfix_sha" "$release" "$integration" \
  | .better-dev/bin/bd-mem ledger put "hotfix-$slug" hotfix.md -
```

If the incident taught something durable - a gap in CI that let the bug through, a fragile path -
that's a `bd-mem learn`, so the next planning pass sees it.
