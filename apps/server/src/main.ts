import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadGitHubToken } from "./modules/projects/github.ts";
import { start } from "./server.ts";

const Env = z.object({
	// Not 0, because the Vite proxy reads this port and cannot follow an ephemeral one.
	HONEYPOT_PORT: z.coerce.number().int().min(1).max(65535),
	HONEYPOT_DB_PATH: z
		.string()
		.min(1)
		.default(fileURLToPath(new URL("../.data/honeypot.db", import.meta.url))),
	HONEYPOT_SKILLS_DIR: z.string().min(1).optional(),
	GITHUB_API_URL: z.url().default("https://api.github.com"),
});

const env = Env.safeParse(process.env);
if (!env.success) throw new Error(z.prettifyError(env.error));

const token = await loadGitHubToken(process.env);
if (token === undefined) {
	console.warn(
		"no GitHub token: set GITHUB_TOKEN or run gh auth login. Repo checks will fail.",
	);
}
const server = await start({
	port: env.data.HONEYPOT_PORT,
	dbPath: env.data.HONEYPOT_DB_PATH,
	skillsDir:
		env.data.HONEYPOT_SKILLS_DIR ??
		join(dirname(env.data.HONEYPOT_DB_PATH), "skills"),
	github: { apiUrl: new URL(env.data.GITHUB_API_URL), token },
});
console.log(`honeypot server listening on ${server.url.href}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => void server.stop().then(() => process.exit(0)));
}
