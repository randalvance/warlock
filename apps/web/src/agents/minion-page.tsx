import { useMutation, useQuery } from "@tanstack/react-query";
import type { Minion, MinionId } from "@warlock/server/api";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { MemoryNotes } from "@/agents/memory-notes";
import {
	blankDraft,
	fromDraft,
	hasRepeatedName,
	Issues,
	issuesOf,
	ProfileFields,
	profilePaths,
	SaveError,
	toDraft,
} from "@/agents/profile-fields";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiRequestError, client, unwrap } from "@/lib/api";
import { agentQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

export function MinionPage() {
	const minionId = useParams().minionId as MinionId | undefined;
	if (!minionId) {
		return (
			<div className="flex flex-col gap-8">
				<MinionEditor />
				<MemoryNotes />
			</div>
		);
	}
	return <SavedMinion key={minionId} minionId={minionId} />;
}

function SavedMinion({ minionId }: { minionId: MinionId }) {
	const minion = useQuery(agentQueries.minions.detail(minionId));
	if (minion.error instanceof ApiRequestError && minion.error.status === 404) {
		return <Navigate to="/agents" replace />;
	}
	if (minion.error) return <FormError error={minion.error} />;
	if (!minion.data) return <p className="text-muted-foreground">Loading…</p>;
	return (
		<div className="flex flex-col gap-8">
			<MinionEditor minion={minion.data} />
			<MemoryNotes minion={minion.data} />
		</div>
	);
}

function MinionEditor({ minion }: { minion?: Minion }) {
	const navigate = useNavigate();
	const [name, setName] = useState(minion?.name ?? "");
	const [profile, setProfile] = useState(() =>
		minion ? toDraft(minion.profile) : blankDraft,
	);
	const save = useMutation({
		mutationFn: () => {
			const json = { name, profile: fromDraft(profile) };
			return minion
				? unwrap(
						client.api.minions[":minionId"].$put({
							param: { minionId: minion.id },
							json,
						}),
					)
				: unwrap(client.api.minions.$post({ json }));
		},
		onSuccess: ({ minion: saved }) => {
			if (!minion) return navigate(`/agents/minions/${saved.id}`);
		},
	});
	const remove = useMutation({
		mutationFn: (id: MinionId) =>
			unwrap(
				client.api.minions[":minionId"].$delete({ param: { minionId: id } }),
			),
		onSuccess: () => navigate("/agents"),
	});
	const issues = issuesOf(save.error);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!hasRepeatedName(profile)) save.mutate();
	};
	return (
		<form onSubmit={submit} className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-heading text-xl font-semibold">
					{minion?.name ?? "New minion"}
				</h2>
				<div className="flex gap-2">
					{minion && (
						<Button
							type="button"
							variant="destructive"
							disabled={remove.isPending}
							onClick={() => remove.mutate(minion.id)}
						>
							Delete minion
						</Button>
					)}
					<Button type="submit" disabled={save.isPending}>
						Save minion
					</Button>
				</div>
			</div>
			<FormError error={remove.error} />
			<Field id="minion-name" label="Name">
				<Input
					id="minion-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<Issues issues={issues} at="name" />
			</Field>
			<ProfileFields
				id="minion"
				value={profile}
				onChange={setProfile}
				issues={issues}
			/>
			<SaveError
				error={save.error}
				shown={["name", ...profilePaths(profile)]}
			/>
		</form>
	);
}
