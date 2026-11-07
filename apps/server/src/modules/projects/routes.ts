import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { type ApiErrorBody, errorStatus, validate } from "../../http.ts";
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

const tooLarge: ApiErrorBody = {
	error: {
		code: "too_large",
		message: `a file can be at most ${maxUploadBytes} bytes`,
	},
};
// Room for the multipart boundaries and the other fields around the file.
const formSlackBytes = 64 * 1024;

export function projectsRoute(projects: Projects) {
	return new Hono()
		.get("/", (c) => c.json({ projects: projects.list() }, 200))
		.post("/", validate("json", NewProject), async (c) =>
			c.json({ project: await projects.create(c.req.valid("json")) }, 201),
		)
		.get("/:projectId", validate("param", ProjectParam), (c) =>
			c.json({ project: projects.get(c.req.valid("param").projectId) }, 200),
		)
		.patch(
			"/:projectId",
			validate("param", ProjectParam),
			validate("json", ProjectPatch),
			(c) => {
				const { projectId } = c.req.valid("param");
				const { name } = c.req.valid("json");
				return c.json({ project: projects.rename(projectId, name) }, 200);
			},
		)
		.put(
			"/:projectId/repos/:owner/:name",
			validate("param", RepoParam),
			async (c) => {
				const { projectId, repo } = c.req.valid("param");
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
			bodyLimit({
				maxSize: maxUploadBytes + formSlackBytes,
				onError: (c) => c.json(tooLarge, errorStatus.too_large),
			}),
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

/** Always a download, so an uploaded HTML file never renders on the app's origin. */
function attachment(name: string): string {
	const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
