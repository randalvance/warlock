import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { Database } from "./db.ts";
import { Seq } from "./events.ts";
import { encodeFrame } from "./events-wire.ts";
import { validate } from "./http.ts";

const EventsQuery = z.object({ after: z.coerce.number().pipe(Seq).optional() });

/** `GET /api/events?after=<seq>`: `ready`, then the stored events after the cursor, then live ones. */
export function eventsRoute(db: Database) {
	return new Hono().get("/", validate("query", EventsQuery), (c) => {
		const { after } = c.req.valid("query");
		const { cursor, events } = db.follow(after);
		return streamSSE(c, async (stream) => {
			stream.onAbort(() => events.close());
			await stream.writeSSE(encodeFrame({ kind: "ready", cursor }));
			for await (const event of events) {
				await stream.writeSSE(encodeFrame({ kind: "event", event }));
			}
		});
	});
}
