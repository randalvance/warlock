import type { MemoryNote, Minion } from "@honeypot/server/api";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { client, unwrap } from "@/lib/api";
import { FormError } from "@/projects/form-error";

const memoryApi = client.api.minions[":minionId"].memory;

export function MemoryNotes({ minion }: { minion?: Minion }) {
	return (
		<section className="flex flex-col gap-3">
			<h3 className="font-heading text-lg font-semibold">Memory</h3>
			<p className="text-sm text-muted-foreground">
				Markdown notes the minion reads at the start of a run and can append to.
			</p>
			{minion ? (
				<>
					<ul aria-label="Memory notes" className="flex flex-col gap-2">
						{minion.memory.map((note) => (
							<NoteItem key={note.id} minion={minion} note={note} />
						))}
					</ul>
					<NoteForm minion={minion} labelPrefix="Note" action="Add note" />
				</>
			) : (
				<p className="text-sm">Save the minion to add notes.</p>
			)}
		</section>
	);
}

function NoteItem({ minion, note }: { minion: Minion; note: MemoryNote }) {
	const [editing, setEditing] = useState(false);
	const remove = useMutation({
		mutationFn: () =>
			unwrap(
				memoryApi[":noteId"].$delete({
					param: { minionId: minion.id, noteId: note.id },
				}),
			),
	});
	if (editing) {
		return (
			<li className="rounded-lg border p-3">
				<NoteForm
					minion={minion}
					note={note}
					labelPrefix={`Edit ${note.name}`}
					action="Save note"
					onDone={() => setEditing(false)}
				/>
			</li>
		);
	}
	return (
		<li className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-mono text-sm">
						memory/{minion.name.toLowerCase()}/{note.name}.md
					</p>
					<p className="text-sm text-muted-foreground">
						written by you · {new Date(note.updatedAt).toLocaleString()}
					</p>
				</div>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="xs"
						aria-label={`Edit ${note.name}`}
						onClick={() => setEditing(true)}
					>
						Edit
					</Button>
					<Button
						variant="ghost"
						size="xs"
						aria-label={`Delete ${note.name}`}
						disabled={remove.isPending}
						onClick={() => remove.mutate()}
					>
						Delete
					</Button>
				</div>
			</div>
			<p className="whitespace-pre-wrap text-sm">{note.body}</p>
			<FormError error={remove.error} />
		</li>
	);
}

function NoteForm(props: {
	minion: Minion;
	note?: MemoryNote;
	labelPrefix: string;
	action: string;
	onDone?: () => void;
}) {
	const { minion, note, labelPrefix, action, onDone } = props;
	const [name, setName] = useState(note?.name ?? "");
	const [body, setBody] = useState(note?.body ?? "");
	const save = useMutation({
		mutationFn: () =>
			note
				? unwrap(
						memoryApi[":noteId"].$put({
							param: { minionId: minion.id, noteId: note.id },
							json: { name, body },
						}),
					)
				: unwrap(
						memoryApi.$post({
							param: { minionId: minion.id },
							json: { name, body },
						}),
					),
		onSuccess: () => {
			if (onDone) return onDone();
			setName("");
			setBody("");
		},
	});
	const submit = (event: FormEvent) => {
		event.preventDefault();
		save.mutate();
	};
	const prefix = labelPrefix.toLowerCase().replace(/\W+/g, "-");
	return (
		<form onSubmit={submit} className="flex flex-col gap-2">
			<Field id={`${prefix}-name`} label={`${labelPrefix} name`}>
				<Input
					id={`${prefix}-name`}
					placeholder="conventions"
					value={name}
					onChange={(e) => setName(e.target.value)}
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
