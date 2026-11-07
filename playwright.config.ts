import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const smokePorts = { server: 4417, web: 5273 };
const web = `http://127.0.0.1:${smokePorts.web}`;
const healthThroughProxy = `${web}/api/health`;

export default defineConfig({
	testDir: "e2e",
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: { baseURL: web, trace: "retain-on-failure" },
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], colorScheme: "light" },
		},
	],
	webServer: {
		command: "pnpm dev",
		url: healthThroughProxy,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			WARLOCK_PORT: String(smokePorts.server),
			WARLOCK_WEB_PORT: String(smokePorts.web),
			WARLOCK_DB_PATH: join(
				mkdtempSync(join(tmpdir(), "warlock-smoke-")),
				"warlock.db",
			),
		},
	},
});
