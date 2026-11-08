import { useQuery } from "@tanstack/react-query";
import type {
	AgentProfile,
	ApiIssue,
	McpServerConfig,
	SkillRef,
} from "@warlock/server/api";
import { useState } from "react";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError } from "@/lib/api";
import { agentQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

/** One MCP server as the editor holds it. It keeps the fields of both types, so switching type loses nothing. */
interface ServerRow {
	readonly key: number;
	readonly name: string;
	readonly type: "stdio" | "http";
	readonly command: string;
	readonly args: string;
	readonly env: string;
	readonly url: string;
	readonly headers: string;
}

export interface ProfileDraft {
	readonly systemPrompt: string;
	readonly skills: readonly SkillRef[];
	readonly servers: readonly ServerRow[];
}

export const blankDraft: ProfileDraft = {
	systemPrompt: "",
	skills: [],
	servers: [],
};

let nextRowKey = 0;

function blankServer(): ServerRow {
	return {
		key: nextRowKey++,
		name: "",
		type: "stdio",
		command: "",
		args: "",
		env: "",
		url: "",
		headers: "",
	};
}

export function toDraft(profile: AgentProfile): ProfileDraft {
	return {
		systemPrompt: profile.systemPrompt,
		skills: profile.skills,
		servers: Object.entries(profile.mcpServers).map(([name, server]) => ({
			...blankServer(),
			name,
			...(server.type === "http"
				? {
						type: "http",
						url: server.url,
						headers: joinPairs(server.headers, ": "),
					}
				: {
						command: server.command,
						args: (server.args ?? []).join("\n"),
						env: joinPairs(server.env, "="),
					}),
		})),
	};
}

export function fromDraft(draft: ProfileDraft): AgentProfile {
	return {
		systemPrompt: draft.systemPrompt,
		skills: [...draft.skills],
		mcpServers: Object.fromEntries(
			draft.servers.map((row) => [row.name, toServer(row)]),
		),
	};
}

function toServer(row: ServerRow): McpServerConfig {
	if (row.type === "http") {
		const headers = splitPairs(row.headers, ":");
		return { type: "http", url: row.url, ...(headers ? { headers } : {}) };
	}
	const args = lines(row.args);
	const env = splitPairs(row.env, "=");
	return {
		type: "stdio",
		command: row.command,
		...(args.length > 0 ? { args } : {}),
		...(env ? { env } : {}),
	};
}

function lines(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "");
}

function joinPairs(
	pairs: Readonly<Record<string, string>> | undefined,
	separator: string,
): string {
	return Object.entries(pairs ?? {})
		.map(([key, value]) => `${key}${separator}${value}`)
		.join("\n");
}

function splitPairs(
	text: string,
	separator: string,
): Record<string, string> | undefined {
	const pairs = lines(text).map((line) => {
		const at = line.indexOf(separator);
		return at < 0
			? [line, ""]
			: [line.slice(0, at).trim(), line.slice(at + 1).trim()];
	});
	return pairs.length > 0 ? Object.fromEntries(pairs) : undefined;
}

/** The servers record keeps one entry per name, so saving a row that repeats an earlier name would drop a row. */
function isRepeated(servers: readonly ServerRow[], index: number): boolean {
	const name = servers[index]?.name;
	return name !== "" && servers.findIndex((row) => row.name === name) < index;
}

export function hasRepeatedServer(draft: ProfileDraft): boolean {
	return draft.servers.some((_, index) => isRepeated(draft.servers, index));
}

export function issuesOf(error: Error | null): readonly ApiIssue[] {
	return error instanceof ApiRequestError &&
		error.error.code === "invalid_request"
		? error.error.issues
		: [];
}

function isUnder(path: string, owner: string): boolean {
	return path === owner || path.startsWith(`${owner}.`);
}

/** The issue paths the profile editor shows beside a field. */
export function profilePaths(draft: ProfileDraft): string[] {
	return [
		"profile.systemPrompt",
		...draft.skills.map((_, index) => `profile.skills.${index}`),
		...draft.servers.map((row) => `profile.mcpServers.${row.name}`),
	];
}

