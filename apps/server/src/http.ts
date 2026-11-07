import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
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
				/** Each repo GitHub would not show the token, as "owner/name". */
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

/** Thrown by modules. The app's error handler answers with `body` and `status`. */
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
