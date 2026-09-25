import { body, createService, json, route } from "../shared/http.mjs";
import { publish } from "../shared/bus-client.mjs";

const scores = [
  { supplierId: "SUP-001", financialRisk: 22, countryRisk: 18, qualityRisk: 14, capacityRisk: 35, overallRisk: 24, assessedAt: "2026-09-25T08:00:00Z" },
  { supplierId: "SUP-002", financialRisk: 8, countryRisk: 7, qualityRisk: 10, capacityRisk: 14, overallRisk: 10, assessedAt: "2026-09-25T08:00:00Z" },
  { supplierId: "SUP-003", financialRisk: 48, countryRisk: 54, qualityRisk: 31, capacityRisk: 72, overallRisk: 57, assessedAt: "2026-09-25T08:00:00Z" }
];

createService({ name: "lumen-supplier-risk", port: 4104, routes: [
  route("GET", "/metadata", async ({ res }) => json(res, 200, { application: "Lumen Supplier Risk", type: "SRM/Risk", protocol: "REST", baseUrl: "http://127.0.0.1:4104", resources: { riskScores: { endpoint: "/api/risk-scores", businessObject: "SupplierRisk", key: "supplierId", fields: Object.keys(scores[0]) } }, eventsProduced: ["supplier.risk-changed"], freshness: "daily" })),
  route("GET", "/api/risk-scores", async ({ res }) => json(res, 200, scores)),
  route("PUT", /^\/api\/risk-scores\/([^/]+)$/, async ({ req, res, params }) => {
    const score = scores.find(x => x.supplierId === params[0]);
    if (!score) return json(res, 404, { error: "SUPPLIER_RISK_NOT_FOUND" });
    Object.assign(score, await body(req), { assessedAt: new Date().toISOString() });
    await publish("supplier-risk", "supplier.risk-changed", "lumen-supplier-risk", score);
    json(res, 200, score);
  })
] });
