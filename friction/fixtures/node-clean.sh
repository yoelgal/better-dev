# fixture: node-clean - the happy path. Real git history, main + staging, a test script, CI.
#
# Probes: does onboard detect what is already here instead of asking? Does it find `staging` and use
# it as the integration branch without a question? How many questions does the easiest repo cost?

BRIEF="You maintain a small Node/TypeScript service at work. It has tests (vitest, 'npm test'), a
GitHub Actions CI workflow, and you branch off 'staging' and release from 'main'. Everything is
committed and green. You heard about better-dev and want it wired into this repo. You do not want it
changing your CI, your branches, or your scripts.
Once it is wired, the next thing you want is a /convert endpoint on the service - amount plus a
currency pair in, converted minor units out. You have no strong view on how it gets built, but you do
care that your staging branch stays clean."

OPENING="/onboard"

# The handoff under test: a plain feature ask in a wired repo should route to /plan-grill, and the
# work should land in its own worktree off staging - not as edits on the branch you are standing on.
FOLLOWUP="right, now add a /convert endpoint that takes an amount and a currency pair and returns the converted minor units."

fixture_build() {
  local d="$1"
  mkdir -p "$d/src" "$d/test" "$d/.github/workflows"

  cat > "$d/package.json" <<'JSON'
{
  "name": "ledger-api",
  "version": "1.4.2",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
JSON

  cat > "$d/tsconfig.json" <<'JSON'
{ "compilerOptions": { "strict": true, "module": "esnext", "target": "es2022", "outDir": "dist" }, "include": ["src"] }
JSON

  cat > "$d/src/rates.ts" <<'TS'
export function convert(amountMinor: number, rate: number): number {
  if (!Number.isInteger(amountMinor)) throw new TypeError("amountMinor must be minor units");
  return Math.round(amountMinor * rate);
}
TS

  cat > "$d/test/rates.test.ts" <<'TS'
import { expect, test } from "vitest";
import { convert } from "../src/rates.js";

test("converts minor units", () => {
  expect(convert(1000, 1.25)).toBe(1250);
});
TS

  cat > "$d/.github/workflows/ci.yml" <<'YML'
name: ci
on:
  pull_request:
    branches: [staging, main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
YML

  printf 'node_modules/\ndist/\n' > "$d/.gitignore"
  printf '# ledger-api\n\nInternal FX ledger service.\n\n- `npm test` runs the suite\n- branch off `staging`, release from `main`\n' > "$d/README.md"

  git -c init.defaultBranch=main init -q "$d"
  git -C "$d" add -A
  git -C "$d" -c user.name=dev -c user.email=dev@example.com commit -qm "feat: fx conversion helper"
  git -C "$d" branch -q staging
  git -C "$d" checkout -q staging
}
