---
version: 1
slug: "docs-prototypes-main-dc-html"
primary_target: "docs/prototypes/Main.dc.html"
related_targets: ["docs/prototypes/Board.dc.html","docs/prototypes/Formations.dc.html","docs/prototypes/Projects.dc.html","docs/prototypes/Agents.dc.html","docs/prototypes/Spellbooks.dc.html","docs/prototypes/Runtime.dc.html","docs/prototypes/Warlock.dc.html","docs/prototypes/Factory.dc.html"]
---

# Surface brief: the home (the floor)

Primary target: docs/prototypes/Main.dc.html. Related: Board, Formations, Projects, Agents, Spellbooks, Runtime, Warlock, Factory artboards. Mode: Operate. Build path: code-led, into the Design-canvas prototypes first, then apps/web.

## 1. Job and audience

One developer, solo, between other tasks. They open the home to answer three questions in one look: what is running, what needs me, what shipped. Then they give the warlock the next task and leave. Many short visits a day; an occasional long watch of one run.

## 2. Outcome and proof

- Primary task: read the floor, then act through the one door (the composer).
- Success: within one viewport the developer can name every running run's station and agent, sees every blocked run before anything else, and can send a task without leaving the home.
- Proof content is the event log: run ids, sequence numbers, times, handoffs, elapsed live timers, worktree and branch names. Project and formation names are the user's own. No invented metrics, counts or testimonials.

## 3. Selected direction

- Structure: **one line per project**. Chosen from the dealt hand (my grounded list position 6; seed:c3c3aecca41836ec; sketch .impeccable/mocks/decision/project-rail-home.html). Visual authority stays the Agentic Factory system; this round decided composition only.
- Thesis: the floor is stacked Lines, one per project. Each line is that project's formation's stations in order on a lane; each run is a Station card under the station it is at. The lit card is the focal moment.
- Sequence: top bar tallies (lines, running, blocked, shipped) → lines sorted blocked first, then running, then idle → inspector on the right for the opened run → composer docked along the floor's bottom.
- Signature move: the lane. One pill of light per line, and a handoff is the card moving to the next station along the lane while its event lands in the inspector log.
- Implementation consequence: Main is built from Line, Station, WorkOrder and Console (the line header is a Console strip: project, formation, run count, actions). Station columns follow each project's formation. Runtime's content becomes the inspector; the Warlock artboard becomes the composer's expanded thread.

## 4. Scope and boundaries

- Fidelity: full flows in the prototypes, clickable, with every state below.
- Breadth: Main recomposed. Board, Formations, Projects, Agents and Spellbooks become observe-first boards: read-only by default, with one explicit Edit action that reveals the existing editor. Runtime becomes the inspector at full width, reached from a card. Warlock becomes the expanded thread behind the composer.
- Untouched: the harden work (confirm strips, undo, live regions, focus rings) stays as is. Domain vocabulary and rules stay verbatim.
- Anti-goals: no hand-operated run controls on the floor beyond the hardened cancel and rerun; no second accent; no light theme; no multi-user hints; no synonyms in chrome; the Board does not become a second floor.

## 5. States and ranges

- Projects (lines): 0 to 6. Zero projects: one placeholder line with "Add a project" as the only action besides the composer.
- Stations per formation: 2 to 8; the line scrolls horizontally past 6 at 1360 wide.
- Runs per line: 0 to 12. Idle line (0 runs): collapsed to its Console strip with a lime SHIPPED count sign. More than 3 runs at one station: 3 cards and a "+n" row.
- Run states: queued (unlit title), running (magenta tube, one per card), blocked (amber chip, line sorts to top), failed (red chip, stays lit until rerun or dismissed), succeeded (lime 1.2s then flat, then leaves for the Dock).
- Titles truncate with an ellipsis; full title in the inspector. Elapsed is 0:00 upward live, "3m 12s" once done.
- After a server restart the inspector log shows "replayed from event #n".

## 6. Interaction and layout

- Shell: 56 rail, 56 top bar, the floor, 320 inspector, composer across the floor only (never under the inspector).
- Click a run card: inspector opens on it. Click a station node: inspector shows that station's spellbook brief, read-only. Arrow keys move between cards, Enter opens, Escape closes the inspector.
- Handoff: the card slides to the next station (cascade timing), the lane pill keeps moving, the log row appears with its sequence number, the live region announces it.
- Composer: Enter sends to the warlock. The reply appears as a line in the composer's strip, a new queued card appears under the chosen project's entry station, and "Open thread" expands to the Warlock view.
- Observe-first boards: Formations shows the formation as a Line with its transitions; Edit switches to the editor in place. Projects, Agents, Spellbooks the same.
- Responsive: desktop first at 1360×960 boards; below 1100 the inspector becomes a sheet. Reduced motion: tubes hold steady, cards jump.

## 7. Constraints and open decisions

- Platform web, dark only, local single-user. Components only from Agentic Factory: Line, Station, Console, WorkOrder, Dock, AgentCard, Sign, Chip, Lamp, Tally, Bar, Button, Icon.
- Accessibility: every lamp, sign and chip carries its word; handoffs announced through the existing live region; focus-visible on every control.
- Open decisions a builder must not invent:
  1. What the Factory artboard becomes: the home with the inspector closed, or retired.
  2. Whether the station-visit cap (12) is shown on the line.
  3. Whether a succeeded run leaves the line immediately for the Dock or waits for the developer's review.
  4. Whether the composer names the target project explicitly or the warlock infers it.
