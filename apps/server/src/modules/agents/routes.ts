import { Hono } from "hono";
import { z } from "zod";
import { jsonBodyLimit, validate } from "../../http.ts";
import {
	MemoryNoteId,
	MinionId,
	MinionInput,
	NoteInput,
	WarlockInput,
} from "./model.ts";
import type { SkillsLibrary } from "./skills.ts";
import type { Agents } from "./store.ts";

const MinionParam = z.object({ minionId: MinionId });
const NoteParam = z.object({ minionId: MinionId, noteId: MemoryNoteId });

export function warlockRoute(agents: Agents) {
	return new Hono()
		.get("/", (c) => c.json({ warlock: agents.warlock() }, 200))
		.put("/", jsonBodyLimit, validate("json", WarlockInput), async (c) => {
			const { profile } = c.req.valid("json");
			return c.json({ warlock: await agents.saveWarlock(profile) }, 200);
		});
}

export function minionsRoute(agents: Agents) {
	return new Hono()
		.get("/", (c) => c.json({ minions: agents.listMinions() }, 200))
		.post("/", jsonBodyLimit, validate("json", MinionInput), async (c) =>
			c.json({ minion: await agents.createMinion(c.req.valid("json")) }, 201),
		)
		.get("/:minionId", validate("param", MinionParam), (c) =>
			c.json({ minion: agents.getMinion(c.req.valid("param").minionId) }, 200),
		)
		.put(
			"/:minionId",
			validate("param", MinionParam),
			jsonBodyLimit,
			validate("json", MinionInput),
			async (c) => {
				const { minionId } = c.req.valid("param");
				const minion = await agents.saveMinion(minionId, c.req.valid("json"));
				return c.json({ minion }, 200);
			},
		)
		.delete("/:minionId", validate("param", MinionParam), (c) => {
			agents.deleteMinion(c.req.valid("param").minionId);
			return c.body(null, 204);
		})
		.post(
			"/:minionId/memory",
			validate("param", MinionParam),
			jsonBodyLimit,
			validate("json", NoteInput),
			(c) => {
				const { minionId } = c.req.valid("param");
				return c.json(
					{ note: agents.addNote(minionId, c.req.valid("json")) },
					201,
				);
			},
		)
		.put(
			"/:minionId/memory/:noteId",
			validate("param", NoteParam),
			jsonBodyLimit,
			validate("json", NoteInput),
			(c) => {
				const { minionId, noteId } = c.req.valid("param");
				const note = agents.editNote(minionId, noteId, c.req.valid("json"));
				return c.json({ note }, 200);
			},
		)
		.delete("/:minionId/memory/:noteId", validate("param", NoteParam), (c) => {
			const { minionId, noteId } = c.req.valid("param");
			agents.deleteNote(minionId, noteId);
			return c.body(null, 204);
		});
}

export function skillsRoute(library: SkillsLibrary) {
	return new Hono().get("/", async (c) =>
		c.json({ skills: await library.list() }, 200),
	);
}
