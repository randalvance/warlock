import type { StreamStatus } from "@warlock/server/events";
import { NavLink, Outlet } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStreamStatus } from "@/lib/server-events";
import { sections } from "@/sections";

const statusLabel: Record<StreamStatus, string> = {
	connecting: "Connecting",
	live: "Live",
	reconnecting: "Reconnecting",
};

export function Shell() {
	const status = useStreamStatus();
	return (
		<div className="flex min-h-svh">
			<aside className="flex w-56 flex-col gap-4 border-r p-3">
				<div className="px-2.5 pt-1 font-heading font-semibold">Warlock</div>
				<nav aria-label="Sections" className="flex flex-col gap-1">
					{sections.map(({ path, label }) => (
						<Button
							key={path}
							asChild
							variant="ghost"
							className="justify-start aria-[current=page]:bg-muted"
						>
							<NavLink to={path}>{label}</NavLink>
						</Button>
					))}
				</nav>
			</aside>
			<div className="flex flex-1 flex-col">
				<header className="flex h-12 items-center justify-end border-b px-6">
					<Badge
						role="status"
						aria-label="Event stream"
						variant={status === "live" ? "default" : "secondary"}
					>
						{statusLabel[status]}
					</Badge>
				</header>
				<main className="flex-1 p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
