import { applications, generatedAt } from "../lib/demo-data.js";

export default function handler(_request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.status(200).json({ environment: "Maison Lumen Demo", synthetic: true, generatedAt: generatedAt(), applications });
}
