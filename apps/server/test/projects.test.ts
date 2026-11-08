import { hc } from "hono/client";
import { expect, expectTypeOf, onTestFinished, test } from "vitest";
import type { AppType } from "../src/app.ts";
import { type ApiErrorBody, maxJsonBodyBytes } from "../src/http.ts";
import {
	maxUploadBytes,
	type ProjectId,
} from "../src/modules/projects/model.ts";
import { type StubRepo, startGitHubStub } from "./github-stub.ts";
import { startFresh, tempDbPath } from "./support.ts";

const readable = {
	"acme/api": { defaultBranch: "main" },
	"acme/web": { defaultBranch: "trunk" },
	"acme/sso": { answer: "sso_forbidden" },
} satisfies Record<string, StubRepo>;

async function serve(dbPath = tempDbPath()) {
	const github = await startGitHubStub(readable);
	onTestFinished(() => github.close());
	const server = await startFresh(dbPath, { github: github.config });
	return { github, server, api: hc<AppType>(server.url.href).api };
}

type Api = Awaited<ReturnType<typeof serve>>["api"];

async function createProject(api: Api, repos: string[] = ["acme/api"]) {
	const response = await api.projects.$post({
		json: { name: "Checkout", repos },
	});
	if (response.status !== 201) {
		throw new Error(`create answered ${response.status}`);
	}
	return (await response.json()).project;
}

async function readProject(api: Api, projectId: string) {
	const response = await api.projects[":projectId"].$get({
		param: { projectId },
	});
	if (response.status !== 200) {
		throw new Error(`get answered ${response.status}`);
	}
	return (await response.json()).project;
}

async function errorOf(response: Response): Promise<ApiErrorBody["error"]> {
	return ((await response.json()) as ApiErrorBody).error;
}

async function headSeq(url: URL): Promise<number> {
	const response = await fetch(new URL("/api/events", url));
	const reader = response.body?.getReader();
	if (!reader) throw new Error("the stream has no body");
	const { value } = await reader.read();
	await reader.cancel();
	const match = /"cursor":(\d+)/.exec(new TextDecoder().decode(value));
	if (!match) throw new Error("the stream did not open with ready");
	return Number(match[1]);
}

