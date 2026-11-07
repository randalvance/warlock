import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database, Reader } from "../../db.ts";
import type { ServerEvent } from "../../events.ts";
import { ApiError, notFound } from "../../http.ts";
import type { GitHub } from "./github.ts";
import {
	type Artifact,
	ArtifactId,
	type ContextEntry,
	ContextId,
	type ContextInput,
	maxUploadBytes,
	type NewArtifact,
	type NewProject,
	type Project,
	ProjectId,
	type ProjectSummary,
	type RepoName,
	type RepoRef,
} from "./model.ts";
import {
	artifactBytes,
	artifacts,
	contextEntries,
	projectRepos,
	projects,
} from "./schema.ts";

export interface ArtifactFile {
	readonly name: string;
	readonly mediaType: string;
	readonly bytes: Buffer;
}

/** The only writer of the project tables and the only caller of GitHub. Every method that misses a project throws `not_found`. */
export interface Projects {
	list(): ProjectSummary[];
	get(id: ProjectId): Project;
	create(input: NewProject): Promise<Project>;
	rename(id: ProjectId, name: string): ProjectSummary;
	/** Idempotent. A repo already attached returns the stored one and writes nothing. */
	attachRepo(id: ProjectId, name: RepoName): Promise<RepoRef>;
	/** Idempotent. Detaching the last repo is a `conflict`, decided in the same transaction as the delete. */
	detachRepo(id: ProjectId, name: RepoName): void;
	addArtifact(id: ProjectId, input: NewArtifact): Promise<Artifact>;
	readArtifactFile(id: ProjectId, artifactId: ArtifactId): ArtifactFile;
	addContext(id: ProjectId, input: ContextInput): ContextEntry;
	/** Replaces both fields. */
	editContext(
		id: ProjectId,
		contextId: ContextId,
		input: ContextInput,
	): ContextEntry;
}

const rowid = sql`rowid`;

