import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './worker'

const PROXY = 'https://cors-proxy.test/'

// Call the worker's fetch handler with an encoded ?url= target.
function call(target?: string, init?: RequestInit, env: Record<string, string> = {}) {
  const url =
    target === undefined ? PROXY : `${PROXY}?url=${encodeURIComponent(target)}`
  return worker.fetch(new Request(url, init), env as never)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('cors-proxy worker', () => {
  it('answers a CORS preflight with 204 and permissive headers', async () => {
    const res = await worker.fetch(
      new Request(`${PROXY}?url=https://example.com/`, { method: 'OPTIONS' }),
      {} as never
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it('rejects methods other than GET/HEAD with 405', async () => {
    const res = await call('https://example.com/', { method: 'POST' })
    expect(res.status).toBe(405)
  })

  it('400s when ?url= is missing', async () => {
    expect((await call(undefined)).status).toBe(400)
  })

  it('400s on an unparseable URL', async () => {
    const res = await worker.fetch(
      new Request(`${PROXY}?url=%20%20`),
      {} as never
    )
    expect(res.status).toBe(400)
  })

  it('400s on a non-http(s) scheme', async () => {
    expect((await call('ftp://example.com/x')).status).toBe(400)
  })

  it.each([
    'http://127.0.0.1/',
    'http://localhost/',
    'http://169.254.169.254/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
  ])('blocks SSRF target %s with 403', async (target) => {
    expect((await call(target)).status).toBe(403)
  })

  it('proxies a GET and re-serves the body with CORS + content-type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('hello world', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    const res = await call('https://example.com/page')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('hello world')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(res.headers.get('x-proxied-url')).toBe('https://example.com/page')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/page',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('502s when the upstream fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    const res = await call('https://example.com/')
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining('boom'),
    })
  })

  describe('ALLOWED_ORIGINS allowlist', () => {
    const env = {
      ALLOWED_ORIGINS: 'https://forgotten-industries.net, http://localhost:5173',
    }

    it('echoes an allowed Origin', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      )
      const res = await call(
        'https://example.com/',
        { headers: { Origin: 'https://forgotten-industries.net' } },
        env
      )
      expect(res.status).toBe(200)
      expect(res.headers.get('access-control-allow-origin')).toBe(
        'https://forgotten-industries.net'
      )
    })

    it('denies a disallowed Origin with 403 (before any upstream fetch)', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const res = await call(
        'https://example.com/',
        { headers: { Origin: 'https://evil.test' } },
        env
      )
      expect(res.status).toBe(403)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('allows a non-browser caller (no Origin) with *', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      )
      const res = await call('https://example.com/', {}, env)
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
    })
  })
})
