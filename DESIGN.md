---
name: Warlock
description: The floor of an agentic software factory, dark, where status is a sign and the few lit tubes say everything.
colors:
  bg-000: "#09090b"
  bg-100: "#0f0f11"
  surface-100: "#141417"
  surface-200: "#1b1b1f"
  surface-300: "#1f1f24"
  line-100: "#232327"
  line-200: "#303036"
  line-300: "#45454c"
  ink-100: "#f2f2f0"
  ink-200: "#c4c4c8"
  ink-300: "#8f8f96"
  ink-400: "#5c5c63"
  accent: "#ff3dcd"
  accent-bright: "#ff7ae0"
  accent-tint: "rgba(255, 61, 205, 0.14)"
  glow-core: "#ffd6f3"
  glow-halo: "rgba(255, 61, 205, 0.5)"
  ok: "#b6ff3d"
  warn: "#ffb02e"
  warn-tint: "rgba(255, 176, 46, 0.14)"
  err: "#ff4d4d"
typography:
  heading:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.05em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  section:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  sign:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  body:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  tally:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
  chip:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  md: "8px"
  xl: "14px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.accent-bright}"
    typography: "{typography.sign}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.err}"
    typography: "{typography.sign}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-100}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  chip:
    backgroundColor: "{colors.surface-200}"
    textColor: "{colors.ink-300}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "20px"
  chip-accent:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-bright}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "20px"
  chip-warn:
    backgroundColor: "{colors.warn-tint}"
    textColor: "{colors.warn}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "20px"
  sign-ok:
    backgroundColor: "transparent"
    textColor: "{colors.ok}"
    typography: "{typography.sign}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "24px"
  card:
    backgroundColor: "{colors.surface-100}"
    textColor: "{colors.ink-100}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-run:
    backgroundColor: "{colors.surface-100}"
    textColor: "{colors.ink-100}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "8px 10px"
  station-node:
    backgroundColor: "{colors.surface-200}"
    textColor: "{colors.ink-300}"
    typography: "{typography.chip}"
    rounded: "{rounded.md}"
    padding: "0"
    size: "36px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-300}"
    rounded: "{rounded.md}"
    padding: "0"
    size: "44px"
  nav-item-active:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-bright}"
    rounded: "{rounded.md}"
    padding: "0"
    size: "44px"
  input-composer:
    backgroundColor: "{colors.surface-100}"
    textColor: "{colors.ink-100}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "28px"
  input-field:
    backgroundColor: "{colors.surface-200}"
    textColor: "{colors.ink-100}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  composer-strip:
    backgroundColor: "{colors.surface-300}"
    textColor: "{colors.ink-100}"
    padding: "4px 24px"
    height: "56px"
---

# Design System: Warlock

## Overview

**Creative North Star: "The Floor at Night"**

Warlock is one developer's software factory, and its interface is the factory floor seen after hours. The ground is near-black, every surface is matte, and structure is drawn with 1px hairlines rather than fills. Nothing glows by default. Light is signage: a magenta tube around the card that is running right now, a pill of light travelling the lane under it, an amber chip on the run that needs you, a lime SHIPPED sign on finished work. Because the floor is dark and quiet, the three or four lit things on a 1360x960 screen say what is running, what needs you and what shipped in one look.

The visual authority is the Agentic Factory design system, used unchanged. This build adds composition: the home is stacked Lines, one per project, each a strip over a lane of station nodes with the run cards under the station they are at; an inspector on the right for the opened run; a composer docked along the floor's bottom. Density is high and the tone is operational: tabular numerals, sequence numbers, worktree and branch names, uppercase condensed signage for names and sentence-case Instrument Sans for everything else. Confirmed rejections: no light theme, no second accent, no gradients as light, no emoji or glyph icons in chrome, no synonyms for the domain words.

