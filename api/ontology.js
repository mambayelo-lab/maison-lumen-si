import { ontology, generatedAt } from "../lib/demo-data.js";

export default function handler(_request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.status(200).json({ generatedAt: generatedAt(), ...ontology });
}
