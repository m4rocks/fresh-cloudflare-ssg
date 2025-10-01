# fresh-cloudflare-ssg

This is a simple package that allows you to prerender some routes programatically within
Fresh and host it on Cloudflare Workers. This greatly improves performance and cost of hosting.
This package is intended for Fresh >=2.0.0 projects.

## How to run

In your project's `deno.json` add the following task:
```json
{
	"tasks": {
		"prerender": "echo \"import \"jsr:@m4rocks/fresh-cloudflare-ssg\";\" | deno run -A -"
	}
}
```

You can even schedule it after your build.
```json
{
	"tasks": {
		"prerender": "echo \"import \"jsr:@m4rocks/fresh-cloudflare-ssg\";\" | deno run -A -"
		"build": "vite build && deno task prerender"
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
