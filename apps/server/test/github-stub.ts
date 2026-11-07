import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { GitHubConfig } from "../src/modules/projects/github.ts";

/**
 * How the stub answers one repo. `blocked` is a 403 with rate limit left, as
 * an org's SSO answers. `rate_limited` is a 403 with none left.
 * `secondary_rate_limited` is a 403 with rate limit left, as GitHub answers a
 * burst of requests.
 */
export type StubRepo =
	| { readonly defaultBranch: string }
	| {
			readonly answer:
				| "blocked"
				| "rate_limited"
				| "secondary_rate_limited"
				| "server_error";
	  };

export interface GitHubStub {
	/** Pass into Config.github, or as GITHUB_API_URL and GITHUB_TOKEN. */
	readonly config: GitHubConfig & { readonly token: string };
	/** Each request path, such as "/repos/acme/api", in arrival order. */
	readonly requests: readonly string[];
	close(): Promise<void>;
}

/**
 * Serves `GET /repos/{owner}/{name}` on loopback. An unknown repo is a 404 and
 * a wrong token a 401. Owner and name match case-insensitively and answer with
 * the map's casing, as GitHub does.
 */
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
			case "blocked":
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
