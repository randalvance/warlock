# Warlock

Warlock is an agentic software factory, called the dark factory. You give the warlock agent a task. The warlock picks a spellbook for the task, and a formation of minion agents does the work, handing it from station to station.

Warlock is early in development. The plan is a set of GitHub issues with the `epic` label.

[The domain model](docs/domain.md) defines every term above and the data shape behind it.

## Develop

You need Node 22.22 or later and pnpm 10. The stack and its reasons are in [ADR 0001](docs/adr/0001-stack.md).

```sh
nvm use
pnpm install
pnpm dev
```

`pnpm dev` starts the server on `http://127.0.0.1:4317` and the web app on `http://127.0.0.1:5173`. The web app sends `/api` requests to the server. The development database is `apps/server/.data/warlock.db`. Set `WARLOCK_DB_PATH` to use a different file.

| Command | What it runs |
| --- | --- |
| `pnpm lint` | Biome lint and format check |
| `pnpm typecheck` | `tsc` for the root and both apps |
| `pnpm test` | Vitest server tests, including the restart test |
| `pnpm db:check` | Fails if a schema change has no migration |
| `pnpm smoke` | The Playwright smoke test against `pnpm dev`, on ports 4417 and 5273 |

After you change a table in a `schema.ts` file, run `pnpm --filter @warlock/server db:generate` and commit the new migration.
