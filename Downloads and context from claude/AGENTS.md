# Agents

Every AI assistant working in this repo (Codex CLI, Claude Code, Claude
Cowork, or any other tool) shares one handoff doc:

**➡ [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md)**

Read it first. It has the project overview, the active branch, environment
vars, run commands, files touched, known gotchas, the version-control rules
for this branch, and a running log of prior sessions. When you finish a
session, append a one-liner to its **Current state** section so whoever
picks up next isn't guessing.

Rule of thumb for this branch: **no commits, no pushes, no PRs until Harry
says "Testing passed."** Details in §8 of the shared doc.
