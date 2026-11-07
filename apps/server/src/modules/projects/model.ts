import { z } from "zod";

export const ProjectId = z.uuid().brand<"ProjectId">();
export type ProjectId = z.infer<typeof ProjectId>;
export const ArtifactId = z.uuid().brand<"ArtifactId">();
export type ArtifactId = z.infer<typeof ArtifactId>;
export const ContextId = z.uuid().brand<"ContextId">();
export type ContextId = z.infer<typeof ContextId>;

export const RepoName = z
	.string()
	.trim()
	.regex(
		/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.\.?$)[A-Za-z0-9._-]{1,100}$/,
		"use owner/name, such as acme/api",
	)
	.brand<"RepoName">();
export type RepoName = z.infer<typeof RepoName>;

export interface RepoRef {
	readonly owner: string;
	readonly name: string;
	readonly defaultBranch: string;
}

export function repoName(ref: Pick<RepoRef, "owner" | "name">): RepoName {
	return RepoName.parse(`${ref.owner}/${ref.name}`);
}

export type Artifact =
	| {
			readonly kind: "file";
			readonly id: ArtifactId;
			readonly name: string;
			readonly mediaType: string;
			readonly size: number;
	  }
	| { readonly kind: "link"; readonly id: ArtifactId; readonly url: string }
	| {
			readonly kind: "note";
			readonly id: ArtifactId;
			readonly title: string;
			readonly body: string;
	  };

export type ArtifactKind = Artifact["kind"];

export interface ContextEntry {
	readonly id: ContextId;
	readonly title: string;
	readonly body: string;
}

export interface Project {
	readonly id: ProjectId;
	readonly name: string;
	readonly repos: readonly [RepoRef, ...RepoRef[]];
	readonly artifacts: readonly Artifact[];
	readonly context: readonly ContextEntry[];
}

export type ProjectSummary = Pick<Project, "id" | "name" | "repos">;

export const ProjectName = z.string().trim().min(1).max(120);

export const NewProject = z.object({
	name: ProjectName,
	repos: z
		.array(RepoName)
		.refine(
			(repos): repos is [RepoName, ...RepoName[]] => repos.length > 0,
			"a project needs at least one repo",
		),
});
export type NewProject = z.infer<typeof NewProject>;

export const ProjectPatch = z.object({ name: ProjectName });

export const maxUploadBytes = 25 * 1024 * 1024;
// A 100,000-character context body escaped as \uXXXX is about 600 KB of JSON.
export const maxJsonBodyBytes = 1024 * 1024;

export const NewArtifact = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("file"),
		file: z
			.instanceof(File)
			.refine((file) => file.name !== "", "the file has no name"),
	}),
	z.object({ kind: z.literal("link"), url: z.url({ protocol: /^https?$/ }) }),
	z.object({
		kind: z.literal("note"),
		title: z.string().trim().min(1).max(200),
		body: z.string().max(100_000),
	}),
]);
export type NewArtifact = z.infer<typeof NewArtifact>;

export const ContextInput = z.object({
	title: z.string().trim().min(1).max(200),
	body: z.string().max(100_000),
});
export type ContextInput = z.infer<typeof ContextInput>;
