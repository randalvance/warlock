import { randomUUID } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Database, Reader } from "../../db.ts";
import type { ServerEvent } from "../../events.ts";
import { ApiError, notFound } from "../../http.ts";
import {
	AgentProfile,
	emptyProfile,
	type MemoryNote,
	MemoryNoteId,
	type Minion,
	MinionId,
	type MinionInput,
	type MinionSummary,
	type NoteInput,
	type Warlock,
} from "./model.ts";
import { memoryNotes, minions, warlock as warlockTable } from "./schema.ts";
import type { SkillsLibrary } from "./skills.ts";

/** Every minion method that misses its minion throws `not_found`. A write that changes nothing logs no event. */
export interface Agents {
	warlock(): Warlock;
	/** A skill missing from the library is `invalid_request` at `profile.skills.<i>`. */
	saveWarlock(profile: AgentProfile): Promise<Warlock>;
	/** Ordered by name. */
	listMinions(): MinionSummary[];
	getMinion(id: MinionId): Minion;
	/** The same skill check as `saveWarlock`. A taken name, ignoring case, is a `conflict`. */
	createMinion(input: MinionInput): Promise<Minion>;
	/** Replaces the name and the profile, with the same checks as `createMinion`. */
	saveMinion(id: MinionId, input: MinionInput): Promise<Minion>;
	/** Idempotent. Deletes the minion's memory in the same commit. */
	deleteMinion(id: MinionId): void;
	/** A note name the minion already has, ignoring case, is a `conflict`. */
	addNote(id: MinionId, input: NoteInput): MemoryNote;
	editNote(id: MinionId, noteId: MemoryNoteId, input: NoteInput): MemoryNote;
	/** Idempotent for a missing note. */
	deleteNote(id: MinionId, noteId: MemoryNoteId): void;
}

