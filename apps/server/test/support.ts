import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventSource } from "eventsource";
import { onTestFinished, vi } from "vitest";
import { Seq, type StoredEvent } from "../src/events.ts";
import { connectEvents } from "../src/events-wire.ts";

export function tempDbPath(): string {
	const dir = mkdtempSync(join(tmpdir(), "warlock-test-"));
	onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
	return join(dir, "warlock.db");
}

export async function startFresh(dbPath: string, port = 0) {
	vi.resetModules();
	const { start } = await import("../src/server.ts");
	const server = await start({ port, dbPath });
	onTestFinished(() => server.stop());
	return server;
}

export function readEvents(
	url: URL,
	query: { after: number; count: number },
): Promise<StoredEvent[]> {
	return new Promise((resolve, reject) => {
		const received: StoredEvent[] = [];
		const timeout = setTimeout(() => {
			stream.close();
			reject(new Error(`read ${received.length} of ${query.count} events`));
		}, 5000);
		const stream = connectEvents({
			baseUrl: url.href,
			EventSource,
			after: Seq.parse(query.after),
			onEvent: (event) => {
				received.push(event);
				if (received.length < query.count) return;
				clearTimeout(timeout);
				stream.close();
				resolve(received);
			},
		});
	});
}
