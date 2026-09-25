import catalogHandler from "../api/catalog.js";
import dataHandler from "../api/data/[app].js";
import alertsHandler from "../api/alerts.js";

function invoke(handler, query = {}) {
  let statusCode = 200;
  let payload;
  const response = { setHeader() {}, status(code) { statusCode = code; return this; }, json(value) { payload = value; return this; } };
  handler({ query }, response);
  return { statusCode, payload };
}

const catalog = invoke(catalogHandler);
if (catalog.statusCode !== 200 || catalog.payload.applications.length !== 6) throw new Error("Catalogue contract failed");
for (const app of catalog.payload.applications) {
  const result = invoke(dataHandler, { app: app.id });
  if (result.statusCode !== 200 || !result.payload.records?.length) throw new Error(`Dataset missing for ${app.id}`);
}
const alerts = invoke(alertsHandler);
if (alerts.payload.alerts.length < 3) throw new Error("Alert contract failed");
console.log(JSON.stringify({ status: "PASS", applications: 6, datasets: 6, alerts: alerts.payload.alerts.length }, null, 2));
