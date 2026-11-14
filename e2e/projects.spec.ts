import { expect, test } from "./fixtures.ts";

test("a project with two repos, artifacts, and context survives a server restart", async ({
	page,
	honeypot,
}) => {
	const streamStatus = page.getByRole("status", { name: "Event stream" });
	await page.goto("/projects");
	await expect(streamStatus).toHaveText("Live");

	await page.getByRole("button", { name: "New project" }).click();
	await page.getByLabel("Name").fill("Checkout");
	await page.getByLabel("Repo 1").fill("acme");
	await page.getByRole("button", { name: "Create project" }).click();
	await expect(
		page.getByRole("alert"),
		"a malformed repo name shows the field's message, not a generic one",
	).toHaveText("use owner/name, such as acme/api");
	await page.getByLabel("Repo 1").fill("acme/api");
	await page.getByRole("button", { name: "Add another repo" }).click();
	await page.getByLabel("Repo 2").fill("acme/web");
	await page.getByRole("button", { name: "Create project" }).click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);

	await page.getByLabel("Attach repo").fill("acme/api/extra");
	await page.getByRole("button", { name: "Attach" }).click();
	await expect(
		page.getByRole("alert"),
		"a malformed repo to attach shows the field's message",
	).toHaveText("use owner/name, such as acme/api");
	await page.getByLabel("Attach repo").fill("acme/missing");
	await page.getByRole("button", { name: "Attach" }).click();
	await expect(
		page.getByRole("alert"),
		"an unreadable repo is named in the UI",
	).toContainText("acme/missing");

	await page.getByLabel("Note title").fill("Release plan");
	await page.getByLabel("Note body").fill("Ship behind a flag.");
	await page.getByRole("button", { name: "Add note" }).click();
	await page.getByLabel("Link URL").fill("https://example.com/spec");
	await page.getByRole("button", { name: "Add link" }).click();
	await page.getByLabel("Upload file").setInputFiles({
		name: "notes.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("hello honeypot"),
	});
	await page.getByLabel("Context title").fill("Conventions");
	await page.getByLabel("Context body").fill("Use npm.");
	await page.getByRole("button", { name: "Add context" }).click();
	await page
		.getByRole("button", { name: "Edit Conventions", exact: true })
		.click();
	await page.getByLabel("Edit Conventions body").fill("Use pnpm.");
	await page.getByRole("button", { name: "Save" }).click();

	const repos = page.getByRole("list", { name: "Repos" }).getByRole("listitem");
	const artifacts = page
		.getByRole("list", { name: "Artifacts" })
		.getByRole("listitem");
	const context = page
		.getByRole("list", { name: "Context" })
		.getByRole("listitem");
	const expectProject = async () => {
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Checkout",
		);
		await expect(repos).toHaveText([/acme\/api.*main/, /acme\/web.*trunk/]);
		await expect(artifacts).toHaveText([
			/Release plan.*Ship behind a flag\./,
			/example\.com\/spec/,
			/notes\.txt/,
		]);
		await expect(context).toHaveText([/Conventions.*Use pnpm\./]);
	};
	await expectProject();

	const before = honeypot.pid;
	await honeypot.restart();
	expect(honeypot.pid, "a new server process").not.toBe(before);
	expect(
		() => process.kill(before, 0),
		"the first server process is gone",
	).toThrow();
	await page.reload();
	await expect(streamStatus).toHaveText("Live");

	await expectProject();
	const href = await page
		.getByRole("link", { name: "notes.txt" })
		.getAttribute("href");
	const download = await page.request.get(href ?? "");
	expect(await download.text(), "the uploaded bytes survived").toBe(
		"hello honeypot",
	);
	await page
		.getByRole("navigation", { name: "Sections" })
		.getByRole("link", { name: "Projects" })
		.click();
	await expect(
		page.getByRole("list", { name: "Projects" }).getByRole("listitem"),
	).toHaveText([/Checkout.*acme\/api, acme\/web/]);
});
