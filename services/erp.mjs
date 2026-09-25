import { body, createService, json, route } from "../shared/http.mjs";
import { publish } from "../shared/bus-client.mjs";

const suppliers = [
  { supplierId: "SUP-001", name: "Tessitura Milano", country: "IT", category: "Silk", criticality: "HIGH", annualSpendEur: 3200000, singleSource: true, paymentRisk: 22 },
  { supplierId: "SUP-002", name: "Ateliers du Nord", country: "FR", category: "Leather", criticality: "MEDIUM", annualSpendEur: 1800000, singleSource: false, paymentRisk: 8 },
  { supplierId: "SUP-003", name: "Lumina Components", country: "CN", category: "Packaging", criticality: "HIGH", annualSpendEur: 2400000, singleSource: true, paymentRisk: 48 }
];
const orders = [
  { orderId: "PO-1042", supplierId: "SUP-001", sku: "SCARF-AZUR", quantity: 900, promisedDate: "2026-10-04", status: "CONFIRMED" },
  { orderId: "PO-1043", supplierId: "SUP-003", sku: "BOX-PREMIUM", quantity: 4000, promisedDate: "2026-09-29", status: "AT_RISK" }
];

const metadata = {
  application: "Lumen ERP", type: "ERP", protocol: "REST", baseUrl: "http://127.0.0.1:4101",
  resources: {
    suppliers: { endpoint: "/api/suppliers", businessObject: "Supplier", key: "supplierId", fields: Object.keys(suppliers[0]) },
    purchaseOrders: { endpoint: "/api/purchase-orders", businessObject: "PurchaseOrder", key: "orderId", fields: Object.keys(orders[0]) }
  },
  eventsProduced: ["purchase-order.created"], freshness: "transactional"
};

createService({ name: "lumen-erp", port: 4101, routes: [
  route("GET", "/metadata", async ({ res }) => json(res, 200, metadata)),
  route("GET", "/api/suppliers", async ({ res }) => json(res, 200, suppliers)),
  route("GET", /^\/api\/suppliers\/([^/]+)$/, async ({ res, params }) => json(res, suppliers.find(x => x.supplierId === params[0]) ? 200 : 404, suppliers.find(x => x.supplierId === params[0]) ?? { error: "SUPPLIER_NOT_FOUND" })),
  route("GET", "/api/purchase-orders", async ({ res }) => json(res, 200, orders)),
  route("POST", "/api/purchase-orders", async ({ req, res }) => {
    const input = await body(req);
    const order = { orderId: `PO-${1042 + orders.length}`, status: "CREATED", ...input };
    orders.push(order);
    await publish("purchase-orders", "purchase-order.created", "lumen-erp", order);
    json(res, 201, order);
  })
] });
