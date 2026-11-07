import type { StoredEvent } from "@warlock/server/api";
import { connectEvents, type StreamStatus } from "@warlock/server/events";
import { useSyncExternalStore } from "react";

export interface ServerEventListener {
	onStatus?(status: StreamStatus): void;
	onEvent?(event: StoredEvent): void;
}

let status: StreamStatus = "connecting";
let stream: { close(): void } | undefined;
const listeners = new Set<ServerEventListener>();

function ensureStream() {
	if (stream) return;
	stream = connectEvents({
		baseUrl: window.location.origin,
		EventSource,
		onStatus: (next) => {
			status = next;
			for (const listener of listeners) listener.onStatus?.(next);
		},
		onEvent: (event) => {
			for (const listener of listeners) listener.onEvent?.(event);
		},
	});
}

export function subscribeServerEvents(
	listener: ServerEventListener,
): () => void {
	listeners.add(listener);
	ensureStream();
	return () => {
		listeners.delete(listener);
		if (listeners.size > 0) return;
		stream?.close();
		stream = undefined;
		status = "connecting";
	};
}

export function useStreamStatus(): StreamStatus {
	return useSyncExternalStore(
		(notify) => subscribeServerEvents({ onStatus: notify }),
		() => status,
	);
}