**Key Characteristics:**
- Near-black ground (`bg-000`), chrome one step up (`bg-100`), actionable things on `surface-100` behind a 1px `line-100` hairline.
- One accent, magenta, which is also the only interactive colour: the running tube, the lane pill, the outlined primary button, active nav, the focus ring.
- Lime means done and shipped; amber means needs you; red means failed. Each always carries its word.
- Three faces with fixed jobs: Barlow Condensed 600 uppercase for signage, Instrument Sans for text, Azeret Mono for anything the machine produced.
- Depth is a tube (box-shadow), never a border thicker than 1px and never a lift.

## Colors

A black-and-hairline neutral ramp with one magenta accent and three status colours that are never seen without their word.

### Primary
- **Magenta Tube** (`accent`): the running state and the only interactive colour. The ring of the running tube, the outlined primary button's border, the active rail item, the selected station node, every focus outline (2px, offset 2px). It never fills a surface bigger than a chip.
- **Accent as Text** (`accent-bright`): the primary button's label, the active rail icon, the run id on a running card, link colour. Magenta is never set as `ink` text at full `accent`; text uses this lighter step.
- **Accent Wash** (`accent-tint`): a 14% wash layered over `surface-100` for the selected run card and the active nav tile, with the border stepping up to `line-300`.
- **Filament and Halo** (`glow-core`, `glow-halo`): the filament colours a running station node's numeral and the top-bar tallies; the halo is the drop shadow under the rail mark and the outer spill of every magenta tube. Neither ever fills a surface or carries body text.

### Neutral
- **Floor** (`bg-000`): the page and the shell ground.
- **Chrome** (`bg-100`): rail, top bar, inspector ground, dock, board columns.
- **Surface** (`surface-100`): every card, the composer input, the search field, the brief panel. Always with a `line-100` hairline.
- **Nested Surface** (`surface-200`): station nodes, chips, the project select, form fields, hover tint on rows and nav tiles.
- **Strongest Neutral** (`surface-300`): the composer strip and the progress track only.
- **Hairline** (`line-100`): the resting border and every divider (line bottoms, log top, dock rows, inspector actions).
- **Hover Hairline** (`line-200`): borders of buttons, inputs and nodes at rest; cards on hover; the composer's top edge.
- **Open Hairline** (`line-300`): borders on hover for buttons and nodes, and the border of a selected card.
- **Ink** (`ink-100`): anything the developer must read: names, titles, button labels, input text.
- **Secondary Ink** (`ink-200`): prose, briefs, log lines, the composer's reply, the second row of a run card.
- **Meta Ink** (`ink-300`): captions, counts, ids, timers, placeholders, the resting colour of nav icons and nodes.
- **Decoration Ink** (`ink-400`): queued titles and lamps, log times, disabled text.

### Tertiary (status)
- **Lime Done** (`ok`): the SHIPPED sign on an idle line, the shipped tally, the succeeded chip, the lime ring held on a succeeded card until it is reviewed or dismissed, the edit dot in the log.
- **Amber Needs You** (`warn`, `warn-tint`): the blocked chip, the blocked tally when the count is above zero, the blocked node, the confirm strip's wash before cancelling a run.
- **Red Failed** (`err`): the failed chip and node, the danger button's outline and label, the offline stream chip.

### Named Rules
**The One Light Rule.** Magenta is the only light that means now: one tube on the running card, one pill on each live lane, one outlined primary button per screen. Lime is reserved for done and shipped so success is never a second magenta.

**The Word Rule.** A lamp, node, chip, sign or tally never carries status by colour alone; the word (running, blocked, failed, succeeded, shipped) is in the chip, the sign or the aria label beside it.

**The Black Behind Every Tube Rule.** Tubes sit on `surface-100` over `bg-000`. A wash (`accent-tint`, `warn-tint`) is the only tinted ground, and it is layered over `surface-100` with a gradient of itself, never a flat tinted fill.

## Typography

**Display Font:** Barlow Condensed 600 (with sans-serif fallback), uppercase always
**Body Font:** Instrument Sans 400/500/600 (with sans-serif fallback)
**Label/Mono Font:** Azeret Mono 400/500 (with monospace fallback), tabular numerals always

