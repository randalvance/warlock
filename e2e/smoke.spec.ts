import { expect, type Page, test } from "@playwright/test";

// From the epic's scope, not imported from the app: a test that read the
// app's own list would pass with a section missing.
const sections = [
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
		await backgroundLuminance(page),
		"dark even though the browser prefers light",
	).toBeLessThan(0.2);

	const nav = page.getByRole("navigation", { name: "Sections" });
	await expect(nav.getByRole("link")).toHaveText(sections);
	for (const name of sections) {
		await nav.getByRole("link", { name }).click();
		await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
	}

	await expect(page.getByRole("status", { name: "Event stream" })).toHaveText(
		"Live",
	);
});

/** Relative luminance (0 to 1) of the body background, in any CSS color syntax. */
function backgroundLuminance(page: Page): Promise<number> {
	return page.evaluate(() => {
		const context = document.createElement("canvas").getContext("2d");
		if (!context) throw new Error("no 2d canvas");
		context.fillStyle = getComputedStyle(document.body).backgroundColor;
		context.fillRect(0, 0, 1, 1);
		const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
		return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	});
}
