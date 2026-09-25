import { spawn } from "node:child_process";

const services = ["event-broker", "erp", "wms", "tms", "supplier-risk", "file-hub", "aura-gateway"];
const children = services.map(name => spawn(process.execPath, [`services/${name}.mjs`], { stdio: "inherit", env: process.env }));

function stop() { for (const child of children) child.kill("SIGTERM"); }
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });
await Promise.all(children.map(child => new Promise(resolve => child.on("exit", resolve))));
