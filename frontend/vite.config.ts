import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		allowedHosts: [".ngrok-free.dev"],
		proxy: {
			"/api": {
				target:
					process.env.VITE_PROXY_TARGET ?? "http://localhost:3000",
				changeOrigin: true,
				xfwd: true,
			},
			"/v1": {
				target:
					process.env.VITE_PROXY_TARGET ?? "http://localhost:3000",
				changeOrigin: true,
				xfwd: true,
			},
			"/ws": {
				target: (
					process.env.VITE_PROXY_TARGET ?? "http://localhost:3000"
				).replace(/^http/, "ws"),
				ws: true,
			},
		},
	},
});
