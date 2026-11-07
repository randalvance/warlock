import { z } from "zod";
import { Seq, StoredEvent } from "./events.ts";

/**
 * Every message on `GET /api/events`. `ready` is first on each connection and
 * carries the cursor the stream starts after. There is no SSE `id:` field;
 * the cursor travels only as `?after=`.
 */
export type Frame =
	| { readonly kind: "ready"; readonly cursor: Seq }
	| { readonly kind: "event"; readonly event: StoredEvent };

export interface SseMessage {
	event?: string;
	data: string;
}

export function encodeFrame(frame: Frame): SseMessage {
	switch (frame.kind) {
		case "ready":
			return { event: "ready", data: JSON.stringify({ cursor: frame.cursor }) };
		case "event":
			return { data: JSON.stringify(frame.event) };
	}
}

const Ready = z.object({ cursor: Seq });

export type StreamStatus = "connecting" | "live" | "reconnecting";

export interface EventSourceLike {
	addEventListener(
		type: string,
		listener: (message: { data: string }) => void,
	): void;
	close(): void;
}

export interface ConnectOptions {
	/** An origin such as `http://127.0.0.1:4317`. */
	readonly baseUrl: string;
	readonly EventSource: new (url: string) => EventSourceLike;
	/** Start after this seq. Absent means start at the head. */
	readonly after?: Seq;
	readonly retryMs?: number;
	readonly onEvent?: (event: StoredEvent) => void;
	readonly onStatus?: (status: StreamStatus) => void;
}

/**
 * Keeps the event stream open until `close()`. On any error it closes the
 * EventSource and reopens with `?after=<cursor>`, because the browser's own
 * retry gives up for good on a non-200 answer, which is what the Vite proxy
 * returns while the server restarts.
 */
export function connectEvents(options: ConnectOptions): { close(): void } {
	const { baseUrl, EventSource, retryMs = 1000, onEvent, onStatus } = options;
	let cursor = options.after;
	let status: StreamStatus | undefined;
	let source: EventSourceLike | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;
	let closed = false;

	const setStatus = (next: StreamStatus) => {
		if (next === status) return;
		status = next;
		onStatus?.(next);
	};

	const open = () => {
		const url = new URL("/api/events", baseUrl);
		if (cursor !== undefined) url.searchParams.set("after", String(cursor));
		const current = new EventSource(url.href);
		source = current;
		current.addEventListener("ready", (message) => {
			cursor = Ready.parse(JSON.parse(message.data)).cursor;
			setStatus("live");
		});
		current.addEventListener("message", (message) => {
			const event = StoredEvent.parse(JSON.parse(message.data));
			cursor = event.seq;
			onEvent?.(event);
		});
		current.addEventListener("error", () => {
			current.close();
			if (closed) return;
			setStatus("reconnecting");
			retry = setTimeout(open, retryMs);
		});
	};

	setStatus("connecting");
	open();
	return {
		close() {
			closed = true;
			clearTimeout(retry);
			source?.close();
		},
	};
}
