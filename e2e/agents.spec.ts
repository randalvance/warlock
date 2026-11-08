import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

async function openAgents(page: Page) {
	await page.goto("/agents");
	await expect(page.getByRole("status", { name: "Event stream" })).toHaveText(
		"Live",
	);
}

test("a minion with a system prompt, a skill, and a stdio server shows what was typed after a reload", async ({
	page,
}) => {
	await openAgents(page);
	await page.getByRole("link", { name: "New minion" }).click();
	await expect(page).toHaveURL(/\/agents\/minions\/new$/);
	await expect(page.getByText("Save the minion to add notes.")).toBeVisible();

	const prompt =
		"You implement one task in one git worktree.\nKeep commits small.";
	await page.getByLabel("Name", { exact: true }).fill("Scout");
	await page.getByLabel("System prompt").fill(prompt);
	await page.getByLabel("Skill to add").selectOption("tdd");
	await page.getByRole("button", { name: "Add skill" }).click();
	await page.getByRole("button", { name: "Add server" }).click();
	const server = page.getByRole("group", { name: "MCP server 1" });
	await server.getByLabel("Server name").fill("github");
	await server.getByLabel("Command").fill("npx");
	await server.getByRole("button", { name: "Add argument" }).click();
	await server.getByLabel("Argument 1", { exact: true }).fill("-y");
	await server.getByRole("button", { name: "Add argument" }).click();
	await server
		.getByLabel("Argument 2", { exact: true })
		.fill("@modelcontextprotocol/server-github");
	await server
		.getByRole("button", { name: "Add environment variable" })
		.click();
	await server.getByLabel("Environment variable 1 name").fill("GITHUB_TOKEN");
	await server.getByLabel("Environment variable 1 value").fill("ghp_example");
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(page).toHaveURL(/\/agents\/minions\/[0-9a-f-]{36}$/);

	await page.reload();
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Scout");
	await expect(page.getByLabel("System prompt")).toHaveValue(prompt);
	await expect(
		page.getByRole("list", { name: "Skills" }).getByRole("listitem"),
	).toHaveText([/^skills\/tdd\s*Remove$/]);
	await expect(server.getByLabel("Server name")).toHaveValue("github");
	await expect(server.getByLabel("Type")).toHaveValue("stdio");
	await expect(server.getByLabel("Command")).toHaveValue("npx");
	await expect(server.getByLabel("Argument 1", { exact: true })).toHaveValue(
		"-y",
	);
	await expect(server.getByLabel("Argument 2", { exact: true })).toHaveValue(
		"@modelcontextprotocol/server-github",
	);
	await expect(server.getByLabel("Environment variable 1 name")).toHaveValue(
		"GITHUB_TOKEN",
	);
	await expect(server.getByLabel("Environment variable 1 value")).toHaveValue(
		"ghp_example",
	);
	await expect(page.getByRole("group", { name: /^MCP server/ })).toHaveCount(1);
	await expect(
		page.getByRole("list", { name: "Minions" }).getByRole("listitem"),
	).toHaveText(["Scout"]);

	await page.getByLabel("Note name").fill("conventions");
	await page.getByLabel("Note body").fill("Use pnpm.");
	await page.getByRole("button", { name: "Add note" }).click();
	await page.reload();
	await expect(
		page.getByRole("list", { name: "Memory notes" }).getByRole("listitem"),
	).toHaveText([/memory\/scout\/conventions\.md.*written by you.*Use pnpm\./]);

	await page.getByRole("button", { name: "Delete minion" }).click();
	await expect(page).toHaveURL(/\/agents$/);
	await expect(page.getByText("No minions yet.")).toBeVisible();
});

test("saving a new system prompt keeps every MCP server entry exactly as stored", async ({
	page,
}) => {
	const profile = {
		systemPrompt: "Old prompt.",
		skills: [],
		mcpServers: {
			github: {
				type: "stdio",
				command: "npx",
				args: ["--label", "", " padded "],
				env: { NOTE: "line one\nline two", PADDED: "  spaced  " },
			},
			local: { command: "uvx", args: ["mcp-local"] },
			docs: {
				type: "http",
				url: "https://docs.example/mcp",
				headers: { Authorization: "  Bearer token  " },
			},
		},
	};
	const created = await page.request.post("/api/minions", {
		data: { name: "Scout", profile },
	});
	expect(created.status()).toBe(201);
	const { minion } = await created.json();

	await page.goto(`/agents/minions/${minion.id}`);
	await page.getByLabel("System prompt").fill("New prompt.");
	const saved = page.waitForResponse(
		(response) =>
			response.request().method() === "PUT" &&
			response.url().endsWith(`/api/minions/${minion.id}`),
	);
	await page.getByRole("button", { name: "Save minion" }).click();
	expect((await saved).status()).toBe(200);

	const read = await page.request.get(`/api/minions/${minion.id}`);
	expect((await read.json()).minion.profile).toEqual({
		...profile,
		systemPrompt: "New prompt.",
	});
});

