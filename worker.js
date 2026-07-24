/**
 * Decanter CORS Proxy — Cloudflare Worker
 *
 * Deploy once (free tier: 100k requests/day), then Decanter "just works"
 * from any browser or GitHub Pages — no local proxy needed.
 *
 * One-time deploy:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 *   2. Paste this entire file into the editor
 *   3. Deploy → you get a URL like: decanter-proxy.YOURNAME.workers.dev
 *   4. Set that as the Endpoint in Decanter's Settings
 */

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only forward POST to /v1/chat/completions
    const url = new URL(request.url);
    if (request.method !== 'POST' || !url.pathname.endsWith('/chat/completions')) {
      return new Response('Not found', { status: 404 });
    }

    // Forward to DeepSeek — all headers (incl. Authorization) pass through
    const deepseek = 'https://api.deepseek.com/v1/chat/completions';
    const proxyReq = new Request(deepseek, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });

    try {
      const resp = await fetch(proxyReq);
      // Clone response and add CORS headers
      const corsResp = new Response(resp.body, resp);
      corsResp.headers.set('Access-Control-Allow-Origin', '*');
      corsResp.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      corsResp.headers.set('Access-Control-Allow-Headers', '*');
      return corsResp;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
