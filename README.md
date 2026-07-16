# [vaporwavemall.com](https://vaporwavemall.com)

This site is a collection of interactive assets for streaming and other tomfoolery.

It was created by Tyler Etters at [Northern Information](https://nor.the-rn.info).

## Stack

- [Eleventy](https://www.11ty.dev/) 3.x
- [Tailwind CSS](https://tailwindcss.com/) 4.x
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

## Development

```sh
npm install
npm run dev
```

In a separate terminal for CSS watch:

```sh
npm run dev:css
```

## Build

```sh
npm run build
```

Output goes to `dist/`.

## Deploy

Deployed to a Cloudflare Worker (Workers Static Assets) on push to `main` via `.github/workflows/deploy.yml`. Worker config: `wrangler.jsonc`. Requires `CLOUDFLARE_API_TOKEN` repo secret.

## CORS proxy

A second, standalone Cloudflare Worker lives in [`workers/cors-proxy/`](workers/cors-proxy/) — a generalized CORS proxy served at `cors-proxy.vaporwavemall.com`. It fetches a target URL server-side and re-serves it with CORS headers, so browser apps can read cross-origin content the origin doesn't allow. First consumer: CxR (forgotten-industries.net/cxr).

It ships from this repo and deploys via the same `deploy.yml` (a second `wrangler deploy --config workers/cors-proxy/wrangler.jsonc` step). Tests run with Vitest (`npm test`) and gate the deploy. Details in `workers/cors-proxy/README.md`.
