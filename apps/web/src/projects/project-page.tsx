import { useMutation, useQuery } from "@tanstack/react-query";
import type {
	Artifact,
	ContextEntry,
	Project,
	ProjectId,
} from "@warlock/server/api";
import { type FormEvent, type ReactNode, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { client, unwrap } from "@/lib/api";
import { projectQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

const projectApi = client.api.projects[":projectId"];

export function ProjectPage() {
	const projectId = useParams().projectId as ProjectId;
	const project = useQuery(projectQueries.detail(projectId));
	if (project.error) return <FormError error={project.error} />;
	if (!project.data) return <p className="text-muted-foreground">Loading…</p>;
	return <ProjectView project={project.data} />;
}

function ProjectView({ project }: { project: Project }) {
	const param = { projectId: project.id };
	return (
		<div className="flex max-w-2xl flex-col gap-8">
			<h1 className="font-heading text-2xl font-semibold">{project.name}</h1>
			<RenameForm project={project} />
			<Section title="Repos">
				<ul aria-label="Repos" className="flex flex-col gap-1">
					{project.repos.map((repo) => (
						<RepoItem
							key={`${repo.owner}/${repo.name}`}
							projectId={project.id}
							{...repo}
						/>
					))}
				</ul>
				<SingleFieldForm
					label="Attach repo"
					placeholder="owner/name"
					action="Attach"
					submit={(repo) =>
						unwrap(projectApi.repos.$post({ param, json: { repo } }))
					}
				/>
			</Section>
			<Section title="Artifacts">
				<ul aria-label="Artifacts" className="flex flex-col gap-2">
					{project.artifacts.map((artifact) => (
						<li key={artifact.id} className="rounded-lg border p-3">
							<ArtifactView projectId={project.id} artifact={artifact} />
						</li>
					))}
				</ul>
				<NoteForm projectId={project.id} />
				<SingleFieldForm
					label="Link URL"
					placeholder="https://"
					action="Add link"
					submit={(url) =>
						unwrap(
							projectApi.artifacts.$post({
								param,
								form: { kind: "link", url },
							}),
						)
					}
				/>
				<UploadForm projectId={project.id} />
			</Section>
			<Section title="Context">
				<ul aria-label="Context" className="flex flex-col gap-2">
					{project.context.map((entry) => (
						<ContextItem key={entry.id} projectId={project.id} entry={entry} />
					))}
				</ul>
				<ContextForm
					projectId={project.id}
					labelPrefix="Context"
					action="Add context"
				/>
			</Section>
		</div>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-heading text-lg font-semibold">{title}</h2>
			{children}
		</section>
	);
}

function RenameForm({ project }: { project: Project }) {
	return (
		<SingleFieldForm
			key={project.name}
			label="Project name"
			initial={project.name}
			action="Rename"
			submit={(name) =>
				unwrap(
					projectApi.$patch({
						param: { projectId: project.id },
						json: { name },
					}),
				)
			}
		/>
	);
}

function RepoItem(props: {
	projectId: ProjectId;
	owner: string;
	name: string;
	defaultBranch: string;
}) {
	const { projectId, owner, name, defaultBranch } = props;
	const detach = useMutation({
		mutationFn: () =>
			unwrap(
				projectApi.repos[":owner"][":name"].$delete({
					param: { projectId, owner, name },
				}),
			),
	});
	return (
		<li className="flex flex-col gap-1">
			<div className="flex items-center gap-3">
				<span className="font-mono text-sm">
					{owner}/{name}
				</span>
				<span className="text-sm text-muted-foreground">{defaultBranch}</span>
				<Button
					variant="ghost"
					size="xs"
					aria-label={`Remove ${owner}/${name}`}
					onClick={() => detach.mutate()}
				>
					Remove
				</Button>
			</div>
			<FormError error={detach.error} />
		</li>
	);
}

function ArtifactView({
	projectId,
	artifact,
}: {
	projectId: ProjectId;
	artifact: Artifact;
}) {
	switch (artifact.kind) {
		case "note":
			return (
				<div>
					<p className="font-medium">{artifact.title}</p>
					<p className="whitespace-pre-wrap text-sm">{artifact.body}</p>
				</div>
			);
		case "link":
			return (
				<a
					href={artifact.url}
					target="_blank"
					rel="noreferrer"
					className="hover:underline"
				>
					{artifact.url}
				</a>
			);
		case "file":
			return (
				<div className="flex items-center gap-3">
					<a
						href={projectApi.artifacts[":artifactId"].content.$path({
							param: { projectId, artifactId: artifact.id },
						})}
						download={artifact.name}
						className="hover:underline"
					>
						{artifact.name}
					</a>
					<span className="text-sm text-muted-foreground">
						{formatSize(artifact.size)}
					</span>
				</div>
			);
	}
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function NoteForm({ projectId }: { projectId: ProjectId }) {
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const add = useMutation({
		mutationFn: () =>
			unwrap(
				projectApi.artifacts.$post({
					param: { projectId },
					form: { kind: "note", title, body },
				}),
			),
		onSuccess: () => {
			setTitle("");
			setBody("");
		},
	});
	return (
		<form
			onSubmit={onSubmit(() => add.mutate())}
			className="flex flex-col gap-2"
		>
			<Field id="note-title" label="Note title">
				<Input
					id="note-title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</Field>
			<Field id="note-body" label="Note body">
				<Textarea
					id="note-body"
					value={body}
					onChange={(e) => setBody(e.target.value)}
				/>
			</Field>
			<div>
				<Button type="submit" disabled={add.isPending}>
					Add note
				</Button>
			</div>
			<FormError error={add.error} />
		</form>
	);
}

function UploadForm({ projectId }: { projectId: ProjectId }) {
	const upload = useMutation({
		mutationFn: (file: File) =>
			unwrap(
				projectApi.artifacts.$post({
					param: { projectId },
					form: { kind: "file", file },
				}),
			),
	});
	return (
		<div className="flex flex-col gap-2">
			<Field id="upload-file" label="Upload file">
				<Input
					id="upload-file"
					type="file"
					disabled={upload.isPending}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) upload.mutate(file);
						e.target.value = "";
					}}
				/>
			</Field>
			<FormError error={upload.error} />
		</div>
	);
}