export function Issues({
	issues,
	at,
}: {
	issues: readonly ApiIssue[];
	at: string;
}) {
	return issues
		.filter((issue) => isUnder(issue.path, at))
		.map((issue) => <IssueText key={issue.path} issue={issue} />);
}

function IssueText({ issue }: { issue: ApiIssue }) {
	return (
		<p role="alert" className="text-sm text-destructive">
			{issue.path.replace(/^profile\./, "")} {issue.message}.
		</p>
	);
}

/** Shows an error other than a 400, and each issue under none of the `shown` paths. */
export function SaveError({
	error,
	shown,
}: {
	error: Error | null;
	shown: readonly string[];
}) {
	const issues = issuesOf(error);
	if (issues.length === 0) return <FormError error={error} />;
	return issues
		.filter((issue) => !shown.some((path) => isUnder(issue.path, path)))
		.map((issue) => <IssueText key={issue.path} issue={issue} />);
}

export function ProfileFields({
	id,
	value,
	onChange,
	issues,
}: {
	id: string;
	value: ProfileDraft;
	onChange: (next: ProfileDraft) => void;
	issues: readonly ApiIssue[];
}) {
	return (
		<>
			<Field id={`${id}-system-prompt`} label="System prompt">
				<Textarea
					id={`${id}-system-prompt`}
					value={value.systemPrompt}
					onChange={(e) => onChange({ ...value, systemPrompt: e.target.value })}
				/>
				<Issues issues={issues} at="profile.systemPrompt" />
			</Field>
			<SkillsField
				skills={value.skills}
				onChange={(skills) => onChange({ ...value, skills })}
				issues={issues}
			/>
			<ServersField
				id={id}
				servers={value.servers}
				onChange={(servers) => onChange({ ...value, servers })}
				issues={issues}
			/>
		</>
	);
}

