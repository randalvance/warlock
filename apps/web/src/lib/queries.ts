import {
	type QueryClient,
	type QueryKey,
	queryOptions,
} from "@tanstack/react-query";
import type {
	EventOf,
	MinionId,
	ProjectId,
	ServerEventType,
	StoredEvent,
} from "@warlock/server/api";
import type { StreamStatus } from "@warlock/server/events";
import { ApiRequestError, client, unwrap } from "@/lib/api";
import { subscribeServerEvents } from "@/lib/server-events";

export const projectKeys = {
	list: ["projects", "list"] as const,
	detail: (id: ProjectId) => ["projects", "detail", id] as const,
};

export const agentKeys = {
	warlock: ["warlock"] as const,
	skills: ["skills"] as const,
	minions: {
		list: ["minions", "list"] as const,
		detail: (id: MinionId) => ["minions", "detail", id] as const,
	},
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

export const agentQueries = {
	warlock: () =>
		queryOptions({
			queryKey: agentKeys.warlock,
			queryFn: async () => (await unwrap(client.api.warlock.$get())).warlock,
		}),
	skills: () =>
		queryOptions({
			queryKey: agentKeys.skills,
			queryFn: async () => (await unwrap(client.api.skills.$get())).skills,
		}),
	minions: {
		list: () =>
			queryOptions({
				queryKey: agentKeys.minions.list,
				queryFn: async () => (await unwrap(client.api.minions.$get())).minions,
			}),
		detail: (id: MinionId) =>
			queryOptions({
				queryKey: agentKeys.minions.detail(id),
				queryFn: async () =>
					(
						await unwrap(
							client.api.minions[":minionId"].$get({
								param: { minionId: id },
							}),
						)
					).minion,
				retry: (failures, error) =>
					!(error instanceof ApiRequestError && error.status === 404) &&
					failures < 3,
			}),
	},
};

export const staleAfter: {
	[T in ServerEventType]: (event: EventOf<T>) => QueryKey[];
} = {
	"server.started": () => [],
	"project.changed": (event) => [
		projectKeys.list,
		projectKeys.detail(event.projectId),
	],
	"warlock.changed": () => [agentKeys.warlock],
	"minion.changed": (event) => [
		agentKeys.minions.list,
		agentKeys.minions.detail(event.minionId),
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
