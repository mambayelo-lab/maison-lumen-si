import { ontology, generatedAt } from "../lib/demo-data.js";
import { beginRequest } from "../lib/http-api.js";

export default function handler(request, response) {
  const gate = beginRequest(request, response, ["GET"]);
  if (!gate.ok) return;
  response.status(200).json({ generatedAt: generatedAt(), version: "1.1.0", synthetic: true, ...ontology });
}
