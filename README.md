# Maison Lumen SI

Executable demonstration information system for **Aura Supply Chain Resilience Agent**.

The repository also includes a Vercel-ready web portal. It exposes six synthetic, market-familiar application profiles, their non-sensitive demo connection parameters, sample datasets, ontology and resilience alerts.

**Live portal:** https://maison-lumen-si.vercel.app

> Vendor names describe the integration pattern being emulated. This project is not affiliated with, endorsed by, or connected to SAP, Manhattan Associates, Blue Yonder, Coupa, Snowflake or MuleSoft.

It simulates a mid-size luxury retailer/manufacturer with multiple applications, three exchange styles and an Aura-facing semantic gateway. The data is synthetic.

## Applications

| Application | Port | Role | Exchanges |
|---|---:|---|---|
| Event Broker | 4100 | Lightweight event log | Events |
| Lumen ERP | 4101 | Suppliers and purchase orders | REST, produces events |
| Lumen WMS | 4102 | Inventory and reservations | REST, consumes/produces events |
| Lumen TMS | 4103 | Shipments and delays | REST, consumes/produces events |
| Supplier Risk | 4104 | Supplier risk scores | REST, produces events |
| Batch Hub | 4105 | Forecast and scorecard exchange | CSV files |
| Aura Gateway | 4191 | Discovery and unified read contract | REST aggregation |

## Start

Requires Node.js 20+ and no external package.

```bash
npm start
```

In another terminal:

```bash
npm test
npm run demo
```

## Aura entry points

- `GET http://127.0.0.1:4191/catalog` — source catalogue.
- `GET http://127.0.0.1:4191/metadata` — live metadata discovery.
- `GET http://127.0.0.1:4191/ontology/minimal` — minimal business ontology.
- `GET http://127.0.0.1:4191/snapshot/supply-chain` — current cross-system facts.
- `GET http://127.0.0.1:4191/alerts` — deterministic resilience alerts and decision needs.
- `GET http://127.0.0.1:4100/events?since=0` — event stream history.
- `GET http://127.0.0.1:4105/files/supplier-scorecard.csv` — batch example.

## Demonstrated flow

1. A purchase order is created in ERP.
2. ERP publishes `purchase-order.created`.
3. WMS plans the receipt and publishes an inventory event.
4. TMS creates a shipment and publishes `shipment.created`.
5. Aura reads the current facts through the gateway, evaluates deterministic rules and exposes decision needs.

This broker is intentionally dependency-free and designed for demos. A production implementation would replace it with Kafka, NATS, Pulsar or a managed event bus while preserving the event contracts.

See [docs/architecture.md](docs/architecture.md) and [docs/aura-integration.md](docs/aura-integration.md).
