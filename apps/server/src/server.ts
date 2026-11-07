import { once } from "node:events";
import { mkdirSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import { dirname } from "node:path";
import { getRequestListener } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createBroadcast } from "./broadcast.ts";
import { type Database, openDatabase } from "./db.ts";

export interface Config {
	/** Port on 127.0.0.1. 0 asks the OS for a free one. */
	readonly port: number;
	readonly dbPath: string;
}

export interface RunningServer {
	readonly url: URL;
	readonly db: Database;
	/** Ends open streams, closes every connection, then the database. Every call returns the first call's promise. */
	stop(): Promise<void>;
}

/** Listens on loopback only, then commits `server.started`. A failed start writes nothing. */
export async function start(config: Config): Promise<RunningServer> {
	mkdirSync(dirname(config.dbPath), { recursive: true });
	const broadcast = createBroadcast();
	const db = openDatabase(config.dbPath, broadcast);
	const handle = getRequestListener(createApp(db).fetch);
	const responses = new Set<ServerResponse>();
	const http = createServer((req, res) => {
		responses.add(res);
		res.once("close", () => responses.delete(res));
		void handle(req, res);
	});
	let port: number;
	try {
		port = await listen(http, config.port);
	} catch (error) {
		db.close();
		throw error;
	}
	db.commit(() => ({ value: undefined, events: [{ type: "server.started" }] }));

	let stopping: Promise<void> | undefined;
	const stop = async () => {
		const closed = new Promise<void>((resolve, reject) =>
			http.close((error) => (error ? reject(error) : resolve())),
		);
		broadcast.close();
		// Let the ended streams flush before dropping sockets. The Vite proxy
		// holds a dropped upstream open, so a browser would never see the end.
		await Promise.all([...responses].map((res) => once(res, "close")));
		// An ended SSE response still leaves its keep-alive socket holding close() open.
		http.closeAllConnections();
		await closed;
		db.close();
	};
	return {
		url: new URL(`http://127.0.0.1:${port}/`),
		db,
		stop: () => {
			stopping ??= stop();
			return stopping;
		},
	};
}

function listen(http: Server, port: number): Promise<number> {
	return new Promise((resolve, reject) => {
		http.once("error", reject);
		http.listen(port, "127.0.0.1", () => {
			http.off("error", reject);
			const address = http.address();
			if (address === null || typeof address === "string") {
				reject(new Error(`unexpected server address ${address}`));
			} else {
				resolve(address.port);
			}
		});
	});
}
