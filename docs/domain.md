# Honeypot domain model

This page defines the words Honeypot uses and the data shape behind each one. Code, issues, and agent prompts use these names and no synonyms.

## Glossary

| Term | Meaning |
| --- | --- |
| Dark factory | The whole Honeypot system. It turns tasks into software work that agents do. |
| Companion | The main agent. Every command enters through the companion. It picks a playbook for a task and delegates the work to minions through a workflow. |
| Minion | A worker agent. Each minion has its own system prompt, skills, MCP servers, and memory. |
| Agent profile | The configuration an agent runs with. It holds a system prompt, skills, and MCP servers. The companion and every minion have one. |
| Skills library | The folder on the server's disk that holds the skills a profile can list. Each skill is an Agent Skills folder with a `SKILL.md`, and a profile names it by its folder name. |
| Memory note | One markdown note in a minion's memory. A minion reads its notes at the start of a run and can append to them. The companion has no memory. |
| Project | The owner of a body of work. A project has one or more GitHub repos, a collection of artifacts, and context. |
| Artifact | A file, link, or note that belongs to a project. Minions read artifacts and produce new ones. |
| Context | Standing knowledge about a project, such as conventions and architecture notes. Every agent that works on the project receives it. |
| Task | One piece of software work in a project. A task can mirror a GitHub issue. |
| Playbook | A strategy for one kind of task. It names the tasks it fits, the workflow that runs them, and the brief each step's minion receives. |
| Workflow | How work moves between minions. It lists the steps, the minion at each step, and the allowed transitions between steps. |
| Step | One step in a workflow. One minion staffs it. |
| Outcome | The label a minion reports when it finishes a step, such as `approved` or `changes_requested`. The outcome selects the next transition. |
| Transition | An allowed move from one step to the next step, or to the end of the run, for one outcome. |
| Run | One execution of a workflow for one task. |
| Handoff | A recorded transition inside a run. It carries the artifacts from one minion to the next. |
| Board | The kanban view of tasks. It can sync with a GitHub Projects board. |
| Factory view | The live view of runs. It shows each minion at work and each handoff to the next step. |

## Data shape

The sketch below is TypeScript. Field names can change during implementation. The relationships between the types are the contract.

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

type ProjectId = Brand<string, "ProjectId">;
type ArtifactId = Brand<string, "ArtifactId">;
type ContextId = Brand<string, "ContextId">;
type MinionId = Brand<string, "MinionId">;
type MemoryNoteId = Brand<string, "MemoryNoteId">;
type SkillRef = Brand<string, "SkillRef">;
type WorkflowId = Brand<string, "WorkflowId">;
type StepId = Brand<string, "StepId">;
type PlaybookId = Brand<string, "PlaybookId">;
type TaskId = Brand<string, "TaskId">;
type RunId = Brand<string, "RunId">;
type Outcome = Brand<string, "Outcome">;

interface Project {
	id: ProjectId;
	name: string;
	repos: [RepoRef, ...RepoRef[]];
	artifacts: Artifact[];
	context: ContextEntry[];
}

interface RepoRef {
	owner: string;
	name: string;
	defaultBranch: string;
}

type Artifact =
	| { kind: "file"; id: ArtifactId; name: string; mediaType: string; size: number; producedBy?: RunId }
	| { kind: "link"; id: ArtifactId; url: string; producedBy?: RunId }
	| { kind: "note"; id: ArtifactId; title: string; body: string; producedBy?: RunId };

interface ContextEntry {
	id: ContextId;
	title: string;
	body: string;
}

interface AgentProfile {
	systemPrompt: string;
	skills: SkillRef[];
	mcpServers: Record<string, McpServerConfig>;
}

type McpServerConfig =
	| { type?: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
	| { type: "http"; url: string; headers?: Record<string, string> };

interface Companion {
	profile: AgentProfile;
}

interface Minion {
	id: MinionId;
	name: string;
	profile: AgentProfile;
	memory: MemoryNote[];
}

interface MemoryNote {
	id: MemoryNoteId;
	name: string;
	body: string;
	updatedAt: string;
}

type End = "done" | "failed";

interface Step {
	id: StepId;
	minion: MinionId;
}

interface Transition {
	from: StepId;
	outcome: Outcome;
	to: StepId | End;
}

interface Workflow {
	id: WorkflowId;
	name: string;
	entry: StepId;
	steps: Record<StepId, Step>;
	transitions: Transition[];
}

interface Playbook {
	id: PlaybookId;
	name: string;
	fits: string;
	workflow: WorkflowId;
	briefs: Record<StepId, string>;
}

type TaskStatus = "backlog" | "ready" | "in_progress" | "in_review" | "done";

interface Task {
	id: TaskId;
	projectId: ProjectId;
	title: string;
	body: string;
	status: TaskStatus;
	playbook?: PlaybookId;
	issue?: { repo: RepoRef; number: number };
}

type RunState =
	| { kind: "running"; step: StepId }
	| { kind: "succeeded" }
	| { kind: "failed"; step: StepId; reason: string };

interface Handoff {
	from: StepId;
	outcome: Outcome;
	to: StepId | End;
	at: string;
	artifacts: ArtifactId[];
}

interface Run {
	id: RunId;
	taskId: TaskId;
	playbookId: PlaybookId;
	workflowId: WorkflowId;
	state: RunState;
	handoffs: Handoff[];
}
```

A file artifact has a name, a media type, and a size instead of a path, because its bytes live in the database next to its row.

A `SkillRef` is the name of a folder directly under the skills library. `mcpServers` has the shape of the `mcpServers` map in a Claude Code `.mcp.json` file. Each key is a server name, and a stdio entry may leave out its `type`.

## Rules the model enforces

- A project has at least one repo.
- A profile lists a skill at most once, and only a skill whose folder in the skills library holds a `SKILL.md`.
- Minion names are unique ignoring case. Within one minion, memory note names are unique ignoring case.
- A workflow's entry step and every transition endpoint exist in `steps`.
- Every step has at least one outgoing transition, and every step is reachable from the entry step.
- A workflow has at most one transition for each pair of step and outcome.
- A playbook has a brief for every step in its workflow.
- A run is at one step at a time. A run moves only along a transition that its workflow defines.
- Each run works in its own git worktree and branch. Two runs never share a checkout.