test.each([
	["an empty repo list", { name: "Checkout", repos: [] }],
	["no repo list", { name: "Checkout" }],
])(
	"the API rejects a project with %s before asking GitHub",
	async (_, body) => {
		const { github, server, api } = await serve();

		const rejected = await fetch(new URL("/api/projects", server.url), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		expect(rejected.status).toBe(400);
		expect(await errorOf(rejected)).toMatchObject({
			code: "invalid_request",
			issues: [expect.objectContaining({ path: "repos" })],
		});
		expect(github.requests, "rejected before any GitHub request").toEqual([]);
		expect(await (await api.projects.$get()).json()).toEqual({ projects: [] });

		const project = await createProject(api);
		expect(github.requests, "a valid create does ask GitHub").toEqual([
			"/repos/acme/api",
		]);
		expect(await (await api.projects.$get()).json()).toEqual({
			projects: [
				{
					id: project.id,
					name: "Checkout",
					repos: [{ owner: "acme", name: "api", defaultBranch: "main" }],
				},
			],
		});
	},
);

test("creating a project names every repo GitHub will not show, and creates nothing", async () => {
	const { api } = await serve();
	const created = await api.projects.$post({
		json: { name: "Checkout", repos: ["acme/api", "acme/missing", "acme/sso"] },
	});

	expect(created.status).toBe(422);
	const error = await errorOf(created);
	expect(error).toMatchObject({
		code: "repo_unavailable",
		repos: ["acme/missing", "acme/sso"],
	});
	expect(error.message).toContain("acme/missing");
	expect(error.message).toContain("acme/sso");
	expect(
		await (await api.projects.$get()).json(),
		"the readable acme/api did not rescue the project",
	).toEqual({ projects: [] });
});

test.each([
	["a missing repo", "missing"],
	["a repo the token is blocked from", "sso"],
])("attaching %s fails with a message that names it", async (_, name) => {
	const { api } = await serve();
	const project = await createProject(api);
	const param = { projectId: project.id };

	const attached = await api.projects[":projectId"].repos.$post({
		param,
		json: { repo: `acme/${name}` },
	});
	expect(attached.status).toBe(422);
	const error = await errorOf(attached);
	expect(error).toMatchObject({
		code: "repo_unavailable",
		repos: [`acme/${name}`],
	});
	expect(error.message).toContain(`acme/${name}`);

	const control = await api.projects[":projectId"].repos.$post({
		param,
		json: { repo: "acme/WEB" },
	});
	expect(control.status, "a readable repo attaches").toBe(200);
	expect((await readProject(api, project.id)).repos).toEqual([
		{ owner: "acme", name: "api", defaultBranch: "main" },
		{ owner: "acme", name: "web", defaultBranch: "trunk" },
	]);
});

test.each([
	["three segments", "a/b/c"],
	["no slash", "acme"],
])(
	"attaching a repo with %s is a 400 at repo and attaches nothing",
	async (_, repo) => {
		const { api } = await serve();
		const project = await createProject(api);

		const attached = await api.projects[":projectId"].repos.$post({
			param: { projectId: project.id },
			json: { repo },
		});
		expect(attached.status).toBe(400);
		expect(await errorOf(attached)).toMatchObject({
			code: "invalid_request",
			issues: [{ path: "repo", message: "use owner/name, such as acme/api" }],
		});
		expect(
			(await readProject(api, project.id)).repos,
			"the project keeps only its original repo",
		).toEqual([{ owner: "acme", name: "api", defaultBranch: "main" }]);
	},
);

test("detaching a project's last repo is refused and the repo stays", async () => {
	const { api } = await serve();
	const project = await createProject(api, ["acme/api", "acme/web"]);
	const detach = (name: string) =>
		api.projects[":projectId"].repos[":owner"][":name"].$delete({
			param: { projectId: project.id, owner: "acme", name },
		});

	expect(
		(await detach("web")).status,
		"a repo that is not the last detaches",
	).toBe(204);
	const refused = await detach("api");
	expect(refused.status).toBe(409);
	expect((await errorOf(refused)).message).toContain("acme/api");
	expect((await readProject(api, project.id)).repos).toEqual([
		{ owner: "acme", name: "api", defaultBranch: "main" },
	]);
});

test("an uploaded file downloads as the same bytes after a restart", async () => {
	const dbPath = tempDbPath();
	const first = await serve(dbPath);
	const project = await createProject(first.api);
	const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => (i * 7) % 256);

	const uploaded = await first.api.projects[":projectId"].artifacts.$post({
		param: { projectId: project.id },
		form: {
			kind: "file",
			file: new File([bytes], "build.bin", { type: "application/x-thing" }),
		},
	});
	expect(uploaded.status).toBe(201);
	await first.server.stop();

	const { api } = await serve(dbPath);
	const [artifact] = (await readProject(api, project.id)).artifacts;
	expect(artifact).toEqual({
		kind: "file",
		id: expect.any(String),
		name: "build.bin",
		mediaType: "application/x-thing",
		size: bytes.length,
	});
	const download = await api.projects[":projectId"].artifacts[
		":artifactId"
	].content.$get({
		param: { projectId: project.id, artifactId: artifact?.id ?? "" },
	});
	expect(download.status).toBe(200);
	expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
	expect(download.headers.get("x-content-type-options")).toBe("nosniff");
	expect(
		new Uint8Array(await download.arrayBuffer()),
		"the downloaded bytes are the uploaded bytes",
	).toEqual(bytes);
});

