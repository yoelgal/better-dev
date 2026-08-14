# browse - the owned browser daemon

better-dev's vendored, cut-down port of gstack's `browse/`: a long-lived localhost Chromium daemon
with sub-second commands, a stale-safe `@ref` accessibility system, a deny-default CDP allowlist,
cheap L1-L3 injection invariants, and Keychain-gated cookie import. It exists so
`skills/browser-capability` can prove browser-shaped done-criteria against an owned tool instead of
re-sourcing one every run.

## Provenance

Adapted near-verbatim from [garrytan/gstack](https://github.com/garrytan/gstack) (MIT), vendored
2026-07-07 at upstream commit `11de390` (VERSION 1.58.5.0). gstack's MIT license rides in
`LICENSE-upstream`; the pin and the security files tracked for upstream drift live in `UPSTREAM`;
`scripts/check-upstream.sh` goes red when upstream changes a tracked security file (run
`scripts/check-upstream.sh selftest` for the offline self-check). Upstream file paths and names are
mirrored so sync diffs stay trivial.

## What was cut, and why

- **ngrok/tunnel + pair-agent** (dual listener, `/pair`, `/connect`, `/tunnel/*`, scoped setup keys) -
  remote-agent sharing is not a loop need; cutting it makes localhost-only literally true. The daemon's
  entire network surface is now `127.0.0.1:<random port>` + bearer token.
- **ML injection-classifier ensemble** (`security-classifier`, sidecar, 112MB-721MB model downloads) -
  the load-bearing defense is the kept L1-L3 static invariants plus `/security-pass` discipline; the
  heavy ML layer was optional upstream and cannot even load from the compiled binary.
- **Chrome extension glue** (sidebar routes, SSE session cookies, inspector HTTP surface, activity
  stream endpoints) - the loop is headless and agent-driven; no extension is vendored.
- **Branded browser** (macOS `Info.plist` rebrand, Dock icon swap, stock-Chrome UA spoof) - `--headed`
  on the core daemon covers watch-a-flow debugging; branding is distribution, not QA.
- **Sidebar/PTY** (`terminal-agent`, PTY leases and cookies, `/pty-*` routes) - product surface for the
  extension we do not ship.
- **Telemetry** and **gbrain hooks** (`telemetry.ts`, `memory-command`) - theirs, and better-dev's
  constitution bans the cross-project brain.
- **Stealth** (`stealth.ts` anti-bot patches) - we drive our own running app, not bot-defended third
  parties. A no-op stub keeps upstream call sites byte-identical.
- **Skillify/domain-skills, `find-browse`/`browse-client`, Windows node bundle, the 27MB
  security-bench fixture** and the tests/fixtures serving only cut components.

Kept: core daemon (`server.ts`, `browser-manager.ts`, `cli.ts`, command handlers), the `@ref`
snapshot system, `cdp-allowlist.ts` (byte-identical - it is the security artifact),
`content-security.ts` + `sanitize.ts` + `security.ts`, cookie import
(`cookie-import-browser.ts` + picker), `token-registry.ts`, proxy/SOCKS bridge, xvfb, and the test
suite for that surface.

## Compile on first need

Nothing here builds at better-dev install time and no binaries are committed. The first time a work
item needs the daemon:

```
cd browse
bun install            # bun >= 1.0
bun run build          # -> dist/browse (~55MB self-contained binary)
```

`bun run src/cli.ts <command>` works uncompiled while iterating. A Chromium must exist once:
a detected Chrome, or `bunx playwright install chromium` (~170MB). Graceful degrade: no bun, no
network, or a declined install means `skills/browser-capability` falls through to its
`/tool-sourcing` rung; a criterion that still cannot run is `NEEDS_INPUT`, never a silent skip.
macOS/Linux carry the full feature set; Windows rides the fallback path.

## Cookie import needs first-use approval

`cookie-import-browser` decrypts the user's real browser cookies via the macOS Keychain (in-process,
read-only temp copy, values never logged). That is a trust decision: before the first cookie import
in a project, the agent must ask the user explicitly and record the answer. Never run it unprompted.
