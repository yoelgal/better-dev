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

## Secret-content scan (stack-agnostic)

The one line every pre-commit hook gets, including the native fallback - it needs no repo tooling. Prefer a
scanner the repo already has, else a grep over the staged diff for high-signal shapes:

```sh
# prefer a real scanner if the repo carries one:
#   gitleaks protect --staged   |   trufflehog git file://. --since-commit HEAD --only-verified   |   detect-secrets-hook
# otherwise a stack-agnostic grep over the staged diff:
if git diff --cached -U0 | grep -nE '(api[_-]?key|secret|password|token)[[:space:]]*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}' ; then
  echo "guardrails: possible secret in staged diff (line above) - remove it, or rotate the key if already pushed" >&2
  exit 1
fi
```

It matches on shape, so it false-positives on a variable literally named `token`; that is the safe
direction. A hit blocks the commit, not the file - unstage it or, if the secret already reached a remote,
rotate the key (a committed secret is compromised; deleting the line is not enough).

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
      - run: <frozen-lockfile install: npm ci | pnpm i --frozen-lockfile | poetry install --sync | cargo build --locked>
      - run: <detected lint command>
      - run: <detected typecheck command>
      - run: <detected test command>
      - run: <ecosystem audit: npm audit --omit=dev | pip-audit | cargo audit>   # supply-chain gate, its own step
```

Add it only when no workflow already runs these checks. An existing CI file is off-limits. The frozen-lockfile
install and the audit step are the supply-chain gate: a run resolves the committed tree, not a drifted one,
and a known-vulnerable dependency fails the gate rather than shipping green.

## Agent-side git safety (Claude Code)

A `PreToolUse` Bash hook that refuses destructive git before it runs - offered, not imposed, and only for a
host that supports it. A small script reads the tool input, matches the command against a blocked-pattern
list (`git push`, `git reset --hard`, `git clean -fd`, `git branch -D`, `git checkout .` / `git restore .`,
`--force`), and exits non-zero with a short message when it hits one; otherwise exits 0. Wire it into the
target settings (`.claude/settings.json` for this project, `~/.claude/settings.json` for all projects) under
`hooks.PreToolUse` with a `Bash` matcher, **merging** into any existing hooks array rather than replacing it.
Ask which patterns the operator wants before writing, and confirm the scope. Other hosts express the same
idea through their own pre-execution hook, or go without - `/worktree-branching` already isolates the risk.

The same hook can refuse the obfuscated-shell injection class - a command that hides or assembles another
command - which is the real prompt-injection vector, distinct from a straight destructive command. High-signal
shapes to add to the blocked list (these are near-always injection, rarely legitimate):

```sh
# refuse: parameter-transform / indirection / eval-like construction
grep -qE '\$\{[A-Za-z_][A-Za-z0-9_]*@P\}|\$\{![A-Za-z_]|\beval\b|\|[[:space:]]*(ba)?sh\b' <<<"$COMMAND"
```

Keep the message short and the exit non-zero. For a real-world irreversible side effect the hook cannot see
(a remote resource delete, a prod write), the discipline lives in the loop and `/security-pass`, not the
hook: confirm that specific action, and a prior approval does not extend to the next one.
