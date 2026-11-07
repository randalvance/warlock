import { sql } from "drizzle-orm";
import {
	blob,
	check,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import type {
	ArtifactId,
	ArtifactKind,
	ContextId,
	ProjectId,
} from "./model.ts";

export const projects = sqliteTable("projects", {
	id: text("id").$type<ProjectId>().primaryKey(),
	name: text("name").notNull(),
});

export const projectRepos = sqliteTable(
	"project_repos",
	{
		projectId: text("project_id")
			.$type<ProjectId>()
			.notNull()
			.references(() => projects.id),
		owner: text("owner").notNull(),
		name: text("name").notNull(),
		defaultBranch: text("default_branch").notNull(),
	},
	(t) => [primaryKey({ columns: [t.projectId, t.owner, t.name] })],
);

export const artifacts = sqliteTable(
	"artifacts",
	{
		id: text("id").$type<ArtifactId>().primaryKey(),
		projectId: text("project_id")
			.$type<ProjectId>()
			.notNull()
			.references(() => projects.id),
		kind: text("kind").$type<ArtifactKind>().notNull(),
		fileName: text("file_name"),
		mediaType: text("media_type"),
		size: integer("size"),
		url: text("url"),
		title: text("title"),
		body: text("body"),
	},
	() => [
		check(
			"artifact_kind_columns",
			sql`(kind = 'file' and file_name is not null and media_type is not null and size is not null)
			or (kind = 'link' and url is not null)
			or (kind = 'note' and title is not null and body is not null)`,
		),
	],
);

export const artifactBytes = sqliteTable("artifact_bytes", {
	artifactId: text("artifact_id")
		.$type<ArtifactId>()
		.primaryKey()
		.references(() => artifacts.id),
	bytes: blob("bytes", { mode: "buffer" }).notNull(),
});

export const contextEntries = sqliteTable("context_entries", {
	id: text("id").$type<ContextId>().primaryKey(),
	projectId: text("project_id")
		.$type<ProjectId>()
		.notNull()
		.references(() => projects.id),
	title: text("title").notNull(),
	body: text("body").notNull(),
});
