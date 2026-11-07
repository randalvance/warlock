import type { StoredEvent } from "./events.ts";

/** Events published after `subscribe`, in order. Iteration ends once it is closed and drained. */
export interface Subscription extends AsyncIterable<StoredEvent> {
	close(): void;
}

export interface Broadcast {
	publish(events: readonly StoredEvent[]): void;
	/** `backlog` is queued ahead of every later publish. */
	subscribe(backlog: readonly StoredEvent[]): Subscription;
	/** Closes every subscription, and every later one at birth. */
	close(): void;
}

interface Queue extends Subscription {
	push(events: readonly StoredEvent[]): void;
}

export function createBroadcast(): Broadcast {
	const queues = new Set<Queue>();
	let closed = false;
	return {
		publish(events) {
			for (const queue of queues) queue.push(events);
		},
		subscribe(backlog) {
			const queue = createQueue(backlog, () => queues.delete(queue));
			if (closed) queue.close();
			else queues.add(queue);
			return queue;
		},
		close() {
			closed = true;
			for (const queue of queues) queue.close();
		},
	};
}

function createQueue(
	backlog: readonly StoredEvent[],
	onClose: () => void,
): Queue {
	const buffer = [...backlog];
	let closed = false;
	let wake: (() => void) | undefined;
	const notify = () => {
		wake?.();
		wake = undefined;
	};
	return {
		push(events) {
			buffer.push(...events);
			notify();
		},
		close() {
			if (closed) return;
			closed = true;
			onClose();
			notify();
		},
		async *[Symbol.asyncIterator]() {
			while (true) {
				const next = buffer.shift();
				if (next) {
					yield next;
				} else if (closed) {
					return;
				} else {
					await new Promise<void>((resolve) => {
						wake = resolve;
					});
				}
			}
		},
	};
}
