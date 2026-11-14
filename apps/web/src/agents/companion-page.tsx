import type { AgentProfile } from "@honeypot/server/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import {
	fromDraft,
	hasRepeatedName,
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

export function CompanionPage() {
	const companion = useQuery(agentQueries.companion());
	if (companion.error) return <FormError error={companion.error} />;
	if (!companion.data) return <p className="text-muted-foreground">Loading…</p>;
	return <CompanionEditor saved={companion.data.profile} />;
}

function CompanionEditor({ saved }: { saved: AgentProfile }) {
	const [profile, setProfile] = useState(() => toDraft(saved));
	const save = useMutation({
		mutationFn: () =>
			unwrap(
				client.api.companion.$put({ json: { profile: fromDraft(profile) } }),
			),
	});
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!hasRepeatedName(profile)) save.mutate();
	};
	return (
		<form onSubmit={submit} className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-heading text-xl font-semibold">
					Companion profile
				</h2>
				<Button type="submit" disabled={save.isPending}>
					Save companion
				</Button>
			</div>
			<ProfileFields
				id="companion"
				value={profile}
				onChange={setProfile}
				issues={issuesOf(save.error)}
			/>
			<SaveError error={save.error} shown={profilePaths(profile)} />
		</form>
	);
}
