// ---------- SESSION & LOGIN ----------
const MAX_INCIDENTS = 100;
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

let sessionTimeoutHandle = null;
let sessionStartTime = null;
let lastActivityTime = null;
let currentUser = null;
let currentRole = null;

const loginPage = document.getElementById("login-page");
const dashboard = document.getElementById("dashboard");
const loginStatus = document.getElementById("login-status");
const lastLoginDisplay = document.getElementById("last-login");
const userRoleDisplay = document.getElementById("user-role-display");
const sessionTimerEl = document.getElementById("session-timer");

// fake simple auth
const VALID_USERS = {
    commander: { code: "CMD123" },
    analyst: { code: "ANA123" },
    field: { code: "FLD123" }
};

document.getElementById("loginBtn").addEventListener("click", () => {
    const officerId = document.getElementById("officerId").value.trim();
    const secureCode = document.getElementById("secureCode").value.trim();
    const role = document.getElementById("role").value;

    if (!officerId || !secureCode) {
        loginStatus.textContent = "Enter Officer ID and Secure Code";
        loginStatus.style.color = "#f97316";
        return;
    }

    const roleConf = VALID_USERS[role];
    if (!roleConf || secureCode !== roleConf.code) {
        loginStatus.textContent = "Invalid credentials or role";
        loginStatus.style.color = "#f87171";
        return;
    }

    currentUser = officerId;
    currentRole = role;
    const now = new Date();
    sessionStartTime = now;
    lastActivityTime = now;

    const prev = localStorage.getItem("lastLogin");
    if (prev) {
        lastLoginDisplay.textContent = `Last Login: ${prev}`;
    }

    const stamp = now.toLocaleString();
    localStorage.setItem("lastLogin", stamp);

    startSessionTimer();
    attachActivityListeners();

    loginStatus.textContent = "Access granted.";
    loginStatus.style.color = "#22c55e";

    setTimeout(() => {
        loginPage.classList.add("hidden");
        dashboard.classList.remove("hidden");
        initDashboard();
    }, 400);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    endSession("Session terminated");
});

function startSessionTimer() {
    if (sessionTimeoutHandle) clearInterval(sessionTimeoutHandle);
    sessionTimeoutHandle = setInterval(() => {
        const now = new Date();
        const elapsed = now - sessionStartTime;
        const inactive = now - lastActivityTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);

        sessionTimerEl.textContent = `Session: ${mins}m ${secs}s | Inactive: ${Math.floor(inactive / 1000)}s`;

        if (inactive >= INACTIVITY_LIMIT_MS) {
            endSession("Auto logout due to inactivity");
        }
    }, 1000);
}

function attachActivityListeners() {
    ["click", "keydown", "mousemove"].forEach(ev => {
        window.addEventListener(ev, () => {
            lastActivityTime = new Date();
        });
    });
}

function endSession(reason) {
    if (sessionTimeoutHandle) clearInterval(sessionTimeoutHandle);
    currentUser = null;
    currentRole = null;
    dashboard.classList.add("hidden");
    loginPage.classList.remove("hidden");
    loginStatus.textContent = reason;
    loginStatus.style.color = "#f97316";
}

// ---------- CLOCK + HERO ----------

const currentTimeEl = document.getElementById("current-time");
const lastSyncEl = document.getElementById("last-sync");
const heroThreatLevelEl = document.getElementById("hero-threat-level");
const heroActiveSectorEl = document.getElementById("hero-active-sector");
const systemHealthEl = document.getElementById("system-health");

function initClock() {
    setInterval(() => {
        const now = new Date();
        currentTimeEl.textContent = now.toLocaleTimeString();
    }, 1000);
}

function updateSync() {
    lastSyncEl.textContent = new Date().toLocaleTimeString();
}

// ---------- KPIs & SIMULATION ----------

const kpiThreatLevelEl = document.getElementById("kpi-threat-level");
const kpiIncidentsEl = document.getElementById("kpi-incidents");
const kpiPatrolEl = document.getElementById("kpi-patrol");
const kpiAssetsEl = document.getElementById("kpi-assets");

let globalThreatLevel = "LOW";
let activeIncidents = 0;
let patrolActive = 4;
let assetsOnline = 12;

