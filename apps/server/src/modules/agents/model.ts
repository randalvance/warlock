import { z } from "zod";

export const MinionId = z.uuid().brand<"MinionId">();
export type MinionId = z.infer<typeof MinionId>;
export const MemoryNoteId = z.uuid().brand<"MemoryNoteId">();
export type MemoryNoteId = z.infer<typeof MemoryNoteId>;

/** A folder directly under the skills library. With no `/` or `.` allowed, a ref never leaves the library. */
export const SkillRef = z
	.string()
	.regex(
		/^[a-z0-9]+(-[a-z0-9]+)*$/,
		"use lowercase letters, digits, and single hyphens, such as tdd",
	)
	.max(64)
	.brand<"SkillRef">();
export type SkillRef = z.infer<typeof SkillRef>;

const required = (what: string) => (issue: { input: unknown }) =>
	issue.input === undefined || issue.input === ""
		? `is required for ${what}`
		: undefined;

/** zod reports a bad record key with its own generic message, so the record supplies one. */
function keyedBy<Value extends z.ZodType>(
	key: RegExp,
	keyMessage: string,
	value: Value,
) {
	return z.record(z.string().regex(key), value, {
		error: (issue) => (issue.code === "invalid_key" ? keyMessage : undefined),
	});
}

export const StdioServer = z.strictObject({
	// A `.mcp.json` stdio entry may leave out its type.
	type: z.literal("stdio").optional(),
	command: z
		.string({ error: required("a stdio server") })
		.trim()
		.min(1, "is required for a stdio server"),
	args: z.array(z.string()).optional(),
	env: keyedBy(
		/^[A-Za-z_][A-Za-z0-9_]*$/,
		"is not an environment variable name",
		z.string(),
	).optional(),
});

export const HttpServer = z.strictObject({
	type: z.literal("http"),
	url: z.url({
		protocol: /^https?$/,
		error: (issue) =>
			required("an http server")(issue) ?? "must be an http or https URL",
	}),
	headers: keyedBy(
		/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/,
		"is not a header name",
		z.string(),
	).optional(),
});

/** One `.mcp.json` `mcpServers` entry, and one value of the Agent SDK's `Options.mcpServers`. */
export const McpServerConfig = z.discriminatedUnion(
	"type",
	[StdioServer, HttpServer],
	{ error: "must be stdio or http" },
);
export type McpServerConfig = z.infer<typeof McpServerConfig>;

// A leading letter keeps JavaScript from reordering the keys, so the editor's row order survives JSON.
export const McpServers = keyedBy(
	/^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
	"is not a server name: use a letter, then letters, digits, - or _",
	McpServerConfig,
);

export const AgentProfile = z.strictObject({
	systemPrompt: z.string().max(100_000),
	skills: z
		.array(SkillRef)
		.max(50)
		.superRefine((refs, ctx) => {
			refs.forEach((ref, index) => {
				if (refs.indexOf(ref) !== index) {
					ctx.addIssue({
						code: "custom",
						path: [index],
						message: "is already in this profile",
					});
				}
			});
		}),
	mcpServers: McpServers,
});
export type AgentProfile = z.infer<typeof AgentProfile>;

export const emptyProfile: AgentProfile = {
	systemPrompt: "",
	skills: [],
	mcpServers: {},
};

export const MinionInput = z.strictObject({
	name: z.string().trim().min(1).max(80),
	profile: AgentProfile,
});
export type MinionInput = z.infer<typeof MinionInput>;

export const WarlockInput = z.strictObject({ profile: AgentProfile });

/** File-name safe, so a run can stage a note as `memory/<name>.md` without escaping. */
export const NoteName = z
	.string()
	.trim()
	.regex(
		/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/,
		"use letters, digits, dots, dashes, or underscores, such as conventions",
	);

export const NoteInput = z.strictObject({
	name: NoteName,
	body: z.string().max(100_000),
});
export type NoteInput = z.infer<typeof NoteInput>;

export interface Warlock {
	readonly profile: AgentProfile;
}

export interface MemoryNote {
	readonly id: MemoryNoteId;
	readonly name: string;
	readonly body: string;
	readonly updatedAt: string;
}

export interface Minion {
	readonly id: MinionId;
	readonly name: string;
	readonly profile: AgentProfile;
	/** Ordered by name. */
	readonly memory: readonly MemoryNote[];
}

export type MinionSummary = Pick<Minion, "id" | "name">;
