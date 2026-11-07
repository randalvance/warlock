import { connectEvents, type StreamStatus } from "@warlock/server/events";
import { useSyncExternalStore } from "react";

let status: StreamStatus = "connecting";
let stream: { close(): void } | undefined;
const listeners = new Set<() => void>();

function ensureStream() {
	if (stream) return;
	stream = connectEvents({
		baseUrl: window.location.origin,
		EventSource,
		onStatus: (next) => {
			status = next;
			for (const notify of listeners) notify();
		},
	});
}

function subscribe(listener: () => void) {
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
	return useSyncExternalStore(subscribe, () => status);
}
