import { fetch as undiciFetch, ProxyAgent } from 'undici';
import net from 'node:net';

/**
 * Proxy-aware fetch.
 *
 * Some dev machines route certain domains (t.me, theguardian.com, bbc feeds,
 * archdaily…) through a local HTTP proxy that fake-resolves them to 127.0.0.1 —
 * plain Node fetch fails on those. Production servers normally have no such
 * proxy, so we only use one when:
 *   1. HTTPS_PROXY / HTTP_PROXY is set, or
 *   2. the known local dev proxy (127.0.0.1:7897) is actually listening.
 */
const DEFAULT_DEV_PROXY = 'http://127.0.0.1:7897';

function probeProxy(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    try {
      const u = new URL(url);
      const sock = net.connect({ host: u.hostname, port: Number(u.port) || 80 });
      sock.setTimeout(timeoutMs);
      sock.once('connect', () => { sock.destroy(); finish(true); });
      sock.once('error', () => finish(false));
      sock.once('timeout', () => { sock.destroy(); finish(false); });
    } catch {
      finish(false);
    }
  });
}

let dispatcher;
let proxyUsed = null;

const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
if (envProxy) {
  dispatcher = new ProxyAgent(envProxy);
  proxyUsed = envProxy;
} else if (await probeProxy(DEFAULT_DEV_PROXY)) {
  dispatcher = new ProxyAgent(DEFAULT_DEV_PROXY);
  proxyUsed = DEFAULT_DEV_PROXY;
}

if (proxyUsed) {
  console.log(`[net] using proxy ${proxyUsed}`);
} else {
  console.log('[net] no proxy — direct connections');
}

export function netFetch(url, opts = {}) {
  return dispatcher ? undiciFetch(url, { ...opts, dispatcher }) : globalThis.fetch(url, opts);
}
