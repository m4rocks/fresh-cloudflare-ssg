import * as path from "@std/path";
import { createBuilder, type InlineConfig } from "vite";

// Default Fresh build configuration
export const FRESH_BUILD_CONFIG: InlineConfig = {
	logLevel: "error",
	root: "./",
	build: { emptyOutDir: true },
	environments: {
		ssr: { build: { outDir: path.join("_fresh", "server") } },
		client: { build: { outDir: path.join("_fresh", "client") } },
	},
};

// Helper function to create and build the Fresh app
export async function buildFreshApp(config: InlineConfig = FRESH_BUILD_CONFIG) {
	const builder = await createBuilder(config);
	await builder.buildApp();
	return await import(path.toFileUrl(path.join(Deno.cwd(), "_fresh/server.js")).href);
}

// Helper function to start a test server
export function startTestServer(app: {
	default: {
		fetch: (req: Request) => Promise<Response>;
	};
}) {
	const server = Deno.serve({
		port: 0,
		handler: app.default.fetch,
	});

	const { port } = server.addr as Deno.NetAddr;
	const address = `http://localhost:${port}`;

	return { server, address };
}
