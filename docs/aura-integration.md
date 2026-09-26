# Aura integration contract

## Recommended production-like sequence

1. Call `GET /api/health` and record `X-API-Version`.
2. Call `GET /api/catalog` to discover applications and authentication profiles.
3. Call `GET /api/ontology`; propose mappings and require human validation for every master-source designation.
4. Authenticate per source, then read `/api/data/:app`. Persist `generatedAt`, `lineage.sourceId` and `X-Request-Id` with every ingested fact.
5. Read `/api/events` incrementally with `cursor`; store the returned `X-Next-Cursor` only after successful processing.
6. Read governed CSV exports with `If-None-Match`; a `304` means the previous version remains current.
7. Read `/api/alerts` with the gateway token. Treat each `evidence[].sourceId` as lineage, not as proof of causality.
8. Open an Aura decision with the alert payload, source facts, timestamps, request IDs and the mapping version used.

## Demonstration credentials

These values are public, synthetic and intended only to exercise the protocol. Aura should store them in its server-side secret store and send only secret references to the UI/LLM.

| Contract | Demo access |
|---|---|
| Gateway alerts | Bearer `lumen_aura_gateway_demo_token` |
| Events | `X-Client-Id: aura-demo-client`, `X-Client-Secret: DEMO-ONLY` |
| CSV files | `X-API-Key: lumen_files_demo_key` |
| ERP | Basic `aura_demo:LUMEN-DEMO-ONLY` + `X-Lumen-Tenant: lumen-fr-100` |
| WMS | `X-API-Key: lumen_wms_demo_key` |
| TMS token | `client_id=aura-lumen-demo`, `client_secret=DEMO-NOT-A-SECRET` |
| Supplier Risk | Bearer `lumen_demo_bearer_token` |

## Minimum reliability rules for Aura

- Eight-second timeout, at most two retries with jitter, no retry on `400/401/403/404`.
- Idempotent ingestion keyed by `sourceId + business key + generatedAt`.
- Cursor checkpoint after commit, not before.
- Circuit breaker and visible stale-data state after repeated failures.
- Never replace the last known good value with an authentication or timeout error.
- Preserve `X-Request-Id` end-to-end for support and audit.
- Validate CloudEvents `specversion`, `id`, `source`, `type`, `time` and `data` before use.

The LLM may explain, query and propose mappings. It must not invent a field, validate a master source, change a causal threshold or silently discard a source error.
