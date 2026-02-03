/**
 * Fetch for Binance API calls. When BINANCE_HTTP_PROXY or BINANCE_HTTPS_PROXY is set,
 * requests are routed through that proxy so the request origin IP is the proxy's
 * (e.g. in a region Binance allows). Binance restricts by request origin (IP);
 * cloud/server IPs may be blocked. Set proxy to a server in an allowed region if needed.
 */

const proxyUrl = process.env.BINANCE_HTTPS_PROXY || process.env.BINANCE_HTTP_PROXY || '';

let cachedDispatcher: import('undici').ProxyAgent | undefined | null = null;

async function getDispatcher(): Promise<import('undici').ProxyAgent | undefined> {
  if (cachedDispatcher !== null) return cachedDispatcher ?? undefined;
  if (!proxyUrl || typeof proxyUrl !== 'string' || !proxyUrl.trim()) {
    cachedDispatcher = undefined;
    return undefined;
  }
  try {
    const { ProxyAgent } = await import('undici');
    cachedDispatcher = new ProxyAgent(proxyUrl.trim());
    return cachedDispatcher;
  } catch {
    cachedDispatcher = undefined;
    return undefined;
  }
}

/** Use for all Binance API requests so proxy (if configured) is applied. */
export async function binanceFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const d = await getDispatcher();
  if (d) {
    const { fetch: undiciFetch } = await import('undici');
    return undiciFetch(input as string, {
      ...init,
      dispatcher: d,
    } as RequestInit & { dispatcher: import('undici').Dispatcher });
  }
  return fetch(input, init);
}
