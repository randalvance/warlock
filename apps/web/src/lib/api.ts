import type { ApiErrorBody, AppType } from "@warlock/server/api";
import { type ClientResponse, hc } from "hono/client";
import type { SuccessStatusCode } from "hono/utils/http-status";

export const client = hc<AppType>("/");

export class ApiRequestError extends Error {
	readonly status: number;
	readonly error: ApiErrorBody["error"];
	constructor(status: number, error: ApiErrorBody["error"]) {
		super(
			"issues" in error && error.issues.length > 0
				? error.issues.map((issue) => issue.message).join(". ")
				: error.message,
		);
		this.status = status;
		this.error = error;
	}
}

type SuccessBody<R> =
	R extends ClientResponse<infer T, infer S, infer _F>
		? S extends SuccessStatusCode
			? T
			: never
		: never;

export async function unwrap<R extends ClientResponse<unknown, number, string>>(
	request: Promise<R>,
): Promise<SuccessBody<R>> {
	const response = await request;
	if (response.ok) {
		return (
			response.status === 204 ? null : await response.json()
		) as SuccessBody<R>;
	}
	const body = (await response.json().catch(() => undefined)) as
		| Partial<ApiErrorBody>
		| undefined;
	throw new ApiRequestError(
		response.status,
		body?.error ?? {
			code: "internal",
			message: `the server answered ${response.status}`,
		},
	);
}
