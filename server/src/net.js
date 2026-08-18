import { fetch as undiciFetch, ProxyAgent } from 'undici';

/**
 * Proxy-aware fetch. This machine routes some domains (t.me, theguardian.com,
 * bbc feeds, archdaily…) through a local HTTP proxy (127.0.0.1:7897) which
 * fake-resolves them to 127.0.0.1 — plain Node fetch fails on those. Using a
 * ProxyAgent makes the proxy do the real resolution/connection.
 *
 * Proxy is taken from HTTPS_PROXY/HTTP_PROXY env, falling back to the known
 * local proxy address.
 */
let dispatcher;
try {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
  dispatcher = new ProxyAgent(proxy);
  console.log(`[net] using proxy ${proxy}`);
} catch (err) {
  dispatcher = undefined;
}

export function netFetch(url, opts = {}) {
  return dispatcher ? undiciFetch(url, { ...opts, dispatcher }) : globalThis.fetch(url, opts);
}
