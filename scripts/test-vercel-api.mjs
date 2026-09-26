import alertsHandler from "../api/alerts.js";
import catalogHandler from "../api/catalog.js";
import dataHandler from "../api/data/[app].js";
import eventsHandler from "../api/events.js";
import fileHandler from "../api/files/[name].js";
import healthHandler from "../api/health.js";
import tokenHandler from "../api/token.js";

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = String(value); },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    send(value) { this.payload = value; return this; },
    end() { return this; },
  };
}

async function invoke(handler, { method = "GET", query = {}, headers = {}, body } = {}) {
  const response = responseMock();
  await handler({ method, query, headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])), body }, response);
  return response;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await invoke(healthHandler);
expect(health.statusCode === 200 && health.payload.status === "ok", "Health contract failed");

const catalog = await invoke(catalogHandler);
expect(catalog.statusCode === 200 && catalog.payload.applications.length === 6, "Catalogue contract failed");
expect(!JSON.stringify(catalog.payload).includes("LUMEN-DEMO-ONLY"), "Catalog must not disclose passwords");

const noAuth = await invoke(dataHandler, { query: { app: "sap-s4" } });
expect(noAuth.statusCode === 401 && noAuth.payload.error.code === "UNAUTHORIZED", "Source endpoint must enforce authentication");

const erpAuth = `Basic ${Buffer.from("aura_demo:LUMEN-DEMO-ONLY").toString("base64")}`;
const erp = await invoke(dataHandler, { query: { app: "sap-s4" }, headers: { authorization: erpAuth, "x-lumen-tenant": "lumen-fr-100" } });
expect(erp.statusCode === 200 && erp.payload.records.length === 3 && erp.payload.lineage.requestId, "ERP authenticated contract failed");

const wrongWms = await invoke(dataHandler, { query: { app: "manhattan-wms" }, headers: { "x-api-key": "wrong" } });
expect(wrongWms.statusCode === 401, "WMS must reject a wrong API key");
const wms = await invoke(dataHandler, { query: { app: "manhattan-wms" }, headers: { "x-api-key": "lumen_wms_demo_key" } });
expect(wms.statusCode === 200 && wms.payload.records[0].available === 290, "WMS authenticated contract failed");

const token = await invoke(tokenHandler, { method: "POST", body: "grant_type=client_credentials&client_id=aura-lumen-demo&client_secret=DEMO-NOT-A-SECRET" });
expect(token.statusCode === 200 && token.payload.token_type === "Bearer", "OAuth token contract failed");
const tms = await invoke(dataHandler, { query: { app: "blueyonder-tms" }, headers: { authorization: `Bearer ${token.payload.access_token}` } });
expect(tms.statusCode === 200 && tms.payload.records.some(item => item.status === "CRITICAL"), "TMS authenticated contract failed");

const risk = await invoke(dataHandler, { query: { app: "coupa-risk" }, headers: { authorization: "Bearer lumen_demo_bearer_token" } });
expect(risk.statusCode === 200 && risk.payload.records.some(item => item.capacityRisk === 88), "Supplier Risk authenticated contract failed");

const demand = await invoke(dataHandler, { query: { app: "snowflake-demand" }, headers: {
  authorization: "Bearer DEMO-KEY-NOT-USABLE",
  "x-lumen-account": "lumen-demo.eu-west",
  "x-lumen-warehouse": "AURA_DEMO_WH",
  "x-lumen-role": "AURA_READER",
} });
expect(demand.statusCode === 200 && demand.payload.records.some(item => item.forecastConfidence === 0.73), "Demand authenticated contract failed");

const integrationHub = await invoke(dataHandler, { query: { app: "mulesoft-events" }, headers: { "x-client-id": "aura-demo-client", "x-client-secret": "DEMO-ONLY" } });
expect(integrationHub.statusCode === 200 && integrationHub.payload.records.length === 3, "Integration Hub authenticated contract failed");

const noAlertAuth = await invoke(alertsHandler);
expect(noAlertAuth.statusCode === 401, "Alerts must enforce gateway authentication");
const alerts = await invoke(alertsHandler, { headers: { authorization: "Bearer lumen_aura_gateway_demo_token" } });
expect(alerts.statusCode === 200 && alerts.payload.alerts.length === 3 && alerts.payload.lineage.ruleSet, "Alert contract failed");

const events = await invoke(eventsHandler, { headers: { "x-client-id": "aura-demo-client", "x-client-secret": "DEMO-ONLY" } });
const eventPayload = JSON.parse(events.payload);
expect(events.statusCode === 200 && events.headers["content-type"].startsWith("application/cloudevents-batch+json"), "Event media type failed");
expect(eventPayload.length === 3 && eventPayload.every(item => item.specversion === "1.0"), "CloudEvents contract failed");
const invalidSince = await invoke(eventsHandler, { query: { since: "not-a-date" }, headers: { "x-client-id": "aura-demo-client", "x-client-secret": "DEMO-ONLY" } });
expect(invalidSince.statusCode === 400 && invalidSince.payload.error.code === "INVALID_SINCE", "Event timestamp validation failed");

const csv = await invoke(fileHandler, { query: { name: "demand-forecast.csv" }, headers: { "x-api-key": "lumen_files_demo_key" } });
expect(csv.statusCode === 200 && csv.headers["content-type"].startsWith("text/csv") && csv.payload.includes("forecast_qty"), "CSV contract failed");
const unchangedCsv = await invoke(fileHandler, { query: { name: "demand-forecast.csv" }, headers: { "x-api-key": "lumen_files_demo_key", "if-none-match": csv.headers.etag } });
expect(unchangedCsv.statusCode === 304, "CSV conditional GET contract failed");

const preflight = await invoke(dataHandler, { method: "OPTIONS", query: { app: "sap-s4" }, headers: { origin: "https://aura-decision-zen.vercel.app" } });
expect(preflight.statusCode === 204 && preflight.headers["access-control-allow-origin"] === "https://aura-decision-zen.vercel.app", "CORS preflight failed");
const deniedOrigin = await invoke(catalogHandler, { headers: { origin: "https://untrusted.example" } });
expect(deniedOrigin.statusCode === 403 && deniedOrigin.payload.error.code === "ORIGIN_NOT_ALLOWED", "CORS allow-list failed");

console.log(JSON.stringify({
  status: "PASS",
  applications: catalog.payload.applications.length,
  authenticatedSources: 6,
  alerts: alerts.payload.alerts.length,
  cloudEvents: eventPayload.length,
  csvRows: Number(csv.headers["x-record-count"]),
}, null, 2));
