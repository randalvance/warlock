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
		| { readonly code: "not_found" | "internal"; readonly message: string };
};

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
		return c.json(body, 400);
	});
}

export function notFound(what: string): ApiErrorBody {
	return { error: { code: "not_found", message: `${what} not found` } };
}

export const internalError: ApiErrorBody = {
	error: { code: "internal", message: "internal error" },
};