test.each([
	["one byte over the cap", maxUploadBytes + 1],
	["far over the cap", maxUploadBytes * 2],
])("a file %s is a 413 and stores nothing", async (_, size) => {
	const { api } = await serve();
	const project = await createProject(api);

	const uploaded = await api.projects[":projectId"].artifacts.$post({
		param: { projectId: project.id },
		form: { kind: "file", file: new File([new Uint8Array(size)], "big.bin") },
	});
	expect(uploaded.status).toBe(413);
	expect((await errorOf(uploaded)).code).toBe("too_large");
	expect((await readProject(api, project.id)).artifacts).toEqual([]);

	const atCap = await api.projects[":projectId"].artifacts.$post({
		param: { projectId: project.id },
		form: {
			kind: "file",
			file: new File([new Uint8Array(maxUploadBytes)], "cap.bin"),
		},
	});
	expect(atCap.status, "a file exactly at the cap is accepted").toBe(201);
});

test("a JSON body over the limit is a 413 and stores nothing", async () => {
	const { api } = await serve();
	const project = await createProject(api);
	const param = { projectId: project.id };

	const tooBig = await api.projects[":projectId"].context.$post({
		param,
		json: { title: "Huge", body: "x".repeat(maxJsonBodyBytes) },
	});
	expect(tooBig.status).toBe(413);
	expect((await errorOf(tooBig)).code).toBe("too_large");
	expect((await readProject(api, project.id)).context).toEqual([]);

	const body = "\u0001".repeat(100_000);
	const largestValid = await api.projects[":projectId"].context.$post({
		param,
		json: { title: "Largest", body },
	});
	expect(
		largestValid.status,
		"a 100,000-character body that escapes to about 600 KB is accepted",
	).toBe(201);
	expect((await readProject(api, project.id)).context).toMatchObject([
		{ title: "Largest", body },
	]);
});

test("notes, links, and context entries read back, and a write that changes nothing logs no event", async () => {
	const { api, server } = await serve();
	const project = await createProject(api);
	const param = { projectId: project.id };

	await api.projects[":projectId"].artifacts.$post({
		param,
		form: { kind: "note", title: "Release plan", body: "Ship behind a flag." },
	});
	await api.projects[":projectId"].artifacts.$post({
		param,
		form: { kind: "link", url: "https://example.com/spec" },
	});
	const added = await api.projects[":projectId"].context.$post({
		param,
		json: { title: "Conventions", body: "Use npm." },
	});
	if (added.status !== 201) throw new Error(`context answered ${added.status}`);
	const { entry } = await added.json();
	const edit = { title: "Conventions", body: "Use pnpm." };
	const contextParam = { ...param, contextId: entry.id };
	const edited = await api.projects[":projectId"].context[":contextId"].$put({
		param: contextParam,
		json: edit,
	});
	expect(edited.status).toBe(200);

	expect(await readProject(api, project.id)).toMatchObject({
		artifacts: [
			{ kind: "note", title: "Release plan", body: "Ship behind a flag." },
			{ kind: "link", url: "https://example.com/spec" },
		],
		context: [{ id: entry.id, ...edit }],
	});

	const head = await headSeq(server.url);
	await api.projects[":projectId"].context[":contextId"].$put({
		param: contextParam,
		json: edit,
	});
	await api.projects[":projectId"].repos.$post({
		param,
		json: { repo: "ACME/api" },
	});
	await api.projects[":projectId"].$patch({
		param,
		json: { name: "Checkout" },
	});
	expect(await headSeq(server.url), "repeat writes logged nothing").toBe(head);
	await api.projects[":projectId"].$patch({
		param,
		json: { name: "Payments" },
	});
	expect(await headSeq(server.url), "a real rename logs one event").toBe(
		head + 1,
	);
});

test("the web client sees branded ids and every error body", () => {
	type Create = Awaited<ReturnType<Api["projects"]["$post"]>>;
	type BodyAt<S extends number> = Awaited<
		ReturnType<Extract<Create, { status: S }>["json"]>
	>;
	expectTypeOf<BodyAt<201>["project"]["id"]>().toEqualTypeOf<ProjectId>();
	expectTypeOf<BodyAt<422>>().toEqualTypeOf<ApiErrorBody>();
	expectTypeOf<BodyAt<502>>().toEqualTypeOf<ApiErrorBody>();
});
