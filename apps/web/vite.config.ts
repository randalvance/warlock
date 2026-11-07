import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const envDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, envDir, "WARLOCK_");
	return {
		envDir,
		plugins: [react(), tailwindcss()],
		resolve: { tsconfigPaths: true },
		server: {
			host: "127.0.0.1",
			port: Number(env.WARLOCK_WEB_PORT ?? 5173),
			strictPort: true,
			proxy: { "/api": `http://127.0.0.1:${env.WARLOCK_PORT}` },
		},
	};
});
