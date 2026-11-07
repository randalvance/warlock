import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { Broadcast } from "./broadcast.ts";
import { type Database, eventsAfter, headSeq } from "./db.ts";
import { Seq } from "./events.ts";
import { encodeFrame } from "./events-wire.ts";
import { validate } from "./http.ts";

const EventsQuery = z.object({ after: z.coerce.number().pipe(Seq).optional() });

/** `GET /api/events?after=<seq>`: `ready`, then the stored events after the cursor, then live ones. */
export function eventsRoute(db: Database, broadcast: Broadcast) {
	return new Hono().get("/", validate("query", EventsQuery), (c) => {
		const { after } = c.req.valid("query");
		const head = headSeq(db.read);
		const cursor = after === undefined || after > head ? head : after;
		// Reading the backlog and subscribing in one synchronous step means no
		// commit can land between them, so nothing is missed or sent twice.
		const events = broadcast.subscribe(eventsAfter(db.read, cursor));
		return streamSSE(c, async (stream) => {
			stream.onAbort(() => events.close());
			await stream.writeSSE(encodeFrame({ kind: "ready", cursor }));
			for await (const event of events) {
				await stream.writeSSE(encodeFrame({ kind: "event", event }));
			}
		});
	});
}
