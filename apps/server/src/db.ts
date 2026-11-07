import { fileURLToPath } from "node:url";
import BetterSqlite3 from "better-sqlite3";
import { asc, gt } from "drizzle-orm";
import {
	type BetterSQLite3Database,
	drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Seq, type ServerEvent, StoredEvent } from "./events.ts";
import { events } from "./schema.ts";

type Drizzle = BetterSQLite3Database;

export type Tx = Parameters<Parameters<Drizzle["transaction"]>[0]>[0];

/** The query builder without its write methods, so a write outside `commit` does not compile. */
export type Reader = Pick<Drizzle, "select" | "selectDistinct" | "$count">;

/** What a write returns: its result, and the events to append to the log with it. */
export interface Change<T> {
	readonly value: T;
	readonly events: readonly ServerEvent[];
}

export interface Database {
	readonly read: Reader;
	/**
	 * Runs `write` in one BEGIN IMMEDIATE transaction and appends its events to
	 * the log in the same transaction. After COMMIT it publishes the stored
	 * events and returns `value`. If anything throws, nothing is written or
	 * published. `write` must be synchronous, so an async callback does not compile.
	 */
	commit<T>(write: (tx: Tx) => Change<T>): T;
	close(): void;
}

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/** Opens or creates the SQLite file and applies pending migrations before returning. */
export function openDatabase(
	path: string,
	publish: (events: readonly StoredEvent[]) => void,
): Database {
	const sqlite = new BetterSqlite3(path);
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("foreign_keys = ON");
	sqlite.pragma("busy_timeout = 5000");
	const db = drizzle({ client: sqlite });
	migrate(db, { migrationsFolder });

	return {
		read: db,
		commit(write) {
			const { value, stored } = db.transaction(
				(tx) => {
					const { value, events: pending } = write(tx);
					const at = new Date().toISOString();
					const stored = pending.map(({ type, ...data }) =>
						toStoredEvent(
							tx.insert(events).values({ type, at, data }).returning().get(),
						),
					);
					return { value, stored };
				},
				{ behavior: "immediate" },
			);
			if (stored.length > 0) publish(stored);
			return value;
		},
		close() {
			if (sqlite.open) sqlite.close();
		},
	};
}

/** Every stored event with a seq above `after`, in order. */
export function eventsAfter(read: Reader, after: Seq): StoredEvent[] {
	return read
		.select()
		.from(events)
		.where(gt(events.seq, after))
		.orderBy(asc(events.seq))
		.all()
		.map(toStoredEvent);
}

function toStoredEvent(row: typeof events.$inferSelect): StoredEvent {
	return StoredEvent.parse({
		...row.data,
		type: row.type,
		seq: row.seq,
		at: row.at,
	});
}
