// --- UI RENDERING & POPUPS ---

function updateBadges() {
    const active = window.events.filter(e => !e.closed_at);
    document.getElementById('stat-high').innerText = active.filter(e => e.intensity === 'High').length;
    document.getElementById('stat-med').innerText = active.filter(e => e.intensity === 'Medium').length;
    document.getElementById('stat-closed').innerText = window.events.filter(e => e.closed_at).length;
}

function renderMapMarkers() {
    window.eventMarkers?.forEach(m => map.removeLayer(m));
    window.eventMarkers = [];
    const now = new Date();

    window.events.forEach(e => {
        const start = new Date(e.start);
        const estimated_end = new Date(e.estimated_end);
        const isClosed = e.closed_at !== null;
        let progress = 100, isActive = false;
        if (isClosed) { progress = 100; isActive = false; } 
        else {
            const total = estimated_end - start;
            const elapsed = now - start;
            progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
            isActive = progress < 100;
        }

        let color = '#95a5a6';
        if (!isClosed && isActive) {
            if (e.type === 'Demonstration') {
                if (e.intensity === 'Low') color = '#f1c40f';
                else if (e.intensity === 'Medium') color = '#f39c12';
                else if (e.intensity === 'High') color = '#e74c3c';
            } else {
                if (e.congestion === 'Low') color = '#27ae60';
                else if (e.congestion === 'Medium') color = '#f39c12';
                else if (e.congestion === 'High') color = '#e74c3c';
            }
        }

        if (e.geometry) {
            try {
                const geo = JSON.parse(e.geometry);
                const layer = L.geoJSON(geo, {
                    style: isClosed ? { color: '#95a5a6', fillColor: '#95a5a6', fillOpacity: 0.15, weight: 2, dashArray: '5 5' } 
                                    : { color: color, fillColor: color, fillOpacity: 0.4, weight: 4 }
                }).addTo(map);
                window.eventMarkers.push(layer);
                layer.bindPopup(buildPopupContent(e, start, estimated_end, isClosed, progress, isActive, color));
                return;
            } catch (err) { console.error("Invalid geometry", err); }
        }

        if (e.lat && e.lng) {
            const marker = L.circleMarker([e.lat, e.lng], { radius: 10, color, fillColor: color, fillOpacity: 0.8 }).addTo(map);
            window.eventMarkers.push(marker);
            marker.bindPopup(buildPopupContent(e, start, estimated_end, isClosed, progress, isActive, color));
        }
    });
}

function buildPopupContent(e, start, estimated_end, isClosed, progress, isActive, color) {
    const trafficInfo = e.type === 'Traffic Incident' && e.congestion ? `<br>🚦 Congestion: <b>${e.congestion}</b>` : '';
    const closedInfo = isClosed ? `<br><b>🛑 Stopped:</b> ${new Date(e.closed_at).toLocaleTimeString()}` : '';
    const stopBtn = (!isClosed && isActive) ? `<button class="close-btn-popup" onclick="stopEvent('${e.id}')">🛑 STOP & RESOLVE</button>` : '';

    let dataHTML = '';
    if (e.type === 'Demonstration') {
        dataHTML = `
            <div class="data-form">
                <b>Detailed Report:</b>
                <div class="row"><div><label>Demonstrators:</label> <span>${e.demonstrators || 'N/A'}</span></div>
                <div><label>Criminals:</label> <span>${e.criminals || 'N/A'}</span></div></div>
                <div class="row"><div><label>Watchers:</label> <span>${e.watchers || 'N/A'}</span></div></div>
                <label>Business Impact:</label> <span>${e.business_impact || 'N/A'}</span>
                <label>Damages:</label> <span>${e.damages || 'N/A'}</span>
                ${e.photos && e.photos.length ? `<label>Photos/Videos:</label> ${e.photos.map(p => `<a href="${p.url}" target="_blank">📷</a>`).join(' ')}` : ''}
            </div>
        `;
    }

    let updateFeedHTML = `<div class="update-feed" id="feed-${e.id}">`;
    const eventUpdates = window.updates.filter(u => u.event_id === e.id);
    if (eventUpdates.length === 0) updateFeedHTML += `<em style="color:#888;">No contributions yet.</em>`;
    else {
        eventUpdates.slice(0, 5).forEach(u => {
            updateFeedHTML += `<div class="update-item"><b>${u.member_name}</b> <span style="color:#888;font-size:11px;">${new Date(u.timestamp).toLocaleTimeString()}</span><br>${u.message}</div>`;
        });
    }
    updateFeedHTML += `</div>
        <div style="margin-top:6px; display:flex; gap:4px;">
            <input type="text" id="msg-${e.id}" placeholder="Add live update..." style="flex:1; padding:4px; font-size:12px;">
            <button class="update-btn" onclick="postUpdate('${e.id}', document.getElementById('msg-${e.id}').value)">Post</button>
        </div>`;

    return `
        <div style="max-width:350px;">
            <b style="color:${color};">${e.type}</b>${trafficInfo}<br>
            <b>${e.name}</b><br>
            <b>🟢 Start:</b> ${start.toLocaleTimeString()}<br>
            <b>⏰ Est. End:</b> ${estimated_end.toLocaleTimeString()}<br>
            ${closedInfo}
            <div class="popup-progress"><div style="width:${progress}%; background:${color};"></div></div>
            <span>${isClosed?'✅ Resolved':(isActive?'🟢 Active':'⏳ Expired')}</span><br>
            ${stopBtn}
            <button class="share-btn" onclick="shareWhatsApp(${e.lat||0}, ${e.lng||0}, '${e.name}')">📱 Share with Police</button>
            <hr style="margin:8px 0;">
            ${dataHTML}
            <hr style="margin:8px 0;">
            <b>📢 Live Contributions</b>
            ${updateFeedHTML}
        </div>
    `;
}

function renderList() {
    const div = document.getElementById('events-list');
    if (document.getElementById('intel-entry-form').classList.contains('active')) return;
    if (window.events.length === 0) { div.innerHTML = '<em>No shared events yet.</em>'; return; }
    let html = `<b>Shared Reports (${window.events.length}):</b><br>`;
    window.events.forEach(e => {
        const isClosed = e.closed_at !== null;
        const isActive = !isClosed && new Date() < new Date(e.estimated_end);
        const borderColor = isClosed ? '#95a5a6' : (isActive ? '#e74c3c' : '#f39c12');
        const updateCount = window.updates.filter(u => u.event_id === e.id).length;
        html += `
            <div class="event-item" style="border-left-color:${borderColor};${isClosed?'opacity:0.6;':''}">
                <div><b>${e.type}</b> ${e.congestion ? `(${e.congestion})` : ''} [${e.intensity||'Medium'}] at <b>${e.name}</b>
                <br><small>🟢 ${new Date(e.start).toLocaleTimeString()} | ${isClosed?'✅ Stopped':(isActive?'🟢 Active':'⏳ Expired')} | 💬 ${updateCount}</small></div>
                <div>${!isClosed && isActive ? `<button class="close-btn" onclick="stopEvent('${e.id}')">🛑 Stop</button>` : ''}</div>
            </div>
        `;
    });
    div.innerHTML = html;
}

function shareWhatsApp(lat, lng, name) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    const msg = `URGENT: Event reported at ${name}.\nCoordinates: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}