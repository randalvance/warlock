import { useMutation, useQuery } from "@tanstack/react-query";
import type { AgentProfile } from "@warlock/server/api";
import { type FormEvent, useState } from "react";
import {
	fromDraft,
	hasRepeatedServer,
	issuesOf,
	ProfileFields,
	profilePaths,
	SaveError,
	toDraft,
} from "@/agents/profile-fields";
import { Button } from "@/components/ui/button";
import { client, unwrap } from "@/lib/api";
import { agentQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

export function WarlockPage() {
	const warlock = useQuery(agentQueries.warlock());
	if (warlock.error) return <FormError error={warlock.error} />;
	if (!warlock.data) return <p className="text-muted-foreground">Loading…</p>;
	return <WarlockEditor saved={warlock.data.profile} />;
}

function WarlockEditor({ saved }: { saved: AgentProfile }) {
	const [profile, setProfile] = useState(() => toDraft(saved));
	const save = useMutation({
		mutationFn: () =>
			unwrap(
				client.api.warlock.$put({ json: { profile: fromDraft(profile) } }),
			),
	});
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!hasRepeatedServer(profile)) save.mutate();
	};
	return (
		<form onSubmit={submit} className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-heading text-xl font-semibold">Warlock profile</h2>
				<Button type="submit" disabled={save.isPending}>
					Save warlock
				</Button>
			</div>
			<ProfileFields
				id="warlock"
				value={profile}
				onChange={setProfile}
				issues={issuesOf(save.error)}
			/>
			<SaveError error={save.error} shown={profilePaths(profile)} />
		</form>
	);
}
