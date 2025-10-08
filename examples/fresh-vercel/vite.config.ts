import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import vercel from "vite-plugin-vercel";
import { freshSSG } from "@m4rocks/fresh-ssg";

export default defineConfig({
	plugins: [fresh(), vercel(), freshSSG()],
	vercel: {
		distContainsOnlyStatic: false,
		rewrites: [
			{ source: "/:path", destination: "/:path.html" },
			{ source: "/(.*)", destination: "/api/handler" }
		],
		additionalEndpoints: [
			{
				source: "./handler.js",
				destination: "/api/handler"
			}
		],
	}
});
