import { expect, onTestFinished, test } from "vitest";
import { ApiError, type ApiErrorBody } from "../src/http.ts";
import { createGitHub } from "../src/modules/projects/github.ts";
import { RepoName } from "../src/modules/projects/model.ts";
import { type StubRepo, startGitHubStub } from "./github-stub.ts";

async function withStub(repos: Record<string, StubRepo>, token?: string) {
	const stub = await startGitHubStub(repos);
	onTestFinished(() => stub.close());
	const config = { ...stub.config, ...(token === undefined ? {} : { token }) };
	return { stub, github: createGitHub(config) };
}

function names(...values: [string, ...string[]]) {
	const [first, ...rest] = values.map((value) => RepoName.parse(value));
	if (!first) throw new Error("no names");
	return [first, ...rest] as const;
}

async function errorOf(
	promise: Promise<unknown>,
): Promise<ApiErrorBody["error"]> {
	const error = await promise.then(
		() => undefined,
		(error: unknown) => error,
	);
	if (!(error instanceof ApiError))
		throw new Error(`expected an ApiError, got ${error}`);
	return error.body.error;
}

test("a readable repo comes back with GitHub's casing and default branch, once", async () => {
	const { github } = await withStub({ "Acme/API": { defaultBranch: "trunk" } });
	expect(await github.resolve(names("acme/api", "ACME/Api"))).toEqual([
		{ owner: "Acme", name: "API", defaultBranch: "trunk" },
	]);
});

test.each([
	["the token is rejected", { "acme/api": { defaultBranch: "main" } }, "wrong"],
	["the rate limit is spent", { "acme/api": { answer: "rate_limited" } }],
	[
		"a secondary rate limit is hit",
		{ "acme/api": { answer: "secondary_rate_limited" } },
	],
	["GitHub fails", { "acme/api": { answer: "server_error" } }],
] as const)(
	"when %s the error says GitHub is unavailable, not that the repo is",
	async (_, repos: Record<string, StubRepo>, token?: string) => {
		const { github } = await withStub(repos, token);
		const error = await errorOf(github.resolve(names("acme/api")));
		expect(error.code, error.message).toBe("github_unavailable");
	},
);

test("with no token or no reachable GitHub, nothing reaches the network and the error says why", async () => {
	const { stub, github } = await withStub({
		"acme/api": { defaultBranch: "main" },
	});
	const tokenless = createGitHub({ ...stub.config, token: undefined });
	expect(await errorOf(tokenless.resolve(names("acme/api")))).toMatchObject({
		code: "github_unavailable",
		message: expect.stringContaining("GITHUB_TOKEN"),
	});
	expect(stub.requests, "no request without a token").toEqual([]);

	const refused = createGitHub({
		apiUrl: new URL("http://127.0.0.1:9/"),
		token: "unused",
	});
	expect((await errorOf(refused.resolve(names("acme/api")))).code).toBe(
		"github_unavailable",
	);
	expect(
		await github.resolve(names("acme/api")),
		"the stub itself answers",
	).toHaveLength(1);
});
