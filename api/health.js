import { API_VERSION, beginRequest } from "../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;
  response.status(200).json({ status: "ok", service: "maison-lumen-si", version: API_VERSION, time: new Date().toISOString() });
}
