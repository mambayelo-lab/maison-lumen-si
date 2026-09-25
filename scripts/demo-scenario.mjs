const put = (url, body) => fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
await put("http://127.0.0.1:4104/api/risk-scores/SUP-001", { capacityRisk: 88, overallRisk: 71 });
await put("http://127.0.0.1:4103/api/shipments/SHP-882", { delayHours: 36, status: "DELAYED" });
const alerts = await fetch("http://127.0.0.1:4191/alerts").then(r => r.json());
console.log(JSON.stringify(alerts, null, 2));
