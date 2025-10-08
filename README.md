# fresh-ssg

This is a simple package that allows you to prerender some routes programatically within
Fresh. This greatly improves performance and cost of hosting.

## Notes
* This tool is in very early development;
* The JavaScript for the prerendered routes is still present and will not be touched;
* This package is intended for Fresh >=2.0.0 projects;
* This tool will automatically pick up the `routes/` or `src/routes/` folder;
* Partials do not work when navigating to a prerendered route;
* Has support for dynamic routes;

## How to run

First add the package:
```bash
deno add jsr:@m4rocks/fresh-ssg
```

Then add the plugin.
```ts
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { freshSSG } from "@m4rocks/fresh-ssg";

export default defineConfig({
	server: {
		port: 3000
	},
	plugins: [fresh(), freshSSG(), tailwindcss()],
});
```

## How to deploy to Cloudflare

Your code will run using Cloudflare's workerd runtime. Make sure you don't use Deno specific API's in server-rendered routes. When deploying to Cloudflare you will need a `wrangler.json` file and a `handler.js` file. Cloudflare's Vite plugin does not generate the entry file properly.

1. For Cloudflare to also pick up the prerendered routes, it is necessary to add the `main` and `assets.directory` to your `wrangler.json`.
```json
{
	"name": "stodio",
	"compatibility_date": "2025-10-01",
	"main": "./handler.js",
	"assets": {
		"directory": "./_fresh/client"
	}
}
```

2. For your `handler.js` file you will need the contents:
```js
export default {
	fetch: await import("./_fresh/server.js").then(mod => mod.default.fetch)
}
```

3. If you are building on Cloudflare, you will need to update your project settings:
* Add variable: SKIP_DEPENDENCY_INSTALL=1
* Build command: `npx deno install --allow-scripts && npx deno task build`

<!--Please see [Cloudflare's Vite Plugin documentation](https://developers.cloudflare.com/workers/vite-plugin/) for more information.-->

## How to deploy to Vercel

Hosting on Vercel will use NodeJS. Make sure you don't use Deno specific API's in server-rendered routes. For this you will need a `handler.js` file and `vite-plugin-vercel`.

Please note that while [Vercel supports the Deno runtime](https://github.com/vercel-community/deno) for serverless functions, the package is outdated and does not work with Deno >2.0.

1. Install `vite-plugin-vercel`
```bash
deno add npm:vite-plugin-vercel
```

2. Configure your `vite.config.ts` to handle Vercel.
```ts
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import { freshSSG } from "@m4rocks/fresh-ssg";
import vercel from "vite-plugin-vercel";

export default defineConfig({
	server: {
		port: 3000
	},
	plugins: [fresh(), vercel(), freshSSG()],
	vercel: {
		distContainsOnlyStatic: false,
		rewrites: [
			{ source: "/:path", destination: "/:path.html" },
			{ source: "/(.*)", destination: "/api/handler" }
		],
		// Optionally you can add `cleanUrls`, `trailingSlash` and other configuration
		// cleanUrls: true,
		// trailingSlash: false,
		additionalEndpoints: [
			{
				source: "./handler.js",
				destination: "/api/handler"
			}
		],
	}
});
```

3. The `handler.js` file should be created at the root of your project folder, but can be put anywhere. Just make sure you have updated the `additionalEndpoints` property in `vite-plugin-vercel` config. For your `handler.js` file you will need the contents:
```js
export default {
	fetch: await import("./_fresh/server.js").then(mod => mod.default.fetch)
}
```

4. Modify your build command so that it copies static files to `.vercel/output`.

```json
{
	"tasks": {
		"build": "vite build && cp -r ./_fresh/client/* ./.vercel/output/static"
	}
}
```

5. If you are building on Vercel, you should also update your project's settings to build the project using Deno:
* Install Command: `npx deno install --allow-scripts`
* Build Command: `npx deno task build`


Please see [`vite-plugin-vercel` documentation](https://www.npmjs.com/package/vite-plugin-vercel) for more information.

## How to prerender routes

Prerendering routes is as simple as exporting a `prerender` boolean set to true from the page.

```tsx
import { useSignal } from "@preact/signals";
import { define } from "../utils.ts";

export const prerender = true;

export default define.page(function Home(ctx) {
  const count = useSignal(3);

  return (
    <div class="px-4 py-8 mx-auto fresh-gradient min-h-screen">
      <Head>
        <title>Fresh project</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1>Fresh Project</h1>
      </div>
    </div>
  );
});
```

### Dynamic routes

To prerender dynamic routes, you will need to import `defineStaticPaths` and return all the paths needed.

```tsx
import { define } from "@/lib/utils.ts";
import { defineStaticPaths } from "@m4rocks/fresh-ssg";

export const prerender = true;

defineStaticPaths(() => {
	return ["test", "hello"]
})

export default define.page(function Test({ params }) {
	return (
		<p>{params.test}</p>
	);
});
```
