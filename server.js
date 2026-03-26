const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Load dataset
let incidents = require('./incidents.json');

// Get all incidents
app.get('/api/incidents', (req, res) => {
    res.json(incidents);
});

// Live updates (simulate new incoming data)
app.get('/api/incidents/live', (req, res) => {
    const random = incidents[Math.floor(Math.random() * incidents.length)];

    const newIncident = {
        ...random,
        id: "INC-" + Math.floor(Math.random() * 999999),
        time: new Date().toLocaleTimeString().slice(0,5)
    };

    incidents.push(newIncident);
    res.json(newIncident);
});

app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});