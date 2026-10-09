// The Great Library on Cloudflare, private: HTTP Basic Auth (user "shaan", the estate world's password) in front of
// the static reader. The cloud build already leaves out private docs; the password keeps client names off the open web.
const enc = new TextEncoder()
function same(a, b) {                       // constant-time compare
  const x = enc.encode(a), y = enc.encode(b)
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0)
  return d === 0
}

export default {
  async fetch(req, env) {
    if (!env.WORLD_PASSWORD) return new Response('Not configured.', { status: 503 })   // never open without a secret
    const auth = req.headers.get('authorization') || ''
    const [scheme, b64] = auth.split(' ')
    let ok = false
    if (scheme === 'Basic' && b64) { try { ok = same(atob(b64), 'shaan:' + env.WORLD_PASSWORD) } catch { ok = false } }
    if (!ok) return new Response('The Great Library of SISO is private.', { status: 401, headers: { 'www-authenticate': 'Basic realm="SISO estate", charset="UTF-8"', 'cache-control': 'no-store' } })
    const res = await env.ASSETS.fetch(req)
    const out = new Response(res.body, res)
    out.headers.set('cache-control', 'private, max-age=300')
    out.headers.set('x-robots-tag', 'noindex')
    return out
  },
}
