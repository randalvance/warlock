import { expect, expectTypeOf, onTestFinished, test } from "vitest";
import { createBroadcast } from "../src/broadcast.ts";
import { type Database, eventsAfter, openDatabase } from "../src/db.ts";
import { Seq, type StoredEvent } from "../src/events.ts";
import { events } from "../src/schema.ts";
import { tempDbPath } from "./support.ts";

function open(path: string) {
	const broadcast = createBroadcast();
	const db = openDatabase(path, broadcast);
	onTestFinished(() => db.close());
	const { events } = db.follow();
	const followed = async () => {
		broadcast.close();
		const received: StoredEvent[] = [];
		for await (const event of events) received.push(event);
		return received;
	};
	return { db, followed };
}

const started = { type: "server.started" } as const;

test("committed events survive reopening the file, in seq order", async () => {
	const path = tempDbPath();
	const first = open(path);
	const value = first.db.commit(() => ({
		value: "ok",
		events: [started, started],
	}));
	expect(value, "commit returns the write's value").toBe("ok");
	const written = eventsAfter(first.db.read, Seq.parse(0));
	expect(written.map((e) => e.seq)).toEqual([1, 2]);
	expect(await first.followed(), "a follower receives each event once").toEqual(
		written,
	);
	first.db.close();

	const second = open(path);
	expect(eventsAfter(second.db.read, Seq.parse(0))).toEqual(written);
});

test("a commit that throws writes nothing and publishes nothing", async () => {
	const { db, followed } = open(tempDbPath());
	expect(() =>
		db.commit((tx) => {
			tx.insert(events)
				.values({
					type: "server.started",
					at: new Date().toISOString(),
					data: {},
				})
				.run();
			throw new Error("write failed");
		}),
	).toThrow("write failed");
	db.commit(() => ({ value: undefined, events: [started] }));

	const log = eventsAfter(db.read, Seq.parse(0));
	expect(
		log.map((e) => e.seq),
		"the rolled-back row left no seq behind",
	).toEqual([1]);
	expect(await followed()).toEqual(log);
});

test("a commit inside another commit publishes nothing when the outer one rolls back", async () => {
	const { db, followed } = open(tempDbPath());
	expect(() =>
		db.commit(() => {
			db.commit(() => ({ value: undefined, events: [started] }));
			throw new Error("outer write failed");
		}),
	).toThrow();

	expect(
		eventsAfter(db.read, Seq.parse(0)),
		"the outer rollback left no event behind",
	).toEqual([]);
	expect(
		await followed(),
		"a follower never sees an event the log does not hold",
	).toEqual([]);
});

test("writes outside commit and async writes do not compile", () => {
	expectTypeOf<Database["read"]>().not.toHaveProperty("insert");
	expectTypeOf<Database["read"]>().not.toHaveProperty("delete");
	const asyncWrite = (db: Database) =>
		// @ts-expect-error a write callback must be synchronous
		db.commit(async () => ({ value: 1, events: [] }));
	expectTypeOf(asyncWrite).toBeFunction();
});
