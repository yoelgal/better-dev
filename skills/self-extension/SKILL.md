---
name: self-extension
description: Use when sourcing an existing skill has come up empty and a capability still needs filling, or when a proven, repeatable workflow is worth capturing as a new reusable skill of its own.
---

# Self-extension

The last resort on a capability gap: author one new skill from what you understand, and only let it reach
the live tree once it has passed a check and an explicit yes. There is no distillation engine — you gather
the sources and write the `SKILL.md` with the tools you already have, so this runs the same on any harness.

Creating is the fallback, not the first move. `/tool-sourcing` hands off here only after discovery,
vetting, and try-before-adopt all came up empty; a proven, installed skill beats a fresh one every time.
Carry the gap line and the vetting note across — they are the spec for what to build.

Read `.better-dev/overrides.md` first and honor any project override — a repo may pin where skills live,
forbid new ones, or already name the shape it wants.

## 1. Earn the create

Two questions gate whether to author anything, and they run before you write a line.

**Is the lesson durable?** A skill is a standing instruction the agent carries for months, so a transient
truth hardens into a self-imposed constraint that bites later. Don't encode a passing "X is broken", an
environment or setup failure someone can fix, or a one-off task narrative — capture the *fix* (the install
step, the config, the retry that worked), never the failure. The full filter, and where a rejected lesson
belongs instead, is in `what-not-to-encode.md`; reach for it whenever you're unsure a lesson deserves to
persist. "Nothing worth saving" is a real answer, just not the default one.

**Does something already cover this?** Prefer improving what exists over adding a narrow sibling. Recall the
project's memory (`.better-dev/bin/bd-mem recall "<capability>"`) and scan the installed skills; take the
earliest fit:

- an existing skill covers the class of work → patch that skill;
- one is close but missing a piece → add a `references/` note or a `scripts/` file under it;
- nothing fits → author a new skill.

When you patch an existing skill, read it in full this turn first and write the edit from those bytes, not
from what you remember of it — a skill edited from memory drifts from what's actually on disk.

## 2. Gather the sources and the requirements

The request mixes two kinds of content in any order: **sources** to gather (paths, directories, URLs, "what
we just did", pasted notes) and **requirements** that shape the skill (what to focus on, what to leave out,
scope, naming, the angle). Every part is load-bearing. Prose that follows a path or link is not incidental —
it is the caller telling you what they want from that source. Gather each source with the tools you have
(read files and search for local paths, fetch for URLs, this conversation for a workflow you just ran); if
scope is ambiguous, make a reasonable choice and note it rather than stalling.

Prefer the exact commands, endpoints, and signatures that appear in the source over ones you half-recall,
and don't invent a flag or path you never saw. A skill gets shared, so keep the host's or user's identity
out of it — the skill names itself.

## 3. Author one SKILL.md

One skill, one job. Author it to the better-dev authoring standard — and that standard is the
`/writing-skills` skill, so apply it by invoking that skill, not by re-deriving frontmatter or structure
rules here. Keeping the standard in one place is what lets it change once and hold everywhere. If the
procedure needs a non-trivial script, write it as a file the skill references by relative path rather than
inlining it for the agent to retype each run.

## 4. Test before you promote

Nothing half-built reaches the live tree. The candidate lives in a throwaway staging dir, passes a check
there, and lands only on approval; on any failure the staging dir is removed and nothing is left behind —
no half-written skill in the list, no tombstone for something never approved. `.better-dev/bin/bd-skill-stage`
owns the two steps that have to be machine-enforced rather than trusted to prose.

1. **Stage.** `bd-skill-stage dir` prints a fresh staging dir; write the `SKILL.md` (and any script or
   reference files) into it.
2. **Check — this is the "test".** For a prose skill, `bd-skill-stage lint <dir>` is the gate: it fails on a
   malformed or missing frontmatter, a name that isn't kebab-case, a description that doesn't state its
   trigger, a stray `version`/`license`, an `@`-link, or an oversized file. For a skill that ships a script,
   also run that script's own fixture and test inside the staging dir, with an assertion that checks real
   output, not just that it didn't throw. If the check fails, fix it in place and retry at most twice,
   showing the diff each time; if it still fails, discard and stop rather than lower the bar.
3. **Approve.** An installed skill runs with full agent permissions, so land it only behind an explicit yes.
   Present it plainly — what it captures, where it will land, the one thing that could go wrong — and ask.
   In an autonomous run there's no human at the keyboard, so this stop is a `NEEDS_INPUT` state (the
   vocabulary is `/autonomous-loop`'s), not a failure; promotion resumes when approval comes.
4. **Land or discard.** On a yes, `bd-skill-stage commit <dir>` atomically moves it into the place the host
   discovers skills — `.agents/skills/<name>` by default, the same tree `/tool-sourcing` installs into —
   refusing to clobber an existing skill, follow a symlink, or land outside that root. The folder is taken
   from the frontmatter `name`, so name and folder always match. On a no, or after the retries are spent,
   `bd-skill-stage discard <dir>` clears the staging dir.

## 5. Verify and record

Once it lands, exercise it once — re-lint the committed copy, or run its script and compare against the
output the prototype produced. If it drifted, surface the discrepancy rather than quietly undoing the
commit; the caller deserves to see it.

Record what the run taught through the memory contract: `.better-dev/bin/bd-mem learn "<lesson>"` for a
durable technique, and `bd-mem remember "authored <skill> for <capability>"` so the next time that gap
surfaces the choice is reused instead of re-created. A skill proven this way can later be published back for
others to source — the same loop, run in reverse.
