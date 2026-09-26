import { dataFor } from "../../lib/demo-data.js";
import { authenticateApplication, beginRequest, publicApplication, sendError, unauthorized } from "../../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;

  const appId = String(request.query?.app || "");
  const result = dataFor(appId);
  if (!result) return sendError(response, 404, "UNKNOWN_APPLICATION", "Unknown Maison Lumen application.", gate.requestId, { appId });

  const scheme = appId === "sap-s4" ? "Basic" : ["manhattan-wms", "mulesoft-events"].includes(appId) ? "ApiKey" : "Bearer";
  if (!authenticateApplication(request, appId)) return unauthorized(response, gate.requestId, scheme);

  const { application, ...data } = result;
  return response.status(200).json({
    application: publicApplication(application),
    ...data,
    lineage: { sourceId: appId, environment: "Maison Lumen Demo", synthetic: true, requestId: gate.requestId },
  });
}
