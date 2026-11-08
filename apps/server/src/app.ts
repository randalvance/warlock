import { Hono } from "hono";
import type { ApplyGlobalResponse } from "hono/client";
import type { Database } from "./db.ts";
import { eventsRoute } from "./events-route.ts";
import {
	ApiError,
	type ApiErrorBody,
	errorStatus,
	internalError,
	notFound,
} from "./http.ts";
import {
	minionsRoute,
	skillsRoute,
	warlockRoute,
} from "./modules/agents/routes.ts";
import type { SkillsLibrary } from "./modules/agents/skills.ts";
import type { Agents } from "./modules/agents/store.ts";
import { projectsRoute } from "./modules/projects/routes.ts";
import type { Projects } from "./modules/projects/store.ts";

export function createApp(
	db: Database,
	projects: Projects,
	agents: Agents,
	library: SkillsLibrary,
) {
	const app = new Hono().basePath("/api");
	app.notFound((c) => c.json(notFound("route"), errorStatus.not_found));
	app.onError((error, c) => {
		if (error instanceof ApiError) return c.json(error.body, error.status);
		console.error(error);
		return c.json(internalError, errorStatus.internal);
	});
	// One chain: Hono accumulates route types along it, and AppType is the web client's contract.
	return app
		.get("/health", (c) => c.json({ ok: true as const }, 200))
		.route("/events", eventsRoute(db))
		.route("/projects", projectsRoute(projects))
		.route("/warlock", warlockRoute(agents))
		.route("/minions", minionsRoute(agents))
		.route("/skills", skillsRoute(library));
}

type ErrorResponses = {
	[S in (typeof errorStatus)[keyof typeof errorStatus]]: {
		json: ApiErrorBody;
	};
};

export type AppType = ApplyGlobalResponse<
	ReturnType<typeof createApp>,
	ErrorResponses
>;
