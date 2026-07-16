# cors-proxy

A small, generalized CORS proxy on Cloudflare Workers, deployed alongside the
vaporwavemall.com site. It fetches a target URL server-side and re-serves it
with permissive CORS headers, so browser apps can read cross-origin content the
origin doesn't send `Access-Control-Allow-Origin` for. First consumer: CxR
(forgotten-industries.net/cxr).

## Usage

```
GET https://cors-proxy.vaporwavemall.com/?url=<url-encoded target>
```

Returns the upstream body with its original status and `content-type`, plus CORS
headers. `GET`/`HEAD` only.

## Deploy

Deployed by CI on push to `main` (`.github/workflows/deploy.yml`) via
`cloudflare/wrangler-action`, as a second step after the site:

```
wrangler deploy --config workers/cors-proxy/wrangler.jsonc
```

The route `cors-proxy.vaporwavemall.com` (custom domain) is provisioned on the
vaporwavemall.com zone. To run locally: `npx wrangler dev --config workers/cors-proxy/wrangler.jsonc`.

## Tests

`worker.test.ts` covers the handler with Vitest (preflight, method/URL guards,
SSRF blocks, successful proxying with header pass-through, upstream failure, and
the `ALLOWED_ORIGINS` allowlist). Run `npm test`; CI runs it before deploying.

## Security

Open proxy by default (`ACAO: *`, any target). SSRF-guarded (refuses
non-http(s) and loopback/private/link-local hosts). To limit which **browser
origins** may read responses, set `ALLOWED_ORIGINS` (comma-separated) in
`wrangler.jsonc` `vars` — note this is not authentication.
