import { exists, walk } from "@std/fs";
import { buildFreshApp, startTestServer } from "./mock_server.ts";
import * as path from "@std/path";

const app = await buildFreshApp();
const { server, address } = startTestServer(app);

const paths: string[] = [];

const baseRoutes = await exists("src") ? "src/routes" : "routes";

for await (const entry of walk(baseRoutes, {
	includeFiles: true,
	includeDirs: false,
	skip: [/(?:^|[\\/])_(?![\\/])[^\\/]+$/, /(?:^|[\\/])[^\\/]*[\[\]][^\\/]*$/],
})) {
	const routePath = entry.path.replace(baseRoutes, "")
		.replace(".tsx", "")
		.replace("\\", "/")
		.replace("index", "") || "/";

	const imported = await import(path.toFileUrl(path.join(Deno.cwd(), entry.path)).href);
	if (!imported.prerender === true) {
		continue;
	}

	paths.push(routePath);
	const res = await fetch(`${address}${routePath}`);
	const text = await res.text();

	if (!res.ok) {
		console.log(res);
		console.error(`Failed to prerender ${routePath}: ${res.status}`);
		Deno.exit(1);
	}


	await Deno.writeTextFile(`./_fresh/client${routePath === "/" ? "/index" : routePath}.html`, text, {
		create: true,
		createNew: true,
	});
}

console.log(`Prerendered ${paths.length} routes:`)
console.log(paths.join("\n"));
server.shutdown();
