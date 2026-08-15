# fixture: greenfield - an empty directory. No git, no code, no entry file.
#
# The real cold-start sequence is /onboard FIRST, then the build ask - onboard is what writes the
# discovery block that routes a later "build me X" to /groundwork. So this fixture runs both halves:
# OPENING wires the empty dir, FOLLOWUP then asks for the build once the agent thinks it is finished.
#
# Probes: can onboard wire a directory with nothing in it - no git, no entry file, no stack to detect?
# Does it invent a stack, or record the absence as a gap? And does the block it just wrote actually
# route the follow-up to /groundwork, or does the agent free-hand the project?

BRIEF="You just made an empty folder called 'linkwarden' on your laptop and you are wiring better-dev
into it before you start. What you eventually want to build is a small command-line tool that checks a
list of URLs and reports which ones are dead - TypeScript, no strong opinions beyond that. You have not
written a line of it and you have not set up git."

OPENING="/onboard"

# Sent once, when the agent first believes it is done. This is the handoff under test.
FOLLOWUP="ok. now build me the thing - a CLI that takes a list of URLs and tells me which are dead. TypeScript."

fixture_build() {
  # deliberately empty: no git, no files. That is the fixture.
  mkdir -p "$1"
}
