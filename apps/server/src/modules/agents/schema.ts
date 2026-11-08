import { sql } from "drizzle-orm";
import {
	check,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AgentProfile, MemoryNoteId, MinionId } from "./model.ts";

/** One row at most. Before the first save there is none, and the warlock reads as `emptyProfile`. */
export const warlock = sqliteTable(
	"warlock",
	{
		id: integer("id").primaryKey(),
		profile: text("profile", { mode: "json" }).$type<AgentProfile>().notNull(),
	},
	() => [check("one_warlock", sql`id = 1`)],
);

export const minions = sqliteTable(
	"minions",
	{
		id: text("id").$type<MinionId>().primaryKey(),
		name: text("name").notNull(),
		profile: text("profile", { mode: "json" }).$type<AgentProfile>().notNull(),
	},
	(t) => [uniqueIndex("minions_name").on(sql`lower(${t.name})`)],
);

export const memoryNotes = sqliteTable(
	"memory_notes",
	{
		id: text("id").$type<MemoryNoteId>().primaryKey(),
		minionId: text("minion_id")
			.$type<MinionId>()
			.notNull()
			.references(() => minions.id),
		name: text("name").notNull(),
		body: text("body").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(t) => [
		uniqueIndex("memory_notes_name").on(t.minionId, sql`lower(${t.name})`),
	],
);
