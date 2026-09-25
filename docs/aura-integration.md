# Aura integration contract

## Recommended sequence

1. Call `/catalog` to register available applications.
2. Call `/metadata` to retrieve live source schemas.
3. Compare returned objects and fields with `/ontology/minimal`.
4. Propose mappings and require human validation for master-source designation.
5. Load `/snapshot/supply-chain` for current facts.
6. Load `/alerts` or consume broker events.
7. Open an Aura decision with the alert, evidence, data timestamps and source lineage.

## Suggested mapping

| Aura object | Source | Resource | Master key |
|---|---|---|---|
| Supplier | ERP | `/api/suppliers` | `supplierId` |
| SupplierRisk | Supplier Risk | `/api/risk-scores` | `supplierId` |
| PurchaseOrder | ERP | `/api/purchase-orders` | `orderId` |
| InventoryPosition | WMS | `/api/inventory` | `sku + siteId` |
| Shipment | TMS | `/api/shipments` | `shipmentId` |
| SupplierPerformance | Batch Hub | `supplier-scorecard.csv` | `supplier_id + period` |
| DemandForecast | Batch Hub | `demand-forecast.csv` | `sku + site_id + week` |

The LLM may explain, query and propose a mapping. It must not silently invent a field, validate a master source or change a causal threshold.
