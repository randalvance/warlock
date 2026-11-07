import type { RouteObject } from "react-router";

export const sections = [
	{ path: "projects", label: "Projects" },
	{ path: "agents", label: "Agents" },
	{ path: "formations", label: "Formations" },
	{ path: "spellbooks", label: "Spellbooks" },
	{ path: "board", label: "Board" },
	{ path: "factory", label: "Factory" },
] as const;

export const sectionRoutes: RouteObject[] = sections.map(({ path, label }) => ({
	path,
	element: <h1 className="font-heading text-2xl font-semibold">{label}</h1>,
}));
