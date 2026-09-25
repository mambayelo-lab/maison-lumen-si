import { dataFor } from "../../lib/demo-data.js";

export default function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  const result = dataFor(request.query.app);
  if (!result) return response.status(404).json({ error: "UNKNOWN_APPLICATION" });
  return response.status(200).json(result);
}
