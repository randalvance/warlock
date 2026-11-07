import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
	seq: integer("seq").primaryKey({ autoIncrement: true }),
	type: text("type").notNull(),
	at: text("at").notNull(),
	data: text("data", { mode: "json" }).notNull().$type<object>(),
});
