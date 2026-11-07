import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { syncQueryCache } from "@/lib/queries";
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

const queryClient = new QueryClient();
syncQueryCache(queryClient);

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root");
createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