**Character:** Condensed uppercase signage reads like stencilled names on a factory floor and fits where a grotesk would wrap; the sans stays plain and sentence-case; the wide mono marks everything the machine said: ids, times, sequence numbers, branches, log lines.

### Hierarchy
- **Heading** (Barlow 600, 20px, 1.15, +0.05em): the page name in the top bar ("Floor", "Board", "Thread"). The inspector heading steps down to 17px.
- **Title** (Barlow 600, 18px, 1, +0.06em): a line's project name in its Console strip. The Dock strip steps down to 14px.
- **Section** (Barlow 600, 14px, +0.06em): card and panel heads ("Isolation", "Command history", board column names), set with the `wl-sig` helper.
- **Sign** (Barlow 600, 13px, +0.12em): one word in a 24px tube (SHIPPED, LISTENING), and the label of primary and danger buttons at +0.08em.
- **Body** (Instrument Sans 400, 14px, 1.4): shell default, thread messages, option labels. Prose panels drop to 13px/1.45 with a 72ch cap.
- **Label** (Instrument Sans 500, 13px): quiet button labels, run card titles, board task titles, form labels.
- **Caption** (Instrument Sans 400, 12px): hints, the inspector's key column, node labels at 11px.
- **Tally** (Azeret Mono 500, 22px, -0.02em; 18px in the top bar): counts with a 10 to 11px uppercase sans word beneath.
- **Mono** (Azeret Mono 400, 11 to 12px): ids, timers, log rows (28px tall), worktree and branch names, strip captions, the composer's reply line.
- **Chip** (Azeret Mono 500, 11px, +0.08em, uppercase): chip labels and station node numerals.

### Named Rules
**The Style Does the Casing Rule.** Uppercase comes from the signage styles, never from the string. Signage is the only uppercase; buttons' quiet labels, hints and log lines are sentence case or lowercase mono.

**The Machine Wrote It Rule.** Anything produced by the system (ids, sequence numbers, times, elapsed, branches, worktrees, event text) is Azeret Mono with tabular numerals. Elapsed reads `0:38` while live and `3m 12s` once done.

## Layout

The home is a fixed 1360x960 artboard laid out as a CSS grid: columns 56px rail / fluid floor / 320px inspector, rows 56px top bar / fluid floor / 56px composer. The rail spans every row; the top bar spans floor and inspector; the inspector spans floor and composer rows so the composer sits across the floor only. Closing the inspector collapses its column to 0 and the floor fills the view: that is the factory view.

The floor scrolls vertically with 20px/24px/16px padding and a 14px gap between Lines. A Line is a 28px Console strip (project name, formation chips, run count, a SHIPPED sign when idle) over one lane per formation in use, separated from the next Line by a `line-100` rule and 12px. A lane is a 36px track with a 2px `lane` rail through its middle, the station nodes centred on it in an equal-column grid (2 to 6 columns, 20px gutters), and 22px below it the run cards in the same column grid under their station. A second lane on a Line is set off by a dashed `line-100` rule. Idle lines show one unlit lane (track in `line-100`) and a hint; a project with no run shows the strip and the hint alone. Lines sort blocked, failed, running, succeeded, queued, idle, empty.

The sibling artboards use the same 56px rail and 56px top bar with a flex-wrap body: panels at 24px padding and 20 to 24px gaps, a list column of 44px rows beside a reading pane, board columns in a five-column grid with a 1100px minimum. Spacing is a 4px grid: 4, 6, 8, 10, 12, 14, 16, 20, 24. Touch targets are 44px (rail tiles, list rows), controls 32px, compact controls 28px, chips 20px, lamps 8px.

No responsive breakpoints are built; the brief's inspector-as-sheet below 1100px is not in the artboards.

## Elevation & Depth

