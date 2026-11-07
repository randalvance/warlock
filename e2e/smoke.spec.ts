import { expect, type Page, test } from "@playwright/test";

const epicSections = [
	"Projects",
	"Agents",
	"Formations",
	"Spellbooks",
	"Board",
	"Factory",
];

test("the shell is dark, reaches every section, and goes live", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page, "the index redirects to the first section").toHaveURL(
		/\/projects$/,
	);
	expect(
		await backgroundLuma(page),
		"dark even though the browser prefers light",
	).toBeLessThan(0.2);

	const nav = page.getByRole("navigation", { name: "Sections" });
	await expect(nav.getByRole("link")).toHaveText(epicSections);
	for (const name of epicSections) {
		await nav.getByRole("link", { name }).click();
		await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
	}

	await expect(page.getByRole("status", { name: "Event stream" })).toHaveText(
		"Live",
	);
});

function backgroundLuma(page: Page): Promise<number> {
	return page.evaluate(() => {
		const context = document.createElement("canvas").getContext("2d");
		if (!context) throw new Error("no 2d canvas");
		// A transparent body would read back as black, so it composites over white.
		context.fillStyle = "white";
		context.fillRect(0, 0, 1, 1);
		context.fillStyle = getComputedStyle(document.body).backgroundColor;
		context.fillRect(0, 0, 1, 1);
		const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
		return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	});
}
