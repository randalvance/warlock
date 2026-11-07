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
import type { StreamStatus } from "@warlock/server/events";
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

export function syncQueryCache(queryClient: QueryClient): () => void {
	return subscribeServerEvents({
		onStatus: invalidateAllOnReconnect(queryClient),
		onEvent: (event) => {
			for (const queryKey of staleFor(event)) {
				void queryClient.invalidateQueries({ queryKey });
			}
		},
	});
}

function invalidateAllOnReconnect(queryClient: QueryClient) {
	return (status: StreamStatus) => {
		if (status === "live") void queryClient.invalidateQueries();
	};
}
