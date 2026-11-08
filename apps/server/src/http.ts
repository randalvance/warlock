import { zValidator } from "@hono/zod-validator";
import type { Context, ValidationTargets } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createMiddleware } from "hono/factory";
import type { z } from "zod";

export interface ApiIssue {
	/** Dotted path to the bad field, such as "repos.0.owner". */
	readonly path: string;
	readonly message: string;
}

export type ApiErrorBody = {
	readonly error:
		| {
				readonly code: "invalid_request";
				readonly message: string;
				readonly issues: readonly ApiIssue[];
		  }
		| {
				readonly code: "repo_unavailable";
				readonly message: string;
				readonly repos: readonly string[];
		  }
		| {
				readonly code:
					| "not_found"
					| "conflict"
					| "too_large"
					| "github_unavailable"
					| "internal";
				readonly message: string;
		  };
};
export type ApiErrorCode = ApiErrorBody["error"]["code"];

export const errorStatus = {
	invalid_request: 400,
	not_found: 404,
	conflict: 409,
	too_large: 413,
	repo_unavailable: 422,
	internal: 500,
	github_unavailable: 502,
} as const satisfies Record<ApiErrorCode, number>;
export type ErrorStatus = (typeof errorStatus)[ApiErrorCode];

export class ApiError extends Error {
	readonly body: ApiErrorBody;
	readonly status: ErrorStatus;
	constructor(error: ApiErrorBody["error"]) {
		super(error.message);
		this.body = { error };
		this.status = errorStatus[error.code];
	}
}

export function validate<
	Target extends keyof ValidationTargets,
	Schema extends z.ZodType,
>(target: Target, schema: Schema) {
	return zValidator(target, schema, (result, c) => {
		if (result.success) return;
		const body: ApiErrorBody = {
			error: {
				code: "invalid_request",
				message: `invalid ${target}`,
				issues: result.error.issues.map((issue) => ({
					path: issue.path.map(String).join("."),
					message: issue.message,
				})),
			},
		};
		return c.json(body, errorStatus.invalid_request);
	});
}

export function notFound(what: string): ApiErrorBody {
	return { error: { code: "not_found", message: `${what} not found` } };
}

export const internalError: ApiErrorBody = {
	error: { code: "internal", message: "internal error" },
};

export function limitBody(maxSize: number, message: string) {
	const tooLarge = (c: Context) =>
		c.json(
			{ error: { code: "too_large", message } } satisfies ApiErrorBody,
			errorStatus.too_large,
		);
	const streamed = bodyLimit({ maxSize, onError: tooLarge });
	return createMiddleware(async (c, next) => {
		const declared = c.req.header("content-length");
		// Hono's bodyLimit opens the body as a web stream first. Its backpressure
		// stalls node-server's drain of the unread body, which then resets the
		// connection the client reuses for its next request.
		if (
			declared !== undefined &&
			c.req.header("transfer-encoding") === undefined
		) {
			return Number(declared) > maxSize ? tooLarge(c) : next();
		}
		return streamed(c, next);
	});
}

// A 100,000-character string field escaped as \uXXXX is about 600 KB of JSON.
export const maxJsonBodyBytes = 1024 * 1024;

export const jsonBodyLimit = limitBody(
	maxJsonBodyBytes,
	`a request body can be at most ${maxJsonBodyBytes} bytes`,
);
