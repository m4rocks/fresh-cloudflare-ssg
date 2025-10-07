# fresh-ssg

This is a simple package that allows you to prerender some routes programatically within
Fresh. This greatly improves performance and cost of hosting.

## Notes
* This tool is in very early development;
* This tool is meant to work with Cloudflare. With a few tweaks it might be possible to make it run on other hosting providers;
* The JavaScript for the prerendered routes is still present and will not be touched;
* This package is intended for Fresh >= 2.0.0 projects;
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
	plugins: [fresh({
		routeDir: "./src/routes",
		islandsDir: "./src/components/islands",
		clientEntry: "./src/client.ts"
	}), freshSSG(), tailwindcss()],
});
```

For Cloudflare to also pick up the prerendered routes, it is necessary to add the following to your `wrangler.json`.
```json
{
	"assets": {
		"directory": "./_fresh/client"
	}
}
```

If you are using `wrangler.toml`, add the following:
```toml
[assets]
directory = "./_fresh/client"
```

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
