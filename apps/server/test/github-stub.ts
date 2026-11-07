import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { GitHubConfig } from "../src/modules/projects/github.ts";

export type StubRepo =
	| { readonly defaultBranch: string }
	| {
			readonly answer:
				| "sso_forbidden"
				| "rate_limited"
				| "secondary_rate_limited"
				| "server_error";
	  };

export interface GitHubStub {
	readonly config: GitHubConfig & { readonly token: string };
	readonly requests: readonly string[];
	close(): Promise<void>;
}

export async function startGitHubStub(
	repos: Record<string, StubRepo>,
): Promise<GitHubStub> {
	const token = randomUUID();
	const byLowerName = new Map(
		Object.entries(repos).map(([fullName, repo]) => [
			fullName.toLowerCase(),
			{ fullName, repo },
		]),
	);
	const requests: string[] = [];
	const server = createServer((req, res) => {
		const path = new URL(req.url ?? "/", "http://stub").pathname;
		requests.push(path);
		const json = (status: number, body: object, headers = {}) => {
			res.writeHead(status, { "content-type": "application/json", ...headers });
			res.end(JSON.stringify(body));
		};
		if (req.headers.authorization !== `Bearer ${token}`) {
			return json(401, { message: "Bad credentials" });
		}
		const match = /^\/repos\/([^/]+)\/([^/]+)$/.exec(path);
		const entry =
			match && byLowerName.get(`${match[1]}/${match[2]}`.toLowerCase());
		if (!entry) return json(404, { message: "Not Found" });
		const { fullName, repo } = entry;
		if ("defaultBranch" in repo) {
			const [owner = "", name = ""] = fullName.split("/");
			return json(200, {
				name,
				full_name: fullName,
				owner: { login: owner },
				default_branch: repo.defaultBranch,
			});
		}
		switch (repo.answer) {
			case "sso_forbidden":
				return json(
					403,
					{ message: "Resource protected by SSO" },
					{
						"x-ratelimit-remaining": "4999",
					},
				);
			case "rate_limited":
				return json(
					403,
					{ message: "API rate limit exceeded" },
					{
						"x-ratelimit-remaining": "0",
						"x-ratelimit-reset": "1893456000",
					},
				);
			case "secondary_rate_limited":
				return json(
					403,
					{
						message:
							"You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
					},
					{ "x-ratelimit-remaining": "4990" },
				);
			case "server_error":
				return json(502, { message: "Server Error" });
		}
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const { port } = server.address() as AddressInfo;
	return {
		config: { apiUrl: new URL(`http://127.0.0.1:${port}/`), token },
		requests,
		async close() {
			server.closeAllConnections();
			server.close();
			await once(server, "close");
		},
	};
}
