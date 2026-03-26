const fs = require('fs');

const zones = ["NORTH", "EAST", "WEST", "SOUTH"];
const types = ["Intrusion", "Drone activity", "Sensor trigger", "Border breach"];
const severities = ["LOW", "MEDIUM", "HIGH"];
const units = ["ALPHA-1", "BRAVO-2", "CHARLIE-3", "DRONE-7"];
const statuses = ["Open", "Investigating", "Resolved"];

// Base coordinates (Delhi-like border simulation)
const zoneCoords = {
    NORTH: { lat: 28.9, lng: 77.1 },
    EAST: { lat: 28.6, lng: 77.4 },
    WEST: { lat: 28.6, lng: 76.9 },
    SOUTH: { lat: 28.3, lng: 77.2 }
};

function getRandomOffset() {
    return (Math.random() - 0.5) * 0.1;
}

function getSeverity(hour, burstMode) {
    if (burstMode) return "HIGH";

    if (hour >= 20 || hour <= 5) {
        return Math.random() < 0.6 ? "HIGH" : "MEDIUM";
    }

    return Math.random() < 0.7 ? "LOW" : "MEDIUM";
}

function getType() {
    const rand = Math.random();
    if (rand < 0.35) return "Sensor trigger";
    if (rand < 0.6) return "Intrusion";
    if (rand < 0.85) return "Drone activity";
    return "Border breach";
}

function getSource(type) {
    if (type === "Drone activity") return "drone";
    if (type === "Sensor trigger") return "sensor";
    if (type === "Intrusion") return "sensor";
    return "satellite";
}

function generateDetails(type, severity) {
    const messages = {
        "Intrusion": [
            "Unauthorized movement detected via infrared sensors",
            "Multiple intruders detected attempting coordinated crossing",
            "Suspicious activity detected near border fence"
        ],
        "Drone activity": [
            "Unidentified UAV detected near restricted airspace",
            "Low-altitude drone movement detected along border",
            "High-altitude UAV entering restricted zone"
        ],
        "Sensor trigger": [
            "Thermal anomaly detected, possible wildlife movement",
            "Ground vibration detected, no threat confirmed",
            "Environmental fluctuation detected by sensors"
        ],
        "Border breach": [
            "Fence breach detected with structural damage",
            "Unauthorized crossing attempt confirmed",
            "Multiple entry points detected in perimeter"
        ]
    };

    const base = messages[type][Math.floor(Math.random() * messages[type].length)];
    return `${base} (Severity: ${severity})`;
}

let data = [];
let burstMode = false;

for (let i = 0; i < 500; i++) {
    const baseTime = new Date(2026, 2, 1, 0, 0);
    baseTime.setMinutes(baseTime.getMinutes() + i * 10);

    const hour = baseTime.getHours();

    // Trigger burst occasionally
    if (Math.random() < 0.05) burstMode = true;
    if (Math.random() < 0.1) burstMode = false;

    const zone = zones[Math.floor(Math.random() * zones.length)];
    const type = burstMode ? "Intrusion" : getType();
    const severity = getSeverity(hour, burstMode);
    const coordBase = zoneCoords[zone];

    data.push({
        id: "INC-" + (100000 + i),
        date: baseTime.toLocaleDateString(),
        time: baseTime.toLocaleTimeString().slice(0, 5),
        zone: zone,
        type: type,
        severity: severity,
        responseUnit: units[Math.floor(Math.random() * units.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        details: generateDetails(type, severity),
        lat: +(coordBase.lat + getRandomOffset()).toFixed(4),
        lng: +(coordBase.lng + getRandomOffset()).toFixed(4),
        source: getSource(type)
    });
}

fs.writeFileSync('hybrid_incidents.json', JSON.stringify(data, null, 2));

console.log("✅ Hybrid dataset generated: hybrid_incidents.json (500 records)");