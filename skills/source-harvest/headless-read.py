#!/usr/bin/env python3
"""Headless full-page read with the operator's imported cookie jar.

The primary capture tool for source-harvest page reads: renders any page in
headless Chromium under the operator's own logged-in cookies, so social
sources (x.com threads, Instagram pages, gated articles) extract in the
background without touching the operator's visible browser or stealing focus.

Usage:
    headless-read.py <url> <out-basename> [--cookies jar.txt] [--wait SECS] [--scrolls N]

Writes <out>.html (rendered DOM) and <out>.md (pandoc-cleaned markdown).
The cookie jar is Netscape format - the operator exports it with yt-dlp
(see extraction-recipes.md; the export is operator-run by policy).

Requires: python3 with playwright (plus a fetched chromium), pandoc for the
markdown pass (skipped gracefully when absent).
"""
import argparse, http.cookiejar, subprocess, time

from playwright.sync_api import sync_playwright

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")


def load_jar(path):
    jar = http.cookiejar.MozillaCookieJar(path)
    jar.load(ignore_discard=True, ignore_expires=True)
    out = []
    for c in jar:
        e = c.expires
        if e and e > 1e14:  # Chrome WebKit epoch (microseconds since 1601) leaks through yt-dlp
            e = int(e / 1e6 - 11644473600)
        out.append({
            "name": c.name, "value": c.value, "domain": c.domain,
            "path": c.path, "secure": bool(c.secure),
            "expires": e if e and e > 0 else -1,
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("out")
    ap.add_argument("--cookies")
    ap.add_argument("--wait", type=float, default=6)
    ap.add_argument("--scrolls", type=int, default=4,
                    help="wheel scrolls to pull in lazy-loaded content (replies, feeds)")
    args = ap.parse_args()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 2000})
        if args.cookies:
            ctx.add_cookies(load_jar(args.cookies))
        page = ctx.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=45000)
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass  # feed pages never fully idle; the fixed wait covers it
        time.sleep(args.wait)
        for _ in range(args.scrolls):
            page.mouse.wheel(0, 1500)
            time.sleep(0.8)
        page.mouse.wheel(0, -10000 * args.scrolls)
        time.sleep(0.5)
        html = page.content()
        browser.close()

    with open(f"{args.out}.html", "w") as f:
        f.write(html)
    subprocess.run(["pandoc", "-f", "html", "-t", "gfm-raw_html",
                    f"{args.out}.html", "-o", f"{args.out}.md"], check=False)
    print(f"wrote {args.out}.html ({len(html)} bytes)")


if __name__ == "__main__":
    main()
