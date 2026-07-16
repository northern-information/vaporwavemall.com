// A small, generalized CORS proxy on Cloudflare Workers.
//
// It fetches a target URL server-side (where the same-origin policy does not
// apply) and re-serves the response with permissive CORS headers, so browser
// apps can read cross-origin content that the origin itself does not send
// `Access-Control-Allow-Origin` for.
//
//   GET https://cors-proxy.vaporwavemall.com/?url=<url-encoded target>
//
// Read-only by design (GET/HEAD only) and guarded against obvious SSRF targets.
// Optionally restrict which browser origins may read responses by setting the
// ALLOWED_ORIGINS var (comma-separated); unset means any origin ("*").
//
// First consumer: CxR, the research instrument at forgotten-industries.net/cxr.

export interface Env {
  /** Comma-separated browser origins allowed to read responses. Unset = "*". */
  ALLOWED_ORIGINS?: string
}

const PROXY_METHODS = new Set(['GET', 'HEAD'])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const allowOrigin = resolveAllowOrigin(origin, env)

    if (request.method === 'OPTIONS') {
      // CORS preflight.
      if (allowOrigin === null) return deny(origin)
      return new Response(null, { status: 204, headers: corsHeaders(allowOrigin) })
    }

    if (allowOrigin === null) return deny(origin)

    if (!PROXY_METHODS.has(request.method)) {
      return json({ error: 'Only GET and HEAD are supported.' }, 405, allowOrigin)
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) {
      return json({ error: 'Missing required ?url= parameter.' }, 400, allowOrigin)
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(target)
    } catch {
      return json({ error: `Not a valid URL: ${target}` }, 400, allowOrigin)
    }
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return json({ error: 'Only http(s) targets are allowed.' }, 400, allowOrigin)
    }
    if (isBlockedHost(targetUrl.hostname)) {
      return json({ error: 'Target host is not allowed.' }, 403, allowOrigin)
    }

    let upstream: Response
    try {
      upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          'user-agent': request.headers.get('user-agent') || 'cors-proxy',
          accept: request.headers.get('accept') || '*/*',
        },
        redirect: 'follow',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return json({ error: `Upstream fetch failed: ${message}` }, 502, allowOrigin)
    }

    // Re-serve the upstream body with CORS headers. Preserve status and
    // content-type; drop upstream CORS/security headers that would conflict.
    const headers = corsHeaders(allowOrigin)
    const contentType = upstream.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
    headers.set('x-proxied-url', targetUrl.toString())

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    })
  },
} satisfies ExportedHandler<Env>

// Resolve the Access-Control-Allow-Origin value:
//   - ALLOWED_ORIGINS unset  -> "*" (open proxy)
//   - set + request Origin in the list -> echo that Origin
//   - set + Origin missing (non-browser caller) -> "*" (CORS is irrelevant)
//   - set + Origin not in the list -> null (deny)
function resolveAllowOrigin(origin: string | null, env: Env): string | null {
  const configured = env.ALLOWED_ORIGINS
  if (!configured) return '*'
  const allowed = configured.split(',').map((s) => s.trim()).filter(Boolean)
  if (!origin) return '*'
  return allowed.includes(origin) ? origin : null
}

function corsHeaders(allowOrigin: string): Headers {
  return new Headers({
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
    vary: 'Origin',
  })
}

function json(body: unknown, status: number, allowOrigin: string): Response {
  const headers = corsHeaders(allowOrigin)
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { status, headers })
}

function deny(origin: string | null): Response {
  return new Response(
    JSON.stringify({ error: `Origin not allowed: ${origin || '(none)'}` }),
    { status: 403, headers: { 'content-type': 'application/json' } }
  )
}

// Block obvious internal / metadata targets to limit SSRF abuse. Workers run on
// Cloudflare's edge and cannot reach a private LAN, but this still refuses
// loopback, private, and link-local (cloud metadata) hosts.
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0.0.0.0') return true
  if (/^127\./.test(host)) return true
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  if (/^169\.254\./.test(host)) return true
  return false
}
