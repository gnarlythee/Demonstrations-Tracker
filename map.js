// --- MAP SETUP & DRAWING LOGIC ---
const map = L.map('map').setView([-1.286389, 36.817223], 12);

const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OSM & CARTO' });
const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });
streetLayer.addTo(map);
let currentLayer = 'street';

function toggleMap() {
    const btn = document.getElementById('toggleBtn');
    if (currentLayer === 'street') { map.removeLayer(streetLayer); satLayer.addTo(map); currentLayer = 'sat'; btn.innerText = '🗺️ Street'; } 
    else { map.removeLayer(satLayer); streetLayer.addTo(map); currentLayer = 'street'; btn.innerText = '🛰️ Satellite'; }
}

// --- DRAW TOOL ---
let drawControl = null;
let isDrawing = false;
const drawLayer = L.featureGroup().addTo(map);

function toggleDraw() {
    const btn = document.querySelector('.draw-btn');
    const instructions = document.getElementById('drawInstructions');
    if (isDrawing) {
        if (drawControl) map.removeControl(drawControl);
        drawControl = null; isDrawing = false;
        btn.innerText = '✏️ Draw Zone/Route';
        instructions.style.display = 'none';
        map.getContainer().style.cursor = '';
    } else {
        drawControl = new L.Control.Draw({
            position: 'topright',
            draw: { polygon: { allowIntersection: false, showArea: true }, polyline: { shapeOptions: { color: '#1976d2', weight: 3 } }, rectangle: false, circle: false, marker: false, circlemarker: false },
            edit: false
        });
        map.addControl(drawControl);
        isDrawing = true;
        btn.innerText = '⏹️ Stop Drawing';
        instructions.style.display = 'block';
        map.getContainer().style.cursor = 'crosshair';
    }
}

// When a commander finishes drawing a shape
map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    window.currentDraftGeoJSON = layer.toGeoJSON();
    drawLayer.addLayer(layer);
    
    document.getElementById('helper-msg').classList.add('hidden');
    document.getElementById('intel-entry-form').classList.add('active');
    document.getElementById('panel-title').innerText = "Submit Intelligence";
});

function cancelDraft() {
    drawLayer.clearLayers();
    window.currentDraftGeoJSON = null;
    document.getElementById('intel-entry-form').classList.remove('active');
    document.getElementById('helper-msg').classList.remove('hidden');
    document.getElementById('panel-title').innerText = "Operations Log";
    renderList();
}

// --- HEATMAP LOGIC ---
let heatLayer = null;
let heatmapActive = false;

function toggleHeatmap() {
    const btn = document.getElementById('heatmapToggle');
    heatmapActive = !heatmapActive;
    if (heatmapActive) { btn.innerText = '🔥 Hide Prevalence'; updateHeatmap(); } 
    else { if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; } btn.innerText = '🔥 Prevalence'; }
}

function updateHeatmap() {
    if (!heatmapActive) return;
    if (heatLayer) map.removeLayer(heatLayer);
    const now = new Date();
    const activePoints = window.events
        .filter(e => !e.closed_at && now < new Date(e.estimated_end) && e.lat && e.lng)
        .map(e => [e.lat, e.lng]);
    if (activePoints.length === 0) return;
    heatLayer = L.heatLayer(activePoints, { radius: 30, blur: 20, maxZoom: 15, gradient: {0.2:'blue',0.4:'lime',0.6:'yellow',0.8:'orange',1.0:'red'} }).addTo(map);
}

// --- CUSTOM PIN LOGIC ---
let customMarker = null;
let customLatLng = null;
map.on('click', function(e) {
    const sel = document.getElementById('locationSelect');
    if (sel.value !== 'custom') return;
    if (customMarker) map.removeLayer(customMarker);
    customLatLng = e.latlng;
    customMarker = L.marker([customLatLng.lat, customLatLng.lng], { draggable: true, icon: L.divIcon({ html: '📍', className: 'custom-pin', iconSize: [24,24] }) }).addTo(map);
    customMarker.on('dragend', function() { customLatLng = customMarker.getLatLng(); });
    document.getElementById('custom-loc-name').style.display = 'inline-block';
    customMarker.bindPopup("Commenced here").openPopup();
});

document.getElementById('locationSelect').addEventListener('change', function() {
    if (this.value === 'custom') {
        document.getElementById('custom-loc-name').style.display = 'inline-block';
        if (!customMarker) map.getContainer().style.cursor = 'crosshair';
    } else {
        document.getElementById('custom-loc-name').style.display = 'none';
        map.getContainer().style.cursor = '';
        if (customMarker) { map.removeLayer(customMarker); customMarker = null; customLatLng = null; }
    }
});

// Plot stations
stations.forEach((s, i) => {
    L.marker([s.lat, s.lng], { icon: L.divIcon({ html: '📌', iconSize: [20,20] }) }).bindPopup(`<b>${s.name}</b>`).addTo(map);
    const opt = document.createElement('option'); opt.value = i; opt.innerText = s.name;
    document.getElementById('locationSelect').appendChild(opt);
});