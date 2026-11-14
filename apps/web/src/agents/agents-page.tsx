import type { AgentProfile } from "@honeypot/server/api";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { agentQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

export function AgentsPage() {
	const companion = useQuery(agentQueries.companion());
	const minions = useQuery(agentQueries.minions.list());
	return (
		<div className="flex gap-8">
			<div className="flex w-80 shrink-0 flex-col gap-6">
				<div className="flex items-center justify-between">
					<h1 className="font-heading text-2xl font-semibold">Agents</h1>
					<Button asChild>
						<Link to="minions/new">New minion</Link>
					</Button>
				</div>
				<section
					aria-label="The companion"
					className="flex flex-col gap-3 rounded-lg border p-3"
				>
					<div>
						<h2 className="font-heading text-lg font-semibold">
							The companion
						</h2>
						<p className="text-sm text-muted-foreground">
							One per install. A profile only, with no memory.
						</p>
					</div>
					<FormError error={companion.error} />
					{companion.data && (
						<ProfileSummary profile={companion.data.profile} />
					)}
					<div>
						<Button asChild variant="outline" size="sm">
							<Link to="companion">Edit companion profile</Link>
						</Button>
					</div>
				</section>
				<section className="flex flex-col gap-2">
					<h2 className="font-heading text-lg font-semibold">Minions</h2>
					<FormError error={minions.error} />
					{minions.data?.length === 0 && (
						<p className="text-muted-foreground">No minions yet.</p>
					)}
					<ul aria-label="Minions" className="flex flex-col gap-1">
						{minions.data?.map((minion) => (
							<li key={minion.id}>
								<Button
									asChild
									variant="ghost"
									className="w-full justify-start aria-[current=page]:bg-muted"
								>
									<NavLink to={`minions/${minion.id}`}>{minion.name}</NavLink>
								</Button>
							</li>
						))}
					</ul>
				</section>
			</div>
			<div className="min-w-0 max-w-2xl flex-1">
				<Outlet />
			</div>
		</div>
	);
}

export function AgentsIndex() {
	return (
		<p className="text-muted-foreground">
			Pick the companion or a minion to edit its profile.
		</p>
	);
}

function ProfileSummary({ profile }: { profile: AgentProfile }) {
	const servers = Object.entries(profile.mcpServers);
	return (
		<div className="flex flex-col gap-2 text-sm">
			<div>
				<p className="font-medium">Skills</p>
				<ul aria-label="Companion skills" className="font-mono">
					{profile.skills.map((ref) => (
						<li key={ref}>skills/{ref}</li>
					))}
				</ul>
				{profile.skills.length === 0 && (
					<p className="text-muted-foreground">None</p>
				)}
			</div>
			<div>
				<p className="font-medium">MCP servers</p>
				<ul aria-label="Companion MCP servers" className="font-mono">
					{servers.map(([name, server]) => (
						<li key={name}>
							{name} · {server.type ?? "stdio"}
						</li>
					))}
				</ul>
				{servers.length === 0 && <p className="text-muted-foreground">None</p>}
			</div>
		</div>
	);
}
