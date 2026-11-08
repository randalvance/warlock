import { Hono } from "hono";
import { z } from "zod";
import { jsonBodyLimit, limitBody, validate } from "../../http.ts";
import {
	ArtifactId,
	ContextId,
	ContextInput,
	maxUploadBytes,
	NewArtifact,
	NewProject,
	ProjectId,
	ProjectPatch,
	RepoName,
} from "./model.ts";
import type { Projects } from "./store.ts";

const ProjectParam = z.object({ projectId: ProjectId });
const RepoParam = z
	.object({ projectId: z.string(), owner: z.string(), name: z.string() })
	.transform(({ projectId, owner, name }) => ({
		projectId,
		repo: `${owner}/${name}`,
	}))
	.pipe(z.object({ projectId: ProjectId, repo: RepoName }));
const ArtifactParam = z.object({
	projectId: ProjectId,
	artifactId: ArtifactId,
});
const ContextParam = z.object({ projectId: ProjectId, contextId: ContextId });

const AttachRepo = z.object({ repo: RepoName });

const multipartOverheadBytes = 64 * 1024;

const fileBodyLimit = limitBody(
	maxUploadBytes + multipartOverheadBytes,
	`a file can be at most ${maxUploadBytes} bytes`,
);

export function projectsRoute(projects: Projects) {
	return new Hono()
		.get("/", (c) => c.json({ projects: projects.list() }, 200))
		.post("/", jsonBodyLimit, validate("json", NewProject), async (c) =>
			c.json({ project: await projects.create(c.req.valid("json")) }, 201),
		)
		.get("/:projectId", validate("param", ProjectParam), (c) =>
			c.json({ project: projects.get(c.req.valid("param").projectId) }, 200),
		)
		.patch(
			"/:projectId",
			validate("param", ProjectParam),
			jsonBodyLimit,
			validate("json", ProjectPatch),
			(c) => {
				const { projectId } = c.req.valid("param");
				const { name } = c.req.valid("json");
				return c.json({ project: projects.rename(projectId, name) }, 200);
			},
		)
		.post(
			"/:projectId/repos",
			validate("param", ProjectParam),
			jsonBodyLimit,
			validate("json", AttachRepo),
			async (c) => {
				const { projectId } = c.req.valid("param");
				const { repo } = c.req.valid("json");
				return c.json(
					{ repo: await projects.attachRepo(projectId, repo) },
					200,
				);
			},
		)
		.delete(
			"/:projectId/repos/:owner/:name",
			validate("param", RepoParam),
			(c) => {
				const { projectId, repo } = c.req.valid("param");
				projects.detachRepo(projectId, repo);
				return c.body(null, 204);
			},
		)
		.post(
			"/:projectId/artifacts",
			validate("param", ProjectParam),
			fileBodyLimit,
			validate("form", NewArtifact),
			async (c) => {
				const { projectId } = c.req.valid("param");
				const artifact = await projects.addArtifact(
					projectId,
					c.req.valid("form"),
				);
				return c.json({ artifact }, 201);
			},
		)
		.get(
			"/:projectId/artifacts/:artifactId/content",
			validate("param", ArtifactParam),
			(c) => {
				const { projectId, artifactId } = c.req.valid("param");
				const file = projects.readArtifactFile(projectId, artifactId);
				return c.body(new Uint8Array(file.bytes), 200, {
					"content-type": file.mediaType,
					"content-disposition": attachment(file.name),
					"x-content-type-options": "nosniff",
				});
			},
		)
		.post(
			"/:projectId/context",
			validate("param", ProjectParam),
			jsonBodyLimit,
			validate("json", ContextInput),
			(c) => {
				const { projectId } = c.req.valid("param");
				const entry = projects.addContext(projectId, c.req.valid("json"));
				return c.json({ entry }, 201);
			},
		)
		.put(
			"/:projectId/context/:contextId",
			validate("param", ContextParam),
			jsonBodyLimit,
			validate("json", ContextInput),
			(c) => {
				const { projectId, contextId } = c.req.valid("param");
				const entry = projects.editContext(
					projectId,
					contextId,
					c.req.valid("json"),
				);
				return c.json({ entry }, 200);
			},
		);
}

function attachment(name: string): string {
	const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
