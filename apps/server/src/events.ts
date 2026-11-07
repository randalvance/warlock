import { z } from "zod";
import { ProjectId } from "./modules/projects/model.ts";

/** A position in the event log. It only grows and is never reused, so a client can hold it across restarts. */
export const Seq = z.number().int().nonnegative().brand<"Seq">();
export type Seq = z.infer<typeof Seq>;

export const ServerEvent = z.discriminatedUnion("type", [
	z.object({ type: z.literal("server.started") }),
	z.object({ type: z.literal("project.changed"), projectId: ProjectId }),
]);
export type ServerEvent = z.infer<typeof ServerEvent>;
export type ServerEventType = ServerEvent["type"];
export type EventOf<T extends ServerEventType> = Extract<
	ServerEvent,
	{ type: T }
>;

export const StoredEvent = z.intersection(
	ServerEvent,
	z.object({ seq: Seq, at: z.iso.datetime() }),
);
export type StoredEvent = ServerEvent & {
	readonly seq: Seq;
	readonly at: string;
};
