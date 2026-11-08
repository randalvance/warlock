# Feature prototypes

One clickable prototype per epic, drawn as a Design canvas with the Agentic Factory design system. The live canvas is at https://claude.ai/artifact/1kJmvVZKgLnUy38ktcvFCS (private until shared from its Share menu).

The files here are the canvas's own sources: `canvas.json` is the index (artboard frames, order, notes, the design-system record), and each `*.dc.html` is one artboard. They render inside the Design canvas runtime, which supplies `support.js` and the copied design-system bundle under `ds/agentic-factory/`; they are kept here so the prototypes are reviewed and versioned with the epics they describe, not to be opened as plain HTML.

| Artboard | Epic | What it shows |
| --- | --- | --- |
| `Main.dc.html` | #1 Foundation, #9 Factory view | The floor: one line per project, blocked first, each a strip over a lane of station nodes with the run cards under them and the running one lit. Click or Enter opens a run in the inspector (log with sequence numbers, Cancel run, Rerun, Review); Escape closes it and the floor fills the view, which is the factory view. The composer names the project and queues the new run under the entry station; Next station plays a handoff. Shipped work sits in the Dock. |
| `Projects.dc.html` | #2 Projects | Observe first: a project with two readable repos and one that fails with a message naming the repo, artifacts by kind, context entries. Edit project reveals the editor and Delete. |
| `Agents.dc.html` | #3 Agent profiles | Observe first: the warlock card, the minions as a shift board, and Scout's profile: system prompt, `SKILL.md` folders, MCP servers with an invalid entry naming the bad field, memory notes. Edit minion reveals the editor and Delete. |
| `Runtime.dc.html` | #4 Agent runtime | The floor's inspector at full width, reached from Open run: one minion on one task in its own worktree and branch. Cancel fails the run with reason `cancelled` and appends the event. |
| `Formations.dc.html` | #5 Workflows | Observe first: the seed formation as a Line with its stations and transitions. Edit formation reveals the editor and the validator; adding a duplicate transition lights the rule and disables Save. |
| `Spellbooks.dc.html` | #6 Playbooks | Observe first: the two seeds with a brief per station, the warlock's pick for a task with its reason and an override, the eval fixture. Edit spellbook reveals the draft failing the missing-brief rule. |
| `Warlock.dc.html` | #7 Warlock | The thread behind the floor's composer, expanded: chat with tool-call lines, a working composer, persisted history, the event log. |
| `Board.dc.html` | #8 Board | Observe first: the five status columns with GitHub-linked cards, the sync log, and the last-write-wins conflict line. Edit board reveals the Move arrows. |

The rail links, Open run, and Open thread join the artboards in Play, so the canvas works as one prototype. The home shape and its decisions are in [the surface brief](../../.impeccable/surfaces/docs-prototypes-main-dc-html.md). Formation, station, and spellbook are the prototypes' presentation labels for workflow, step, and playbook in [the domain model](../domain.md); the labels stay on the artboards and the model terms apply in code. Each artboard keeps its own state in Play: a run cancelled on `Runtime.dc.html` is still running when the rail returns to the floor.
