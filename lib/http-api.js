import { randomUUID, timingSafeEqual } from "node:crypto";

export const API_VERSION = "1.1.0";

export const DEMO_CREDENTIALS = Object.freeze({
  erp: { username: "aura_demo", password: "LUMEN-DEMO-ONLY", tenant: "lumen-fr-100" },
  wms: { apiKey: "lumen_wms_demo_key" },
  tms: { clientId: "aura-lumen-demo", clientSecret: "DEMO-NOT-A-SECRET", accessToken: "lumen_tms_access_demo" },
  risk: { token: "lumen_demo_bearer_token" },
  demand: { account: "lumen-demo.eu-west", warehouse: "AURA_DEMO_WH", role: "AURA_READER", token: "DEMO-KEY-NOT-USABLE" },
  events: { clientId: "aura-demo-client", clientSecret: "DEMO-ONLY" },
  gateway: { token: "lumen_aura_gateway_demo_token" },
  files: { apiKey: "lumen_files_demo_key" },
});

const ALLOWED_ORIGINS = new Set([
  "https://maison-lumen-si.vercel.app",
  "https://aura-decision-zen.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function header(request, name) {
  const value = request.headers?.[name.toLowerCase()] ?? request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^https:\/\/aura-decision-zen-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left ?? ""));
  const b = Buffer.from(String(right ?? ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function beginRequest(request, response, allowedMethods = ["GET"]) {
  const requestId = header(request, "x-request-id") || randomUUID();
  const origin = header(request, "origin");
  const method = String(request.method || "GET").toUpperCase();

  response.setHeader("X-Request-Id", requestId);
  response.setHeader("X-API-Version", API_VERSION);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Vary", "Origin");

  if (origin && isAllowedOrigin(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", [...allowedMethods, "OPTIONS"].join(", "));
  response.setHeader("Access-Control-Allow-Headers", [
    "Authorization", "Content-Type", "X-Request-Id", "X-API-Key", "X-Lumen-Tenant",
    "X-Lumen-Account", "X-Lumen-Warehouse", "X-Lumen-Role", "X-Client-Id", "X-Client-Secret",
  ].join(", "));

  if (origin && !isAllowedOrigin(origin)) {
    sendError(response, 403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed to call Maison Lumen.", requestId);
    return { ok: false, requestId };
  }
  if (method === "OPTIONS") {
    response.status(204).end();
    return { ok: false, requestId };
  }
  if (!allowedMethods.includes(method)) {
    response.setHeader("Allow", [...allowedMethods, "OPTIONS"].join(", "));
    sendError(response, 405, "METHOD_NOT_ALLOWED", `Use ${allowedMethods.join(" or ")} for this resource.`, requestId);
    return { ok: false, requestId };
  }
  return { ok: true, requestId };
}

export function sendError(response, status, code, message, requestId, details) {
  return response.status(status).json({
    error: { code, message, ...(details ? { details } : {}) },
    requestId,
  });
}

function bearerToken(request) {
  const authorization = String(header(request, "authorization") || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function basicCredentials(request) {
  const authorization = String(header(request, "authorization") || "");
  if (!authorization.startsWith("Basic ")) return null;
  try {
    const [username, ...password] = Buffer.from(authorization.slice(6), "base64").toString("utf8").split(":");
    return { username, password: password.join(":") };
  } catch {
    return null;
  }
}

export function authenticateGateway(request) {
  const bearer = constantTimeEqual(bearerToken(request), process.env.LUMEN_GATEWAY_TOKEN || DEMO_CREDENTIALS.gateway.token);
  const client = constantTimeEqual(header(request, "x-client-id"), DEMO_CREDENTIALS.events.clientId)
    && constantTimeEqual(header(request, "x-client-secret"), process.env.LUMEN_EVENTS_CLIENT_SECRET || DEMO_CREDENTIALS.events.clientSecret);
  return bearer || client;
}

export function authenticateFiles(request) {
  return constantTimeEqual(header(request, "x-api-key"), process.env.LUMEN_FILES_API_KEY || DEMO_CREDENTIALS.files.apiKey);
}

export function authenticateApplication(request, appId) {
  switch (appId) {
    case "sap-s4": {
      const auth = basicCredentials(request);
      return !!auth
        && constantTimeEqual(auth.username, DEMO_CREDENTIALS.erp.username)
        && constantTimeEqual(auth.password, process.env.LUMEN_ERP_PASSWORD || DEMO_CREDENTIALS.erp.password)
        && constantTimeEqual(header(request, "x-lumen-tenant"), DEMO_CREDENTIALS.erp.tenant);
    }
    case "manhattan-wms":
      return constantTimeEqual(header(request, "x-api-key"), process.env.LUMEN_WMS_API_KEY || DEMO_CREDENTIALS.wms.apiKey);
    case "blueyonder-tms":
      return constantTimeEqual(bearerToken(request), DEMO_CREDENTIALS.tms.accessToken);
    case "coupa-risk":
      return constantTimeEqual(bearerToken(request), process.env.LUMEN_RISK_TOKEN || DEMO_CREDENTIALS.risk.token);
    case "snowflake-demand":
      return constantTimeEqual(bearerToken(request), process.env.LUMEN_DEMAND_TOKEN || DEMO_CREDENTIALS.demand.token)
        && constantTimeEqual(header(request, "x-lumen-account"), DEMO_CREDENTIALS.demand.account)
        && constantTimeEqual(header(request, "x-lumen-warehouse"), DEMO_CREDENTIALS.demand.warehouse)
        && constantTimeEqual(header(request, "x-lumen-role"), DEMO_CREDENTIALS.demand.role);
    case "mulesoft-events":
      return constantTimeEqual(header(request, "x-client-id"), DEMO_CREDENTIALS.events.clientId)
        && constantTimeEqual(header(request, "x-client-secret"), process.env.LUMEN_EVENTS_CLIENT_SECRET || DEMO_CREDENTIALS.events.clientSecret);
    default:
      return false;
  }
}

export function authenticateTmsClient(clientId, clientSecret) {
  return constantTimeEqual(clientId, DEMO_CREDENTIALS.tms.clientId)
    && constantTimeEqual(clientSecret, process.env.LUMEN_TMS_CLIENT_SECRET || DEMO_CREDENTIALS.tms.clientSecret);
}

export function publicApplication(application) {
  const credentialFields = Object.keys(application.auth || {}).filter(key => key !== "type");
  return {
    ...application,
    auth: {
      type: application.auth?.type || "Unknown",
      credentialFields,
      secretDelivery: "out-of-band demo profile",
    },
  };
}

export function unauthorized(response, requestId, scheme = "Bearer") {
  response.setHeader("WWW-Authenticate", scheme === "Basic" ? "Basic realm=\"Maison Lumen Demo\"" : `${scheme} realm=\"Maison Lumen Demo\"`);
  return sendError(response, 401, "UNAUTHORIZED", "Missing or invalid demonstration credentials.", requestId);
}

export function requestHeader(request, name) {
  return header(request, name);
}
