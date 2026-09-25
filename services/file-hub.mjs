import fs from "node:fs";
import path from "node:path";
import { createService, json, route, text } from "../shared/http.mjs";

const dataDir = path.resolve("data");
const files = [
  { id: "supplier-scorecard", fileName: "supplier-scorecard.csv", businessObject: "SupplierPerformance", cadence: "monthly", delimiter: "," },
  { id: "demand-forecast", fileName: "demand-forecast.csv", businessObject: "DemandForecast", cadence: "weekly", delimiter: "," }
];

createService({ name: "lumen-file-hub", port: 4105, routes: [
  route("GET", "/metadata", async ({ res }) => json(res, 200, { application: "Lumen Batch Hub", type: "MFT/File exchange", protocol: "CSV batch", baseUrl: "http://127.0.0.1:4105", resources: Object.fromEntries(files.map(f => [f.id, { endpoint: `/files/${f.fileName}`, ...f }])), freshness: "weekly/monthly" })),
  route("GET", "/files", async ({ res }) => json(res, 200, files)),
  route("GET", /^\/files\/([^/]+\.csv)$/, async ({ res, params }) => {
    const file = files.find(x => x.fileName === params[0]);
    if (!file) return json(res, 404, { error: "FILE_NOT_FOUND" });
    text(res, 200, fs.readFileSync(path.join(dataDir, file.fileName), "utf8"), "text/csv; charset=utf-8");
  })
] });