export function createProjects(deps: {
	readonly db: Database;
	readonly github: GitHub;
}): Projects {
	const { db, github } = deps;
	const changed = (projectId: ProjectId): ServerEvent[] => [
		{ type: "project.changed", projectId },
	];
	const requireProject = (read: Reader, id: ProjectId) => {
		const row = read.select().from(projects).where(eq(projects.id, id)).get();
		if (!row) throw new ApiError(notFound("project").error);
		return row;
	};

	const get = (id: ProjectId): Project => {
		const row = requireProject(db.read, id);
		return {
			...row,
			repos: nonEmpty(reposByProject(db.read, id).get(id)),
			artifacts: db.read
				.select()
				.from(artifacts)
				.where(eq(artifacts.projectId, id))
				.orderBy(asc(rowid))
				.all()
				.map(toArtifact),
			context: db.read
				.select({
					id: contextEntries.id,
					title: contextEntries.title,
					body: contextEntries.body,
				})
				.from(contextEntries)
				.where(eq(contextEntries.projectId, id))
				.orderBy(asc(rowid))
				.all(),
		};
	};

	return {
		list() {
			const repos = reposByProject(db.read);
			return db.read
				.select()
				.from(projects)
				.orderBy(asc(rowid))
				.all()
				.map((row) => ({ ...row, repos: nonEmpty(repos.get(row.id)) }));
		},

		get,

		async create(input) {
			const repos = await github.resolve(input.repos);
			const id = ProjectId.parse(randomUUID());
			db.commit((tx) => {
				tx.insert(projects).values({ id, name: input.name }).run();
				tx.insert(projectRepos)
					.values(repos.map((repo) => ({ projectId: id, ...repo })))
					.run();
				return { value: undefined, events: changed(id) };
			});
			return get(id);
		},

		rename(id, name) {
			return db.commit((tx) => {
				const row = requireProject(tx, id);
				if (row.name !== name) {
					tx.update(projects).set({ name }).where(eq(projects.id, id)).run();
				}
				const summary = {
					id,
					name,
					repos: nonEmpty(reposByProject(tx, id).get(id)),
				};
				return {
					value: summary,
					events: row.name === name ? [] : changed(id),
				};
			});
		},

		async attachRepo(id, name) {
			requireProject(db.read, id);
			const [repo] = await github.resolve([name]);
			return db.commit((tx) => {
				const inserted = tx
					.insert(projectRepos)
					.values({ projectId: id, ...repo })
					.onConflictDoNothing()
					.returning()
					.all();
				if (inserted.length > 0) return { value: repo, events: changed(id) };
				const stored = tx
					.select({
						owner: projectRepos.owner,
						name: projectRepos.name,
						defaultBranch: projectRepos.defaultBranch,
					})
					.from(projectRepos)
					.where(
						and(
							eq(projectRepos.projectId, id),
							eq(projectRepos.owner, repo.owner),
							eq(projectRepos.name, repo.name),
						),
					)
					.get();
				return { value: stored ?? repo, events: [] };
			});
		},

		detachRepo(id, name) {
			const [owner = "", repoName = ""] = name.split("/");
			db.commit((tx) => {
				requireProject(tx, id);
				const repos = tx
					.select()
					.from(projectRepos)
					.where(eq(projectRepos.projectId, id))
					.all();
				const target = repos.find(
					(repo) =>
						repo.owner.toLowerCase() === owner.toLowerCase() &&
						repo.name.toLowerCase() === repoName.toLowerCase(),
				);
				if (!target) return { value: undefined, events: [] };
				if (repos.length === 1) {
					throw new ApiError({
						code: "conflict",
						message: `${target.owner}/${target.name} is the project's last repo, and a project needs at least one`,
					});
				}
				tx.delete(projectRepos)
					.where(
						and(
							eq(projectRepos.projectId, id),
							eq(projectRepos.owner, target.owner),
							eq(projectRepos.name, target.name),
						),
					)
					.run();
				return { value: undefined, events: changed(id) };
			});
		},

		async addArtifact(id, input) {
			requireProject(db.read, id);
			const artifactId = ArtifactId.parse(randomUUID());
			const bytes =
				input.kind === "file"
					? Buffer.from(await input.file.arrayBuffer())
					: undefined;
			if (bytes && bytes.length > maxUploadBytes) {
				throw new ApiError({
					code: "too_large",
					message: `a file can be at most ${maxUploadBytes} bytes`,
				});
			}
			const row: typeof artifacts.$inferInsert = (() => {
				switch (input.kind) {
					case "file":
						return {
							id: artifactId,
							projectId: id,
							kind: "file",
							fileName: input.file.name,
							mediaType: input.file.type || "application/octet-stream",
							size: bytes?.length ?? 0,
						};
					case "link":
						return {
							id: artifactId,
							projectId: id,
							kind: "link",
							url: input.url,
						};
					case "note":
						return {
							id: artifactId,
							projectId: id,
							kind: "note",
							title: input.title,
							body: input.body,
						};
				}
			})();
			return db.commit((tx) => {
				const stored = tx.insert(artifacts).values(row).returning().get();
				if (bytes) tx.insert(artifactBytes).values({ artifactId, bytes }).run();
				return { value: toArtifact(stored), events: changed(id) };
			});
		},

		readArtifactFile(id, artifactId) {
			const row = db.read
				.select({
					name: artifacts.fileName,
					mediaType: artifacts.mediaType,
					bytes: artifactBytes.bytes,
				})
				.from(artifacts)
				.innerJoin(artifactBytes, eq(artifactBytes.artifactId, artifacts.id))
				.where(
					and(
						eq(artifacts.id, artifactId),
						eq(artifacts.projectId, id),
						eq(artifacts.kind, "file"),
					),
				)
				.get();
			if (!row?.name || !row.mediaType) {
				throw new ApiError(notFound("file artifact").error);
			}
			return { name: row.name, mediaType: row.mediaType, bytes: row.bytes };
		},

		addContext(id, input) {
			return db.commit((tx) => {
				requireProject(tx, id);
				const entry = { id: ContextId.parse(randomUUID()), ...input };
				tx.insert(contextEntries)
					.values({ ...entry, projectId: id })
					.run();
				return { value: entry, events: changed(id) };
			});
		},

		editContext(id, contextId, input) {
			return db.commit((tx) => {
				const where = and(
					eq(contextEntries.id, contextId),
					eq(contextEntries.projectId, id),
				);
				const row = tx.select().from(contextEntries).where(where).get();
				if (!row) throw new ApiError(notFound("context entry").error);
				const entry = { id: contextId, ...input };
				if (row.title === input.title && row.body === input.body) {
					return { value: entry, events: [] };
				}
				tx.update(contextEntries).set(input).where(where).run();
				return { value: entry, events: changed(id) };
			});
		},
	};
}

function reposByProject(
	read: Reader,
	only?: ProjectId,
): Map<ProjectId, RepoRef[]> {
	const rows = read
		.select()
		.from(projectRepos)
		.where(only === undefined ? undefined : eq(projectRepos.projectId, only))
		.orderBy(asc(rowid))
		.all();
	const byProject = new Map<ProjectId, RepoRef[]>();
	for (const { projectId, ...repo } of rows) {
		const list = byProject.get(projectId) ?? [];
		list.push(repo);
		byProject.set(projectId, list);
	}
	return byProject;
}

function nonEmpty(repos: RepoRef[] | undefined): [RepoRef, ...RepoRef[]] {
	const [first, ...rest] = repos ?? [];
	if (!first) throw new Error("a stored project has no repos");
	return [first, ...rest];
}

function toArtifact(row: typeof artifacts.$inferSelect): Artifact {
	const { id, kind, fileName, mediaType, size, url, title, body } = row;
	switch (kind) {
		case "file":
			if (fileName !== null && mediaType !== null && size !== null) {
				return { kind, id, name: fileName, mediaType, size };
			}
			break;
		case "link":
			if (url !== null) return { kind, id, url };
			break;
		case "note":
			if (title !== null && body !== null) return { kind, id, title, body };
			break;
	}
	throw new Error(`artifact ${id} breaks the ${kind} column check`);
}
