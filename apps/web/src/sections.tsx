import type { RouteObject } from "react-router";
import { AgentsIndex, AgentsPage } from "@/agents/agents-page";
import { MinionPage } from "@/agents/minion-page";
import { WarlockPage } from "@/agents/warlock-page";
import { ProjectPage } from "@/projects/project-page";
import { ProjectsPage } from "@/projects/projects-page";

export const sections = [
	{ path: "projects", label: "Projects" },
	{ path: "agents", label: "Agents" },
	{ path: "formations", label: "Formations" },
	{ path: "spellbooks", label: "Spellbooks" },
	{ path: "board", label: "Board" },
	{ path: "factory", label: "Factory" },
] as const;

type SectionPath = (typeof sections)[number]["path"];

const sectionPages: Partial<Record<SectionPath, RouteObject[]>> = {
	projects: [
		{ index: true, element: <ProjectsPage /> },
		{ path: ":projectId", element: <ProjectPage /> },
	],
	agents: [
		{
			element: <AgentsPage />,
			children: [
				{ index: true, element: <AgentsIndex /> },
				{ path: "warlock", element: <WarlockPage /> },
				{ path: "minions/new", element: <MinionPage /> },
				{ path: "minions/:minionId", element: <MinionPage /> },
			],
		},
	],
};

export const sectionRoutes: RouteObject[] = sections.map(({ path, label }) => ({
	path,
	children: sectionPages[path] ?? [
		{
			index: true,
			element: <h1 className="font-heading text-2xl font-semibold">{label}</h1>,
		},
	],
}));
