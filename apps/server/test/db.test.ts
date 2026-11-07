import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, expectTypeOf, onTestFinished, test } from "vitest";
import { type Database, eventsAfter, openDatabase } from "../src/db.ts";
import { Seq, type StoredEvent } from "../src/events.ts";
import { events } from "../src/schema.ts";

function tempDbPath(): string {
	const dir = mkdtempSync(join(tmpdir(), "warlock-test-"));
	onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
	return join(dir, "warlock.db");
}

function open(path: string) {
	const published: StoredEvent[][] = [];
	const db = openDatabase(path, (stored) => published.push([...stored]));
	onTestFinished(() => db.close());
	return { db, published };
}

const started = { type: "server.started" } as const;

test("committed events survive reopening the file, in seq order", () => {
	const path = tempDbPath();
	const first = open(path);
	const value = first.db.commit(() => ({
		value: "ok",
		events: [started, started],
	}));
	expect(value, "commit returns the write's value").toBe("ok");
	const written = eventsAfter(first.db.read, Seq.parse(0));
	expect(written.map((e) => e.seq)).toEqual([1, 2]);
	expect(first.published, "published once, after commit").toEqual([written]);
	first.db.close();

	const second = open(path);
	expect(eventsAfter(second.db.read, Seq.parse(0))).toEqual(written);
});

test("a commit that throws writes nothing and publishes nothing", () => {
	const { db, published } = open(tempDbPath());
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
	expect(published).toEqual([log]);
});

test("writes outside commit and async writes do not compile", () => {
	expectTypeOf<Database["read"]>().not.toHaveProperty("insert");
	expectTypeOf<Database["read"]>().not.toHaveProperty("delete");
	const asyncWrite = (db: Database) =>
		// @ts-expect-error a write callback must be synchronous
		db.commit(async () => ({ value: 1, events: [] }));
	expectTypeOf(asyncWrite).toBeFunction();
});
