import { body, createService, json, route } from "../shared/http.mjs";

const events = [];
let sequence = 0;

createService({ name: "lumen-event-broker", port: 4100, routes: [
  route("POST", "/events", async ({ req, res }) => {
    const input = await body(req);
    const event = { id: crypto.randomUUID(), sequence: ++sequence, occurredAt: new Date().toISOString(), ...input };
    events.push(event);
    if (events.length > 1000) events.shift();
    json(res, 201, event);
  }),
  route("GET", "/events", async ({ res, url }) => {
    const topic = url.searchParams.get("topic");
    const since = Number(url.searchParams.get("since") ?? 0);
    json(res, 200, events.filter(e => (!topic || e.topic === topic) && e.sequence > since));
  }),
  route("GET", "/topics", async ({ res }) => json(res, 200, [...new Set(events.map(e => e.topic))])),
] });