export function createAgents(deps: {
	readonly db: Database;
	readonly library: SkillsLibrary;
}): Agents {
	const { db, library } = deps;
	const changed = (minionId: MinionId): ServerEvent[] => [
		{ type: "minion.changed", minionId },
	];

	const requireSkills = async (profile: AgentProfile) => {
		const present = await Promise.all(profile.skills.map(library.has));
		const issues = profile.skills.flatMap((ref, index) =>
			present[index]
				? []
				: [
						{
							path: `profile.skills.${index}`,
							message: `skills/${ref} has no SKILL.md`,
						},
					],
		);
		if (issues.length > 0) {
			throw new ApiError({
				code: "invalid_request",
				message: "the skills library is missing a listed skill",
				issues,
			});
		}
	};

	const requireMinion = (read: Reader, id: MinionId) => {
		const row = read.select().from(minions).where(eq(minions.id, id)).get();
		if (!row) throw new ApiError(notFound("minion").error);
		return row;
	};

	// SQLite's lower() folds only ASCII, so the comparison runs here.
	const requireFreeName = (read: Reader, name: string, self?: MinionId) => {
		const folded = foldName(name);
		const taken = read
			.select({ name: minions.name })
			.from(minions)
			.where(self === undefined ? undefined : ne(minions.id, self))
			.all()
			.find((row) => foldName(row.name) === folded);
		if (taken) {
			throw new ApiError({
				code: "conflict",
				message: `a minion named ${taken.name} already exists`,
			});
		}
	};

	const requireFreeNoteName = (
		read: Reader,
		id: MinionId,
		name: string,
		self?: MemoryNoteId,
	) => {
		const taken = read
			.select({ name: memoryNotes.name })
			.from(memoryNotes)
			.where(
				and(
					eq(memoryNotes.minionId, id),
					eq(sql`lower(${memoryNotes.name})`, sql`lower(${name})`),
					self === undefined ? undefined : ne(memoryNotes.id, self),
				),
			)
			.get();
		if (taken) {
			throw new ApiError({
				code: "conflict",
				message: `the minion already has a note named ${taken.name}`,
			});
		}
	};

	const getMinion = (id: MinionId): Minion => {
		const row = requireMinion(db.read, id);
		return {
			id,
			name: row.name,
			profile: AgentProfile.parse(row.profile),
			memory: db.read
				.select({
					id: memoryNotes.id,
					name: memoryNotes.name,
					body: memoryNotes.body,
					updatedAt: memoryNotes.updatedAt,
				})
				.from(memoryNotes)
				.where(eq(memoryNotes.minionId, id))
				.orderBy(asc(sql`lower(${memoryNotes.name})`))
				.all(),
		};
	};

	return {
		warlock() {
			const row = db.read.select().from(warlockTable).get();
			return { profile: row ? AgentProfile.parse(row.profile) : emptyProfile };
		},

		async saveWarlock(profile) {
			await requireSkills(profile);
			return db.commit((tx) => {
				const row = tx.select().from(warlockTable).get();
				const value = { profile };
				if (sameJson(row?.profile ?? emptyProfile, profile)) {
					return { value, events: [] };
				}
				tx.insert(warlockTable)
					.values({ id: 1, profile })
					.onConflictDoUpdate({ target: warlockTable.id, set: { profile } })
					.run();
				return { value, events: [{ type: "warlock.changed" }] };
			});
		},

		listMinions() {
			return db.read
				.select({ id: minions.id, name: minions.name })
				.from(minions)
				.orderBy(asc(sql`lower(${minions.name})`))
				.all();
		},

		getMinion,

		async createMinion(input) {
			await requireSkills(input.profile);
			const id = MinionId.parse(randomUUID());
			db.commit((tx) => {
				requireFreeName(tx, input.name);
				tx.insert(minions)
					.values({ id, ...input })
					.run();
				return { value: undefined, events: changed(id) };
			});
			return getMinion(id);
		},

		async saveMinion(id, input) {
			requireMinion(db.read, id);
			await requireSkills(input.profile);
			db.commit((tx) => {
				const row = requireMinion(tx, id);
				if (row.name === input.name && sameJson(row.profile, input.profile)) {
					return { value: undefined, events: [] };
				}
				requireFreeName(tx, input.name, id);
				tx.update(minions).set(input).where(eq(minions.id, id)).run();
				return { value: undefined, events: changed(id) };
			});
			return getMinion(id);
		},

		deleteMinion(id) {
			db.commit((tx) => {
				tx.delete(memoryNotes).where(eq(memoryNotes.minionId, id)).run();
				const { changes } = tx.delete(minions).where(eq(minions.id, id)).run();
				return { value: undefined, events: changes > 0 ? changed(id) : [] };
			});
		},

		addNote(id, input) {
			return db.commit((tx) => {
				requireMinion(tx, id);
				requireFreeNoteName(tx, id, input.name);
				const note = {
					id: MemoryNoteId.parse(randomUUID()),
					...input,
					updatedAt: new Date().toISOString(),
				};
				tx.insert(memoryNotes)
					.values({ ...note, minionId: id })
					.run();
				return { value: note, events: changed(id) };
			});
		},

		editNote(id, noteId, input) {
			return db.commit((tx) => {
				requireMinion(tx, id);
				const where = and(
					eq(memoryNotes.id, noteId),
					eq(memoryNotes.minionId, id),
				);
				const row = tx.select().from(memoryNotes).where(where).get();
				if (!row) throw new ApiError(notFound("memory note").error);
				if (row.name === input.name && row.body === input.body) {
					const { minionId: _, ...note } = row;
					return { value: note, events: [] };
				}
				requireFreeNoteName(tx, id, input.name, noteId);
				const note = {
					id: noteId,
					...input,
					updatedAt: new Date().toISOString(),
				};
				tx.update(memoryNotes).set(note).where(where).run();
				return { value: note, events: changed(id) };
			});
		},

		deleteNote(id, noteId) {
			db.commit((tx) => {
				requireMinion(tx, id);
				const { changes } = tx
					.delete(memoryNotes)
					.where(and(eq(memoryNotes.id, noteId), eq(memoryNotes.minionId, id)))
					.run();
				return { value: undefined, events: changes > 0 ? changed(id) : [] };
			});
		},
	};
}

function foldName(name: string): string {
	return name.normalize("NFC").toLowerCase();
}

function sameJson(stored: unknown, next: unknown): boolean {
	return JSON.stringify(stored) === JSON.stringify(next);
}
