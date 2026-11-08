---
version: 1
slug: "docs-prototypes-main-dc-html"
primary_target: "docs/prototypes/Main.dc.html"
related_targets: ["docs/prototypes/Board.dc.html","docs/prototypes/Formations.dc.html","docs/prototypes/Projects.dc.html","docs/prototypes/Agents.dc.html","docs/prototypes/Spellbooks.dc.html","docs/prototypes/Runtime.dc.html","docs/prototypes/Warlock.dc.html"]
---

# Surface brief: the home (the floor)

Primary target: docs/prototypes/Main.dc.html. Related: Board, Formations, Projects, Agents, Spellbooks, Runtime, Warlock artboards (Factory retired on 2026-11-08). Mode: Operate. Build path: code-led, into the Design-canvas prototypes first, then apps/web; an Operate surface is code-led whatever `.impeccable/config.json` records as the standing default, so the comp-led default there is not in play here. Vocabulary: the artboards keep formation, station and spellbook, the names they were drawn with; the domain model has since renamed them workflow, step and playbook, and the prototypes README records that exception until the artboards are renamed with the app.

## 1. Job and audience

One developer, solo, between other tasks. They open the home to answer three questions in one look: what is running, what needs me, what shipped. Then they give the warlock the next task and leave. Many short visits a day; an occasional long watch of one run.

## 2. Outcome and proof

- Primary task: read the floor, then act through the one door (the composer).
- Success: within one viewport the developer can name every running run's station and minion, sees every blocked run before anything else, and can send a task without leaving the home.
- Proof content is the event log: run ids, sequence numbers, times, handoffs, elapsed live timers, worktree and branch names. Project and formation names are the user's own. No invented metrics, counts or testimonials.

## 3. Selected direction

- Structure: **one line per project**. Chosen from the dealt hand (my grounded list position 6; seed:c3c3aecca41836ec; sketch .impeccable/mocks/decision/project-rail-home.html). Visual authority stays the Agentic Factory system; this round decided composition only.
- Thesis: the floor is stacked Lines, one per project. A project does not own a formation: each run records its spellbook and formation, so a line carries one lane per formation its runs are using, usually one. Each lane is that formation's stations in order; each run is a Station card under the station it is at, on the lane of its own formation. The lit card is the focal moment.
- Sequence: top bar tallies (lines, running, blocked, shipped) → lines sorted blocked first, then running, then idle → inspector on the right for the opened run → composer docked along the floor's bottom.
- Signature move: the lane. One pill of light per line, and a handoff is the card moving to the next station along the lane while its event lands in the inspector log.
- Implementation consequence: Main is built from Line, Station, WorkOrder and Console (the line header is a Console strip: project, formation, run count, actions). Station columns follow each lane's formation; a line stacks one lane per formation in use, and its Console strip names the project and the formations on it. Runtime's content becomes the inspector; the Warlock artboard becomes the composer's expanded thread.

## 4. Scope and boundaries

- Fidelity: full flows in the prototypes, clickable, with every state below.
- Breadth: Main recomposed. Board, Formations, Projects, Agents and Spellbooks become observe-first artboards: read-only by default, with one explicit Edit action that reveals the existing editor. Runtime becomes the inspector at full width, reached from a card. Warlock becomes the expanded thread behind the composer.
- Untouched: the harden work (confirm strips, undo, live regions, focus rings) stays as is. Domain vocabulary and rules stay verbatim.
- Anti-goals: no hand-operated run controls on the floor beyond the hardened cancel and rerun; no second accent; no light theme; no multi-user hints; no synonyms in chrome; the Board does not become a second floor.

## 5. States and ranges

- Projects (lines): 0 to 6. Zero projects: one placeholder line with "Add a project" as the only action besides the composer.
- Formations per line: 1 to 3 lanes in use. An idle line with past runs expands to one unlit lane, the formation of its most recently run spellbook. A project with no run yet has no lane: its line is the Console strip alone with the hint "Send a task to start a run", and the first lane appears with the first run.
- Stations per formation: 2 to 8; a lane scrolls horizontally past 6 at 1360 wide.
- Runs per line: 0 to 12. Idle line (0 runs): collapsed to its Console strip with a lime SHIPPED count sign. More than 3 runs at one station: 3 cards and one compact row listing the rest as "run-id · minion" chips, so every running run's station and minion stays readable in one viewport; the row expands into cards on click.
- Run states: queued (unlit title), running (magenta tube, one per card), blocked (amber chip, line sorts to top), failed (red chip, stays lit until rerun or dismissed), succeeded (lime 1.2s then flat, then leaves for the Dock).
- Titles truncate with an ellipsis; full title in the inspector. Elapsed is 0:00 upward live, "3m 12s" once done.
- After a server restart the inspector log shows "replayed from event #n".

