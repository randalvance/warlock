import { defineConfig, devices } from "@playwright/test";
import { e2ePorts } from "./e2e/ports.ts";

const web = `http://127.0.0.1:${e2ePorts.web}`;

export default defineConfig({
	testDir: "e2e",
	forbidOnly: !!process.env.CI,
	// One server port for the Vite proxy, so one test at a time.
	workers: 1,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: { baseURL: web, trace: "retain-on-failure" },
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], colorScheme: "light" },
		},
	],
	// Only Vite. The fixture in e2e/fixtures.ts owns the server, so a test can restart it.
	webServer: {
		command: "pnpm --filter @warlock/web dev",
		url: web,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			WARLOCK_PORT: String(e2ePorts.server),
			WARLOCK_WEB_PORT: String(e2ePorts.web),
		},
	},
});
