# Feature prototypes

One clickable prototype per epic, drawn as a Design canvas with the Agentic Factory design system. The live canvas is at https://claude.ai/artifact/1kJmvVZKgLnUy38ktcvFCS (private until shared from its Share menu).

The files here are the canvas's own sources: `canvas.json` is the index (artboard frames, order, notes, the design-system record), and each `*.dc.html` is one artboard. They render inside the Design canvas runtime, which supplies `support.js` and the copied design-system bundle under `ds/agentic-factory/`; they are kept here so the prototypes are reviewed and versioned with the epics they describe, not to be opened as plain HTML.

| Artboard | Epic | What it shows |
| --- | --- | --- |
| `Main.dc.html` | #1 Foundation | The shell: rail with the six sections, event-stream badge (live, reconnecting, offline), empty Projects state, the `server.started` event, the five CI checks. |
| `Projects.dc.html` | #2 Projects | A project with two readable repos and one that fails with a message naming the repo, artifacts by kind, context entries. |
| `Agents.dc.html` | #3 Agent profiles | The warlock card, the minions as a shift board, and Scout's editor: system prompt, `SKILL.md` folders, MCP servers with an invalid entry naming the bad field, memory notes. |
| `Runtime.dc.html` | #4 Agent runtime | One minion on one task in its own worktree and branch. Cancel fails the run with reason `cancelled` and appends the event. |
| `Formations.dc.html` | #5 Formations | The seed formation's stations and transitions, a read-only graph with the review loop, and the validator. Adding a duplicate transition lights the rule and disables Save. |
| `Spellbooks.dc.html` | #6 Spellbooks | The two seeds, a draft failing the missing-brief rule, the warlock's pick for a task with its reason and an override, the eval fixture. |
| `Warlock.dc.html` | #7 Warlock | The command panel: chat with tool-call lines, a working composer, persisted history, the event log. |
| `Board.dc.html` | #8 Board | The five status columns with GitHub-linked cards that move, the sync log, and the last-write-wins conflict line. |
| `Factory.dc.html` | #9 Factory view | Two live runs on their lines with the minion's activity, a finished run replayed handoff by handoff, the dock of shipped work. |

The rail links and the Open run links join the artboards in Play, so the canvas works as one prototype. Vocabulary follows [the domain model](../domain.md).
