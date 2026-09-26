import { createHash } from "node:crypto";
import { authenticateFiles, beginRequest, requestHeader, sendError, unauthorized } from "../../lib/http-api.js";

const FILES = Object.freeze({
  "demand-forecast.csv": "sku,site_id,week,forecast_qty,confidence_pct\nSCARF-AZUR,WH-PAR,2026-W40,665,82\nBOX-PREMIUM,WH-PAR,2026-W40,1120,74\nBAG-ORION,WH-LIL,2026-W40,252,88\n",
  "supplier-scorecard.csv": "supplier_id,period,otif_pct,defect_rate_pct,lead_time_days,confirmed_capacity_pct\nSUP-001,2026-09,91.2,1.4,18,84\nSUP-002,2026-09,97.8,0.6,9,96\nSUP-003,2026-09,72.4,4.8,43,61\n",
});

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET", "HEAD"]);
  if (!gate.ok) return;
  if (!authenticateFiles(request)) return unauthorized(response, gate.requestId, "ApiKey");

  const name = String(request.query?.name || "");
  const content = FILES[name];
  if (!content) return sendError(response, 404, "UNKNOWN_FILE", "Unknown Maison Lumen file export.", gate.requestId, { name });

  const etag = `\"${createHash("sha256").update(content).digest("hex")}\"`;
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `inline; filename=\"${name}\"`);
  response.setHeader("ETag", etag);
  response.setHeader("X-Record-Count", String(content.trim().split("\n").length - 1));
  if (requestHeader(request, "if-none-match") === etag) return response.status(304).end();
  if (String(request.method).toUpperCase() === "HEAD") return response.status(200).end();
  return response.status(200).send(content);
}