## 6. Interaction and layout

- Shell: 56 rail, 56 top bar, the floor, 320 inspector, composer across the floor only (never under the inspector).
- Click a run card: inspector opens on it. Click a station node: a station alone has no brief, so with a run open whose formation is the clicked lane's, the inspector shows that station's brief from that run's spellbook, read-only; otherwise it lists the spellbooks on that lane that brief the station and opens the one chosen. Arrow keys move between cards, Enter opens, Escape closes the inspector.
- Handoff: the card slides to the next station (cascade timing), the lane pill keeps moving, the log row appears with its sequence number, the live region announces it.
- Composer: Enter sends to the warlock. The reply appears as a line in the composer's strip, a new queued card appears on that project's line under the entry station of the formation of the spellbook the warlock picked (a new lane if that formation had none), and "Open thread" expands to the Warlock view.
- Observe-first artboards: Formations shows the formation as a Line with its transitions; Edit switches to the editor in place. Projects, Agents, Spellbooks the same.
- Responsive: desktop first at 1360×960 artboards; below 1100 the inspector becomes a sheet. Reduced motion: tubes hold steady, cards jump.

## 7. Constraints and open decisions

- Platform web, dark only, local single-user. Components only from Agentic Factory: Line, Station, Console, WorkOrder, Dock, AgentCard, Sign, Chip, Lamp, Tally, Bar, Button, Icon.
- Accessibility: every lamp, sign and chip carries its word; handoffs announced through the existing live region; focus-visible on every control.
- Decisions taken by the owner on 2026-11-08, before the build:
  1. Factory is retired: the home with the inspector closed is the factory view. Factory.dc.html leaves the canvas and its README row points at Main.
  2. The station-visit cap (12) is not shown on the line; it is not in the domain model yet. The inspector log still shows visits.
  3. A succeeded run waits for review: its card holds at its last station lit lime with a Review action, and leaves for the Dock when the developer dismisses it or opens the result.
  4. The composer names the target project explicitly: a project chip, preset to the line last opened. The warlock never guesses where a task goes.

## Direction contract

THESIS: The home is the floor: one line per project, each run a lit card at the station it is at. It refuses the dashboard-of-cards arrangement (status tiles, a feed, a CTA) that the current Main and Factory artboards share.

OWN-WORLD: Agentic Factory, unchanged. Near-black ground, matte surface-100 cards with 1px hairlines, one magenta accent that is the only light: a tube on the running card, a pill travelling the lane, the outlined primary button. Lime only on SHIPPED and a succeeded card. Barlow Condensed 600 uppercase for signage, Instrument Sans for text, Azeret Mono for ids, times and the log.

STORY: The developer reads blocked, then running, then shipped, in one look. They open a run card and the inspector shows its log with sequence numbers. They give the warlock the next task from the composer, with the project named, and watch the queued card land under the entry station. They leave.

FIRST VIEWPORT: 1360x960. Rail 56 left. Top bar 56: FLOOR, tallies (lines, running, blocked, shipped), search, NEW TASK as the one outlined tube. Floor from x=56 to x=1040: project lines stacked, blocked first; each line a Console strip (project, formation chips, run count, SHIPPED sign when idle) over a lane of station nodes with run cards under them, the lit one magenta. Inspector 320 on the right: run id, title, chips (station, minion, worktree, branch), the log with its one shimmer line, Cancel run and Rerun. Composer docked along the floor's bottom edge, 56 tall: project chip, input, Send, Open thread.

FORM: One line per project, position 6 of 7 on my ordered list; locked from the dealt hand as .impeccable/mocks/decision/project-rail-home.html. seed:c3c3aecca41836ec. Signature interaction: the handoff, the card sliding to the next station along the lane (cascade timing) while its event lands in the inspector log and the live region announces it. Motion grammar: flicker on once, hum while running, the pill on every lane, cascade for log rows, everything instant under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