test("an http server with no url shows the server's message on its row and does not save", async ({
	page,
}) => {
	await openAgents(page);
	await page.getByRole("link", { name: "New minion" }).click();
	await page.getByLabel("Name", { exact: true }).fill("Scout");
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(page).toHaveURL(/\/agents\/minions\/[0-9a-f-]{36}$/);

	await page.getByRole("button", { name: "Add server" }).click();
	const server = page.getByRole("group", { name: "MCP server 1" });
	await server.getByLabel("Server name").fill("linear");
	await server.getByLabel("Type").selectOption("http");
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(server.getByRole("alert")).toHaveText(
		"mcpServers.linear.url is required for an http server.",
	);

	await page.reload();
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Scout");
	await expect(page.getByRole("group", { name: /^MCP server/ })).toHaveCount(0);
});

test("a second server named github shows a message on its row and does not save", async ({
	page,
}) => {
	await openAgents(page);
	await page.getByRole("link", { name: "New minion" }).click();
	await page.getByLabel("Name", { exact: true }).fill("Scout");
	await page.getByRole("button", { name: "Add server" }).click();
	const first = page.getByRole("group", { name: "MCP server 1" });
	await first.getByLabel("Server name").fill("github");
	await first.getByLabel("Command").fill("npx");
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(page).toHaveURL(/\/agents\/minions\/[0-9a-f-]{36}$/);

	await page.getByRole("button", { name: "Add server" }).click();
	const second = page.getByRole("group", { name: "MCP server 2" });
	await second.getByLabel("Server name").fill("github");
	await second.getByLabel("Command").fill("uvx");
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(second.getByRole("alert")).toHaveText(
		"mcpServers.github is already in this profile.",
	);
	await expect(first.getByRole("alert")).toHaveCount(0);

	await page.reload();
	await expect(page.getByRole("group", { name: /^MCP server/ })).toHaveCount(1);
	await expect(first.getByLabel("Server name")).toHaveValue("github");
	await expect(first.getByLabel("Command")).toHaveValue("npx");
});

test("a repeated environment variable shows a message on its row and does not save", async ({
	page,
}) => {
	await openAgents(page);
	await page.getByRole("link", { name: "New minion" }).click();
	await page.getByLabel("Name", { exact: true }).fill("Scout");
	await page.getByRole("button", { name: "Add server" }).click();
	const server = page.getByRole("group", { name: "MCP server 1" });
	await server.getByLabel("Server name").fill("github");
	await server.getByLabel("Command").fill("npx");
	const env = server.getByRole("list", { name: "Environment" });
	for (const value of ["first", "second"]) {
		await server
			.getByRole("button", { name: "Add environment variable" })
			.click();
		const row = env.getByRole("listitem").last();
		await row.getByLabel(/name$/).fill("TOKEN");
		await row.getByLabel(/value$/).fill(value);
	}
	await page.getByRole("button", { name: "Save minion" }).click();
	await expect(env.getByRole("listitem").nth(1).getByRole("alert")).toHaveText(
		"mcpServers.github.env.TOKEN is already in this server.",
	);
	await expect(
		env.getByRole("listitem").first().getByRole("alert"),
	).toHaveCount(0);
	await expect(page).toHaveURL(/\/agents\/minions\/new$/);
	const minions = await page.request.get("/api/minions");
	expect(await minions.json()).toEqual({ minions: [] });
});

test("the warlock profile saves and shows on the warlock card after a reload", async ({
	page,
}) => {
	await openAgents(page);
	await page.getByRole("link", { name: "Edit warlock profile" }).click();
	await page.getByLabel("System prompt").fill("Pick a playbook for each task.");
	await page.getByLabel("Skill to add").selectOption("tdd");
	await page.getByRole("button", { name: "Add skill" }).click();
	await page.getByRole("button", { name: "Add server" }).click();
	const server = page.getByRole("group", { name: "MCP server 1" });
	await server.getByLabel("Server name").fill("docs");
	await server.getByLabel("Type").selectOption("http");
	await server.getByLabel("URL").fill("https://docs.example/mcp");
	await page.getByRole("button", { name: "Save warlock" }).click();

	const card = page.getByRole("region", { name: "The warlock" });
	await expect(card.getByRole("list", { name: "Warlock skills" })).toHaveText(
		"skills/tdd",
	);
	await expect(
		card.getByRole("list", { name: "Warlock MCP servers" }),
	).toHaveText("docs · http");
	await page.reload();
	await expect(page.getByLabel("System prompt")).toHaveValue(
		"Pick a playbook for each task.",
	);
	await expect(server.getByLabel("URL")).toHaveValue(
		"https://docs.example/mcp",
	);
});
