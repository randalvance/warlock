import {
	type QueryClient,
	type QueryKey,
	queryOptions,
} from "@tanstack/react-query";
import type {
	EventOf,
	ProjectId,
	ServerEventType,
	StoredEvent,
} from "@warlock/server/api";
import { client, unwrap } from "@/lib/api";
import { subscribeServerEvents } from "@/lib/server-events";

export const projectKeys = {
	list: ["projects", "list"] as const,
	detail: (id: ProjectId) => ["projects", "detail", id] as const,
};

export const projectQueries = {
	list: () =>
		queryOptions({
			queryKey: projectKeys.list,
			queryFn: async () => (await unwrap(client.api.projects.$get())).projects,
		}),
	detail: (id: ProjectId) =>
		queryOptions({
			queryKey: projectKeys.detail(id),
			queryFn: async () =>
				(
					await unwrap(
						client.api.projects[":projectId"].$get({
							param: { projectId: id },
						}),
					)
				).project,
		}),
};

/** What each event makes stale. A new event type fails the typecheck until it has a row here. */
export const staleAfter: {
	[T in ServerEventType]: (event: EventOf<T>) => QueryKey[];
} = {
	"server.started": () => [],
	"project.changed": (event) => [
		projectKeys.list,
		projectKeys.detail(event.projectId),
	],
};

function staleFor(event: StoredEvent): QueryKey[] {
	const stale = staleAfter[event.type] as (event: StoredEvent) => QueryKey[];
	return stale(event);
}

/**
 * The event stream is the only way the cache learns of a write. Each move to
 * live, the first connect and every reconnect, invalidates everything, which
 * covers writes missed while the stream was down or before its cursor.
 */
export function syncQueryCache(queryClient: QueryClient): () => void {
	return subscribeServerEvents({
		onStatus: (status) => {
			if (status === "live") void queryClient.invalidateQueries();
		},
		onEvent: (event) => {
			for (const queryKey of staleFor(event)) {
				void queryClient.invalidateQueries({ queryKey });
			}
		},
	});
}
