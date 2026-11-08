import { expect, test } from "vitest";
import { type ServerEventType, StoredEvent } from "../src/events.ts";

const storedRows: { [Type in ServerEventType]: [unknown, ...unknown[]] } = {
	"server.started": [
		{ type: "server.started", seq: 1, at: "2026-11-07T05:17:03.075Z" },
	],
	"project.changed": [
		{
			type: "project.changed",
			projectId: "0b6f2a52-6a1e-4c55-9a2f-3d1c8e7b4a90",
			seq: 2,
			at: "2026-11-07T06:02:41.512Z",
		},
	],
	"warlock.changed": [
		{ type: "warlock.changed", seq: 3, at: "2026-11-08T02:14:09.330Z" },
	],
	"minion.changed": [
		{
			type: "minion.changed",
			minionId: "5d2c9e71-0f4a-4b8e-9c63-7a1e2b4f8d05",
			seq: 4,
			at: "2026-11-08T02:15:27.904Z",
		},
	],
};

test("every event row ever stored still parses with today's schema", () => {
	for (const rows of Object.values(storedRows)) {
		for (const row of rows) {
			expect(
				StoredEvent.safeParse(row).success,
				`a stored ${JSON.stringify(row)} row must keep parsing`,
			).toBe(true);
		}
	}
});
