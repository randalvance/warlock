import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Matches the server's `node --env-file`, which reads only the root .env and lets the shell win.
const env = {
	...parseEnv(readFileSync(new URL("../../.env", import.meta.url), "utf8")),
	...process.env,
};

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: { tsconfigPaths: true },
	server: {
		host: "127.0.0.1",
		port: Number(env.HONEYPOT_WEB_PORT ?? 5173),
		strictPort: true,
		proxy: { "/api": `http://127.0.0.1:${env.HONEYPOT_PORT}` },
	},
});