function updateKPI() {
    kpiThreatLevelEl.textContent = globalThreatLevel;
    kpiIncidentsEl.textContent = activeIncidents.toString();
    kpiPatrolEl.textContent = patrolActive.toString();
    kpiAssetsEl.textContent = assetsOnline.toString();

    heroThreatLevelEl.textContent = globalThreatLevel;

    heroThreatLevelEl.classList.remove("value-low", "value-med", "value-high");
    kpiThreatLevelEl.style.color = "#22c55e";

    if (globalThreatLevel === "LOW") {
        heroThreatLevelEl.classList.add("value-low");
        systemHealthEl.textContent = "OPERATIONAL";
        systemHealthEl.className = "value value-ok";
    } else if (globalThreatLevel === "MEDIUM") {
        heroThreatLevelEl.classList.add("value-med");
        systemHealthEl.textContent = "DEGRADED";
        systemHealthEl.className = "value value-med";
        kpiThreatLevelEl.style.color = "#eab308";
    } else {
        heroThreatLevelEl.classList.add("value-high");
        systemHealthEl.textContent = "CRITICAL";
        systemHealthEl.className = "value value-high";
        kpiThreatLevelEl.style.color = "#ef4444";
    }
}

// ---------- ACTIVITY FEED ----------

const activityListEl = document.getElementById("activity-list");
const MAX_ACTIVITY_LOGS = 10;

function pushActivity({ time, message, sector, severity }) {
    const item = document.createElement("div");
    item.className = "activity-item";

    const meta = document.createElement("div");
    meta.className = "activity-meta";

    const tSpan = document.createElement("span");
    tSpan.textContent = time;
    const sSpan = document.createElement("span");
    sSpan.textContent = sector;

    const sevBadge = document.createElement("span");
    sevBadge.className = "badge " + (severity === "HIGH" ? "badge-high" : severity === "MEDIUM" ? "badge-medium" : "badge-low");
    sevBadge.textContent = severity;

    meta.appendChild(tSpan);
    meta.appendChild(sSpan);
    meta.appendChild(sevBadge);

    const msg = document.createElement("div");
    msg.className = "activity-msg";
    msg.textContent = message;

    item.appendChild(meta);
    item.appendChild(msg);

    activityListEl.insertBefore(item, activityListEl.firstChild);

    while (activityListEl.childElementCount > MAX_ACTIVITY_LOGS) {
        activityListEl.removeChild(activityListEl.lastChild);
    }
}

// ---------- MAP (Leaflet) ----------

let map;
let heatLayer;
let markerLayer;
let routeLayer;

const baseLat = 28.6;
const baseLng = 77.2;

const sectors = {
    NORTH: { lat: baseLat + 0.3, lng: baseLng },
    EAST: { lat: baseLat, lng: baseLng + 0.3 },
    WEST: { lat: baseLat, lng: baseLng - 0.3 },
    SOUTH: { lat: baseLat - 0.3, lng: baseLng }
};

function initMap() {
    map = L.map("map", {
        zoomControl: false
    }).setView([baseLat, baseLng], 9);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; Carto"
    }).addTo(map);

    const borderCoords = [
        [baseLat + 0.6, baseLng - 0.5],
        [baseLat + 0.6, baseLng + 0.5],
        [baseLat - 0.6, baseLng + 0.5],
        [baseLat - 0.6, baseLng - 0.5]
    ];
    L.polygon(borderCoords, {
        color: "#00ff88",
        weight: 1,
        fillOpacity: 0.03
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);

    heatLayer = L.heatLayer([], { radius: 25, blur: 20, maxZoom: 11 }).addTo(map);

    drawPatrolRoute();
}

function randomIncidentPoint(zone) {
    const base = sectors[zone];
    const lat = base.lat + (Math.random() - 0.5) * 0.15;
    const lng = base.lng + (Math.random() - 0.5) * 0.15;
    return [lat, lng];
}

function addIncidentMarker(incident) {
    const lat = incident.lat;
    const lng = incident.lng;

    const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: incident.severity === "HIGH" ? "#ff3b3b" : incident.severity === "MEDIUM" ? "#fbbf24" : "#22c55e",
        fillColor: "#000",
        fillOpacity: 0.9
    });

    marker.bindTooltip(
        `${incident.id} | ${incident.type}\n${incident.zone} | ${incident.time}\nSeverity: ${incident.severity}`,
        { direction: "top" }
    );

    markerLayer.addLayer(marker);

    const heatWeight = incident.severity === "HIGH" ? 1 : incident.severity === "MEDIUM" ? 0.7 : 0.4;
    heatLayer.addLatLng([lat, lng, heatWeight]);
}

