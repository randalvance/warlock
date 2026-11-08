import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { hc } from "hono/client";
import { expect, expectTypeOf, test } from "vitest";
import type { z } from "zod";
import type { AppType } from "../src/app.ts";
import type { ApiErrorBody } from "../src/http.ts";
import type {
	MinionId,
	MinionInput,
	NoteInput,
} from "../src/modules/agents/model.ts";
import {
	errorOf,
	headSeq,
	readEvents,
	startFresh,
	tempDbPath,
} from "./support.ts";

type MinionBody = z.input<typeof MinionInput>;
type McpServersBody = MinionBody["profile"]["mcpServers"];

async function serve(dbPath = tempDbPath()) {
	const skillsDir = join(dirname(dbPath), "skills");
	const server = await startFresh(dbPath, { skillsDir });
	return { server, skillsDir, api: hc<AppType>(server.url.href).api };
}

type Api = Awaited<ReturnType<typeof serve>>["api"];

function writeSkill(folder: string) {
	mkdirSync(folder, { recursive: true });
	writeFileSync(
		join(folder, "SKILL.md"),
		`---\nname: ${basename(folder)}\ndescription: Use when testing.\n---\n`,
	);
}

function plain(name: string, mcpServers: McpServersBody = {}): MinionBody {
	return { name, profile: { systemPrompt: "", skills: [], mcpServers } };
}

async function createMinion(api: Api, json: MinionBody) {
	const response = await api.minions.$post({ json });
	if (response.status !== 201) {
		throw new Error(`create answered ${response.status}`);
	}
	return (await response.json()).minion;
}

async function readMinion(api: Api, minionId: string) {
	const response = await api.minions[":minionId"].$get({ param: { minionId } });
	if (response.status !== 200) {
		throw new Error(`get answered ${response.status}`);
	}
	return (await response.json()).minion;
}

async function addNote(api: Api, minionId: string, json: NoteInput) {
	const response = await api.minions[":minionId"].memory.$post({
		param: { minionId },
		json,
	});
	if (response.status !== 201) {
		throw new Error(`add note answered ${response.status}`);
	}
	return (await response.json()).note;
}

