# ADR 0001: The Warlock stack

- Status: accepted
- Date: 2026-11-07
- Epic: [#1 Foundation](https://github.com/randalvance/warlock/issues/1)

## Context

Every later epic needs a running app, storage, and checks. Epic #1 proposed pnpm workspaces, Node 22, Vite, React, shadcn/ui, Hono, Drizzle with SQLite, Vitest, and Playwright. The later epics add three demands that shape how those parts fit together:

- Epics #4, #6, #7, and #9 persist every event and replay it after a restart.
- Epic #9 updates the factory view within one second of a handoff, and a page reload restores the same state from the server.
- Epic #3 rejects a bad request at the API boundary with a message that names the field.

## Decision

Warlock keeps the proposed stack. This ADR adds the parts the proposal left open and records how they connect.

| Concern | Choice |
| --- | --- |
| Workspace | pnpm workspaces with two apps, `apps/server` and `apps/web`. There is no shared package. |
| Runtime | Node 22.22 or later. React Router 8.5 needs 22.22. The server runs its TypeScript source with Node's built-in type stripping, so there is no build step and no `tsx`. |
| Language | TypeScript 7.0 in strict mode, with `verbatimModuleSyntax` and `erasableSyntaxOnly`. |
| Server | Hono on `@hono/node-server`. The server binds to `127.0.0.1` only. |
| Storage | SQLite through Drizzle and `better-sqlite3`. Drizzle Kit generates SQL migrations into `apps/server/drizzle/`, and the server applies them on every start. |
| Event stream | One Server-Sent Events endpoint, `GET /api/events`, backed by the `events` table. |
| Validation | Zod at the HTTP and event-stream boundaries. |
| Web | Vite, React, React Router, Tailwind CSS 4, and shadcn/ui. The web app is dark mode only. |
| Lint and format | Biome. |
| Tests | Vitest for unit and server tests. Playwright runs one smoke test against `pnpm dev`. |
| CI | One GitHub Actions job runs lint, typecheck, the migration check, unit tests, and the smoke test. |

### The event log is a table

Every write goes through `db.commit`. The callback returns the value it wrote and the events the write caused. `commit` inserts those events into the `events` table in the same SQLite transaction, then publishes them to open streams after the commit. A rolled-back write publishes nothing. Each event gets a `seq` number that SQLite never reuses.

A client connects to `/api/events?after=<seq>`. The server sends the stored events after that `seq`, then live events. If the connection drops, the client reconnects with the last `seq` it saw, so it misses nothing and receives nothing twice. Each server start writes a `server.started` event, which is also the write that the restart test reads back.

### The web imports server types, not server code

The web reads the API types through `@warlock/server/api`, a types-only package export. A value import from it fails the typecheck, and Node refuses it at runtime. The Hono RPC client derives every route's request and response types from the server's route definitions, so no hand-written API type exists to drift. The event-stream client and its wire format live in one browser-safe file, exported as `@warlock/server/events`.

## Additions and changes to the proposal

- **`better-sqlite3` is the SQLite driver.** Drizzle's stable release (0.45) has no driver for Node's built-in `node:sqlite`. Only the 1.0 release candidate has one.
- **Biome is the linter.** `typescript-eslint` 8.72 supports TypeScript below 6.1 only. Biome does not use the TypeScript compiler API, so it works with TypeScript 7. Biome also formats, so the repo needs one tool instead of two.
- **TypeScript 7 is the compiler.** No tool in this stack calls the TypeScript JavaScript API, so the native compiler works with all of them. If a tool breaks on it, TypeScript 6.0 is the fallback.
- **Versions are at least seven days old.** `pnpm-workspace.yaml` sets `minimumReleaseAge`, so CI and local installs reject a release in its first week.

## Consequences

- An epic adds a table in `apps/server/src/modules/<name>/schema.ts`, runs `pnpm --filter @warlock/server db:generate`, and commits the migration. `pnpm db:check` fails in CI when a schema change has no migration.
- An epic adds an event type by adding one entry to the event schema in `apps/server/src/events.ts`. The server, the stream decoder, and the web all derive their event types from that entry. The typecheck then requires a sample stored row in `apps/server/test/event-history.test.ts`, and that test fails if a later schema change stops a stored row from parsing.
- `db.commit` callbacks are synchronous. Async work, such as epic #2's GitHub repo check, runs before the transaction.
- Only one server process may write a database file, because the stream's wake-up is in-process.
- Each git worktree has its own development database at `apps/server/.data/warlock.db`.
- The `events` table grows by one row per server start. Epic #4 decides retention when it adds run events.

## Alternatives considered

- **An in-memory broadcast with no event table.** The foundation would be smaller. Epics #4, #7, and #9 would each build their own history table, and a client that reconnects would lose events published during the gap.
- **Event sourcing for all state.** Domain tables would become projections of the log. Every epic would then need a reducer and a rebuild path before it could store a project. Warlock keeps ordinary tables as the current state and the log as the record, both written in one transaction.
- **WebSocket instead of Server-Sent Events.** Commands go over HTTP, so the stream only flows one way. Server-Sent Events pass through the Vite proxy with no extra setup, and `curl` can read them.
- **A `packages/shared` workspace.** The type-only export and the Hono RPC client cover what the web needs today. A shared package can come when a second consumer appears.
