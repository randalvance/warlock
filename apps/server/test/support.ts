import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { EventSource } from "eventsource";
import { onTestFinished, vi } from "vitest";
import { Seq, type StoredEvent } from "../src/events.ts";
import { connectEvents } from "../src/events-wire.ts";
import type { ApiErrorBody } from "../src/http.ts";
import type { GitHubConfig } from "../src/modules/projects/github.ts";

export function tempDbPath(): string {
	const dir = mkdtempSync(join(tmpdir(), "honeypot-test-"));
	onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
	return join(dir, "honeypot.db");
}

const noGitHub: GitHubConfig = {
	apiUrl: new URL("http://127.0.0.1:9/"),
	token: "unused",
};

export async function startFresh(
	dbPath: string,
	{
		port = 0,
		github = noGitHub,
		skillsDir = join(dirname(dbPath), "skills"),
	}: { port?: number; github?: GitHubConfig; skillsDir?: string } = {},
) {
	vi.resetModules();
	const { start } = await import("../src/server.ts");
	const server = await start({ port, dbPath, skillsDir, github });
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

export async function errorOf(
	response: Response,
): Promise<ApiErrorBody["error"]> {
	return ((await response.json()) as ApiErrorBody).error;
}

export async function headSeq(url: URL): Promise<number> {
	const response = await fetch(new URL("/api/events", url));
	const reader = response.body?.getReader();
	if (!reader) throw new Error("the stream has no body");
	const { value } = await reader.read();
	await reader.cancel();
	const match = /"cursor":(\d+)/.exec(new TextDecoder().decode(value));
	if (!match) throw new Error("the stream did not open with ready");
	return Number(match[1]);
}
