import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, unwrap } from "@/lib/api";
import { projectQueries } from "@/lib/queries";
import { FormError } from "@/projects/form-error";

export function ProjectsPage() {
	const projects = useQuery(projectQueries.list());
	const [creating, setCreating] = useState(false);
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="font-heading text-2xl font-semibold">Projects</h1>
				{!creating && (
					<Button onClick={() => setCreating(true)}>New project</Button>
				)}
			</div>
			{creating && <CreateProjectForm onCancel={() => setCreating(false)} />}
			<FormError error={projects.error} />
			{projects.data?.length === 0 && (
				<p className="text-muted-foreground">No projects yet.</p>
			)}
			<ul aria-label="Projects" className="flex flex-col gap-2">
				{projects.data?.map((project) => (
					<li key={project.id} className="rounded-lg border p-3">
						<Link to={project.id} className="font-medium hover:underline">
							{project.name}
						</Link>
						<p className="text-sm text-muted-foreground">
							{project.repos.map((r) => `${r.owner}/${r.name}`).join(", ")}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}

function CreateProjectForm({ onCancel }: { onCancel: () => void }) {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [repos, setRepos] = useState([""]);
	const create = useMutation({
		mutationFn: () =>
			unwrap(
				client.api.projects.$post({
					json: { name, repos: repos.filter((repo) => repo.trim() !== "") },
				}),
			),
		onSuccess: ({ project }) => navigate(project.id),
	});
	const submit = (event: FormEvent) => {
		event.preventDefault();
		create.mutate();
	};
	return (
		<form
			onSubmit={submit}
			aria-label="New project"
			className="flex flex-col gap-3 rounded-lg border p-4"
		>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="project-name">Name</Label>
				<Input
					id="project-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>
			{repos.map((repo, index) => {
				const id = `project-repo-${index}`;
				return (
					<div key={index} className="flex flex-col gap-1.5">
						<Label htmlFor={id}>Repo {index + 1}</Label>
						<Input
							id={id}
							placeholder="owner/name"
							value={repo}
							onChange={(e) =>
								setRepos(
									repos.map((r, i) => (i === index ? e.target.value : r)),
								)
							}
						/>
					</div>
				);
			})}
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => setRepos([...repos, ""])}
				>
					Add another repo
				</Button>
				<Button type="submit" disabled={create.isPending}>
					Create project
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
			</div>
			<FormError error={create.error} />
		</form>
	);
}
