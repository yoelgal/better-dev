# Adversarial friction review

You are reviewing better-dev's **onboarding experience**, not its code. Your job is to find the
places a competent developer would get annoyed, confused, blocked, or quietly do the wrong thing -
and to say what in the shipped text or scripts causes it.

## Inputs

- `facts.md` in the run dir - per-fixture turn counts, the ask each fixture drew, tool inventory,
  permission denials, and the simulated human's in-the-moment gripes
- `transcripts/<fixture>/` - `human-N.txt` and `agent-N.txt` are the conversation; `turn-N.jsonl` is
  the full event stream; `tools.tsv` and `denials.txt` are the reductions
- `repos/<fixture>/` - the repo as the agent left it. Diff it against what the fixture script created.
- the library itself: `skills/*/SKILL.md`, `install.sh`, `scripts/bd-*`, `hooks/`
- `seen.md` in this directory - every finding this harness has already filed

## The rule that matters

**Every finding names a file and a line in the library.** "The agent was slow to ask about the test
command" is not a finding. "`skills/onboard/SKILL.md:212` tells the agent to detect the test runner
before it has been told the repo has two, so Phase 3 asks twice" is a finding. If you cannot trace a
gripe back to shipped text, you have not finished the finding - keep reading until you can, or drop it.

Read the transcript before you read the skill. Form the complaint from what actually happened, then
go find its cause. Do not go looking for text you dislike and invent a symptom for it.

## Read seen.md before you write anything

Dedup against every row in `seen.md`, whatever that row's status says. Dedup against only the
accepted ones and a declined finding comes back every run, the operator re-adjudicates it every run,
and the harness never converges - `/orchestrating-agents` owns the general form of that rule.

A finding that matches a row is not a finding. The one exception is a `FIXED` row whose behaviour is
back: that is a regression, and it files fresh with the old row's id in its title.

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
  session short, a fixture that is unrealistic. Call these out as `HARNESS` so they get fixed here. A
  drawn ask the fixture repo cannot support is not one of these: the mismatch is the test, and the
  finding is what the agent did with it - said so plainly, or guessed a command the repo never had
- Style opinions about the library's prose

## Output

Rank by how much user pain the fix removes per unit of work. Each title names a concrete failing
behaviour, in one sentence that would work as a failing test's name. "branch handling" and
"onboarding is confusing" are categories, and a category cannot be reproduced, matched against
`seen.md`, or observed to have stopped. Fill this shape:

```
### onboard asks for the test command twice in the same run
- **where**: `skills/onboard/SKILL.md:212`
- **evidence**: polyglot, turn 3 and again turn 6 - "i already told you, there isn't one at the root"
- **cause**: the detect step runs before the step that records a gap, so a repo with two runners gets
  asked once per phase
- **fix**: record the answer as a gap on the first ask and read it back in the later phase
- **class**: FRICTION
```

## Where a finding goes

The class decides, and there is one queue:

| class | what happens |
|---|---|
| `FRICTION` | `.better-dev/bin/bd-mem papercut add "<title>" "friction <fixture> <where>"`, then a row in `seen.md` with status `ACCEPTED` and the papercut id it printed |
| `MODEL` | a row in `seen.md` with status `DECLINED` - the model missed text that already covers it, so nothing in the library changes |
| `HARNESS` | fix it in `friction/` in this pass, then a row with status `FIXED` |

Every finding gets a row, including the ones nothing is done about: that row is what stops the next
run filing it again. Nothing else gets created - the papercut queue is where the operator already
triages friction, and a second list would only split the attention that queue needs.

End with one line: the single change that would most improve first-run experience.
