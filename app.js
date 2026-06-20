// --- MAIN APPLICATION ENTRY ---
window.events = [];
window.updates = [];
window.eventMarkers = [];
window.currentDraftGeoJSON = null;

// --- POLLING ---
setInterval(() => { fetchEvents(); fetchUpdates(); }, 5000);
fetchEvents();
fetchUpdates();

// --- EVENT TYPE & CONGESTION TOGGLE ---
document.getElementById('eventType').addEventListener('change', function() {
    document.getElementById('congestionLevel').style.display = this.value === 'Traffic Incident' ? 'inline-block' : 'none';
});

// --- SIMPLE PIN REPORT (Standard Report) ---
function getLocationData() {
    const sel = document.getElementById('locationSelect').value;
    if (sel === 'custom') {
        if (!customLatLng) { alert("Tap map to drop a pin first."); return null; }
        const name = document.getElementById('custom-loc-name').value || "Custom Location";
        return { name, lat: customLatLng.lat, lng: customLatLng.lng };
    } else { return stations[parseInt(sel)]; }
}

async function reportEvent() {
    const loc = getLocationData();
    if (!loc) return;
    const type = document.getElementById('eventType').value;
    const hours = parseFloat(document.getElementById('duration').value);
    const congestion = document.getElementById('congestionLevel').value;
    const start = new Date().toISOString(); // Start time button (implicit)
    const estimated_end = new Date(Date.now() + hours * 3600000).toISOString();
    await postEvent({ name: loc.name, lat: loc.lat, lng: loc.lng, type, congestion: type === 'Traffic Incident' ? congestion : null, start, estimated_end, closed_at: null });
}

async function simulateRandom() {
    const station = stations[Math.floor(Math.random() * stations.length)];
    const types = ['Demonstration', 'Traffic Incident'];
    const type = types[Math.floor(Math.random() * types.length)];
    const hours = 1 + Math.random() * 4;
    const start = new Date().toISOString();
    const estimated_end = new Date(Date.now() + hours * 3600000).toISOString();
    await postEvent({
        name: station.name, lat: station.lat, lng: station.lng, type,
        congestion: type === 'Traffic Incident' ? ['Low','Medium','High'][Math.floor(Math.random()*3)] : null,
        start, estimated_end, closed_at: null
    });
}

async function clearAllClosed() {
    const toDelete = window.events.filter(e => e.closed_at);
    for (let e of toDelete) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_EVENTS}/${e.id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
    }
    fetchEvents();
}

// --- PWA ---
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }