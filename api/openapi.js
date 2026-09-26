import { API_VERSION, beginRequest } from "../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;
  response.status(200).json({
    openapi: "3.1.0",
    info: { title: "Maison Lumen Integration API", version: API_VERSION, description: "Synthetic integration contracts for Aura, including governed demonstration writes from the Lumen administration screen." },
    servers: [{ url: "https://maison-lumen-si.vercel.app" }],
    paths: {
      "/api/health": { get: { summary: "Service health" } },
      "/api/catalog": { get: { summary: "Discover source applications" } },
      "/api/ontology": { get: { summary: "Read the minimal business ontology" } },
      "/api/token": { post: { summary: "Issue a demonstration OAuth client-credentials token" } },
      "/api/data/{app}": { get: { summary: "Read a source dataset using its declared authentication profile" }, patch: { summary: "Persist edited demonstration records (gateway authentication required)", security: [{ bearerAuth: [] }] } },
      "/api/alerts": { get: { summary: "Read deterministic resilience alerts", security: [{ bearerAuth: [] }] } },
      "/api/events": { get: { summary: "Read a cursor-based CloudEvents 1.0 batch", security: [{ clientHeaders: [] }] } },
      "/api/files/{name}": { get: { summary: "Read a governed CSV export", security: [{ apiKeyAuth: [] }] } },
    },
    components: { securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      clientHeaders: { type: "apiKey", in: "header", name: "X-Client-Id", description: "Also requires X-Client-Secret." },
    } },
  });
}
