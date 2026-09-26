import { resilienceAlerts, generatedAt } from "../lib/demo-data.js";
import { authenticateGateway, beginRequest, unauthorized } from "../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;
  if (!authenticateGateway(request)) return unauthorized(response, gate.requestId);
  response.status(200).json({
    generatedAt: generatedAt(),
    synthetic: true,
    alerts: resilienceAlerts().map(alert => ({ ...alert, evidence: alert.evidence.map(sourceId => ({ sourceId, href: `/api/data/${sourceId}` })) })),
    lineage: { ruleSet: "lumen-resilience-v1", requestId: gate.requestId },
  });
}
