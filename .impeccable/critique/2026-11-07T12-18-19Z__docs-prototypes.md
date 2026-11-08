---
target: docs/prototypes
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/randal/dev/warlock/.claude/worktrees/warlock-feature-prototypes-efc894/docs/prototypes"
timestamp: 2026-11-07T12-18-19Z
slug: docs-prototypes
closed: true
---
> Baseline note, added 2026-11-08: this snapshot was taken before the harden pass in PR 21. The three P1 findings below are pre-harden observations. Addressed since: confirm strips with undo before Cancel run, Delete project and Delete minion; `aria-live` status regions on every artboard; `:focus-visible` on `.wl-btn` and the other controls; distinct names on the Board's Move arrows; the Spellbooks error tied to its textarea. Still open: the third P1 (generic composition), now the subject of the shape brief in `.impeccable/surfaces/docs-prototypes-main-dc-html.md`, and both P2 items.

Method: dual-agent (A: design-review subagent · B: detector subagent). Browser inspection unavailable on both sides: the canvas at https://claude.ai/artifact/1kJmvVZKgLnUy38ktcvFCS requires a claude.ai sign-in the browser pane does not have. Detector ran against inline token fallbacks because the Agentic Factory bundle is not in the repo.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Live chip, tallies and seq numbers everywhere; chip static on eight artboards; nothing announced to assistive tech |
| 2 | Match system / real world | 3 | Domain words exact; headers leak implementation ("hono · sqlite · drizzle", "gh auth refresh -s project") |
| 3 | User control and freedom | 2 | Cancel run, Delete project, Delete minion are one unguarded click; no undo; only Runtime has a back link |
| 4 | Consistency and standards | 2 | Save lives in four places; button heights 32/28/26; Formations and Spellbooks indistinguishable |
| 5 | Error prevention | 3 | Save disables while invalid; "Check and add" validates; nothing guards Cancel, Delete, Max visits |
| 6 | Recognition rather than recall | 3 | "Selected station" duplicates "Transitions"; Runtime outcomes contradict the formation's |
| 7 | Flexibility and efficiency | 2 | Board moves one column per 28px arrow click; no drag, no keyboard |
| 8 | Aesthetic and minimalist design | 2 | Main follows empty state with two infra cards; Spellbooks/Formations stack 4-6 competing cards |
| 9 | Error recovery | 3 | Errors name the field and ship the fix; no offline, stream-down or visit-limit state |
| 10 | Help and documentation | 3 | Rule-as-subtitle on every card; Board Rules card; nothing beyond |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

Split verdict: the copy is authored for Warlock, the composition mostly is not. Rule-as-subtitle copy and the Factory/Agents artboards (Line, Dock, Sign, AgentCard) carry the factory metaphor. Six of nine artboards are the same card-head-row stack; Projects, Formations and Spellbooks share one list-rail-plus-editor skeleton; Board is any kanban, Warlock any chat, Main a settings home. Station, Console and Bar components are used on zero artboards; Formations hand-rolls its nodes. Rail icons are generic (eye, file-text, users).

Deterministic scan: 140 warnings, 5 rules. cramped-padding 71 (false positive: padding 0 14px inside 32-44px flex-centered rows), tiny-text 48 (real: 11px mono captions, some carrying sentences and commands), low-contrast 9 (real on fallbacks: --ink-400 #5c5c63 timestamps at 2.4-2.8:1, compounded by 11px), overused-font 9 (advisory, one per file), tight-leading 3 (false positive: /1 shorthand on fixed-height controls in Agents). Content inside imported Chip/Icon/Lamp/AgentCard/Line was not scanned. No overlay was injected.

## Overall Impression

A prototype that explains Warlock's domain model better than most shipped apps, dressed in a generic ops-dashboard body. Biggest opportunity: let the factory components carry the composition on every artboard.

## What's Working

- Rule-as-subtitle copy documents the model without a help page.
- Error states name the field and ship the fix (Agents, Projects, Spellbooks, Formations), coupled to a disabled Save.
- The Factory replay (Line + handoff ledger + Dock + Sign flip) makes the run state machine legible.

## Priority Issues

- [P1] Cancel run has no guard and is framed as failure (Runtime: one click, header and outcome turn err, "failed · reason: cancelled"; Delete project/minion equally unguarded). Fix: inline confirm, render cancelled in warn, reserve err for minion faults. Command: /impeccable harden.
- [P1] State changes silent and unreachable for assistive tech: no aria-live anywhere; Board's seven "Move forward" arrows share one name; Spellbooks error not tied to textarea; Scout's running state glow-only; nine --ink-400 11px timestamps at ~2.6:1; .wl-btn has no :focus-visible. Fix: live region per status strip, per-card arrow names, aria-describedby, text state labels, --ink-300 for 11px text. Command: /impeccable harden, then /impeccable audit.
- [P1] Six artboards share one generic composition; factory components unused. Fix: Formations as Stations on a Line, Board columns as lanes, Warlock composer as Console. Command: /impeccable shape, then /impeccable bolder.
- [P2] Cross-board dead ends and a wrong link: Board run chips, Spellbooks "Selection for WO-14", Formations minion selects go nowhere; both Factory "Open run" links open run 31. Command: /impeccable clarify.
- [P2] Main buries its only CTA under Server/Checks infra cards and a duplicate Command header button. Command: /impeccable distill.

## Persona Red Flags

Alex: Board WO-11 backlog to done takes four 28px arrow clicks, no drag/keys; Warlock Reuse only fills the draft; Formations "Edit as JSON" and "Add station" are dead.
Sam: "Move forward" announced identically seven times; Runtime cancel re-renders three regions silently; Formations loop arrow and "changes_requested · back to implement" visual only; no :focus-visible on .wl-btn.
Riley: any non-status Warlock text triggers the "This prototype only simulates" reply; thread has no scroll container; Board log spams identical 14:06 lines, "next in 0:42" never counts; Runtime Cancel then Rerun runs the clock backwards 0:41 to 0:38.

## Minor Observations

- Max station visits / "limit 12" are not in domain.md.
- Runtime outcomes needs_review/blocked are not transitions of the seed formation.
- Activity-row dot colours are an undocumented code.
- Main header exposes ./warlock.db; Projects header exposes token scope.
- Board grid min-width 1100px scrolls horizontally below ~1250px.
- Save placement differs on four artboards.

## Questions to Consider

- What if the Factory floor were the home artboard and the others doors off it?
- Could the Formations rows be the only editor and the Line the only picture?
- Should a human cancel be a recorded outcome ("stopped by you") rather than a failure?
- If every write went through the command panel, which cards on Projects, Agents and Spellbooks would survive?
