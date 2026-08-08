const state = {
  token: null,
  user: null,
  apiBaseUrl: null,
  liveTimer: null,
  refreshTimer: null,
  range: "24h",
  metric: "heart_rate_bpm",
  datas: [],
  statistics: null,
};

const els = {
  loginView: document.getElementById("loginView"),
  appShell: document.getElementById("appShell"),
  loginForm: document.getElementById("loginForm"),
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  loginHint: document.getElementById("loginHint"),
  connectionDot: document.getElementById("connectionDot"),
  connectionLabel: document.getElementById("connectionLabel"),
  lastSync: document.getElementById("lastSync"),
  activeBracelet: document.getElementById("activeBracelet"),
  activeUser: document.getElementById("activeUser"),
  liveState: document.getElementById("liveState"),
  heartRateValue: document.getElementById("heartRateValue"),
  heartRateTrend: document.getElementById("heartRateTrend"),
  spo2Value: document.getElementById("spo2Value"),
  spo2Trend: document.getElementById("spo2Trend"),
  stepCountValue: document.getElementById("stepCountValue"),
  stepCountTrend: document.getElementById("stepCountTrend"),
  signalQualityValue: document.getElementById("signalQualityValue"),
  signalQualityTrend: document.getElementById("signalQualityTrend"),
  capturedAt: document.getElementById("capturedAt"),
  braceletLabel: document.getElementById("braceletLabel"),
  liveNote: document.getElementById("liveNote"),
  summaryList: document.getElementById("summaryList"),
  recentTable: document.getElementById("recentTable"),
  metricSelect: document.getElementById("metricSelect"),
  rangeSelect: document.getElementById("rangeSelect"),
  chart: document.getElementById("chart"),
  chartLegend: document.getElementById("chartLegend"),
  rangeAvg: document.getElementById("rangeAvg"),
  rangeAvgLabel: document.getElementById("rangeAvgLabel"),
  rangeMinMax: document.getElementById("rangeMinMax"),
  rangeLast: document.getElementById("rangeLast"),
  rangeLastLabel: document.getElementById("rangeLastLabel"),
  refreshBtn: document.getElementById("refreshBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  activeUserLabel: document.getElementById("activeUser"),
  activeBraceletLabel: document.getElementById("activeBracelet"),
};

function resolveApiBaseUrl() {
  const saved = localStorage.getItem("pdg.apiBaseUrl");
  if (saved) return saved;
  if (window.location.port === "3000") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return `${window.location.origin.replace(/:\d+$/, ":8000")}`;
}

function saveSession() {
  if (state.token) localStorage.setItem("pdg.token", state.token);
  if (state.user) localStorage.setItem("pdg.user", JSON.stringify(state.user));
  localStorage.setItem("pdg.apiBaseUrl", state.apiBaseUrl);
}

function loadSession() {
  state.token = localStorage.getItem("pdg.token");
  state.apiBaseUrl = resolveApiBaseUrl();
  els.apiBaseUrl.value = state.apiBaseUrl;
  const rawUser = localStorage.getItem("pdg.user");
  if (rawUser) {
    try {
      state.user = JSON.parse(rawUser);
    } catch {
      state.user = null;
    }
  }
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("pdg.token");
  localStorage.removeItem("pdg.user");
}

function setConnection(online, label) {
  els.connectionDot.classList.toggle("online", online);
  els.connectionLabel.textContent = label;
}

function showLogin(message = "") {
  els.loginView.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  setConnection(false, message || "Hors ligne");
  if (state.liveTimer) clearInterval(state.liveTimer);
  if (state.refreshTimer) clearInterval(state.refreshTimer);
}

function showApp() {
  els.loginView.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  setConnection(true, "Connecté");
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);

  return fetch(`${state.apiBaseUrl}${path}`, {
    ...options,
    headers,
  }).then(async (response) => {
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const detail = payload.detail || `Erreur HTTP ${response.status}`;
      throw new Error(detail);
    }
    return payload;
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`;
}

function setView(viewId) {
  document.querySelectorAll(".view-stack").forEach((el) => el.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
  if (viewId === "statsView") {
    renderStats();
  }
}

function extractMeasurements(payload) {
  return Array.isArray(payload?.datas) ? payload.datas : [];
}

function latestMeasurement(records) {
  return [...records].sort((left, right) => new Date(left.captured_at) - new Date(right.captured_at)).at(-1) || null;
}

function updateDashboard() {
  const records = state.datas;
  const latest = latestMeasurement(records);

  if (!state.user) return;
  els.activeUserLabel.textContent = state.user.username || state.user.email || `Utilisateur ${state.user.id}`;
  els.activeUser.textContent = state.user.username || state.user.email || `Utilisateur ${state.user.id}`;
  els.activeBracelet.textContent = latest?.bracelet?.display_name || latest?.bracelet?.serial_number || "Aucun";
  els.activeBraceletLabel.textContent = latest?.bracelet?.display_name || latest?.bracelet?.serial_number || "Aucun";
  els.lastSync.textContent = formatDate(latest?.captured_at || new Date().toISOString());

  if (!latest) {
    els.liveState.textContent = "Inactif";
    els.liveNote.textContent = "Aucune mesure reçue pour ce compte.";
    return;
  }

  els.liveState.textContent = "En ligne";
  els.capturedAt.textContent = formatDate(latest.captured_at);
  els.braceletLabel.textContent = `${latest.bracelet?.display_name || latest.bracelet?.serial_number || "Bracelet"}`;
  els.liveNote.textContent = `Dernière mesure provenant de ${latest.source_topic || "la passerelle HTTP"}.`;

  els.heartRateValue.textContent = formatNumber(latest.heart_rate_bpm, " bpm");
  els.spo2Value.textContent = formatNumber(latest.spo2_percent, " %");
  els.stepCountValue.textContent = formatNumber(latest.step_count);
  els.signalQualityValue.textContent = formatNumber(latest.signal_quality, " %");

  const history = records.slice(0, 8);
  const avg = (key) => {
    const values = history.map((row) => Number(row[key])).filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  els.heartRateTrend.textContent = `Moyenne 8 points: ${formatNumber(avg("heart_rate_bpm"), " bpm")}`;
  els.spo2Trend.textContent = `Moyenne 8 points: ${formatNumber(avg("spo2_percent"), " %")}`;
  els.stepCountTrend.textContent = `Dernier relevé: ${formatNumber(latest.step_count)}`;
  els.signalQualityTrend.textContent = `Moyenne 8 points: ${formatNumber(avg("signal_quality"), " %")}`;

  els.summaryList.innerHTML = "";
  const summaryEntries = state.statistics
    ? [
        ["Mesures reçues", state.statistics.measurements_count, "sur toutes les périodes"],
        ["BPM moyen", state.statistics.avg_heart_rate_bpm, "Bpm sur l’historique"],
        ["SpO2 moyen", state.statistics.avg_spo2_percent, "% sur l’historique"],
        ["Pas max", state.statistics.max_step_count, "plus grand cumul observé"],
      ]
    : [];

  summaryEntries.forEach(([label, value, meta]) => {
    const row = document.createElement("div");
    row.className = "summary-item";
    row.innerHTML = `<div><span>${label}</span><strong>${formatNumber(value)}</strong></div><div class="muted">${meta}</div>`;
    els.summaryList.appendChild(row);
  });

  els.recentTable.innerHTML = "";
  records.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.captured_at)}</td>
      <td>${formatNumber(row.heart_rate_bpm, " bpm")}</td>
      <td>${formatNumber(row.spo2_percent, " %")}</td>
      <td>${formatNumber(row.step_count)}</td>
      <td>${formatNumber(row.signal_quality, " %")}</td>
    `;
    els.recentTable.appendChild(tr);
  });
}

