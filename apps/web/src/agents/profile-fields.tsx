import type {
	AgentProfile,
	ApiIssue,
	McpServerConfig,
	SkillRef,
} from "@honeypot/server/api";
import { useQuery } from "@tanstack/react-query";
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

type Pairs = readonly (readonly [string, string])[];

/**
 * One MCP server as the editor holds it. It keeps the fields of both types, so switching type loses nothing.
 * A list left `undefined` is left out of the entry, so a stored empty list stays empty.
 */
interface ServerRow {
	readonly key: number;
	readonly name: string;
	readonly type: "stdio" | "http";
	/** A `.mcp.json` stdio entry may leave out its type, and one loaded that way keeps leaving it out. */
	readonly typed: boolean;
	readonly command: string;
	readonly args: readonly string[] | undefined;
	readonly env: Pairs | undefined;
	readonly url: string;
	readonly headers: Pairs | undefined;
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
		typed: true,
		command: "",
		args: undefined,
		env: undefined,
		url: "",
		headers: undefined,
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
						headers: server.headers && Object.entries(server.headers),
					}
				: {
						typed: server.type === "stdio",
						command: server.command,
						args: server.args,
						env: server.env && Object.entries(server.env),
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
		return {
			type: "http",
			url: row.url,
			...(row.headers ? { headers: Object.fromEntries(row.headers) } : {}),
		};
	}
	return {
		...(row.typed ? { type: "stdio" as const } : {}),
		command: row.command,
		...(row.args ? { args: [...row.args] } : {}),
		...(row.env ? { env: Object.fromEntries(row.env) } : {}),
	};
}

/** A record keeps one entry per name, so saving a row that repeats an earlier name would drop a row. */
function isRepeated(names: readonly string[], index: number): boolean {
	const name = names[index] ?? "";
	return name !== "" && names.indexOf(name) < index;
}

function anyRepeated(names: readonly string[]): boolean {
	return names.some((_, index) => isRepeated(names, index));
}

function keysOf(pairs: Pairs | undefined): string[] {
	return (pairs ?? []).map(([key]) => key);
}

export function hasRepeatedName(draft: ProfileDraft): boolean {
	return (
		anyRepeated(draft.servers.map((row) => row.name)) ||
		draft.servers.some((row) =>
			row.type === "http"
				? anyRepeated(keysOf(row.headers))
				: anyRepeated(keysOf(row.env)),
		)
	);
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
	const names = servers.map((row) => row.name);
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
					repeated={isRepeated(names, index)}
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
	const path = `profile.mcpServers.${row.name}`;
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
							onChange({
								type: e.target.value === "http" ? "http" : "stdio",
								typed: true,
							})
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
					<ArgsField args={row.args} onChange={(args) => onChange({ args })} />
					<PairsField
						heading="Environment"
						item="environment variable"
						pairs={row.env}
						onChange={(env) => onChange({ env })}
						repeatedPath={(key) => `${path}.env.${key}`}
					/>
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
					<PairsField
						heading="Headers"
						item="header"
						pairs={row.headers}
						onChange={(headers) => onChange({ headers })}
						repeatedPath={(key) => `${path}.headers.${key}`}
					/>
				</>
			)}
			{repeated ? (
				<IssueText issue={{ path, message: "is already in this profile" }} />
			) : (
				<Issues issues={issues} at={path} />
			)}
		</fieldset>
	);
}

function without<T>(
	list: readonly T[],
	index: number,
): readonly T[] | undefined {
	const next = list.filter((_, i) => i !== index);
	return next.length > 0 ? next : undefined;
}

function ArgsField({
	args = [],
	onChange,
}: {
	args: readonly string[] | undefined;
	onChange: (next: readonly string[] | undefined) => void;
}) {
	return (
		<section className="flex flex-col gap-2">
			<h4 className="text-sm font-medium">Arguments</h4>
			<ol aria-label="Arguments" className="flex flex-col gap-2">
				{args.map((arg, index) => (
					<li key={index} className="flex items-start gap-2">
						<Textarea
							aria-label={`Argument ${index + 1}`}
							rows={1}
							className="min-h-9 font-mono"
							value={arg}
							onChange={(e) =>
								onChange(args.map((a, i) => (i === index ? e.target.value : a)))
							}
						/>
						<Button
							type="button"
							variant="ghost"
							aria-label={`Remove argument ${index + 1}`}
							onClick={() => onChange(without(args, index))}
						>
							Remove
						</Button>
					</li>
				))}
			</ol>
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange([...args, ""])}
				>
					Add argument
				</Button>
			</div>
		</section>
	);
}

function PairsField({
	heading,
	item,
	pairs = [],
	onChange,
	repeatedPath,
}: {
	heading: string;
	item: string;
	pairs: Pairs | undefined;
	onChange: (next: Pairs | undefined) => void;
	repeatedPath: (key: string) => string;
}) {
	const keys = keysOf(pairs);
	const Item = item.charAt(0).toUpperCase() + item.slice(1);
	const set = (index: number, pair: readonly [string, string]) =>
		onChange(pairs.map((p, i) => (i === index ? pair : p)));
	return (
		<section className="flex flex-col gap-2">
			<h4 className="text-sm font-medium">{heading}</h4>
			<ol aria-label={heading} className="flex flex-col gap-2">
				{pairs.map(([key, value], index) => (
					<li key={index} className="flex flex-col gap-1">
						<div className="flex items-start gap-2">
							<Input
								aria-label={`${Item} ${index + 1} name`}
								className="w-48 shrink-0 font-mono"
								value={key}
								onChange={(e) => set(index, [e.target.value, value])}
							/>
							<Textarea
								aria-label={`${Item} ${index + 1} value`}
								rows={1}
								className="min-h-9 font-mono"
								value={value}
								onChange={(e) => set(index, [key, e.target.value])}
							/>
							<Button
								type="button"
								variant="ghost"
								aria-label={`Remove ${item} ${index + 1}`}
								onClick={() => onChange(without(pairs, index))}
							>
								Remove
							</Button>
						</div>
						{isRepeated(keys, index) && (
							<IssueText
								issue={{
									path: repeatedPath(key),
									message: "is already in this server",
								}}
							/>
						)}
					</li>
				))}
			</ol>
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange([...pairs, ["", ""]])}
				>
					Add {item}
				</Button>
			</div>
		</section>
	);
}
