import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { sectionRoutes, sections } from "@/sections";
import { Shell } from "@/shell";
import "./index.css";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Shell />,
		children: [
			{ index: true, element: <Navigate to={sections[0].path} replace /> },
			...sectionRoutes,
		],
	},
]);

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root");
createRoot(root).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
