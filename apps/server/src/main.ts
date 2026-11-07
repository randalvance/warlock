import { fileURLToPath } from "node:url";
import { z } from "zod";
import { start } from "./server.ts";

const Env = z.object({
	// Not 0, because the Vite proxy reads this port and cannot follow an ephemeral one.
	WARLOCK_PORT: z.coerce.number().int().min(1).max(65535),
	WARLOCK_DB_PATH: z
		.string()
		.min(1)
		.default(fileURLToPath(new URL("../.data/warlock.db", import.meta.url))),
});

const env = Env.safeParse(process.env);
if (!env.success) throw new Error(z.prettifyError(env.error));

const server = await start({
	port: env.data.WARLOCK_PORT,
	dbPath: env.data.WARLOCK_DB_PATH,
});
console.log(`warlock server listening on ${server.url.href}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => void server.stop().then(() => process.exit(0)));
}
