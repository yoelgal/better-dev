# Per-stack guardrail recipes

Concrete detection signals and hook recipes for the common stacks. Read the row for the stack you are in;
every recipe wires the repo's **detected** commands, never an invented one. Where a check is absent, leave
it out of the hook and report the gap.

## Detecting the checks

| Signal (file at root) | Real check commands to read for |
| --- | --- |
| `package.json` `scripts` | `lint`, `typecheck`, `test` → the matching `npm`/`pnpm`/`yarn`/`bun run <script>` |
| `Makefile` with `lint:` / `test:` targets | prefer `make <target>` - a Makefile usually wants to be the single entrypoint |
| `pyproject.toml` / `setup.cfg` | `ruff check` / `flake8`, `mypy .`, `pytest` - prefix with the project runner (poetry/uv/hatch) if present |
| `go.mod` | `go vet ./...` or `golangci-lint run`, `go build ./...`, `go test ./...` |
| `Cargo.toml` | `cargo clippy`, `cargo test` |

Detect the package manager for a Node repo by its lockfile: `package-lock.json` → npm, `pnpm-lock.yaml` →
pnpm, `yarn.lock` → yarn, `bun.lockb` → bun. Default to npm when none is clear.

## Node - Husky + lint-staged

If `.husky/` already exists, the repo has a hook - read it, add only missing checks, do not re-init.
Otherwise the operator runs the installer (interactive, so emit it as a paste-ready block):

```bash
<pm> add -D husky lint-staged   # devDependencies
npx husky init                  # creates .husky/ and adds "prepare": "husky" to package.json
```

Then write `.husky/pre-commit` (Husky v9+ needs no shebang) with only the checks the repo actually has -
drop any line whose script is absent:

```
npx lint-staged
<pm> run typecheck
```

And `.lintstagedrc` for staged-file formatting, using whatever formatter the repo already configures
(Prettier if present; do not add one where the repo has none):

```json
{ "*": "prettier --ignore-unknown --write" }
```

Leave any existing `.prettierrc` / `eslint` config untouched - a formatter config already in the repo is
the operator's, not yours to replace.

## Python - the `pre-commit` framework

If `.pre-commit-config.yaml` exists, add missing hooks to it in place rather than rewriting it. Absent, a
minimal config wiring the repo's real linters:

```yaml
repos:
  - repo: local
    hooks:
      - id: ruff
        name: ruff
        entry: ruff check
        language: system
        types: [python]
      - id: mypy
        name: mypy
        entry: mypy
        language: system
        types: [python]
```

Install the hook (interactive-ish - emit as a block): `pre-commit install`. Only include a hook whose tool
the repo already uses.

## Anything else - a native hook

No framework, no Node/Python tooling: a plain `.git/hooks/pre-commit` running the detected commands. Only
write it if none exists (never clobber a native hook the operator wrote):

```sh
#!/usr/bin/env sh
set -eu
<detected lint command>
<detected typecheck command>
```

`chmod +x .git/hooks/pre-commit`. A native hook is not committed with the repo, so pair it with a CI check
so the gate survives a fresh clone.

## CI check

One workflow running the same detected commands on push / PR. GitHub form
(`.github/workflows/checks.yml`) - adapt the setup step and commands to the stack, and to the host if the
remote is not GitHub:

```yaml
name: checks
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # setup step for the stack (actions/setup-node, setup-python, setup-go, …)
      - run: <detected lint command>
      - run: <detected typecheck command>
      - run: <detected test command>
```

Add it only when no workflow already runs these checks. An existing CI file is off-limits.

## Agent-side git safety (Claude Code)

A `PreToolUse` Bash hook that refuses destructive git before it runs - offered, not imposed, and only for a
host that supports it. A small script reads the tool input, matches the command against a blocked-pattern
list (`git push`, `git reset --hard`, `git clean -fd`, `git branch -D`, `git checkout .` / `git restore .`,
`--force`), and exits non-zero with a short message when it hits one; otherwise exits 0. Wire it into the
target settings (`.claude/settings.json` for this project, `~/.claude/settings.json` for all projects) under
`hooks.PreToolUse` with a `Bash` matcher, **merging** into any existing hooks array rather than replacing it.
Ask which patterns the operator wants before writing, and confirm the scope. Other hosts express the same
idea through their own pre-execution hook, or go without - `/worktree-branching` already isolates the risk.
