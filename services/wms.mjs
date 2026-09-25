import { body, createService, json, route } from "../shared/http.mjs";
import { poll, publish } from "../shared/bus-client.mjs";

const inventory = [
  { sku: "SCARF-AZUR", siteId: "WH-PAR", onHand: 1240, reserved: 180, safetyStock: 500, dailyDemand: 95, updatedAt: new Date().toISOString() },
  { sku: "BOX-PREMIUM", siteId: "WH-PAR", onHand: 720, reserved: 430, safetyStock: 600, dailyDemand: 160, updatedAt: new Date().toISOString() },
  { sku: "BAG-ORION", siteId: "WH-LIL", onHand: 310, reserved: 80, safetyStock: 250, dailyDemand: 36, updatedAt: new Date().toISOString() }
];

async function applyOrder(order) {
  const row = inventory.find(x => x.sku === order.sku);
  if (!row) return;
  row.onHand += Number(order.quantity ?? 0);
  row.updatedAt = new Date().toISOString();
  await publish("inventory", "inventory.receipt-planned", "lumen-wms", { sku: row.sku, siteId: row.siteId, projectedOnHand: row.onHand });
}
poll("purchase-orders", event => event.type === "purchase-order.created" && applyOrder(event.payload));

createService({ name: "lumen-wms", port: 4102, routes: [
  route("GET", "/metadata", async ({ res }) => json(res, 200, { application: "Lumen WMS", type: "WMS", protocol: "REST + Event consumer", baseUrl: "http://127.0.0.1:4102", resources: { inventory: { endpoint: "/api/inventory", businessObject: "InventoryPosition", key: "sku+siteId", fields: Object.keys(inventory[0]) } }, eventsConsumed: ["purchase-order.created"], eventsProduced: ["inventory.receipt-planned", "inventory.low"], freshness: "near-real-time" })),
  route("GET", "/api/inventory", async ({ res }) => json(res, 200, inventory.map(x => ({ ...x, available: x.onHand - x.reserved, daysOfCover: Math.round((x.onHand - x.reserved) / x.dailyDemand * 10) / 10 })))),
  route("POST", "/api/reservations", async ({ req, res }) => {
    const input = await body(req); const row = inventory.find(x => x.sku === input.sku && x.siteId === input.siteId);
    if (!row) return json(res, 404, { error: "INVENTORY_NOT_FOUND" });
    row.reserved += Number(input.quantity); row.updatedAt = new Date().toISOString();
    const available = row.onHand - row.reserved;
    await publish("inventory", available < row.safetyStock ? "inventory.low" : "inventory.changed", "lumen-wms", { ...row, available });
    json(res, 201, { ...row, available });
  })
] });
