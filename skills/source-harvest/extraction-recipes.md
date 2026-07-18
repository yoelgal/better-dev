# Extraction recipes (verified on macOS, arm64)

Concrete per-type recipes for stage 1 of `source-harvest`. All verified working
2026-07-07 on macOS (arm64); on another OS keep each recipe's shape - the canonical
capture, then the page read - and swap the tool invocations. Re-verify a recipe
against its tool's --help if it misbehaves before debugging deeper.

## X post (plain text)

Syndication API - x.com blocks plain fetch, this does not need auth:

    curl -s "https://cdn.syndication.twimg.com/tweet-result?id=<TWEET_ID>&token=x"

Gives user, date, text, photos, and for long-form posts the article URL stub. If
`.entities.urls[0].expanded_url` points at `x.com/i/article/...` it is an X Article and
the text is NOT in the JSON - use the browser recipe.

The JSON is the canonical capture (exact text, date, media URLs), not the whole
source. Follow it with the browser full-page read of the thread URL (recipe below):
the rendered page carries what the API cuts - the author's self-replies continuing
the thread, replies and quote-posts worth quoting, and outbound links expanded past
t.co. Quote the high-signal parts into source.md and promote each load-bearing link
to its own ingest item, one hop deep. Skipping the page read is fine only for a
self-contained single post with no links and no thread.

Attached images: the JSON's `.photos[]` array carries public `pbs.twimg.com` URLs -
curl each into `media/` (no auth needed), then transcribe or describe them into
source.md. Downloaded image files are readable by extraction subagents (the
main-agent-only constraint applies to conversation-pasted images, not files on disk).

Images INSIDE an X Article: the preferred outerHTML capture (recipe below) keeps
them as img tags - harvest the `pbs.twimg.com/media/...` URLs from the cleaned
markdown into `media/`. Only the select-all fallback loses them; if forced onto it,
screenshot the rendered page into `media/` and note in source.md which figures were
captured versus skipped - never silently drop them.

## Full-page browser read (X Articles, threads, any authenticated page)

Preferred (verified 2026-07-18): pull the rendered DOM out of Chrome and clean it
with pandoc. Needs View > Developer > Allow JavaScript from Apple Events turned on
(one-time, per profile) - if it is off the osascript errors telling you so; use the
fallback below or ask the operator to flip it.

    osascript <<'EOF' > raw-capture.html
    tell application "Google Chrome" to open location "https://x.com/i/article/<ARTICLE_ID>"
    delay 7
    tell application "Google Chrome" to get execute active tab of front window javascript "document.documentElement.outerHTML"
    EOF
    pandoc -f html -t gfm-raw_html raw-capture.html -o raw-capture.md

No keystrokes, no clipboard, no focus games - and unlike the copy fallback it keeps
every img src: content images are the `pbs.twimg.com/media/...` URLs in the markdown
(`profile_images/` is avatar junk), curl each into `media/`. A slow page can still
hand you the previous tab's DOM, so confirm the capture names the expected
author/title before filing; on a mismatch re-run with a longer delay. This read also
recovers truncated note-tweets: the thread page carries the full text the
syndication API cuts at ~280 chars.

Fallback (setting off, no settings needed): open the page, select-all, copy, read
the clipboard. Frontmost gotcha (hit 2026-07-07): some terminal apps (cmux) stay
frontmost after `activate`, so the keystrokes land in the terminal and you copy your
own session. Force focus inside System Events right before the keystrokes - `set
frontmost of process "Google Chrome" to true`, delay 2 - and apply the same
expected-author check before trusting the clipboard.

    pbpaste > /tmp/clip-backup.txt   # restore the user's clipboard after the batch
    osascript <<'EOF'
    tell application "Google Chrome"
      activate
      open location "https://x.com/i/article/<ARTICLE_ID>"
    end tell
    delay 7
    tell application "System Events"
      keystroke "a" using command down
      delay 0.7
      keystroke "c" using command down
      delay 0.5
    end tell
    EOF
    pbpaste > raw-capture.txt
    cat /tmp/clip-backup.txt | pbcopy

Either way, strip the X page chrome: content starts at the article title, ends
before "Want to publish your own Article?". Keep the author's trailing promo if it is
part of the article body; sed line ranges beat regex here.

## Instagram reel / video

    DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib \
      yt-dlp --cookies-from-browser chrome --write-info-json \
      -o "media/%(id)s.%(ext)s" "<REEL_URL>"
    ffmpeg -y -i media/<id>.mp4 -ar 16000 -ac 1 media/audio.wav
    whisper-cli -m ~/.cache/whisper-models/ggml-base.en.bin -f media/audio.wav \
      -otxt -of transcript

Notes: IG needs the logged-in browser cookies; the DYLD prefix fixes brew Python's
pyexpat mismatch on DASH manifests; whisper output lines start with a space - strip
with `sed 's/^ //'`. Post date comes from `.upload_date` in the info.json.

## GitHub repo

    git clone --depth 1 https://github.com/<owner>/<repo> <scratch>/repos/<owner>-<repo>

Clone to scratch, never into the library. Then dispatch the extraction agent per the
brief in SKILL.md. For npm/PyPI/crates packages use a package-source reading skill,
where the host ships one, instead of guessing from the README.

## Research paper (a post recirculating one)

The paper is the source; the post is only the pointer. Fetch the actual PDF (arXiv:
`curl -sL arxiv.org/pdf/<id>` into scratch, Read with `pages`) and read the main text
before writing the FEEDS summary - the tweet-level summary reliably misses the
load-bearing mechanics and can even misattribute the authors.

## Execution transcript (of a model's own run)

Split prompt-supplied from model-contributed behavior before extracting: the
scaffolding (gates, budgets, receipt standards) harvests as harness patterns; only the
model's own moves harvest as dispositions. Crediting the wrong layer overstates the
model.

## Operator judgement doc (a mined codex of someone's own rules)

Already synthesis, not raw ore: the work is a coverage diff against current skill text,
rule by rule, not extraction - expect most ground already held and the real gaps at the
seams the library deliberately avoided. Get the persona/library ruling first: which
rules universalize into shared skills, and whether any personal persona layer ships at
all.

## Image / screenshot

Only the main agent sees pasted images - transcribe fully yourself into source.md
(structure, headings, margin notes, captions), and copy the temp file into `media/`
IMMEDIATELY: clipboard temp paths under /var/folders vanish.

## Manifest

Per batch, append to the archive's manifest: item, type, status
(extracted/dupe/failed+why), files written. The manifest is what makes "did we ingest
X?" answerable without re-crawling.
