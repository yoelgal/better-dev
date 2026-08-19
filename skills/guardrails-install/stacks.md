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

## Detecting the runnable entry points and the migrate mechanism

Same premise discipline: the value is what you read at `file:line`, and a missing signal is a gap to
report, never a command to invent.

| Signal | What it yields |
| --- | --- |
| `package.json` scripts `dev` / `start` | `dev-run: <pm> run dev` (or `start`) |
| `package.json` scripts `seed` / `db:seed` / `db:reset`, or a `prisma.seed` entry | `seed-reset` commands (`npx prisma db seed`, `npx prisma migrate reset`) |
| `package.json` migrate-deploy script, or a migrate line in a deploy workflow | `deploy-migrate: command` / `release-step` |
| `Procfile` | `web:` → the dev-run shape; `release:` → `deploy-migrate: platform-auto` |
| `fly.toml` `release_command` / `render.yaml` `preDeployCommand` | `deploy-migrate: platform-auto` |
| `docker-compose.yml` / `compose.yaml` fronting the app | `dev-run: docker compose up` |
| `Makefile` `run` / `dev` / `seed` targets | prefer `make <target>` |
| `manage.py` (Django) | `dev-run: <runner> manage.py runserver`; a fixtures/`loaddata` or seed command → `seed-reset` |
| `bin/dev` / `db/seeds.rb` (Rails) | `dev-run: bin/dev`; `seed-reset: rails db:seed` / `rails db:reset` |
| `Procfile` `worker:` / a queue config (sidekiq, celery, bullmq) / a jobs workflow with `workflow_dispatch` | `ops-runner` candidates - confirm with the operator which one prod jobs actually use |

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
write it if none exists (never clobber a native hook the operator wrote) - the write and the executable
bit both live outside git's own tracked tree, so emit them as a paste-ready block for the operator to
run, the same as the Husky and `pre-commit` installers above:

```sh
cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env sh
set -eu
<detected lint command>
<detected typecheck command>
EOF
chmod +x .git/hooks/pre-commit
```

A native hook is not committed with the repo, so pair it with a CI check so the gate survives a fresh
clone.

## Secret-content scan (stack-agnostic)

The one line every pre-commit hook gets, including the native fallback - it needs no repo tooling. Prefer a
scanner the repo already has, else a grep over the staged diff for high-signal shapes:

```sh
# prefer a real scanner if the repo carries one:
#   gitleaks protect --staged   |   trufflehog git file://. --since-commit HEAD --only-verified   |   detect-secrets-hook
# otherwise a stack-agnostic grep over the staged diff:
if git diff --cached -U0 | grep -inE '[a-z0-9_]*(api[_-]?key|secret|password|token)[a-z0-9_]*[[:space:]]*[:=][[:space:]]*["'\'']?[A-Za-z0-9+/_=-]{12,}["'\'']?|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}' ; then
  echo "guardrails: possible secret in staged diff (line above) - remove it, or rotate the key if already pushed" >&2
  exit 1
fi
```

It matches on value shape: an assignment of a 12-plus-character literal to a key-named variable, a PEM
block, or an AWS key id. The key word may sit inside a compound identifier (`SECRET_KEY`,
`AWS_SECRET_ACCESS_KEY`), and the value class covers base64 padding (`==`), so a padded key still fires;
there is no end-of-line anchor, so an inline secret with a trailing comment fires too. It does not fire on
a type declaration (`session_token: string;` - the value is too short) or a member-access reference
(`token: session.token,`, `auth.slice('Bearer '.length)` - a dotted identifier is a reference, and a dot
is not key material here, so the run is under the length floor). Code that names tokens is not a
credential; code that carries one is. A hit blocks the commit, not the file - unstage it or, if the secret
already reached a remote, rotate the key (a committed secret is compromised; deleting the line is not
enough).

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

## The committed bash policy

Write this at the repo root as `.omp/config.yml` and commit it - the policy then travels with the repo,
where a machine-global setting would guard only the machine that set it. `bash.patterns` is a
**top-level** key, not nested under `tools:`, and one rule covers one destructive command class:

```yaml
bash:
  patterns:
    # recursive delete
    - match: "rm -r*"
      approval: prompt
    - match: "rm --recursive*"
      approval: prompt
    # history and worktree destruction
    - match: "git push *--force*"
      approval: prompt
    - match: "git push *-f *"
      approval: prompt
    - match: "git reset --hard*"
      approval: prompt
    - match: "git clean -f*"
      approval: prompt
    # infrastructure
    - match: "kubectl delete*"
      approval: prompt
    - match: "docker rm -f*"
      approval: prompt
    - match: "docker system prune*"
      approval: prompt
    # SQL object destruction, which arrives inside a quoted -e argument
    - match: "*DROP TABLE*"
      approval: prompt
    - match: "*DROP DATABASE*"
      approval: prompt
    - match: "*TRUNCATE TABLE*"
      approval: prompt
```

Three properties of the matcher shape every pattern you add. Rules are **ordered and the first match
wins**, so a specific gate goes above any broader allow. A `deny` or `prompt` glob fires on the whole
command **or on any single segment of a compound line** - split on `&&`, `||`, `;`, `|`, a single `&`,
subshells and newlines - so `cd /tmp && rm -rf build` is caught without counting occurrences, and a
leading `*` is needed only where the pattern must match mid-command, as the SQL shapes above do inside a
quoted `-e` argument. An `allow` glob must match the entire command and never applies to a compound line,
so an allow can never vouch for the second half of `git status && rm -rf /`.

Write no trailing `match: "*"` rule. Omitting it leaves the host's own approval mode in charge of
everything these rules do not name, where a catch-all makes this file silently vouch for all of it.

Merge, never replace: a repo that already has `.omp/config.yml` gets the missing patterns added under
`bash.patterns` in place, and a re-run that finds them all present writes nothing.

Prove it before reporting it installed - run a matching command and confirm the host asks, then a
near-miss (`rm file`, `git push`) and confirm it does not. Nothing here gates a write by its path; the
skill body states that coverage limit.
