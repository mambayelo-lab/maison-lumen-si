import { datasets } from "./demo-data.js";

// Durable when Vercel KV/Upstash is attached; process memory is a safe local
// fallback for development and is explicitly reported by /api/health.
const memory = globalThis.__lumenMemory ?? (globalThis.__lumenMemory = new Map());
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const persistenceMode = kvUrl && kvToken ? "vercel-kv" : "memory-fallback";

async function kv(command, ...args) {
  if (!kvUrl || !kvToken) return null;
  const response = await fetch(kvUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
    body: JSON.stringify([command, ...args]),
  });
  if (!response.ok) throw new Error(`KV HTTP ${response.status}`);
  return (await response.json()).result;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function readDataset(appId) {
  const key = `lumen:dataset:${appId}`;
  try {
    const stored = await kv("GET", key);
    if (stored) return JSON.parse(stored);
  } catch { /* use memory/local seed if storage is temporarily unavailable */ }
  if (memory.has(key)) return clone(memory.get(key));
  return datasets[appId] ? clone(datasets[appId]) : null;
}

export async function writeDataset(appId, dataset) {
  const key = `lumen:dataset:${appId}`;
  const value = clone(dataset);
  memory.set(key, value);
  if (kvUrl && kvToken) await kv("SET", key, JSON.stringify(value));
  return value;
}

export async function readAllDatasets() {
  const result = {};
  for (const appId of Object.keys(datasets)) result[appId] = await readDataset(appId);
  return result;
}

export function validateRecords(records) {
  if (!Array.isArray(records) || records.length > 500) return "records must be an array of at most 500 objects";
  if (records.some(row => !row || typeof row !== "object" || Array.isArray(row))) return "each record must be an object";
  return null;
}
