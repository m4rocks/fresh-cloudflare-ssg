# fresh-cloudflare-ssg

This is a simple package that allows you to prerender some routes programatically within
Fresh and host it on Cloudflare Workers. This greatly improves performance and cost of hosting.
This package is intended for Fresh >=2.0.0 projects.

This tool will automatically pick up the routes folder even if it is a `src/` folder.

## How to run

In your project's `deno.json` add the following task:
```json
{
	"tasks": {
		"prerender": "echo \"import 'jsr:@m4rocks/fresh-cloudflare-ssg'\" | deno run -A -",
	}
}
```

You can even schedule it after your build.
```json
{
	"tasks": {
		"prerender": "echo \"import 'jsr:@m4rocks/fresh-cloudflare-ssg'\" | deno run -A -",
		"build": "vite build && deno task prerender",
	}
}
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
