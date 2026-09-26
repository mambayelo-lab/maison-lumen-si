import { applications, generatedAt } from "../lib/demo-data.js";
import { beginRequest, publicApplication } from "../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;
  response.status(200).json({
    environment: "Maison Lumen Demo",
    synthetic: true,
    generatedAt: generatedAt(),
    applications: applications.map(publicApplication),
    contracts: {
      alerts: "/api/alerts",
      events: "/api/events",
      files: ["/api/files/demand-forecast.csv", "/api/files/supplier-scorecard.csv"],
      token: "/api/token",
      openapi: "/api/openapi",
    },
  });
}