This system is flat. Depth at rest is tonal: `bg-000` under `bg-100` chrome under `surface-100` cards, each layer bounded by a 1px hairline, and nesting fills step up one surface at a time. Nothing lifts on hover (border to `line-200`, rows tint `surface-200`; no scale, no shadow). The only shadows are tubes, and a tube is a state, not a decoration: a stacked ring-plus-spill in the state's colour on the card, node, sign, avatar or button that carries it. The DS supplies the tube tokens (`glow-running`, `glow-attention`, `glow-danger`, `glow-done`, `glow-button`, and the resting `bezel`) through the canvas runtime; the artboards reference them by name and never hand-write a shadow except the small ones below.

### Shadow Vocabulary
- **Running tube** (`box-shadow: var(--glow-running)`; on a node `0 0 0 1px var(--glow-body), 0 0 10px var(--glow-body), 0 0 24px var(--glow-halo)`; peaks at `0 0 0 1px var(--accent), 0 0 14px var(--glow-body), 0 0 40px var(--glow-halo)` mid-hum): the running card, its station node, a running agent avatar.
- **Attention tube** (`var(--glow-attention)`, with a `warn-tint` wash): the blocked card; `0 0 8px var(--warn-glow)` on a blocked node or lamp.
- **Danger tube** (`var(--glow-danger)`): the failed card; `0 0 8px var(--err-glow)` on a failed node or lamp.
- **Done tube** (`var(--glow-done)`, fallback `0 0 0 1px #b6ff3d`): the SHIPPED sign, and held steady on a succeeded run card until Review or Dismiss.
- **Button tube** (`var(--glow-button)`): the one outlined primary button, lit inside and out.
- **Mark halo** (`filter: drop-shadow(0 0 6px var(--glow-halo))`): the zap mark at the top of the rail.
- **Lamp and bead** (`0 0 6px var(--glow-body), 0 0 18px var(--glow-body)` on the running lamp; `0 0 8px var(--glow-body), 0 0 20px var(--glow-halo)` on the lane pill).

