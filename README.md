# Warlock

Warlock is an agentic software factory, called the dark factory. You give the warlock agent a task. The warlock picks a spellbook for the task, and a formation of minion agents does the work, handing it from station to station.

Warlock is early in development. The plan is a set of GitHub issues with the `epic` label.

[The domain model](docs/domain.md) defines every term above and the data shape behind it.

## Develop

You need Docker and the devcontainer CLI (`npm install --global @devcontainers/cli`). The container provides Node 22 and pnpm 10. The stack and its reasons are in [ADR 0001](docs/adr/0001-stack.md).

Run every command inside the dev container. The devcontainer CLI starts it on your active Docker context, and `scripts/devcontainer.sh` runs commands in it:

```sh
scripts/devcontainer.sh up
scripts/devcontainer.sh pnpm dev
```

`pnpm dev` starts the server on `http://127.0.0.1:4317` and the web app on `http://127.0.0.1:5173`, both inside the container. The web app sends `/api` requests to the server. The development database is `apps/server/.data/warlock.db`. Set `WARLOCK_DB_PATH` to use a different file. Agent profiles pick skills from the skills library, a `skills` folder next to the database that holds one Agent Skills folder per skill. Set `WARLOCK_SKILLS_DIR` to use a different folder. The server checks each project repo against GitHub with `GITHUB_TOKEN`, or with `gh auth token` when that is unset. Set `GITHUB_API_URL` for GitHub Enterprise.

| Command | What it runs |
| --- | --- |
| `pnpm lint` | Biome lint and format check |
| `pnpm typecheck` | `tsc` for the root and both apps |
| `pnpm test` | Vitest server tests, including the restart test |
| `pnpm db:check` | Fails if a schema change has no migration |
| `pnpm smoke` | The Playwright browser tests. Playwright runs Vite on port 5273, and each test starts its own server on port 4417 with a fresh database and a local GitHub stub |

[Nx](https://nx.dev) runs each app's `package.json` scripts as tasks. It caches `typecheck`, `test`, and `db:check`, so a rerun with no file changes replays the stored result. Nx hides the output of a task that passes. Add `--output-style=static` to see it. To run one app's script, use `pnpm nx run <project>:<script>`, such as `pnpm nx run @warlock/server:test`. [ADR 0002](docs/adr/0002-nx.md) says why.

After you change a table in a `schema.ts` file, run `pnpm nx run @warlock/server:db:generate` and commit the new migration.
