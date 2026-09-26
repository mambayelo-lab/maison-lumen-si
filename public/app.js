const state = { applications: [], active: null, tmsToken: null };
const ADMIN_TOKEN_KEY = "lumen-admin-token";

const DEMO_ACCESS = {
  "sap-s4": { display: { type: "Basic Auth", username: "aura_demo", password: "LUMEN-DEMO-ONLY", tenant: "lumen-fr-100" } },
  "manhattan-wms": { display: { type: "API Key", header: "x-api-key", apiKey: "lumen_wms_demo_key" } },
  "blueyonder-tms": { display: { type: "OAuth 2.0 Client Credentials", clientId: "aura-lumen-demo", clientSecret: "DEMO-NOT-A-SECRET", tokenUrl: "/api/token" } },
  "coupa-risk": { display: { type: "Bearer token", token: "lumen_demo_bearer_token" } },
  "snowflake-demand": { display: { type: "Key pair profile", account: "lumen-demo.eu-west", warehouse: "AURA_DEMO_WH", role: "AURA_READER", privateKey: "DEMO-KEY-NOT-USABLE" } },
  "mulesoft-events": { display: { type: "Client ID enforcement", clientId: "aura-demo-client", clientSecret: "DEMO-ONLY" } },
};

const clean = value => String(value ?? "—");
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${payload.error?.code || url}`);
  return payload;
}

async function sourceHeaders(id) {
  if (id === "sap-s4") return { Authorization: `Basic ${btoa("aura_demo:LUMEN-DEMO-ONLY")}`, "X-Lumen-Tenant": "lumen-fr-100" };
  if (id === "manhattan-wms") return { "X-API-Key": "lumen_wms_demo_key" };
  if (id === "coupa-risk") return { Authorization: "Bearer lumen_demo_bearer_token" };
  if (id === "snowflake-demand") return { Authorization: "Bearer DEMO-KEY-NOT-USABLE", "X-Lumen-Account": "lumen-demo.eu-west", "X-Lumen-Warehouse": "AURA_DEMO_WH", "X-Lumen-Role": "AURA_READER" };
  if (id === "mulesoft-events") return { "X-Client-Id": "aura-demo-client", "X-Client-Secret": "DEMO-ONLY" };
  if (id === "blueyonder-tms") {
    if (!state.tmsToken) {
      const body = new URLSearchParams({ grant_type: "client_credentials", client_id: "aura-lumen-demo", client_secret: "DEMO-NOT-A-SECRET" });
      const token = await getJson("/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      state.tmsToken = token.access_token;
    }
    return { Authorization: `Bearer ${state.tmsToken}` };
  }
  return {};
}

function renderSignals(alerts, generatedAt) {
  document.querySelector("#updated-at").textContent = new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.querySelector("#signals").innerHTML = alerts.slice(0, 3).map(alert => `
    <div class="signal"><span class="severity ${alert.severity}"></span><div><strong>${clean(alert.signal)}</strong><small>${clean(alert.decision)}</small></div><b>${money(alert.exposureEur)}</b></div>
  `).join("");
}

function renderCredentials(app) {
  const pairs = { endpoint: location.origin + app.baseUrl, ...(DEMO_ACCESS[app.id]?.display || {}), refresh: app.refresh };
  document.querySelector("#credentials").innerHTML = Object.entries(pairs).map(([key, value]) => `
    <div class="credential"><label>${clean(key.replace(/([A-Z])/g, " $1"))}</label><code>${clean(value)}</code></div>
  `).join("");
}

function renderTable(records) {
  const keys = [...new Set(records.flatMap(Object.keys))];
  return `<div class="table-wrap"><table><thead><tr>${keys.map(key => `<th>${key}</th>`).join("")}</tr></thead><tbody>${records.map(record => `<tr>${keys.map(key => `<td>${clean(record[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderEditor(records) {
  return `<div class="editor-panel">
    <div class="editor-head"><strong>Modifier les valeurs fictives</strong><span>PATCH persistant · les prochaines lectures Aura les verront</span></div>
    <textarea id="records-editor" spellcheck="false">${JSON.stringify(records, null, 2)}</textarea>
    <div class="editor-actions"><input id="admin-token" type="password" placeholder="Token d’administration (démo)" value="${sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""}"/><button class="button primary" id="save-records">Enregistrer</button><span id="save-status"></span></div>
  </div>`;
}

async function saveRecords() {
  const status = document.querySelector("#save-status");
  try {
    const records = JSON.parse(document.querySelector("#records-editor").value);
    const token = document.querySelector("#admin-token").value.trim();
    if (!token) throw new Error("Token d’administration requis");
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    const saved = await getJson(`/api/data/${state.active}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
    status.textContent = `Enregistré · ${saved.records.length} lignes · ${saved.persistence}`;
    await selectApplication(state.active);
    await refreshSignals();
  } catch (error) {
    status.textContent = `Échec : ${clean(error.message)}`;
  }
}

async function refreshSignals() {
  try {
    const alerts = await getJson("/api/alerts", { headers: { Authorization: "Bearer lumen_aura_gateway_demo_token" } });
    renderSignals(alerts.alerts, alerts.generatedAt);
  } catch (error) {
    document.querySelector("#signals").innerHTML = `<p>Alertes indisponibles · ${clean(error.message)}</p>`;
  }
}

async function selectApplication(id) {
  state.active = id;
  document.querySelectorAll(".app-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.id === id));
  document.querySelector("#app-detail").innerHTML = "<p>Authenticated read in progress…</p>";
  try {
    const payload = await getJson(`/api/data/${id}`, { headers: await sourceHeaders(id) });
    const { application: app, entity, records, lineage } = payload;
    document.querySelector("#app-detail").innerHTML = `
      <div class="app-heading"><div><p class="eyebrow">${clean(app.marketReference)}-INSPIRED</p><h3>${clean(app.name)}</h3><p>${clean(app.role)}</p></div><span class="status">● ${clean(app.status)}</span></div>
      <div class="contract"><span>${clean(app.protocol)}</span><span>${clean(entity)}</span><span>${records.length} sample records</span><span>request ${clean(lineage?.requestId).slice(0, 8)}</span></div>
      ${renderTable(records)}
      ${renderEditor(records)}
      <p style="color:#7c8097;font-size:12px;margin-top:18px">${clean(app.disclaimer)}</p>`;
    renderCredentials(app);
    document.querySelector("#save-records").addEventListener("click", saveRecords);
  } catch (error) {
    document.querySelector("#app-detail").innerHTML = `<h3>Authenticated source read failed</h3><p>${clean(error.message)}</p>`;
  }
}

function renderTabs(applications) {
  document.querySelector("#app-tabs").innerHTML = applications.map(app => `<button class="app-tab" data-id="${app.id}" role="tab">${clean(app.name)}</button>`).join("");
  document.querySelectorAll(".app-tab").forEach(tab => tab.addEventListener("click", () => selectApplication(tab.dataset.id)));
}

async function bootstrap() {
  try {
    const [catalog, alerts, ontology] = await Promise.all([
      getJson("/api/catalog"),
      getJson("/api/alerts", { headers: { Authorization: "Bearer lumen_aura_gateway_demo_token" } }),
      getJson("/api/ontology"),
    ]);
    state.applications = catalog.applications;
    renderTabs(state.applications);
    renderSignals(alerts.alerts, alerts.generatedAt);
    document.querySelector("#ontology").innerHTML = ontology.objects.map(item => `<span>${clean(item)}</span>`).join("");
    await selectApplication(state.applications[0].id);
  } catch (error) {
    document.querySelector("#app-detail").innerHTML = `<h3>Integration lab unavailable</h3><p>${clean(error.message)}</p>`;
  }
}

bootstrap();
