import { EventSource } from "eventsource";
import { expect, onTestFinished, test, vi } from "vitest";
import type { StoredEvent } from "../src/events.ts";
import { connectEvents } from "../src/events-wire.ts";
import type { ApiErrorBody } from "../src/http.ts";
import { boot, readEvents, tempDbPath } from "./support.ts";

test("a commit reaches a stream that is already open", async () => {
	const server = await boot(tempDbPath());
	const received: StoredEvent[] = [];
	let live = false;
	const client = connectEvents({
		baseUrl: server.url.href,
		EventSource,
		onEvent: (event) => received.push(event),
		onStatus: (status) => {
			live = status === "live";
		},
	});
	onTestFinished(() => client.close());
	await vi.waitFor(() => expect(live).toBe(true));
	expect(received, "a stream without a cursor starts at the head").toEqual([]);

	server.db.commit(() => ({
		value: undefined,
		events: [{ type: "server.started" }],
	}));

	await vi.waitFor(() => expect(received).toHaveLength(1));
	const log = await readEvents(server.url, { after: 0, count: 2 });
	expect(received).toEqual([log[1]]);
});

test("stop ends open streams cleanly and resolves", async () => {
	const server = await boot(tempDbPath());
	const response = await fetch(new URL("/api/events", server.url));
	const reader = response.body?.getReader();
	if (!reader) throw new Error("the stream has no body");
	const first = await reader.read();
	expect(new TextDecoder().decode(first.value)).toContain("event: ready");

	await server.stop();

	await expect(
		reader.read(),
		"the stream ended cleanly, which the Vite proxy passes on to the browser",
	).resolves.toEqual({
		done: true,
		value: undefined,
	});
});

test("a malformed cursor is a 400 that names the field", async () => {
	const server = await boot(tempDbPath());
	const response = await fetch(new URL("/api/events?after=-1", server.url));
	expect(response.status).toBe(400);
	const body = (await response.json()) as ApiErrorBody;
	expect(body.error).toMatchObject({
		code: "invalid_request",
		issues: [expect.objectContaining({ path: "after" })],
	});
});
