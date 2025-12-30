export async function onRequest(context) {
  const { request, env } = context;
  const origin = env.VPS_API_ORIGIN;

  if (!origin) {
    return new Response("Missing VPS_API_ORIGIN", { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(origin);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;
  const isLive = incomingUrl.pathname.startsWith("/api/match-analysis/live");

  const init = {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  if (request.method === "GET" && !isLive) {
    const cacheKey = new Request(targetUrl.toString(), request);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const response = await fetch(targetUrl, init);
    const proxyResponse = new Response(response.body, response);
    proxyResponse.headers.set("Cache-Control", "s-maxage=60");
    context.waitUntil(cache.put(cacheKey, proxyResponse.clone()));
    return proxyResponse;
  }

  const response = await fetch(targetUrl, init);
  if (isLive && request.method === "GET") {
    const noStore = new Response(response.body, response);
    noStore.headers.set("Cache-Control", "no-store");
    return noStore;
  }
  return response;
}