function SkillsField({
	skills,
	onChange,
	issues,
}: {
	skills: readonly SkillRef[];
	onChange: (next: SkillRef[]) => void;
	issues: readonly ApiIssue[];
}) {
	const library = useQuery(agentQueries.skills());
	const available = (library.data ?? []).filter((ref) => !skills.includes(ref));
	const [picked, setPicked] = useState("");
	const toAdd = available.find((ref) => ref === picked) ?? available[0];
	return (
		<section className="flex flex-col gap-2">
			<h3 className="text-sm font-medium">Skills</h3>
			<p className="text-sm text-muted-foreground">
				Agent Skills folders in the skills library, each with a SKILL.md.
			</p>
			<ul aria-label="Skills" className="flex flex-col gap-1">
				{skills.map((ref, index) => (
					<li key={ref} className="flex flex-col gap-1">
						<div className="flex items-center gap-3">
							<span className="font-mono text-sm">skills/{ref}</span>
							{library.data && !library.data.includes(ref) && (
								<Badge variant="destructive">missing from the library</Badge>
							)}
							<Button
								type="button"
								variant="ghost"
								size="xs"
								aria-label={`Remove skills/${ref}`}
								onClick={() => onChange(skills.filter((_, i) => i !== index))}
							>
								Remove
							</Button>
						</div>
						<Issues issues={issues} at={`profile.skills.${index}`} />
					</li>
				))}
			</ul>
			<div className="flex gap-2">
				<NativeSelect
					aria-label="Skill to add"
					value={toAdd ?? ""}
					disabled={!toAdd}
					onFocus={() => void library.refetch()}
					onChange={(e) => setPicked(e.target.value)}
				>
					{available.length === 0 && (
						<NativeSelectOption value="">
							No other skills in the library
						</NativeSelectOption>
					)}
					{available.map((ref) => (
						<NativeSelectOption key={ref} value={ref}>
							{ref}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<Button
					type="button"
					variant="outline"
					disabled={!toAdd}
					onClick={() => toAdd && onChange([...skills, toAdd])}
				>
					Add skill
				</Button>
			</div>
		</section>
	);
}

function ServersField({
	id,
	servers,
	onChange,
	issues,
}: {
	id: string;
	servers: readonly ServerRow[];
	onChange: (next: ServerRow[]) => void;
	issues: readonly ApiIssue[];
}) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className="text-sm font-medium">MCP servers</h3>
			<p className="text-sm text-muted-foreground">
				Each entry has the shape of a Claude Code .mcp.json entry.
			</p>
			{servers.map((row, index) => (
				<ServerFields
					key={row.key}
					id={`${id}-server-${row.key}`}
					label={`MCP server ${index + 1}`}
					row={row}
					onChange={(patch) =>
						onChange(
							servers.map((r) => (r.key === row.key ? { ...r, ...patch } : r)),
						)
					}
					onRemove={() => onChange(servers.filter((r) => r.key !== row.key))}
					repeated={isRepeated(servers, index)}
					issues={issues}
				/>
			))}
			<div>
				<Button
					type="button"
					variant="outline"
					onClick={() => onChange([...servers, blankServer()])}
				>
					Add server
				</Button>
			</div>
		</section>
	);
}

function ServerFields({
	id,
	label,
	row,
	onChange,
	onRemove,
	repeated,
	issues,
}: {
	id: string;
	label: string;
	row: ServerRow;
	onChange: (patch: Partial<ServerRow>) => void;
	onRemove: () => void;
	repeated: boolean;
	issues: readonly ApiIssue[];
}) {
	return (
		<fieldset
			aria-label={label}
			className="flex flex-col gap-2 rounded-lg border p-3"
		>
			<div className="flex items-end gap-2">
				<Field id={`${id}-name`} label="Server name">
					<Input
						id={`${id}-name`}
						value={row.name}
						onChange={(e) => onChange({ name: e.target.value })}
					/>
				</Field>
				<Field id={`${id}-type`} label="Type">
					<NativeSelect
						id={`${id}-type`}
						value={row.type}
						onChange={(e) =>
							onChange({ type: e.target.value === "http" ? "http" : "stdio" })
						}
					>
						<NativeSelectOption value="stdio">stdio</NativeSelectOption>
						<NativeSelectOption value="http">http</NativeSelectOption>
					</NativeSelect>
				</Field>
				<Button
					type="button"
					variant="ghost"
					aria-label={`Remove ${label}`}
					onClick={onRemove}
				>
					Remove
				</Button>
			</div>
			{row.type === "stdio" ? (
				<>
					<Field id={`${id}-command`} label="Command">
						<Input
							id={`${id}-command`}
							value={row.command}
							onChange={(e) => onChange({ command: e.target.value })}
						/>
					</Field>
					<Field id={`${id}-args`} label="Arguments, one per line">
						<Textarea
							id={`${id}-args`}
							value={row.args}
							onChange={(e) => onChange({ args: e.target.value })}
						/>
					</Field>
					<Field id={`${id}-env`} label="Environment, one KEY=value per line">
						<Textarea
							id={`${id}-env`}
							value={row.env}
							onChange={(e) => onChange({ env: e.target.value })}
						/>
					</Field>
				</>
			) : (
				<>
					<Field id={`${id}-url`} label="URL">
						<Input
							id={`${id}-url`}
							placeholder="https://"
							value={row.url}
							onChange={(e) => onChange({ url: e.target.value })}
						/>
					</Field>
					<Field id={`${id}-headers`} label="Headers, one Name: value per line">
						<Textarea
							id={`${id}-headers`}
							value={row.headers}
							onChange={(e) => onChange({ headers: e.target.value })}
						/>
					</Field>
				</>
			)}
			{repeated ? (
				<IssueText
					issue={{
						path: `profile.mcpServers.${row.name}`,
						message: "is already in this profile",
					}}
				/>
			) : (
				<Issues issues={issues} at={`profile.mcpServers.${row.name}`} />
			)}
		</fieldset>
	);
}