function sendJson(
	url: URL,
	method: "POST" | "PUT",
	path: string,
	body: unknown,
) {
	return fetch(new URL(path, url), {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

test("a minion with a system prompt, one skill, and one MCP server reads back as entered after a restart", async () => {
	const dbPath = tempDbPath();
	const first = await serve(dbPath);
	writeSkill(join(first.skillsDir, "tdd"));
	const scout: MinionBody = {
		name: "Scout",
		profile: {
			systemPrompt: "You implement one task in one git worktree.",
			skills: ["tdd"],
			mcpServers: {
				github: {
					type: "stdio",
					command: "npx",
					args: ["-y", "@modelcontextprotocol/server-github"],
					env: { GITHUB_TOKEN: "ghp_example" },
				},
			},
		},
	};

	const created = await createMinion(first.api, scout);
	const expected = { id: created.id, ...scout, memory: [] };
	expect(created).toEqual(expected);
	await first.server.stop();

	const { api } = await serve(dbPath);
	expect(await readMinion(api, created.id)).toEqual(expected);
	expect(await (await api.minions.$get()).json()).toEqual({
		minions: [{ id: created.id, name: "Scout" }],
	});
});

test.each<[string, unknown, string, string, McpServersBody]>([
	[
		"an http server with no url",
		{ linear: { type: "http" } },
		"profile.mcpServers.linear.url",
		"is required for an http server",
		{ linear: { type: "http", url: "https://mcp.linear.app/mcp" } },
	],
	[
		"an http server with an empty url",
		{ linear: { type: "http", url: "" } },
		"profile.mcpServers.linear.url",
		"is required for an http server",
		{ linear: { type: "http", url: "https://mcp.linear.app/mcp" } },
	],
	[
		"an http server with an ftp url",
		{ linear: { type: "http", url: "ftp://mcp.linear.app" } },
		"profile.mcpServers.linear.url",
		"must be an http or https URL",
		{ linear: { type: "http", url: "https://mcp.linear.app/mcp" } },
	],
	[
		"a stdio server with no command",
		{ github: { type: "stdio", args: ["-y"] } },
		"profile.mcpServers.github.command",
		"is required for a stdio server",
		{ github: { command: "npx", args: ["-y"] } },
	],
	[
		"an sse server",
		{ legacy: { type: "sse", url: "https://legacy.example/sse" } },
		"profile.mcpServers.legacy.type",
		"must be stdio or http",
		{ legacy: { type: "http", url: "https://legacy.example/mcp" } },
	],
	[
		"a key the entry does not have",
		{ docs: { type: "http", url: "https://docs.example/mcp", timeout: 5000 } },
		"profile.mcpServers.docs",
		'Unrecognized key: "timeout"',
		{ docs: { type: "http", url: "https://docs.example/mcp" } },
	],
	[
		"a server name with a space",
		{ "has space": { command: "npx" } },
		"profile.mcpServers.has space",
		"is not a server name: use a letter, then letters, digits, - or _",
		{ "has-space": { command: "npx" } },
	],
	[
		"an environment variable name with a dash",
		{ github: { command: "npx", env: { "GITHUB-TOKEN": "ghp_example" } } },
		"profile.mcpServers.github.env.GITHUB-TOKEN",
		"is not an environment variable name",
		{ github: { command: "npx", env: { GITHUB_TOKEN: "ghp_example" } } },
	],
])(
	"the API rejects %s with a message at the bad field and stores nothing",
	async (_, bad, path, message, fixed) => {
		const { server, api } = await serve();

		const rejected = await sendJson(server.url, "POST", "/api/minions", {
			name: "Scout",
			profile: { systemPrompt: "", skills: [], mcpServers: bad },
		});
		expect(rejected.status).toBe(400);
		expect(await errorOf(rejected)).toMatchObject({
			code: "invalid_request",
			issues: [{ path, message }],
		});
		expect(await (await api.minions.$get()).json()).toEqual({ minions: [] });

		const control = await createMinion(api, plain("Scout", fixed));
		expect(
			control.profile.mcpServers,
			"the fixed entry saves and reads back as sent",
		).toEqual(fixed);
	},
);

test("the warlock rejects an invalid MCP server entry at the bad field and keeps its profile", async () => {
	const { server, api } = await serve();

	const rejected = await sendJson(server.url, "PUT", "/api/warlock", {
		profile: {
			systemPrompt: "",
			skills: [],
			mcpServers: { linear: { type: "http" } },
		},
	});
	expect(rejected.status).toBe(400);
	expect(await errorOf(rejected)).toMatchObject({
		code: "invalid_request",
		issues: [
			{
				path: "profile.mcpServers.linear.url",
				message: "is required for an http server",
			},
		],
	});
	expect(await (await api.warlock.$get()).json()).toEqual({
		warlock: { profile: { systemPrompt: "", skills: [], mcpServers: {} } },
	});
});

test("a memory note written through the API reads back after a restart", async () => {
	const dbPath = tempDbPath();
	const first = await serve(dbPath);
	const minion = await createMinion(first.api, plain("Scout"));
	const body = "# Conventions\n\nUse pnpm. Keep commits small.";

	const note = await addNote(first.api, minion.id, {
		name: "conventions",
		body,
	});
	expect(note).toMatchObject({ name: "conventions", body });
	await first.server.stop();

	const { api } = await serve(dbPath);
	expect((await readMinion(api, minion.id)).memory).toEqual([note]);
});

test("a memory note can be renamed, rewritten, and deleted", async () => {
	const { api } = await serve();
	const minion = await createMinion(api, plain("Scout"));
	const note = await addNote(api, minion.id, { name: "draft", body: "x" });
	const param = { minionId: minion.id, noteId: note.id };

	const edit = { name: "conventions", body: "Use pnpm." };
	const edited = await api.minions[":minionId"].memory[":noteId"].$put({
		param,
		json: edit,
	});
	expect(edited.status).toBe(200);
	expect((await readMinion(api, minion.id)).memory).toMatchObject([
		{ id: note.id, ...edit },
	]);

	const remove = () =>
		api.minions[":minionId"].memory[":noteId"].$delete({ param });
	expect((await remove()).status).toBe(204);
	expect((await readMinion(api, minion.id)).memory).toEqual([]);
	expect((await remove()).status, "a second delete is a no-op").toBe(204);
});

test("the skills library lists each folder with a SKILL.md, symlinked folders included", async () => {
	const { skillsDir, api } = await serve();
	writeSkill(join(skillsDir, "tdd"));
	const elsewhere = join(dirname(skillsDir), "my-skills", "pr");
	writeSkill(elsewhere);
	symlinkSync(elsewhere, join(skillsDir, "pr"));
	mkdirSync(join(skillsDir, "no-skill-md"));
	writeSkill(join(skillsDir, "Not A Ref"));

	expect(await (await api.skills.$get()).json()).toEqual({
		skills: ["pr", "tdd"],
	});
	const minion = await createMinion(api, {
		name: "Scout",
		profile: { systemPrompt: "", skills: ["tdd", "pr"], mcpServers: {} },
	});
	expect(minion.profile.skills).toEqual(["tdd", "pr"]);
});

test.each([
	[["missing"], "profile.skills.0", "skills/missing has no SKILL.md"],
	[["no-skill-md"], "profile.skills.0", "skills/no-skill-md has no SKILL.md"],
	[["tdd", "tdd"], "profile.skills.1", "is already in this profile"],
])(
	"a profile listing %j is a 400 at the skill and stores nothing",
	async (skills, path, message) => {
		const { skillsDir, api } = await serve();
		writeSkill(join(skillsDir, "tdd"));
		mkdirSync(join(skillsDir, "no-skill-md"));
		const profile = { systemPrompt: "", skills, mcpServers: {} };

		for (const rejected of [
			await api.minions.$post({ json: { name: "Scout", profile } }),
			await api.warlock.$put({ json: { profile } }),
		]) {
			expect(rejected.status).toBe(400);
			expect(await errorOf(rejected)).toMatchObject({
				code: "invalid_request",
				issues: [{ path, message }],
			});
		}
		expect(await (await api.minions.$get()).json()).toEqual({ minions: [] });
		expect(await (await api.warlock.$get()).json()).toEqual({
			warlock: { profile: { systemPrompt: "", skills: [], mcpServers: {} } },
		});
	},
);

test("the warlock starts empty, keeps a saved profile across a restart, and logs nothing for an unchanged save", async () => {
	const dbPath = tempDbPath();
	const first = await serve(dbPath);
	expect(await (await first.api.warlock.$get()).json()).toEqual({
		warlock: { profile: { systemPrompt: "", skills: [], mcpServers: {} } },
	});
	writeSkill(join(first.skillsDir, "pick-playbook"));
	const profile = {
		systemPrompt: "You pick a playbook for each task.",
		skills: ["pick-playbook"],
		mcpServers: {
			"warlock-api": { type: "stdio" as const, command: "node" },
		},
	};
	expect((await first.api.warlock.$put({ json: { profile } })).status).toBe(
		200,
	);
	await first.server.stop();

	const { server, api } = await serve(dbPath);
	expect(await (await api.warlock.$get()).json()).toEqual({
		warlock: { profile },
	});
	const head = await headSeq(server.url);
	await api.warlock.$put({ json: { profile } });
	expect(await headSeq(server.url), "an unchanged save logs nothing").toBe(
		head,
	);
	await api.warlock.$put({
		json: { profile: { ...profile, systemPrompt: "Pick carefully." } },
	});
	expect(await readEvents(server.url, { after: head, count: 1 })).toEqual([
		expect.objectContaining({ type: "warlock.changed" }),
	]);
});

test("deleting a minion takes its memory with it, and a second delete is a no-op", async () => {
	const { server, api } = await serve();
	const minion = await createMinion(api, plain("Scout"));
	const note = await addNote(api, minion.id, {
		name: "conventions",
		body: "Use pnpm.",
	});
	const param = { minionId: minion.id };
	const noteParam = { ...param, noteId: note.id };
	const json = { name: "conventions", body: "Use npm." };
	const head = await headSeq(server.url);

	expect((await api.minions[":minionId"].$delete({ param })).status).toBe(204);
	expect((await api.minions[":minionId"].$get({ param })).status).toBe(404);
	const noteAnswers = [
		await api.minions[":minionId"].memory.$post({ param, json }),
		await api.minions[":minionId"].memory[":noteId"].$put({
			param: noteParam,
			json,
		}),
		await api.minions[":minionId"].memory[":noteId"].$delete({
			param: noteParam,
		}),
	];
	expect(noteAnswers.map((answer) => answer.status)).toEqual([404, 404, 404]);
	expect(
		(await api.minions[":minionId"].$delete({ param })).status,
		"a second delete is a no-op",
	).toBe(204);

	expect(await readEvents(server.url, { after: head, count: 1 })).toEqual([
		expect.objectContaining({ type: "minion.changed", minionId: minion.id }),
	]);
	expect(await headSeq(server.url), "only the first delete logged").toBe(
		head + 1,
	);
	expect(await (await api.minions.$get()).json()).toEqual({ minions: [] });
});

test("minion names and a minion's note names are unique ignoring case", async () => {
	const { api } = await serve();
	const scout = await createMinion(api, plain("Scout"));
	const scribe = await createMinion(api, plain("Scribe"));

	const taken = await api.minions.$post({ json: plain("scout") });
	expect(taken.status).toBe(409);
	expect((await errorOf(taken)).message).toContain("Scout");
	const renamed = await api.minions[":minionId"].$put({
		param: { minionId: scribe.id },
		json: plain("SCOUT"),
	});
	expect(renamed.status).toBe(409);
	expect(await (await api.minions.$get()).json()).toEqual({
		minions: [
			{ id: scout.id, name: "Scout" },
			{ id: scribe.id, name: "Scribe" },
		],
	});

	const note = await addNote(api, scout.id, { name: "conventions", body: "" });
	const repeated = await api.minions[":minionId"].memory.$post({
		param: { minionId: scout.id },
		json: { name: "Conventions", body: "Again." },
	});
	expect(repeated.status).toBe(409);
	expect((await readMinion(api, scout.id)).memory).toEqual([note]);
});

test("minion names that differ only in non-ASCII case are taken", async () => {
	const { api } = await serve();
	const echo = await createMinion(api, plain("Écho"));

	const taken = await api.minions.$post({ json: plain("écho") });
	expect(taken.status).toBe(409);
	expect((await errorOf(taken)).message).toContain("Écho");
	expect(await (await api.minions.$get()).json()).toEqual({
		minions: [{ id: echo.id, name: "Écho" }],
	});
});

test("the web client sees branded minion ids and the 400 body", () => {
	type Create = Awaited<ReturnType<Api["minions"]["$post"]>>;
	type BodyAt<S extends number> = Awaited<
		ReturnType<Extract<Create, { status: S }>["json"]>
	>;
	expectTypeOf<BodyAt<201>["minion"]["id"]>().toEqualTypeOf<MinionId>();
	expectTypeOf<BodyAt<400>>().toEqualTypeOf<ApiErrorBody>();
});
