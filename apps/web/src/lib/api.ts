import type { AppType } from "@warlock/server/api";
import { hc } from "hono/client";

export const client = hc<AppType>("/");