function filterByRange(records) {
  const limitHours = {
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  }[state.range] || 24;
  const threshold = Date.now() - limitHours * 60 * 60 * 1000;
  return records.filter((record) => new Date(record.captured_at).getTime() >= threshold);
}

function renderChart(records) {
  const svg = els.chart;
  const legend = els.chartLegend;
  svg.innerHTML = "";
  legend.textContent = "";

  const data = filterByRange(records)
    .map((record) => ({
      label: record.captured_at,
      value: Number(record[state.metric]),
    }))
    .filter((point) => Number.isFinite(point.value));

  if (data.length === 0) {
    svg.innerHTML = '<text x="450" y="210" text-anchor="middle" class="chart-label">Aucune donnée sur cette période.</text>';
    legend.textContent = "Recharge la page ou élargis la fenêtre temporelle.";
    els.rangeAvg.textContent = "-";
    els.rangeMinMax.textContent = "-";
    els.rangeLast.textContent = "-";
    return;
  }

  const width = 900;
  const height = 420;
  const margin = { top: 28, right: 28, bottom: 56, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = data.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const pad = Math.max((maxValue - minValue) * 0.12, 1);
  const yMin = minValue - pad;
  const yMax = maxValue + pad;

  const x = (index) => margin.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value) => margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const toPoint = (index, point) => `${x(index)},${y(point.value)}`;
  const path = data.map((point, index) => `${index === 0 ? "M" : "L"}${toPoint(index, point)}`).join(" ");

  const verticalTicks = 5;
  for (let i = 0; i <= verticalTicks; i += 1) {
    const value = yMin + ((yMax - yMin) / verticalTicks) * i;
    const yPos = y(value);
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "line");
    grid.setAttribute("x1", margin.left);
    grid.setAttribute("x2", width - margin.right);
    grid.setAttribute("y1", yPos);
    grid.setAttribute("y2", yPos);
    grid.setAttribute("class", "chart-grid");
    svg.appendChild(grid);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", margin.left - 10);
    label.setAttribute("y", yPos + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-label");
    label.textContent = Math.round(value).toString();
    svg.appendChild(label);
  }

  const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axis.setAttribute("x1", margin.left);
  axis.setAttribute("x2", width - margin.right);
  axis.setAttribute("y1", height - margin.bottom);
  axis.setAttribute("y2", height - margin.bottom);
  axis.setAttribute("class", "chart-axis");
  svg.appendChild(axis);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", path);
  line.setAttribute("class", "chart-path");
  svg.appendChild(line);

  data.forEach((point, index) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x(index));
    circle.setAttribute("cy", y(point.value));
    circle.setAttribute("r", data.length > 40 ? 2.5 : 4.5);
    circle.setAttribute("class", "chart-point");
    svg.appendChild(circle);
  });

  const xLabelCount = Math.min(data.length, 6);
  for (let i = 0; i < xLabelCount; i += 1) {
    const index = Math.round((data.length - 1) * (xLabelCount === 1 ? 0 : i / (xLabelCount - 1)));
    const point = data[index];
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x(index));
    label.setAttribute("y", height - 22);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    label.textContent = new Date(point.label).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    svg.appendChild(label);
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const last = values[values.length - 1];
  els.rangeAvg.textContent = formatNumber(avg, state.metric === "spo2_percent" ? " %" : state.metric === "heart_rate_bpm" ? " bpm" : "");
  els.rangeMinMax.textContent = `${formatNumber(minValue)} / ${formatNumber(maxValue)}`;
  els.rangeLast.textContent = formatNumber(last, state.metric === "spo2_percent" ? " %" : state.metric === "heart_rate_bpm" ? " bpm" : "");
  els.rangeAvgLabel.textContent = `${data.length} points sur ${state.range}`;
  els.rangeLastLabel.textContent = `Dernière donnée le ${formatDate(data.at(-1).label)}`;
  legend.textContent = `Série affichée: ${metricLabel(state.metric)}.`;
}

