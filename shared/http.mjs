import http from "node:http";

export function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...headers });
  res.end(JSON.stringify(body, null, 2));
}

export function text(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "access-control-allow-origin": "*" });
  res.end(body);
}

export async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createService({ name, port, routes }) {
  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "access-control-allow-headers": "content-type" });
      return res.end();
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/health") return json(res, 200, { service: name, status: "UP", timestamp: new Date().toISOString() });
    try {
      const route = routes.find(r => r.method === req.method && (typeof r.path === "string" ? r.path === url.pathname : r.path.test(url.pathname)));
      if (!route) return json(res, 404, { error: "NOT_FOUND", service: name, path: url.pathname });
      await route.handler({ req, res, url, params: typeof route.path === "string" ? [] : url.pathname.match(route.path)?.slice(1) ?? [] });
    } catch (error) {
      json(res, 500, { error: "INTERNAL_ERROR", service: name, message: error instanceof Error ? error.message : String(error) });
    }
  });
  server.listen(port, "127.0.0.1", () => console.log(`[${name}] http://127.0.0.1:${port}`));
  return server;
}

export const route = (method, path, handler) => ({ method, path, handler });
