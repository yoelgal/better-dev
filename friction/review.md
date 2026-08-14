# Adversarial friction review

You are reviewing better-dev's **onboarding experience**, not its code. Your job is to find the
places a competent developer would get annoyed, confused, blocked, or quietly do the wrong thing -
and to say what in the shipped text or scripts causes it.

## Inputs

- `facts.md` in the run dir - per-fixture turn counts, tool inventory, permission denials, and the
  simulated human's in-the-moment gripes
- `transcripts/<fixture>/` - `human-N.txt` and `agent-N.txt` are the conversation; `turn-N.jsonl` is
  the full event stream; `tools.tsv` and `denials.txt` are the reductions
- `repos/<fixture>/` - the repo as the agent left it. Diff it against what the fixture script created.
- the library itself: `better-dev/skills/*/SKILL.md`, `install.sh`, `scripts/bd-*`, `hooks/`

## The rule that matters

**Every finding names a file and a line in the library.** "The agent was slow to ask about the test
command" is not a finding. "`skills/onboard/SKILL.md:212` tells the agent to detect the test runner
before it has been told the repo has two, so Phase 3 asks twice" is a finding. If you cannot trace a
gripe back to shipped text, you have not finished the finding - keep reading until you can, or drop it.

Read the transcript before you read the skill. Form the complaint from what actually happened, then
go find its cause. Do not go looking for text you dislike and invent a symptom for it.

## What counts as friction

- **Question load** - how many turns did the easiest fixture cost? Which questions could the agent
  have answered itself from the repo? Which were asked twice, or asked after the answer was visible?
- **Lack of proactiveness** - did it wait to be told something it should have just done? Did it stop
  at a boundary the skill actually permits it to cross?
- **Overreach** - did it touch files nobody asked it to touch? Rewrite a hand-written CLAUDE.md?
  Create a branch, a commit, or a config the user did not agree to?
- **Permission walls** - which tool calls were denied, and was the denial recoverable? Did the agent
  notice it was blocked, or keep going as if it had succeeded? (In a `--perm typical` run, every
  denial is a dialog a real user has to click.)
- **Guessing** - any command, branch, or convention written into config that the repo does not
  actually have. This is the worst class: it is silent and it is wrong later.
- **Dead ends** - the agent hands the user a command to run and then cannot verify the result; the
  agent references a phase, file, or skill that does not exist; the agent stalls with no next action.
- **Cold-start gaps** - anything that only worked because the machine was already set up.

## What does NOT count

- The agent being wrong in a way the skill text explicitly prevents, when it plainly did not read it
  (that is a model failure, note it separately as `MODEL` and move on)
- Anything caused by the harness itself - the persona misreading a question, the turn cap cutting a
  session short, a fixture that is unrealistic. Call these out as `HARNESS` so they get fixed here.
- Style opinions about the library's prose

## Output

Rank by how much user pain the fix removes per unit of work. For each:

```
### <one-line symptom, as the user would say it>
- **where**: `path/to/file:line`
- **evidence**: fixture + turn, quoting the human or the agent
- **cause**: what the shipped text does that produces this
- **fix**: the smallest change that removes it
- **class**: FRICTION | MODEL | HARNESS
```

End with one line: the single change that would most improve first-run experience.
