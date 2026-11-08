# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One developer, working solo, running their own dark factory against their own GitHub repos. They issue a command, go back to other work, and check in on long runs between tasks. No second audience is confirmed: nobody who did not issue the command looks at the board or the factory view.

## Product Purpose

Warlock is an agentic software factory. The developer gives the warlock agent a task. The warlock picks a spellbook for it, and a formation of minion agents does the work, handing it from station to station until the run reaches done or fails. Success is a task turning into committed, reviewed software work with the human only commanding at the start and reviewing at the end.

## Positioning

One door, the warlock. The human only ever talks to the warlock. Spellbooks, formations, minions, runs and handoffs are all visible, and configurable, but never operated by hand mid-run. Every other surface observes or prepares; the command panel acts.

## Operating Context

- Projects own one or more GitHub repos, plus artifacts (files, links, notes) and context entries that every agent reads.
- A task can mirror a GitHub issue. For those tasks, status syncs with a GitHub Projects board; last write wins and the sync log says so. A task without an issue is valid and syncs nothing.
- Minions run on the Claude Agent SDK with their own system prompt, skills (Agent Skills folders), MCP servers and markdown memory.
- Each run works in its own git worktree and branch. Two runs never share a checkout.
- Every state change is an appended event in a local SQLite file; the UI's views are replayable from the event log, including after a server restart.
- The app runs locally: a Hono server and a React web shell on localhost, one install per machine.

## Capabilities and Constraints

- Vocabulary is fixed by docs/domain.md and used verbatim: dark factory, warlock, minion, agent profile, project, artifact, context, task, spellbook, formation, station, outcome, transition, run, handoff, board, factory view. No synonyms in UI copy.
- Rules the model enforces, and the UI must show where they bind: a project has at least one repo; a formation's entry station and every transition endpoint exist; every station has an outgoing transition and is reachable from the entry; at most one transition per station and outcome; a spellbook has a brief for every station in its formation; a run is at one station at a time and moves only along defined transitions.
- Task statuses: backlog, ready, in_progress, in_review, done. Run states: running at a station, succeeded, failed with a reason.
- Local and single-user: no accounts, no sharing, no tenancy. The UI never implies multi-user features.
- Dark only: no light theme is planned.
- Undecided: a maximum number of station visits per run appears in the prototypes (12) but is not in the domain model yet.

## Brand Commitments

- Name: Warlock. The product's own metaphor (warlock, minions, spellbooks, formations) is the voice, used plainly, without irony.
- Design system: Agentic Factory (https://claude.ai/code/artifact/a4f263ee-d487-44f4-8116-ce6be02cc5e0) is binding for every surface: its components (Station, Line, Console, WorkOrder, Dock, AgentCard, Sign, Chip, Lamp, Tally, Bar, Button, Icon), its tokens, its pink accent on a near-black ground, Barlow Condensed uppercase signage, Instrument Sans text and Azeret Mono data.
- Design goes to the Design-canvas prototypes under docs/prototypes first, then is applied to the real app under apps/web. Design critique runs against the prototypes.

## Evidence on Hand

- docs/domain.md: the glossary, data shape and rules.
- docs/prototypes/*.dc.html and canvas.json: nine clickable prototype artboards (Main, Projects, Agents, Runtime, Formations, Spellbooks, Warlock, Board, Factory), published at https://claude.ai/artifact/1kJmvVZKgLnUy38ktcvFCS.
- README.md and docs/adr/0001-stack.md: the stack and how to run it.
- Absent, never to be fabricated: customers, testimonials, benchmarks, pricing, a logo beyond the zap glyph.

## Product Principles

1. One door. The human commands through the warlock; every other surface observes or prepares, and never offers a hand-operated shortcut around the warlock.
2. Every state is an event. What a screen shows must be reconstructible from the event log, so screens show sequence numbers, times and handoffs rather than inferred summaries.
3. The vocabulary is the interface. Domain words appear verbatim, and each rule is shown at the place it binds, as the rule itself.
4. Isolation is visible. Worktrees, branches and per-run artifacts are shown, not hidden, because they are what makes parallel runs safe.
5. One operator's tool. Density and precision over onboarding; no accounts, sharing or tenancy anywhere.
