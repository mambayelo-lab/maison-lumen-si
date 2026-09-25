const BROKER = process.env.BROKER_URL ?? "http://127.0.0.1:4100";

export async function publish(topic, type, source, payload) {
  const response = await fetch(`${BROKER}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic, type, source, payload }),
  });
  if (!response.ok) throw new Error(`Broker publish failed: ${response.status}`);
  return response.json();
}

export async function consume(topic, since = 0) {
  const response = await fetch(`${BROKER}/events?topic=${encodeURIComponent(topic)}&since=${since}`);
  if (!response.ok) return [];
  return response.json();
}

export function poll(topic, onEvent, interval = 700) {
  let cursor = 0;
  const timer = setInterval(async () => {
    try {
      const events = await consume(topic, cursor);
      for (const event of events) {
        cursor = Math.max(cursor, event.sequence);
        await onEvent(event);
      }
    } catch { /* service may be starting */ }
  }, interval);
  return () => clearInterval(timer);
}
