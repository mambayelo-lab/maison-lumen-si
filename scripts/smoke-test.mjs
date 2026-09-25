const checks = [4100, 4101, 4102, 4103, 4104, 4105, 4191];
for (const port of checks) {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  if (!response.ok) throw new Error(`Health check failed on ${port}`);
}
const metadata = await fetch("http://127.0.0.1:4191/metadata").then(r => r.json());
if (metadata.sources.some(x => x.status !== "AVAILABLE")) throw new Error("Metadata discovery incomplete");
const alerts = await fetch("http://127.0.0.1:4191/alerts").then(r => r.json());
if (!alerts.alerts.length) throw new Error("Expected seeded resilience alerts");
console.log(JSON.stringify({ status: "PASS", services: checks.length, discoveredSources: metadata.sources.length, alerts: alerts.alerts.length }, null, 2));
