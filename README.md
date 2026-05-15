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
