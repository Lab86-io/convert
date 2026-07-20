import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js",
					dest: "ffmpeg",
					rename: { stripBase: true, name: "ffmpeg-core.js" },
				},
				{
					src: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm",
					dest: "ffmpeg",
					rename: { stripBase: true, name: "ffmpeg-core.wasm" },
				},
			],
		}),
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
