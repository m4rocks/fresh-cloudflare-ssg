import * as path from "@std/path";
import { ensureFile, exists } from "@std/fs";
import type { Plugin, ResolvedConfig } from "vite";

/**
 * A function that returns an array of strings representing the paths to be statically generated.
 * This function can be asynchronous and can fetch data from external sources to determine the paths.
 */
export type GetStaticPaths = () => Promise<string[]> | string[];

/**
 * Registers a `defineStaticPaths` function for a specific route.
 * This function is used to define the paths that should be statically generated for dynamic routes.
 */
export function defineStaticPaths<T extends GetStaticPaths>(fn: T): void {
	// This dummy reference ensures Rollup keeps the function
	// @ts-ignore: We need this to avoid Fresh's treeshaking
	globalThis.__keepStaticPaths ||= [];
	// @ts-ignore: We need this to avoid Fresh's treeshaking
	globalThis.__keepStaticPaths.push(fn);
}

/**
 * A Vite plugin that enables static site generation (SSG) for Fresh framework routes.
 * It scans the project for routes that export `prerender = true` and generates static HTML files
 * for those routes, including handling dynamic routes with `defineStaticPaths`.
 */
export function freshSSG(): Plugin[] {
	let resolvedConfig: ResolvedConfig;
	const routesToPrerender = new Map<string, string>();

	const shouldCheckForPrerender = (id: string): boolean => {
		return id.includes("/routes/") && !id.includes("/_");
	};
	return [{
		name: "@m4rocks/fresh-ssg",
		configResolved(config) {
			resolvedConfig = config;
		},
		// This is a little fix for Fresh not creating the server.js file in time
		async buildStart() {
			const serverPath = path.join(resolvedConfig.root, "_fresh", "server.js");
			if (!await exists(serverPath)) {
				try {
					await ensureFile(serverPath);
					await Deno.writeTextFile(serverPath, "export default {};");
				} catch (error) {
					throw error;
				}
			}
		},
		transform(code, id) {
			if (!shouldCheckForPrerender(id)) {
				return null;
			}

			const hasPrerenderExport = /export\s+(?:const|let|var)\s+prerender\s*=\s*true/m.test(code);

			if (hasPrerenderExport) {
				const routePath = id
					.replace(/.*\/routes/, "")
					.replace(/\.(tsx?|jsx?)$/, "")
					.replace(/\\/g, "/");

				routesToPrerender.set(id, routePath);
			}

			return null;
		},
		async closeBundle() {
			// Checking if this is is Fresh's SSR bundle
			const isFreshBuildingSSR = resolvedConfig.build.ssr && (Object(resolvedConfig.build.rollupOptions.input)["server-entry"] === "fresh:server_entry")
			if (!isFreshBuildingSSR) return;

			const { server, address } = await startMockServer();

			for await (const entry of routesToPrerender) {
				// We check to see if this value is dynamic
				const isDynamic = entry[1].includes("[");

				if (isDynamic) {
					if (entry[1].includes("[..")) {
						throw new Error(`SSG does not support dynamic segments for ${entry[1]}`);
					}

					// We compare lenghts because we can't track defineStaticPaths across files
					const formerGetStaticPathsFn = getAllGetStaticPathsFn()
					await importGetStaticPaths(entry[1]);
					const newGetStaticPathsFn = getAllGetStaticPathsFn();
					const getStaticPathsFn = newGetStaticPathsFn[newGetStaticPathsFn.length - 1];

					if (formerGetStaticPathsFn.length === newGetStaticPathsFn.length) {
						throw new Error(`Route ${entry[1]} does not have a getStaticPaths function`);
					}
					try {
						const paths = await getStaticPathsFn();

						paths.forEach((p) => {
							const replacedPath = entry[1]
								.replace(/\[(.*?)\]/g, p);

							// It's ok to use a made-up entry file path since we no longer read from it in the next step
							routesToPrerender.set(`${entry[0]}+${p}`, replacedPath);
						})
						routesToPrerender.delete(entry[0]);
					} catch (error) {
						console.error(`Error fetching static paths for ${entry[1]}`, error);
					}
				}
			}

			for await (const entry of routesToPrerender) {
				const pathname = entry[1]
					.replace(/\/index$/, "");
				const res = await fetch(`${address}${pathname}`);
				const text = await res.text();

				if (!res.ok) {
					console.log(res);
					console.error(`Failed to prerender ${pathname}: ${res.status}`);
					Deno.exit(1);
				}

				try {
					await Deno.mkdir(path.dirname(`./_fresh/client${entry[1]}.html`), { recursive: true });
				} catch(_) {_};
				await Deno.writeTextFile(`./_fresh/client${entry[1]}.html`, text, {
					create: true,
					createNew: true,
				});
			}
			server.shutdown();
			console.log("Mock server shutdown");
			console.log(`Successfully prerendered`);
			routesToPrerender.entries().forEach((entry) => console.log("\t", entry[1]))
		}
	}];
}

async function importGetStaticPaths(routePath: string) {
	const viteManifest = await import(path.toFileUrl(path.join(Deno.cwd(), "_fresh", "server", ".vite", "manifest.json")).href, { with: { type: "json" } });

	const routePathBuilt = "fresh-route::" + routePath
		.replaceAll("/", "_")
		.replaceAll("[", "")
		.replaceAll("]", "")
		.replaceAll("-", "_");

	const routeModulePath = viteManifest.default[routePathBuilt]?.file || viteManifest.default[routePathBuilt + "_"]?.file;

	if (!routeModulePath) {
		throw new Error(`Route module not found for path: ${routePath}. Route assumed was ${routePathBuilt}`);
	}
	await import(path.toFileUrl(path.join(Deno.cwd(), "_fresh", "server", routeModulePath)).href);
}

const getAllGetStaticPathsFn = (): GetStaticPaths[] => {
	// @ts-ignore: We need this to avoid Fresh's treeshaking
	const fns: GetStaticPaths[] = globalThis.__keepStaticPaths || [];
	return fns;
}

async function startMockServer() {
	const app = await import(path.toFileUrl(path.join(Deno.cwd(), "_fresh/server/server-entry.mjs")).href)
	const server = Deno.serve({
		port: 0,
		handler: app.default.fetch,
		onListen: ({ port }) => {
			const address = `http://localhost:${port}`;
			console.log(`Mock server started at ${address}`);
		}
	});

	const { port } = server.addr as Deno.NetAddr;
	const address = `http://localhost:${port}`;

	return { server, address };
}
