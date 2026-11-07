import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Ports away from the dev defaults (4317, 5173), so the smoke test runs while a dev stack is up.
const ports = { server: 4417, web: 5273 };
const web = `http://127.0.0.1:${ports.web}`;

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
		// Through the proxy, so both apps and the proxy between them must answer.
		url: `${web}/api/health`,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			WARLOCK_PORT: String(ports.server),
			WARLOCK_WEB_PORT: String(ports.web),
			WARLOCK_DB_PATH: join(
				mkdtempSync(join(tmpdir(), "warlock-smoke-")),
				"warlock.db",
			),
		},
	},
});
