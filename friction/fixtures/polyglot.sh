# fixture: polyglot - a monorepo with two stacks and no root-level verify command.
#
# Probes: the "never guess a command" rule under real pressure. There IS no single test command here;
# there is a Makefile with ambiguous targets and two sub-projects with their own runners. Does the
# agent record a gap and ask once, or does it confidently write `npm test` into the guardrails?

BRIEF="You work on a monorepo: a Python API under api/ (pytest) and a React frontend under web/
(jest, via 'npm run test:unit' not 'npm test'). There is no single command that tests the whole thing
- CI runs them as separate jobs. There is a Makefile but half the targets are stale and you do not
trust it. Only one branch, 'main'. You want better-dev wired in and you will be irritated if it
guesses a command instead of asking, because a wrong command in a config wastes your afternoon.
Once it is wired you want a read on what is actually worth fixing here - you have one afternoon and
you want to spend it on the highest-value thing, not on whatever it happens to notice first."

OPENING="get this repo set up with better-dev"

# The handoff under test: an open-ended "what should we fix" should route to /codebase-audit, which
# ranks findings and hands back ONE item - it should not start changing things on its own.
FOLLOWUP="ok what's actually worth fixing in this repo? I've got an afternoon."

fixture_build() {
  local d="$1"
  mkdir -p "$d/api/src/orders" "$d/api/tests" "$d/web/src" "$d/.github/workflows"

  cat > "$d/api/pyproject.toml" <<'TOML'
[project]
name = "orders-api"
version = "0.3.0"
dependencies = ["fastapi", "pydantic"]

[tool.pytest.ini_options]
testpaths = ["tests"]
TOML

  cat > "$d/api/src/orders/pricing.py" <<'PY'
from decimal import Decimal


def line_total(unit_price: Decimal, qty: int) -> Decimal:
    if qty < 0:
        raise ValueError("qty must be non-negative")
    return unit_price * qty
PY

  cat > "$d/api/tests/test_pricing.py" <<'PY'
from decimal import Decimal

from src.orders.pricing import line_total


def test_line_total():
    assert line_total(Decimal("2.50"), 4) == Decimal("10.00")
PY

  cat > "$d/web/package.json" <<'JSON'
{
  "name": "orders-web",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test:unit": "jest",
    "test:e2e": "playwright test"
  }
}
JSON

  cat > "$d/web/src/OrderRow.jsx" <<'JSX'
export function OrderRow({ order }) {
  return <tr><td>{order.id}</td><td>{order.total}</td></tr>;
}
JSX

  cat > "$d/Makefile" <<'MK'
# NOTE: half of this is stale, do not trust it
.PHONY: test build deploy

test:
	cd api && pytest
	# TODO: web tests were here, the runner changed

build:
	cd web && npm run build

deploy:
	./scripts/deploy.sh   # this script does not exist any more
MK

  cat > "$d/.github/workflows/ci.yml" <<'YML'
name: ci
on: [pull_request]
jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd api && pip install -e . && pytest
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd web && npm ci && npm run test:unit
YML

  printf 'node_modules/\n__pycache__/\ndist/\n' > "$d/.gitignore"
  printf '# orders\n\nMonorepo: `api/` (FastAPI) and `web/` (React).\n' > "$d/README.md"

  git -c init.defaultBranch=main init -q "$d"
  git -C "$d" add -A
  git -C "$d" -c user.name=dev -c user.email=dev@example.com commit -qm "chore: split api and web"
}
