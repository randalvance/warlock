import { connect } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { EventSource } from "eventsource";
import { expect, onTestFinished, test, vi } from "vitest";
import type { StoredEvent } from "../src/events.ts";
import { connectEvents } from "../src/events-wire.ts";
import type { ApiErrorBody } from "../src/http.ts";
import { readEvents, startFresh, tempDbPath } from "./support.ts";

test("a commit reaches a stream that is already open", async () => {
	const server = await startFresh(tempDbPath());
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
	const server = await startFresh(tempDbPath());
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

test("stop resolves while a client that never reads holds a large replay", {
	timeout: 15_000,
}, async () => {
	const server = await startFresh(tempDbPath());
	// 10,000 events already outgrow the loopback socket buffers on macOS. This leaves room for larger ones.
	const replay = Array.from({ length: 50_000 }, () => ({
		type: "server.started" as const,
	}));
	server.db.commit(() => ({ value: undefined, events: replay }));
	const socket = connect(Number(server.url.port), "127.0.0.1");
	onTestFinished(() => {
		socket.destroy();
	});
	socket.write("GET /api/events?after=0 HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");
	await vi.waitFor(() =>
		expect(socket.readableLength, "the replay has started").toBeGreaterThan(0),
	);

	const outcome = await Promise.race([
		server.stop().then(() => "stopped"),
		delay(3000, "still stopping"),
	]);
	expect(outcome, "a stalled client does not hold stop open").toBe("stopped");
});

test("a cursor past the head starts the stream at the head", async () => {
	const server = await startFresh(tempDbPath());
	const response = await fetch(new URL("/api/events?after=100", server.url));
	const reader = response.body?.getReader();
	if (!reader) throw new Error("the stream has no body");
	onTestFinished(() => reader.cancel());
	const first = await reader.read();
	expect(
		new TextDecoder().decode(first.value),
		"ready carries the head, seq 1, not the cursor past it",
	).toContain('event: ready\ndata: {"cursor":1}\n');
});

test("a malformed cursor is a 400 that names the field", async () => {
	const server = await startFresh(tempDbPath());
	const response = await fetch(new URL("/api/events?after=-1", server.url));
	expect(response.status).toBe(400);
	const body = (await response.json()) as ApiErrorBody;
	expect(body.error).toMatchObject({
		code: "invalid_request",
		issues: [expect.objectContaining({ path: "after" })],
	});
});
