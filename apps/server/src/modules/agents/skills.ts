import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { SkillRef } from "./model.ts";

/** The folder of Agent Skills folders. A skill is a folder directly under it that holds a `SKILL.md`. */
export interface SkillsLibrary {
	/** Ordered by ref. Symlinked folders count, and folders whose names are not refs do not. */
	list(): Promise<SkillRef[]>;
	has(ref: SkillRef): Promise<boolean>;
}

export function createSkillsLibrary(root: string): SkillsLibrary {
	const has = async (ref: SkillRef) => {
		try {
			return (await stat(join(root, ref, "SKILL.md"))).isFile();
		} catch (error) {
			if (isMissing(error)) return false;
			throw error;
		}
	};
	return {
		has,
		async list() {
			const refs = (await readdir(root)).flatMap((name) => {
				const ref = SkillRef.safeParse(name);
				return ref.success ? [ref.data] : [];
			});
			const present = await Promise.all(refs.map(has));
			return refs.filter((_, index) => present[index]).sort();
		},
	};
}

function isMissing(error: unknown): boolean {
	const code = (error as NodeJS.ErrnoException).code;
	return code === "ENOENT" || code === "ENOTDIR";
}