function metricLabel(metric) {
  return {
    heart_rate_bpm: "Fréquence cardiaque",
    spo2_percent: "SpO2",
    step_count: "Pas cumulés",
    signal_quality: "Qualité signal",
  }[metric] || metric;
}

function renderStats() {
  renderChart(state.datas);
}

async function loadData() {
  if (!state.user) return;

  els.loginHint.textContent = "Chargement des données…";
  try {
    const [datasPayload, statisticsPayload] = await Promise.all([
      apiFetch(`/api/datas/${state.user.id}?limit=500`),
      apiFetch(`/api/statistics/${state.user.id}`),
    ]);
    state.datas = extractMeasurements(datasPayload);
    state.statistics = statisticsPayload.statistics || null;
    updateDashboard();
    renderStats();
    setConnection(true, "Connecté");
    els.lastSync.textContent = formatDate(new Date().toISOString());
    els.loginHint.textContent = "Données synchronisées.";
  } catch (error) {
    setConnection(false, "Erreur API");
    els.loginHint.textContent = error.message;
  }
}

function startPolling() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(loadData, 15000);
  if (state.liveTimer) clearInterval(state.liveTimer);
  state.liveTimer = setInterval(() => {
    if (!els.appShell.classList.contains("hidden")) loadData();
  }, 30000);
}

async function login(email, password) {
  const response = await apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  state.token = response.token;
  state.user = response.user;
  saveSession();
  showApp();
  await loadData();
  startPolling();
}

async function logout() {
  try {
    if (state.token) {
      await apiFetch("/api/logout", { method: "POST", body: "{}" });
    }
  } catch {
    // Stateless logout: local cleanup still happens even if the backend is unavailable.
  }
  clearSession();
  showLogin("Déconnecté");
}

function bindEvents() {
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.apiBaseUrl = els.apiBaseUrl.value.trim().replace(/\/$/, "");
    saveSession();
    try {
      await login(els.email.value.trim(), els.password.value);
      setView("dashboardView");
    } catch (error) {
      els.loginHint.textContent = error.message;
      setConnection(false, "Connexion impossible");
    }
  });

  els.refreshBtn.addEventListener("click", loadData);
  els.logoutBtn.addEventListener("click", logout);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  els.metricSelect.addEventListener("change", () => {
    state.metric = els.metricSelect.value;
    renderStats();
  });

  els.rangeSelect.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button) return;
    state.range = button.dataset.range;
    document.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.toggle("active", segment === button);
    });
    renderStats();
  });
}

function boot() {
  loadSession();
  bindEvents();
  if (state.user && state.token) {
    els.apiBaseUrl.value = state.apiBaseUrl;
    showApp();
    setView("dashboardView");
    loadData();
    startPolling();
  } else {
    showLogin("Prêt à se connecter");
  }
}

boot();