import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { ApiError } from "../../http.ts";
import { type RepoName, type RepoRef, repoName } from "./model.ts";

export interface GitHubConfig {
	/** https://api.github.com, a GitHub Enterprise API root, or a test stub. */
	readonly apiUrl: URL;
	/** Undefined when neither GITHUB_TOKEN nor `gh auth token` gave one. */
	readonly token: string | undefined;
}

export interface GitHub {
	/**
	 * Looks up every repo in parallel and returns each with GitHub's casing and
	 * default branch, deduped. Throws `repo_unavailable` naming each repo GitHub
	 * will not show the token, or `github_unavailable` when GitHub's answer is
	 * unknown, which wins because it leaves the other repos unknown too.
	 */
	resolve(
		names: readonly [RepoName, ...RepoName[]],
	): Promise<[RepoRef, ...RepoRef[]]>;
}

const RepoResponse = z.object({
	name: z.string(),
	owner: z.object({ login: z.string() }),
	default_branch: z.string(),
});

type Lookup =
	| { readonly kind: "found"; readonly repo: RepoRef }
	| { readonly kind: "unreadable"; readonly name: RepoName }
	| { readonly kind: "unknown"; readonly message: string };

const timeoutMs = 10_000;

export function createGitHub(config: GitHubConfig): GitHub {
	const root = config.apiUrl.href.endsWith("/")
		? config.apiUrl
		: new URL(`${config.apiUrl.href}/`);

	const lookup = async (name: RepoName, token: string): Promise<Lookup> => {
		let response: Response;
		try {
			response = await fetch(new URL(`repos/${name}`, root), {
				headers: {
					accept: "application/vnd.github+json",
					authorization: `Bearer ${token}`,
					"user-agent": "warlock",
					"x-github-api-version": "2022-11-28",
				},
				signal: AbortSignal.timeout(timeoutMs),
			});
		} catch (error) {
			return {
				kind: "unknown",
				message: `GitHub could not be reached (${error instanceof Error ? error.message : String(error)})`,
			};
		}
		if (response.ok) {
			const body = RepoResponse.parse(await response.json());
			return {
				kind: "found",
				repo: {
					owner: body.owner.login,
					name: body.name,
					defaultBranch: body.default_branch,
				},
			};
		}
		const message = await response.text();
		// A secondary rate limit is a 403 that may carry neither rate limit
		// header, so GitHub's message is the only sign of it.
		const rateLimited =
			response.status === 429 ||
			(response.status === 403 &&
				(response.headers.get("x-ratelimit-remaining") === "0" ||
					/rate limit/i.test(message)));
		if (rateLimited) {
			const reset = Number(response.headers.get("x-ratelimit-reset"));
			const at =
				Number.isFinite(reset) && reset > 0
					? `, retry after ${new Date(reset * 1000).toISOString()}`
					: "";
			return { kind: "unknown", message: `GitHub rate limit reached${at}` };
		}
		// 404 is GitHub's answer for a missing repo and for a private one the
		// token cannot see. 403 here is an org's SSO or a fine-grained token's scope.
		if (response.status === 404 || response.status === 403) {
			return { kind: "unreadable", name };
		}
		if (response.status === 401) {
			return { kind: "unknown", message: "GitHub rejected the token" };
		}
		return {
			kind: "unknown",
			message: `GitHub answered ${response.status} for ${name}`,
		};
	};

	return {
		async resolve(names) {
			const token = config.token;
			if (token === undefined) {
				throw unavailable(
					"no GitHub token: set GITHUB_TOKEN or run gh auth login",
				);
			}
			const lookups = await Promise.all(names.map((n) => lookup(n, token)));
			const unknown = lookups.find((l) => l.kind === "unknown");
			if (unknown) throw unavailable(unknown.message);
			const unreadable = lookups.flatMap((l) =>
				l.kind === "unreadable" ? [l.name] : [],
			);
			if (unreadable.length > 0) {
				const noun = unreadable.length === 1 ? "repo" : "repos";
				throw new ApiError({
					code: "repo_unavailable",
					message: `GitHub has no ${noun} ${unreadable.join(", ")} that this token can read`,
					repos: unreadable,
				});
			}
			const found = new Map<RepoName, RepoRef>();
			for (const l of lookups) {
				if (l.kind === "found") found.set(repoName(l.repo), l.repo);
			}
			const [first, ...rest] = found.values();
			if (!first)
				throw new Error("resolve found no repos for a non-empty list");
			return [first, ...rest];
		},
	};
}

function unavailable(message: string): ApiError {
	return new ApiError({ code: "github_unavailable", message });
}

/** GITHUB_TOKEN when set, else `gh auth token`, else undefined. */
export async function loadGitHubToken(
	env: NodeJS.ProcessEnv,
): Promise<string | undefined> {
	if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
	try {
		const { stdout } = await promisify(execFile)("gh", ["auth", "token"]);
		return stdout.trim() || undefined;
	} catch {
		return undefined;
	}
}
