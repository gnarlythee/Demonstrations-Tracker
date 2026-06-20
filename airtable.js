// --- AIRTABLE DATA LAYER ---

// Fetch Events
async function fetchEvents() {
    try {
        const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_EVENTS}`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await res.json();
        window.events = data.records.map(r => ({
            id: r.id,
            name: r.fields.name,
            lat: r.fields.lat,
            lng: r.fields.lng,
            type: r.fields.type,
            congestion: r.fields.congestion,
            intensity: r.fields.intensity || 'Medium',
            geometry: r.fields.geometry,
            demonstrators: r.fields.demonstrators,
            criminals: r.fields.criminals,
            watchers: r.fields.watchers,
            business_impact: r.fields.business_impact,
            damages: r.fields.damages,
            photos: r.fields.photos,
            start: r.fields.start,
            estimated_end: r.fields.estimated_end,
            closed_at: r.fields.closed_at
        }));
        updateBadges();
        renderMapMarkers();
        renderList();
        updateHeatmap();
    } catch (e) { console.error("Event fetch error", e); }
}

// Fetch Updates
async function fetchUpdates() {
    try {
        const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_UPDATES}?sort[0][field]=timestamp&sort[0][direction]=desc`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await res.json();
        window.updates = data.records.map(r => ({
            id: r.id,
            event_id: r.fields.event_id,
            member_name: r.fields.member_name,
            message: r.fields.message,
            timestamp: r.fields.timestamp
        }));
        renderMapMarkers();
    } catch (e) { console.error("Update fetch error", e); }
}

// Post Event
async function postEvent(data) {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_EVENTS}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: data })
    });
    fetchEvents();
}

// Patch Event
async function patchEvent(id, updates) {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_EVENTS}/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: updates })
    });
    fetchEvents();
}

// Post Update (Live Feed)
async function postUpdate(eventId, message) {
    const memberName = document.getElementById('memberName').value.trim() || "Commander";
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE_UPDATES}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            fields: { event_id: eventId, member_name: memberName, message: message, timestamp: new Date().toISOString() }
        })
    });
    fetchUpdates();
}

// Helper: Convert File to Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Strip data:image/png;base64,
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Submit Comprehensive Intel Report (with Media Uploads)
async function submitIntelReport() {
    if (!window.currentDraftGeoJSON) return alert("Please draw a zone on the map first.");
    
    const name = document.getElementById('ev-name').value || "Unnamed Axis";
    const intensity = document.getElementById('ev-intensity').value;
    const demonstrators = parseInt(document.getElementById('ev-demos').value) || 0;
    const criminals = parseInt(document.getElementById('ev-crims').value) || 0;
    const watchers = parseInt(document.getElementById('ev-watch').value) || 0;
    const damages = document.getElementById('ev-damages').value || "None reported.";
    const business_impact = document.getElementById('ev-impact').value || "None reported.";
    const start = new Date().toISOString(); // Start Time Button (implicit)
    const geometry = JSON.stringify(window.currentDraftGeoJSON.geometry);
    
    const fileInput = document.getElementById('ev-media');
    const files = fileInput.files;
    let attachments = [];
    
    if (files.length > 0) {
        document.getElementById('intel-entry-form').innerHTML = "<h3 style='text-align:center; color:#27ae60;'>Uploading media...</h3>";
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const base64 = await readFileAsBase64(file);
            attachments.push({ filename: file.name, content: base64 });
        }
    }

    const payload = { name, type: "Demonstration", intensity, demonstrators, criminals, watchers, damages, business_impact, start, geometry, photos: attachments };
    document.getElementById('intel-entry-form').innerHTML = "<h3 style='text-align:center; color:#27ae60;'>Transmitting to Command...</h3>";
    
    await postEvent(payload);
    setTimeout(() => location.reload(), 1500);
}

// Stop / Resolve Event (Stop Time Button)
async function stopEvent(id) {
    if(!confirm("Are you sure you want to STOP this operation? The area will be marked as resolved.")) return;
    await patchEvent(id, { closed_at: new Date().toISOString() }); // Records Stop Time
    map.closePopup();
}