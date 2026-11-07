import { connectEvents, type StreamStatus } from "@warlock/server/events";
import { useSyncExternalStore } from "react";

let status: StreamStatus = "connecting";
let connected = false;
const listeners = new Set<() => void>();

/** Opens the tab's one event stream on first use and keeps it for the page's life. */
function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!connected) {
		connected = true;
		connectEvents({
			baseUrl: window.location.origin,
			EventSource,
			onStatus: (next) => {
				status = next;
				for (const notify of listeners) notify();
			},
		});
	}
	return () => {
		listeners.delete(listener);
	};
}

export function useStreamStatus(): StreamStatus {
	return useSyncExternalStore(subscribe, () => status);
}
