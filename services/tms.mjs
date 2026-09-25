import { body, createService, json, route } from "../shared/http.mjs";
import { poll, publish } from "../shared/bus-client.mjs";

const shipments = [
  { shipmentId: "SHP-882", orderId: "PO-1042", carrier: "EuroFreight", origin: "Milan", destination: "Paris", eta: "2026-10-03T08:00:00Z", delayHours: 0, status: "IN_TRANSIT" },
  { shipmentId: "SHP-883", orderId: "PO-1043", carrier: "AsiaBridge", origin: "Shenzhen", destination: "Paris", eta: "2026-10-02T16:00:00Z", delayHours: 72, status: "DELAYED" }
];

poll("purchase-orders", async event => {
  if (event.type !== "purchase-order.created") return;
  const shipment = { shipmentId: `SHP-${882 + shipments.length}`, orderId: event.payload.orderId, carrier: "Pending allocation", origin: "Supplier", destination: "Paris", eta: event.payload.promisedDate, delayHours: 0, status: "PLANNED" };
  shipments.push(shipment);
  await publish("shipments", "shipment.created", "lumen-tms", shipment);
});

createService({ name: "lumen-tms", port: 4103, routes: [
  route("GET", "/metadata", async ({ res }) => json(res, 200, { application: "Lumen TMS", type: "TMS", protocol: "REST + Events", baseUrl: "http://127.0.0.1:4103", resources: { shipments: { endpoint: "/api/shipments", businessObject: "Shipment", key: "shipmentId", fields: Object.keys(shipments[0]) } }, eventsConsumed: ["purchase-order.created"], eventsProduced: ["shipment.created", "shipment.delayed"], freshness: "near-real-time" })),
  route("GET", "/api/shipments", async ({ res }) => json(res, 200, shipments)),
  route("PUT", /^\/api\/shipments\/([^/]+)$/, async ({ req, res, params }) => {
    const shipment = shipments.find(x => x.shipmentId === params[0]);
    if (!shipment) return json(res, 404, { error: "SHIPMENT_NOT_FOUND" });
    Object.assign(shipment, await body(req));
    await publish("shipments", shipment.delayHours > 24 ? "shipment.delayed" : "shipment.updated", "lumen-tms", shipment);
    json(res, 200, shipment);
  })
] });
