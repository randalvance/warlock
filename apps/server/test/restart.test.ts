import { EventSource } from "eventsource";
import { expect, onTestFinished, test, vi } from "vitest";
import type { StoredEvent } from "../src/events.ts";
import { connectEvents, type StreamStatus } from "../src/events-wire.ts";
import { boot, readEvents, tempDbPath } from "./support.ts";

test("a row written before a restart reads back unchanged after it", async () => {
	const dbPath = tempDbPath();

	const first = await boot(dbPath);
	const before = await readEvents(first.url, { after: 0, count: 1 });
	await first.stop();
	await expect(
		fetch(new URL("/api/health", first.url)),
		"the first server stopped answering",
	).rejects.toThrow();

	const second = await boot(dbPath);
	const after = await readEvents(second.url, { after: 0, count: 2 });

	expect(before).toEqual([expect.objectContaining({ type: "server.started" })]);
	expect(after[0], "the first boot's row is unchanged").toEqual(before[0]);
	expect(after[1]).toMatchObject({ type: "server.started" });
	expect(after[1]?.seq).toBeGreaterThan(before[0]?.seq ?? Infinity);
});

test("a client connected across a restart receives what was written while it was away, once", async () => {
	const dbPath = tempDbPath();
	const first = await boot(dbPath);

	const received: StoredEvent[] = [];
	const statuses: StreamStatus[] = [];
	const client = connectEvents({
		baseUrl: first.url.href,
		EventSource,
		retryMs: 20,
		onEvent: (event) => received.push(event),
		onStatus: (status) => statuses.push(status),
	});
	onTestFinished(() => client.close());

	await vi.waitFor(() => expect(statuses).toContain("live"));
	await first.stop();
	const second = await boot(dbPath, Number(first.url.port));
	const log = await readEvents(second.url, { after: 0, count: 2 });

	await vi.waitFor(() => expect(received).toHaveLength(1));
	expect(received, "exactly the second boot's row").toEqual([log[1]]);
	expect(statuses).toEqual(["connecting", "live", "reconnecting", "live"]);
});
