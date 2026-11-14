# Honeypot agent guide

Honeypot is an agentic software factory. Work arrives as GitHub issues labeled `epic`, and an epic is done when every box in its "Done when" list passes.

- **Names.** [`docs/domain.md`](docs/domain.md) is the naming contract. Use its terms and data shapes in code, tests, and issues, with no synonyms. When the code changes a shape, update that file in the same PR.
- **Stack.** [ADR 0001](docs/adr/0001-stack.md) records the stack and why each part was chosen. [ADR 0002](docs/adr/0002-nx.md) records how Nx runs the tasks. Read both before you add a dependency or a tool.
- **Commands.** The root `package.json` scripts are the commands. The README's "Develop" section says what each one runs.

## Environment

- Run every command inside the dev container, through the devcontainer CLI on the active Docker context. Start the container with `scripts/devcontainer.sh up`, then run each command as `scripts/devcontainer.sh <command>`, such as `scripts/devcontainer.sh pnpm test` or `scripts/devcontainer.sh git commit`. Only `scripts/devcontainer.sh` itself and Docker housekeeping run on the host.
- `scripts/devcontainer.sh` passes in `GITHUB_TOKEN` (or the host's `gh` login) and your git name and email, so `gh`, `git commit`, and `git push` work inside the container.
- The container keeps its own `node_modules` and pnpm store in Docker volumes, so the host's `node_modules` stays untouched. After a lockfile change, run `scripts/devcontainer.sh pnpm install`.
- pnpm refuses package versions published less than 7 days ago (`minimumReleaseAge`). When an install refuses the latest version, pick the newest version that is old enough.
- Tests and browser tests answer GitHub from `apps/server/test/github-stub.ts`. Only `pnpm dev` talks to the real GitHub API, with `GITHUB_TOKEN` or the `gh` login.

## Server rules

- Every write goes through `db.commit((tx) => ({ value, events }))` in `apps/server/src/db.ts`. The callback is synchronous, so async work such as a GitHub call runs before the commit. A commit inside another commit throws.
- A module's store, such as `modules/projects/store.ts`, is the only writer of that module's tables. Routes parse input with `validate` and call the store. Stores throw `ApiError`, and `errorStatus` in `http.ts` maps each error code to its HTTP status.
- To add a table, edit the module's `schema.ts`, run `pnpm nx run @honeypot/server:db:generate`, and commit the migration. `pnpm db:check` fails in CI when a schema change has no migration.
- Event rows are kept forever. To add an event type, add it to `ServerEvent` in `events.ts` and add a stored sample row to `test/event-history.test.ts`; the typecheck requires the row. An existing event type may gain optional fields only.
- The web imports server code only through `@honeypot/server/api` (types only) and `@honeypot/server/events`. Files the web bundles stay free of Node and server-only imports, and the Biome override in `biome.json` lists them.

## Tests

- A test drives the code through its public API (HTTP, the event stream, or the UI) and asserts what a user can observe. Server tests start a real server with `startFresh` from `test/support.ts` on a temp database.
- Before you keep a new test, break the behavior it covers, watch it fail, and restore the code.
- The browser tests in `e2e/` start and restart the real server process through the fixture in `e2e/fixtures.ts`. Vite runs on port 5273 and the server on 4417, so they can run beside `pnpm dev`.

## Code and changes

- Write a comment only for a reason the code cannot show.
- Before you commit, run `pnpm lint`, `pnpm typecheck`, `pnpm db:check`, `pnpm test`, and `pnpm smoke`. Each commit passes all five.
- Work on a branch, use Conventional Commit subjects, and open a PR against `main`. The repo owner reviews and merges.