function ContextItem({
	projectId,
	entry,
}: {
	projectId: ProjectId;
	entry: ContextEntry;
}) {
	const [editing, setEditing] = useState(false);
	if (editing) {
		return (
			<li className="rounded-lg border p-3">
				<ContextForm
					projectId={projectId}
					entry={entry}
					labelPrefix={`Edit ${entry.title}`}
					action="Save"
					onDone={() => setEditing(false)}
				/>
			</li>
		);
	}
	return (
		<li className="flex items-start justify-between gap-3 rounded-lg border p-3">
			<div>
				<p className="font-medium">{entry.title}</p>
				<p className="whitespace-pre-wrap text-sm">{entry.body}</p>
			</div>
			<Button
				variant="ghost"
				size="xs"
				aria-label={`Edit ${entry.title}`}
				onClick={() => setEditing(true)}
			>
				Edit
			</Button>
		</li>
	);
}

function ContextForm(props: {
	projectId: ProjectId;
	entry?: ContextEntry;
	labelPrefix: string;
	action: string;
	onDone?: () => void;
}) {
	const { projectId, entry, labelPrefix, action, onDone } = props;
	const [title, setTitle] = useState(entry?.title ?? "");
	const [body, setBody] = useState(entry?.body ?? "");
	const save = useMutation({
		mutationFn: () =>
			entry
				? unwrap(
						projectApi.context[":contextId"].$put({
							param: { projectId, contextId: entry.id },
							json: { title, body },
						}),
					)
				: unwrap(
						projectApi.context.$post({
							param: { projectId },
							json: { title, body },
						}),
					),
		onSuccess: () => {
			if (onDone) return onDone();
			setTitle("");
			setBody("");
		},
	});
	const prefix = labelPrefix.toLowerCase().replace(/\W+/g, "-");
	return (
		<form
			onSubmit={onSubmit(() => save.mutate())}
			className="flex flex-col gap-2"
		>
			<Field id={`${prefix}-title`} label={`${labelPrefix} title`}>
				<Input
					id={`${prefix}-title`}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</Field>
			<Field id={`${prefix}-body`} label={`${labelPrefix} body`}>
				<Textarea
					id={`${prefix}-body`}
					value={body}
					onChange={(e) => setBody(e.target.value)}
				/>
			</Field>
			<div className="flex gap-2">
				<Button type="submit" disabled={save.isPending}>
					{action}
				</Button>
				{onDone && (
					<Button type="button" variant="ghost" onClick={onDone}>
						Cancel
					</Button>
				)}
			</div>
			<FormError error={save.error} />
		</form>
	);
}

function SingleFieldForm(props: {
	label: string;
	action: string;
	placeholder?: string;
	initial?: string;
	submit: (value: string) => Promise<unknown>;
}) {
	const { label, action, placeholder, initial = "", submit } = props;
	const [value, setValue] = useState(initial);
	const run = useMutation({
		mutationFn: () => submit(value),
		onSuccess: () => {
			if (!initial) setValue("");
		},
	});
	const id = label.toLowerCase().replace(/\W+/g, "-");
	return (
		<form
			onSubmit={onSubmit(() => run.mutate())}
			className="flex flex-col gap-2"
		>
			<Field id={id} label={label}>
				<div className="flex gap-2">
					<Input
						id={id}
						placeholder={placeholder}
						value={value}
						onChange={(e) => setValue(e.target.value)}
					/>
					<Button type="submit" disabled={run.isPending}>
						{action}
					</Button>
				</div>
			</Field>
			<FormError error={run.error} />
		</form>
	);
}

function Field({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			{children}
		</div>
	);
}

function onSubmit(action: () => void) {
	return (event: FormEvent) => {
		event.preventDefault();
		action();
	};
}
