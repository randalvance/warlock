import { Hono } from "hono";
import type { Broadcast } from "./broadcast.ts";
import type { Database } from "./db.ts";
import { eventsRoute } from "./events-route.ts";
import { internalError, notFound } from "./http.ts";

export interface AppDeps {
	readonly db: Database;
	readonly broadcast: Broadcast;
}

export function createApp({ db, broadcast }: AppDeps) {
	const app = new Hono().basePath("/api");
	app.notFound((c) => c.json(notFound("route"), 404));
	app.onError((error, c) => {
		console.error(error);
		return c.json(internalError, 500);
	});
	// One chain: Hono accumulates route types along it, and AppType is the web client's contract.
	return app
		.get("/health", (c) => c.json({ ok: true as const }, 200))
		.route("/events", eventsRoute(db, broadcast));
}

export type AppType = ReturnType<typeof createApp>;
