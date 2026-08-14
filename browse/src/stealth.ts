/**
 * better-dev vendored stub. Upstream gstack ships anti-bot stealth patches
 * here (navigator.webdriver masking, chrome.* shape restoration, per-install
 * hardware spoofing). That capability is deliberately CUT from this vendor:
 * better-dev drives its own running app, not bot-defended third parties.
 *
 * The no-op exports keep upstream call sites in browser-manager.ts
 * byte-identical, which keeps upstream sync diffs trivial (see UPSTREAM).
 * ponytail: re-vendor upstream browse/src/stealth.ts if a scrape-shaped
 * need is ever ratified.
 */
import type { BrowserContext } from 'playwright';

/** Upstream: blink-level anti-automation launch flags. Here: none. */
export const STEALTH_LAUNCH_ARGS: string[] = [];

/** Upstream: per-install hardware/GPU/UA-CH override flags. Here: none. */
export function buildGStackLaunchArgs(): string[] {
  return [];
}

/**
 * Upstream: Playwright default args to suppress (automation tells).
 * Here: `false` = keep every Playwright default arg (Playwright accepts
 * boolean | string[]; an empty array means the same thing).
 */
export const STEALTH_IGNORE_DEFAULT_ARGS: string[] = [];

/** Upstream: injects JS stealth init scripts. Here: no-op. */
export async function applyStealth(_context: BrowserContext): Promise<void> {}
