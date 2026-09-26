import { DEMO_CREDENTIALS, authenticateTmsClient, beginRequest, sendError, unauthorized } from "../lib/http-api.js";

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return Object.fromEntries(new URLSearchParams(String(request.body || "")));
}

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["POST"]);
  if (!gate.ok) return;
  const body = parseBody(request);
  if (body.grant_type !== "client_credentials") {
    return sendError(response, 400, "UNSUPPORTED_GRANT_TYPE", "grant_type must be client_credentials.", gate.requestId);
  }
  if (!authenticateTmsClient(body.client_id, body.client_secret)) {
    return unauthorized(response, gate.requestId);
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  response.status(200).json({
    access_token: DEMO_CREDENTIALS.tms.accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: "lumen:tms:read",
    issued_at: new Date().toISOString(),
    request_id: gate.requestId,
  });
}
