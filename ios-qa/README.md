# ios-qa - vendored live-device iOS QA daemon

Live-device QA for SwiftUI apps on a real iPhone over USB, vendored from gstack
(https://github.com/garrytan/gstack, `ios-qa/`, MIT, commit `11de390`, vendored 2026-07-07 -
see `UPSTREAM` and `LICENSE-upstream`). A Mac-side bun/TS daemon bridges USB CoreDevice (IPv6)
to a Debug-only `StateServer` compiled into the app under test, exposing screenshot,
element-tree, state-snapshot, and touch endpoints. No simulator, no XCTest, no WebDriverAgent.

The practice that decides *when and how* to use this lives in `skills/ios-capability/` - this
directory is only the tool. Upstream's orchestration prompt (`SKILL.md` / `SKILL.md.tmpl`) is
deliberately not vendored; this README replaces it as the operational guide.

**Not CI-gated.** Nothing here runs in `bd-package-check` or any repo gate - the daemon needs
macOS, Xcode, and a paired USB iPhone, which no CI runner has. It is exercised only when an
iOS work-item's done-criteria actually drive a device. The directory is self-contained:
the daemon imports only the node stdlib (bun runs the TS directly, no install step, no
package.json), and the Swift codegen tool builds on first use.

## Layout

| Path | What |
|---|---|
| `daemon/src/` | Mac daemon: token mint/rotation, allowlist, Tailscale WhoIs, flock singleton, audit, device proxy |
| `daemon/test/` | bun tests for the daemon (`bun test ios-qa/daemon/test/`, runs Mac-only) |
| `templates/` | Swift/ObjC sources compiled into the target app's Debug build: StateServer, touch synthesis, `AGENT DEMO` overlay, SPM package |
| `scripts/gen-accessors-tool/` | standalone SPM tool: parses `@Observable`/`@Snapshotable` source, emits typed accessors |
| `docs/tailscale-acl-example.md` | tailnet exposure walkthrough for remote-agent mode |

## Architecture

```
gstack-ios-qa daemon (Mac, bun/TS)  --USB CoreDevice (IPv6)-->  iOS app StateServer
  boot-token rotate, session mint,      bearer + X-Session-Id     loopback only (::1 + 127.0.0.1)
  allowlist, audit + redact                                       /tap /swipe /type /state /snapshot
        ^
        | Tailscale (optional, --tailnet)
  remote agent
```

The app's `StateServer` binds loopback only; tailnet ingress is exclusively the daemon's job.
The daemon validates Tailscale identities via the local `tailscaled` socket and mints
short-lived session tokens for remote agents.

## Prerequisites

- macOS with Xcode (the daemon shells to `devicectl`); Swift >= 5.9.
- iPhone connected via USB, paired and trusted.
- bun installed (runs the daemon TS directly).
- App source on disk with at least one `@Observable` class.
- For remote-control mode only: Tailscale installed and logged in.

## Running it

1. **Generate accessors.** `swift run --package-path ios-qa/scripts/gen-accessors-tool
   gen-accessors --input <app-source-dir>`. First run builds swift-syntax (cold: 2-5 min);
   later runs are content-hash-cached (~50ms). Show the operator the accessor list before
   touching their `Package.swift`.
2. **Wire the bridge.** Add the `DebugBridge` SPM dependency (from `templates/
   Package.swift.template`) to the app's `Package.swift`; every bridge product is gated
   `.when(configuration: .debug)`, so release builds refuse to link them. Wire startup from
   the `@main` App init inside `#if DEBUG` (see `templates/DebugBridgeWiring.swift.template`).
3. **Build + launch on device.** `xcodebuild -scheme <Scheme> -destination
   'platform=iOS,id=<UDID>' build install`, then `devicectl device process launch --device
   <UDID> --console <bundle-id>`. The app prints a boot token to `os_log` at launch.
4. **Start the daemon.** `GSTACK_IOS_TARGET_UDID=<UDID> GSTACK_IOS_TARGET_BUNDLE_ID=<bundle-id>
   bun ios-qa/daemon/src/index.ts` (add `--tailnet` for remote mode; port via
   `GSTACK_IOS_DAEMON_PORT`, default 9099). The daemon takes an exclusive flock on
   `~/.gstack/ios-qa-daemon.pid` (a second invocation discovers the live one) and immediately
   rotates the boot token to a fresh in-memory-only token - anything scraping `os_log` a few
   seconds later sees a dead credential.
5. **Drive the loop.** Each iteration: `GET /screenshot`, `GET /elements`,
   `GET /state/snapshot`, decide, `POST /session/acquire`, act (`POST /tap` / `/swipe` /
   `/type` / `/state/<key>`), re-screenshot and compare, `POST /session/release`.

## Modes and capability tiers

**Local-USB (default).** Daemon binds loopback only; full command surface for the spawning
agent.

**Tailnet (`--tailnet`).** Daemon additionally binds the Tailscale interface, never `0.0.0.0`.
Fails closed if the `tailscaled` socket is missing, permission-denied, or WhoIs is
unparseable. Remote agents mint via `POST /auth/mint`; the allowlist at
`~/.gstack/ios-qa-allowlist.json` is the single source of truth, managed with
`bun ios-qa/daemon/src/cli-mint.ts grant|revoke|list --remote <identity> [--capability
<tier>]` (upstream ships this as `gstack-ios-qa-mint`). Every authenticated mutating tailnet
request writes an audit row to `~/.gstack/security/ios-qa-audit.jsonl`. See
`docs/tailscale-acl-example.md`.

Minted tokens default to `interact`; higher tiers require explicit owner mint:

- **observe:** `/screenshot`, `/elements`, `GET /state/*`, `/healthz`, `/session/heartbeat`
- **interact:** observe + `/tap`, `/swipe`, `/type`
- **mutate:** interact + `POST /state/<key>`
- **restore:** mutate + `POST /state/restore`

**Recording (`--recording`).** The overlay renders a diagonal `AGENT DEMO` watermark so
screencasts are unambiguous about the device being agent-driven.

**Demonstration runs.** When a human asked to see it working, every action goes through the
visible UI (`/tap`, `/swipe`, `/type`) and never through `POST /state/*` writes that skip
steps - a teleported state invalidates the demonstration even though it passes the same check.

## Failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| `curl: connection refused` to daemon | daemon crashed | restart it; the flock spawn-race fails closed |
| `403 identity_not_allowed` from `/auth/mint` | identity missing from allowlist | owner grant via `cli-mint.ts` on the Mac |
| `409 schema_mismatch` on `/state/restore` | snapshot from an older app build | discard the snapshot; re-capture |
| `503 device_disconnected` from proxy | USB tunnel dropped | reconnect device; daemon auto-reconnects within 30s |
| `429 rate_limited` from `/auth/mint` | >10 mints/min from one identity | wait 60s; check the audit log |
| `413 body_too_large` on `/state/restore` | snapshot >1MB | raise `--max-body` or trim the snapshot |

## Cleanup before release

Removing the wiring by hand is a convenience; the structural guard is the safety-critical
path: the SPM products stay gated `.when(configuration: .debug)`, and the work-item's verify
runs `swift build -c release` and asserts no bridge symbols survive. A bridge that links in a
release build fails the work-item (see `skills/ios-capability/`).