### Named Rules
**The Tube Is a Shadow Rule.** State light is always box-shadow or text-shadow; the border under it goes transparent. Borders stay 1px and never change colour to show state (a node's border is the exception: `ok`, `warn` or `err` on its 1px edge).

**The One Tube Per Card Rule.** A card carries one tube. A running card with a blocked detail shows the magenta tube and an amber chip, never two tubes.

## Shapes

Everything is rounded, and radius encodes what a thing is. Containers (cards, the inspector, the dock, menus, the Thread's message bubbles, the brief panel's neighbours) are `xl` (14px). Controls and tokens (buttons, chips, signs, the lane pill, the composer input and project select, the search field, avatars, lamps) are `pill`. Tiles that sit on a grid (station nodes 36px, rail tiles 44px, form fields on the editor artboards, the inspector's brief panel and confirm strip) are `md` (8px). Lamps and log dots are circles; the `said` log dot is a 6px square with a tiny radius. Nothing is square-cornered.

Structure is drawn with 1px hairlines: `line-100` at rest, `line-200` on controls and on hover, `line-300` when open or selected. Dividers between rows are `line-100` top borders; between lanes a dashed `line-100`. Borders are never thicker than 1px; the one thicker stroke is the 2px lane rail and the 2px focus outline.

## Components

### Buttons
Buttons are 32px pills with 12px side padding, flat at rest; the primary is the one lit control on a screen.
- **Shape:** pill (999px), 32px tall; compact 28px for secondary actions inside strips ("Floor", "Open thread"), 26px inside the inspector's list rows.
- **Primary** (DS `Button variant="primary"`): transparent fill, `accent` 1px border, `accent-bright` Barlow 600 uppercase 13px +0.08em label with a `glow-halo` text-shadow, `glow-button` tube. One per screen: New task in the top bar, Send in the composer, Rerun, Review, Sync now.
- **Danger** (DS `variant="danger"`): same construction in `err`, no tube. Cancel run, Stop run.
- **Quiet** (`wl-btn`): transparent, `line-200` border, `ink-100` Instrument Sans 500 13px label, optional 14px icon with 8px gap. Hover: border to `line-300`. Disabled: 40% opacity.
- **Focus:** DS buttons use the `focus-ring` box-shadow; `wl-*` controls use a 2px `accent` outline offset 2px.

### Chips
- **Style:** 20px pill, Azeret Mono 500 11px uppercase +0.08em, 8px side padding, a 6px status dot before the text. Neutral: `surface-200` fill, `line-100` border, `ink-300` text. `plain` removes the dot (formation names, worktree, branch, minion, issue numbers).
- **State:** toned chips drop the border and tint the fill 14% in their colour: `accent` (live stream, station on a running run), `warn` (blocked), `err` (failed, offline), `ok` (succeeded, synced).

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** `surface-100`; `bg-100` for chrome-level containers (board columns, the dock on the floor).
- **Shadow Strategy:** `bezel` at rest; a state tube only when the card carries a state (see Elevation).
- **Border:** 1px `line-100`; `line-200` on hover; `line-300` with an `accent-tint` wash when selected.
- **Internal Padding:** 16px (DS card); 12px 14px for grid cards and board tasks; a card head is 12px 14px 8px with baseline-aligned section title and mono caption, rows 32 to 44px tall separated by `line-100` top borders.

### Inputs / Fields
- **Composer input** (`wl-in` on the floor): 28px pill, `surface-100` fill, `line-200` border, Instrument Sans 13px, placeholder `ink-300`. Beside it the project select: 28px pill on `surface-200`, Azeret Mono 11px uppercase, an inline chevron glyph at the right. The search field is a 32px pill on `surface-100` with a `line-100` border, 200px wide.
- **Form fields** (editor artboards): 32px, 8px radius, `surface-200` fill, `line-100` border, Instrument Sans 14px; textareas 8px 10px padding, 13px/1.45, vertical resize. Labels are Instrument Sans 500 13px `ink-200` above the field, 6px gap.
- **Focus:** 2px `accent` outline, offset 2px.
- **Error:** rules bind in place with an `err` chip or caption naming the field; a failing draft disables Save at 40% opacity.

### Navigation
- **Rail:** 56px, `bg-100`, `line-100` right edge, 10px vertical padding, 4px gaps. The zap mark sits first at 44px in `accent` with the mark halo. Items are 44px tiles, 8px radius, 24px Lucide icons in `ink-300`; hover `ink-100` on `surface-200`; current `accent-bright` on `accent-tint`. Each tile carries an aria-label and title; no visible text.
- **Top bar:** 56px, `bg-100`, `line-100` bottom edge, 16 to 20px gaps, 20px side padding: heading, a mono caption or stream chip, tallies, then actions with the primary button last.

### Line (signature)
A Console strip over a lane. Strip: 28px, project name in Title signage, formation chips (plain), a mono count caption ("2 runs · 1 running · 1 blocked"), and at the right a lime SHIPPED sign when idle or a mono "shipped n" when busy. Lane: a 36px track with the 2px `lane` rail; station nodes (36px, 8px radius, `surface-200`, `line-200`, mono numeral, 11px sans label 6px below) centred per column; on a live lane the `af-lane-bead` pill (60x3px, `glow-body`) travels left to right over 3s on a loop. Node state follows the runs at it: running (filament numeral, magenta tube, border transparent), blocked (`warn` edge and glow), failed (`err`), passed (`ok` edge), queued (`ink-400` numeral). Nodes are buttons: click opens the station's brief in the inspector.

### Run card (signature)
An `af-card` with `data-state`, padded 8px 10px, in the column of its station. Head: 8px lamp, mono run id (`ink-300`, `accent-bright` when running), title in Instrument Sans 500 13px truncating with an ellipsis. Second row (`wl-r2`, 20px): a state chip when blocked, failed or succeeded, then a mono meta line (`minion · 0:38` running, `queued · minion`, `3m 12s · minion` succeeded, the reason when failed). Queued cards set title and meta in `ink-300`. Running: magenta tube, flickers on once then hums. Blocked: amber tube and wash, pulsing. Failed: red tube held until Rerun or Dismiss. Succeeded: lime ring held steady until Review or Dismiss, then the run leaves for the Dock. Selected: `accent-tint` wash and `line-300` border, kept under any tube. The card's wrapper is the focus and keyboard target (`role=button`, `aria-pressed`): Arrow keys move between cards, Home/End jump, Enter or Space opens, Escape closes the inspector and returns focus. A card arriving at a new station or landing from the composer slides in from the left over 0.5s on the DS ease (`wl-slide`); instant under reduced motion.

### Inspector
The DS `af-inspector` at 320px on `bg-100` with a `line-100` left edge, 18px padding, 12px gaps. Heading 17px signage ("Run 31"), a mono sub-line (work order, spellbook, formation), the full title in 13px `ink-200`, a chip row (station toned by state; minion, worktree, branch plain), then the `af-log`: 28px mono rows with a kind dot, `#seq time` in `ink-400`, text truncating and revealing on hover, the one live row shimmering. Actions pin to the bottom above a `line-100` rule: Cancel run (danger) while running, Rerun (primary) and Dismiss when failed, Review (primary) and Dismiss when succeeded. Cancel opens a confirm strip on `warn-tint` (8px radius) with Keep running and Stop run. For a station the inspector shows its brief in a `surface-100` panel (8px radius, 13px/1.5 `ink-200`) or lists the spellbooks that brief it. Live announcements go through one visually hidden `role=status` region.

### Composer
A 56px strip across the floor's bottom on `surface-300` with a `line-200` top edge and 24px side padding. Row: project select pill, the input pill growing to fill, Send (primary, with the send icon), Open thread (quiet, 28px). When the warlock has replied, a 16px mono line in `ink-200` with a 12px zap icon in `accent` sits above the row. Enter sends; focus returns to the input.

### Dock
`af-dock` on `bg-100` under a 24px "Shipped" strip: 44px rows (104px id column, title in 14px signage truncating, mono branch and agent, time), `line-100` dividers, `surface-200` on hover.

## Do's and Don'ts

### Do:
- **Do** put every actionable thing on `surface-100` behind a 1px `line-100` hairline over the `bg-000` floor, and step nested fills up one surface at a time.
- **Do** show state as a tube (box-shadow in the state's colour) with the border under it transparent, and keep the word in a chip, sign or aria-label beside it.
- **Do** set signage in Barlow Condensed 600 uppercase through the style, and set every id, time, count, branch and log line in Azeret Mono with tabular numerals.
- **Do** keep one primary (outlined, lit) button per screen and use quiet pill buttons for everything else.
- **Do** make every lamp, node, chip and card reachable by keyboard with a 2px `accent` focus outline, and announce handoffs through the live region.
- **Do** hold every animation to the DS grammar: flicker on once, hum while running, the pill on a live lane, cascade for log rows, a 0.5s slide for an arriving card, and nothing moving under `prefers-reduced-motion`.

### Don't:
- **Don't** introduce a second accent or use magenta for success; lime is done and shipped, amber is needs you, red is failed.
- **Don't** fill a surface with `accent`, `glow-core`, `glow-body` or `glow-halo`, or set body text in them; they live in shadows, lamps, the lane pill and the bar.
- **Don't** lift, scale or shadow a surface on hover; hover is a hairline step (`line-200`) or a `surface-200` row tint.
- **Don't** draw a border thicker than 1px or square a corner; the only 2px strokes are the lane rail and the focus outline.
- **Don't** type uppercase, emoji, exclamation marks or glyph icons into chrome, and don't coin synonyms for the domain words (formation, station, spellbook on these artboards).
- **Don't** add a light theme, multi-user hints, or hand-operated run controls on the floor beyond the hardened Cancel run and Rerun.
