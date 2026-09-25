const state = { applications: [], active: null };

const clean = value => String(value ?? "—");
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function renderSignals(alerts, generatedAt) {
  document.querySelector("#updated-at").textContent = new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.querySelector("#signals").innerHTML = alerts.slice(0, 3).map(alert => `
    <div class="signal"><span class="severity ${alert.severity}"></span><div><strong>${clean(alert.signal)}</strong><small>${clean(alert.decision)}</small></div><b>${money(alert.exposureEur)}</b></div>
  `).join("");
}

function renderCredentials(app) {
  const pairs = { endpoint: location.origin + app.baseUrl, ...app.auth, refresh: app.refresh };
  document.querySelector("#credentials").innerHTML = Object.entries(pairs).map(([key, value]) => `
    <div class="credential"><label>${clean(key.replace(/([A-Z])/g, " $1"))}</label><code>${clean(value)}</code></div>
  `).join("");
}

function renderTable(records) {
  const keys = [...new Set(records.flatMap(Object.keys))];
  return `<div class="table-wrap"><table><thead><tr>${keys.map(key => `<th>${key}</th>`).join("")}</tr></thead><tbody>${records.map(record => `<tr>${keys.map(key => `<td>${clean(record[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

async function selectApplication(id) {
  state.active = id;
  document.querySelectorAll(".app-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.id === id));
  const payload = await getJson(`/api/data/${id}`);
  const { application: app, entity, records } = payload;
  document.querySelector("#app-detail").innerHTML = `
    <div class="app-heading"><div><p class="eyebrow">${clean(app.marketReference)}-INSPIRED</p><h3>${clean(app.name)}</h3><p>${clean(app.role)}</p></div><span class="status">● ${clean(app.status)}</span></div>
    <div class="contract"><span>${clean(app.protocol)}</span><span>${clean(entity)}</span><span>${records.length} sample records</span></div>
    ${renderTable(records)}
    <p style="color:#7c8097;font-size:12px;margin-top:18px">${clean(app.disclaimer)}</p>`;
  renderCredentials(app);
}

function renderTabs(applications) {
  document.querySelector("#app-tabs").innerHTML = applications.map(app => `<button class="app-tab" data-id="${app.id}" role="tab">${clean(app.name)}</button>`).join("");
  document.querySelectorAll(".app-tab").forEach(tab => tab.addEventListener("click", () => selectApplication(tab.dataset.id)));
}

async function bootstrap() {
  try {
    const [catalog, alerts, ontology] = await Promise.all([getJson("/api/catalog"), getJson("/api/alerts"), getJson("/api/ontology")]);
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