function drawPatrolRoute() {
    routeLayer.clearLayers();
    const coords = [
        [sectors.WEST.lat, sectors.WEST.lng],
        [sectors.NORTH.lat, sectors.NORTH.lng],
        [sectors.EAST.lat, sectors.EAST.lng],
        [sectors.SOUTH.lat, sectors.SOUTH.lng],
        [sectors.WEST.lat, sectors.WEST.lng]
    ];
    L.polyline(coords, {
        color: "#38bdf8",
        weight: 2,
        dashArray: "4,8"
    }).addTo(routeLayer);
}

// ---------- CHARTS ----------

let zoneBarChart, trendLineChart, typeDoughnutChart, heatMatrixChart;

const zoneNames = ["NORTH", "EAST", "WEST", "SOUTH"];
let zoneIncidentCount = { NORTH: 0, EAST: 0, WEST: 0, SOUTH: 0 };

let trendLabels = [];
let trendCounts = [];

let typeCounts = {
    Intrusion: 0,
    "Drone activity": 0,
    "Sensor trigger": 0,
    "Border breach": 0
};

let heatMatrixData = [
    [0, 0, 0, 0], // NORTH, EAST, WEST, SOUTH
    [0, 0, 0, 0]
];

function initCharts() {
    const zoneCtx = document.getElementById("zoneBarChart").getContext("2d");
    zoneBarChart = new Chart(zoneCtx, {
        type: "bar",
        data: {
            labels: zoneNames,
            datasets: [{
                label: "Incidents",
                data: zoneNames.map(z => zoneIncidentCount[z]),
                backgroundColor: "rgba(34, 197, 94, 0.5)",
                borderColor: "#22c55e",
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    const trendCtx = document.getElementById("trendLineChart").getContext("2d");
    trendLineChart = new Chart(trendCtx, {
        type: "line",
        data: {
            labels: trendLabels,
            datasets: [{
                label: "Incidents",
                data: trendCounts,
                fill: false,
                borderColor: "#38bdf8",
                tension: 0.3
            }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });

    const typeCtx = document.getElementById("typeDoughnutChart").getContext("2d");
    typeDoughnutChart = new Chart(typeCtx, {
        type: "doughnut",
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: ["#22c55e", "#38bdf8", "#eab308", "#ef4444"]
            }]
        },
        options: {
            plugins: { legend: { position: "bottom" } }
        }
    });

    const heatCtx = document.getElementById("heatMatrixChart").getContext("2d");
    heatMatrixChart = new Chart(heatCtx, {
        type: "bar",
        data: {
            labels: zoneNames,
            datasets: [
                {
                    label: "Recent Hour",
                    data: heatMatrixData[0],
                    backgroundColor: "rgba(239, 68, 68, 0.4)"
                },
                {
                    label: "Previous Hour",
                    data: heatMatrixData[1],
                    backgroundColor: "rgba(148, 163, 184, 0.4)"
                }
            ]
        },
        options: {
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function refreshCharts() {
    zoneBarChart.data.datasets[0].data = zoneNames.map(z => zoneIncidentCount[z]);
    zoneBarChart.update();

    trendLineChart.data.labels = trendLabels;
    trendLineChart.data.datasets[0].data = trendCounts;
    trendLineChart.update();

    typeDoughnutChart.data.datasets[0].data = Object.values(typeCounts);
    typeDoughnutChart.update();

    heatMatrixChart.data.datasets[0].data = heatMatrixData[0];
    heatMatrixChart.data.datasets[1].data = heatMatrixData[1];
    heatMatrixChart.update();
}

// ---------- ANALYTICS PANELS ----------

const highRiskZonesEl = document.getElementById("high-risk-zones");
const avgResponseEl = document.getElementById("avg-response");
const fastResponseEl = document.getElementById("fast-response");
const delayedResponseEl = document.getElementById("delayed-response");
const patrolUtilEl = document.getElementById("patrol-util");
const droneUptimeEl = document.getElementById("drone-uptime");
const sensorRelEl = document.getElementById("sensor-rel");
const aiPredictionEl = document.getElementById("ai-prediction");

let responseSamples = [];

function updateAnalyticsPanels() {
    const pairs = zoneNames.map(z => ({ zone: z, count: zoneIncidentCount[z] }));
    pairs.sort((a, b) => b.count - a.count);

    highRiskZonesEl.innerHTML = "";
    pairs.slice(0, 2).forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.zone} Sector — Risk Index: ${Math.min(100, p.count * 7)}%`;
        highRiskZonesEl.appendChild(li);
    });

    if (responseSamples.length > 0) {
        const sum = responseSamples.reduce((a, b) => a + b, 0);
        const avg = sum / responseSamples.length;
        const fastest = Math.min(...responseSamples);
        const delayed = (responseSamples.filter(x => x > 8).length / responseSamples.length) * 100;

        avgResponseEl.textContent = avg.toFixed(1);
        fastResponseEl.textContent = fastest.toFixed(1);
        delayedResponseEl.textContent = delayed.toFixed(0);
    } else {
        avgResponseEl.textContent = "0.0";
        fastResponseEl.textContent = "0.0";
        delayedResponseEl.textContent = "0";
    }

    patrolUtilEl.textContent = (70 + Math.random() * 20).toFixed(0);
    droneUptimeEl.textContent = (85 + Math.random() * 10).toFixed(0);
    sensorRelEl.textContent = (95 + Math.random() * 3).toFixed(0);

    const predictedZone = pairs[0].zone;
    aiPredictionEl.textContent = `Predicted High Risk Zone: ${predictedZone} (Next 2 hrs) — Predictive Threat Modeling (Simulated)`;
}

// ---------- PATROL TABLE ----------

const patrolTableBody = document.getElementById("patrol-table-body");
const deployUnitSelect = document.getElementById("deploy-unit");
const deployZoneSelect = document.getElementById("deploy-zone");
const deployPrioritySelect = document.getElementById("deploy-priority");

let patrolUnits = [
    { id: "ALPHA-1", zone: "NORTH", status: "Active", lastCheck: "14:20", battery: 87, assignment: "Perimeter Sweep" },
    { id: "BRAVO-2", zone: "EAST", status: "Standby", lastCheck: "14:15", battery: 98, assignment: "Ready Reserve" },
    { id: "CHARLIE-3", zone: "WEST", status: "Deployed", lastCheck: "14:22", battery: 64, assignment: "Route Patrol" },
    { id: "DRONE-7", zone: "SOUTH", status: "Active", lastCheck: "14:25", battery: 72, assignment: "Aerial Recon" }
];

function renderPatrolTable() {
    patrolTableBody.innerHTML = "";
    patrolUnits.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${u.zone}</td>
            <td><span class="status-pill status-${u.status.toLowerCase()}">${u.status}</span></td>
            <td>${u.lastCheck}</td>
            <td>${u.battery}%</td>
            <td>${u.assignment}</td>
        `;
        patrolTableBody.appendChild(tr);
    });

    deployUnitSelect.innerHTML = "";
    patrolUnits.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.id;
        deployUnitSelect.appendChild(opt);
    });

    patrolActive = patrolUnits.filter(u => u.status === "Active" || u.status === "Deployed").length;
    updateKPI();
}

document.getElementById("deploy-btn").addEventListener("click", () => {
    const unitId = deployUnitSelect.value;
    const zone = deployZoneSelect.value;
    const priority = deployPrioritySelect.value;

    const unit = patrolUnits.find(u => u.id === unitId);
    if (!unit) return;

    unit.zone = zone;
    unit.status = priority === "HIGH" ? "Deployed" : "Active";
    unit.assignment = `${priority} Priority Patrol`;
    unit.lastCheck = new Date().toLocaleTimeString().slice(0, 5);

    pushActivity({
        time: new Date().toLocaleTimeString().slice(0, 5),
        message: `Unit ${unitId} dispatched to ${zone} sector (Priority: ${priority})`,
        sector: zone,
        severity: priority === "HIGH" ? "HIGH" : priority === "MEDIUM" ? "MEDIUM" : "LOW"
    });

    renderPatrolTable();
});

// ---------- INCIDENT DATABASE ----------

const incidentTableBody = document.getElementById("incident-table-body");
const searchIdInput = document.getElementById("search-id");
const filterZoneSelect = document.getElementById("filter-zone");
const filterSeveritySelect = document.getElementById("filter-severity");
const sortTimeBtn = document.getElementById("sort-time");
const exportCsvBtn = document.getElementById("export-csv");
const pageInfo = document.getElementById("page-info");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");

const modal = document.getElementById("incident-modal");
const modalClose = document.getElementById("modal-close");
const incidentDetailPre = document.getElementById("incident-detail");

let incidents = [];
let filteredIncidents = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let sortAsc = true;

function generateIncidentId() {
    return "INC-" + Math.floor(100000 + Math.random() * 900000);
}

function addIncidentRecord(incident) {
    incidents.push(incident);

    // 🔥 Remove old data
    if (incidents.length > MAX_INCIDENTS) {
        incidents.shift();
    }

    zoneIncidentCount[incident.zone]++;
    typeCounts[incident.type]++;
    activeIncidents = incidents.length;

    updateKPI();

    const now = new Date();
    const label = now.toLocaleTimeString().slice(0, 5);
    trendLabels.push(label);
    trendCounts.push(activeIncidents);

    if (trendLabels.length > 10) {
        trendLabels.shift();
        trendCounts.shift();
    }

    refreshCharts();
    updateAnalyticsPanels();
    refreshIncidentTable();
}

function matchesFilters(inc) {
    const idFilter = searchIdInput.value.trim().toUpperCase();
    const zoneFilter = filterZoneSelect.value;
    const sevFilter = filterSeveritySelect.value;

    if (idFilter && !inc.id.includes(idFilter)) return false;
    if (zoneFilter && inc.zone !== zoneFilter) return false;
    if (sevFilter && inc.severity !== sevFilter) return false;
    return true;
}

function refreshIncidentTable() {
    filteredIncidents = incidents.filter(matchesFilters);

    filteredIncidents.sort((a, b) => {
        const tA = a.date + " " + a.time;
        const tB = b.date + " " + b.time;
        return sortAsc ? tA.localeCompare(tB) : tB.localeCompare(tA);
    });

    const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredIncidents.slice(start, start + PAGE_SIZE);

    incidentTableBody.innerHTML = "";
    pageItems.forEach(inc => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${inc.id}</td>
            <td>${inc.date}</td>
            <td>${inc.time}</td>
            <td>${inc.zone}</td>
            <td>${inc.type}</td>
            <td><span class="severity-badge ${inc.severity === "HIGH" ? "sev-high" : inc.severity === "MEDIUM" ? "sev-medium" : "sev-low"}">${inc.severity}</span></td>
            <td>${inc.responseUnit}</td>
            <td>${inc.status}</td>
        `;
        tr.addEventListener("click", () => openIncidentModal(inc));
        incidentTableBody.appendChild(tr);
    });

    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
}

searchIdInput.addEventListener("input", () => {
    currentPage = 1;
    refreshIncidentTable();
});

filterZoneSelect.addEventListener("change", () => {
    currentPage = 1;
    refreshIncidentTable();
});

filterSeveritySelect.addEventListener("change", () => {
    currentPage = 1;
    refreshIncidentTable();
});

sortTimeBtn.addEventListener("click", () => {
    sortAsc = !sortAsc;
    refreshIncidentTable();
});

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        refreshIncidentTable();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
    if (currentPage < totalPages) {
        currentPage++;
        refreshIncidentTable();
    }
});

exportCsvBtn.addEventListener("click", () => {
    const rows = [
        ["Incident ID", "Date", "Time", "Zone", "Type", "Severity", "Response Unit", "Status"],
        ...incidents.map(i => [i.id, i.date, i.time, i.zone, i.type, i.severity, i.responseUnit, i.status])
    ];
    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = url;
    tempLink.download = "incident_database.csv";
    tempLink.click();
    URL.revokeObjectURL(url);
});

function openIncidentModal(inc) {
    const text = `
Incident ID: ${inc.id}
Date: ${inc.date}
Time: ${inc.time}
Zone: ${inc.zone}
Type: ${inc.type}
Severity: ${inc.severity}
Response Unit: ${inc.responseUnit}
Status: ${inc.status}

Details:
${inc.details}
    `.trim();
    incidentDetailPre.textContent = text;
    modal.classList.remove("hidden");
}

modalClose.addEventListener("click", () => {
    modal.classList.add("hidden");
});
modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
});

// ---------- SIMULATION ENGINE ----------

const incidentTypes = ["Intrusion", "Drone activity", "Sensor trigger", "Border breach"];
const severities = ["LOW", "MEDIUM", "HIGH"];

let breachMode = false;

document.getElementById("simulate-breach-btn").addEventListener("click", () => {
    breachMode = true;
    globalThreatLevel = "HIGH";
    updateKPI();
    heroActiveSectorEl.textContent = "NORTH-WEST";
    document.body.style.boxShadow = "0 0 50px rgba(239,68,68,0.6) inset";

    for (let i = 0; i < 4; i++) {
        spawnIncident("NORTH", "HIGH");
    }
    pushActivity({
        time: new Date().toLocaleTimeString().slice(0, 5),
        message: "SIMULATION: Border breach detected - NORTH-WEST corridor. Auto dispatch engaged.",
        sector: "NORTH-WEST",
        severity: "HIGH"
    });

    setTimeout(() => {
        breachMode = false;
        globalThreatLevel = "MEDIUM";
        document.body.style.boxShadow = "none";
        updateKPI();
    }, 20000);
});

function spawnIncident(forceZone, forceSeverity) {
    const zone = forceZone || zoneNames[Math.floor(Math.random() * zoneNames.length)];
    const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];

    let severity;
    if (forceSeverity) {
        severity = forceSeverity;
    } else {
        const weight = zoneIncidentCount[zone];
        if (weight > 10 || breachMode) {
            severity = Math.random() < 0.5 ? "HIGH" : "MEDIUM";
        } else {
            severity = severities[Math.floor(Math.random() * severities.length)];
        }
    }

    const now = new Date();
    const inc = {
        id: generateIncidentId(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString().slice(0, 5),
        zone,
        type,
        severity,
        responseUnit: pickResponseUnit(),
        status: "Open",
        details: `${type} detected in ${zone} sector.\nSeverity: ${severity}.\nAuto-generated from field sensors and patrol telemetry.`
    };

    addIncidentRecord(inc);
    addIncidentMarker(inc);

    const msg = `${type} detected — ${zone} Sector`;
    pushActivity({
        time: inc.time,
        message: msg,
        sector: zone,
        severity
    });

    if (severity === "HIGH") {
        globalThreatLevel = "HIGH";
    } else if (severity === "MEDIUM" && globalThreatLevel === "LOW") {
        globalThreatLevel = "MEDIUM";
    }
    updateKPI();
    updateSync();
}

function pickResponseUnit() {
    const active = patrolUnits.filter(u => u.status === "Active" || u.status === "Deployed");
    if (active.length === 0) return "N/A";
    const idx = Math.floor(Math.random() * active.length);
    return active[idx].id;
}

// ---------- ROLE-BASED ACCESS ----------

function applyRolePermissions() {
    userRoleDisplay.textContent = `Officer: ${currentUser} — Role: ${currentRole.toUpperCase()}`;

    if (currentRole === "analyst") {
        document.querySelector(".patrol-section").style.opacity = "0.4";
        document.querySelector(".patrol-section").style.pointerEvents = "none";
    } else if (currentRole === "field") {
        document.querySelector(".analytics").style.opacity = "0.4";
        document.querySelector(".analytics").style.pointerEvents = "none";
    } else {
        document.querySelector(".patrol-section").style.opacity = "1";
        document.querySelector(".patrol-section").style.pointerEvents = "auto";
        document.querySelector(".analytics").style.opacity = "1";
        document.querySelector(".analytics").style.pointerEvents = "auto";
    }
}

// ---------- TOGGLES ----------

document.getElementById("toggle-heat").addEventListener("change", (e) => {
    if (e.target.checked) {
        map.addLayer(heatLayer);
    } else {
        map.removeLayer(heatLayer);
    }
});

document.getElementById("toggle-markers").addEventListener("change", (e) => {
    if (e.target.checked) {
        map.addLayer(markerLayer);
    } else {
        map.removeLayer(markerLayer);
    }
});

document.getElementById("toggle-routes").addEventListener("change", (e) => {
    if (e.target.checked) {
        map.addLayer(routeLayer);
    } else {
        map.removeLayer(routeLayer);
    }
});

async function loadIncidentsFromAPI() {
    const res = await fetch("http://localhost:3000/api/incidents");
    const data = await res.json();

    // 🔥 LIMIT TO LAST 80 INCIDENTS
    const recent = data.slice(-80);

    recent.forEach(inc => {
        addIncidentRecord(inc);
        addIncidentMarker(inc);
    });
}

function startLiveUpdates() {
    setInterval(async () => {
        const res = await fetch("http://localhost:3000/api/incidents/live");
        const inc = await res.json();

        addIncidentRecord(inc);
        addIncidentMarker(inc);

        pushActivity({
            time: inc.time,
            message: inc.type + " detected — " + inc.zone,
            sector: inc.zone,
            severity: inc.severity
        });

    }, 15000);
}
// ---------- INIT DASHBOARD ----------

function initDashboard() {
    initClock();
    initMap();
    initCharts();
    renderPatrolTable();
    applyRolePermissions();
    updateSync();
    heroActiveSectorEl.textContent = "NORTH";

    // 🔥 Load real dataset
    loadIncidentsFromAPI();

    // 🔥 Start live updates
    startLiveUpdates();
}