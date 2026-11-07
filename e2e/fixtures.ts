import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test as base, expect } from "@playwright/test";
import {
	type GitHubStub,
	startGitHubStub,
} from "../apps/server/test/github-stub.ts";
import { e2ePorts } from "./ports.ts";

interface Warlock {
	readonly github: GitHubStub;
	readonly pid: number;
	restart(): Promise<void>;
}

export const test = base.extend<{ warlock: Warlock }>({
	warlock: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures argument to be destructured
		async ({}, use) => {
			const github = await startGitHubStub({
				"acme/api": { defaultBranch: "main" },
				"acme/web": { defaultBranch: "trunk" },
			});
			try {
				const dataDir = mkdtempSync(join(tmpdir(), "warlock-e2e-"));
				try {
					const env = {
						...process.env,
						WARLOCK_PORT: String(e2ePorts.server),
						WARLOCK_DB_PATH: join(dataDir, "warlock.db"),
						GITHUB_API_URL: github.config.apiUrl.href,
						GITHUB_TOKEN: github.config.token,
					};
					let server = await startServer(env);
					await use({
						github,
						get pid() {
							return pidOf(server);
						},
						async restart() {
							await stopServer(server);
							server = await startServer(env);
						},
					});
					await stopServer(server);
				} finally {
					rmSync(dataDir, { recursive: true, force: true });
				}
			} finally {
				await github.close();
			}
		},
		{ auto: true },
	],
});

export { expect };

function pidOf(child: ChildProcess): number {
	if (child.pid === undefined) throw new Error("the server has no pid");
	return child.pid;
}

async function startServer(env: NodeJS.ProcessEnv): Promise<ChildProcess> {
	const child = spawn(process.execPath, ["apps/server/src/main.ts"], {
		env,
		stdio: ["ignore", "inherit", "inherit"],
	});
	const health = `http://127.0.0.1:${env.WARLOCK_PORT}/api/health`;
	for (let attempt = 0; attempt < 100; attempt++) {
		if (child.exitCode !== null) {
			throw new Error(`the server exited with ${child.exitCode}`);
		}
		const ok = await fetch(health).then(
			(response) => response.ok,
			() => false,
		);
		if (ok) return child;
		await delay(100);
	}
	if (child.exitCode === null && child.signalCode === null) {
		const exited = once(child, "exit");
		child.kill("SIGKILL");
		await exited;
	}
	throw new Error("the server did not answer /api/health within 10s");
}

async function stopServer(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null) return;
	const exited = once(child, "exit");
	child.kill("SIGTERM");
	const [code] = await exited;
	expect(code, "the server shut down cleanly on SIGTERM").toBe(0);
}
