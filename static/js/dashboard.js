// ========== INITIALIZE MAP ==========
const map = L.map('map').setView([23.5937, 85.9629], 6); // Center on India

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

let markers = [];
let incidents = [];

// ========== SEVERITY COLORS ==========
const severityColors = {
    'Critical': '#dc3545',
    'High': '#ff6b6b',
    'Medium': '#ffc107',
    'Low': '#28a745'
};

// ========== LOAD INCIDENTS ==========
async function loadIncidents() {
    try {
        // Get filter values
        const severity = document.getElementById('filter-severity').value;
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;

        // Build query string
        const params = new URLSearchParams();
        if (severity) params.append('severity', severity);
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        const response = await fetch(`/api/incidents?${params}`);
        const data = await response.json();

        if (data.success) {
            incidents = data.incidents;
            updateMap();
            updateIncidentsList();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
        document.getElementById('incidents-list').innerHTML = 
            '<p style="color: red;">Error loading incidents</p>';
    }
}

// ========== UPDATE MAP ==========
function updateMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add new markers
    incidents.forEach(incident => {
        const color = severityColors[incident.severity];
        
        const marker = L.circleMarker([incident.latitude, incident.longitude], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        // Popup
        marker.bindPopup(`
            <b>${incident.type}</b><br>
            <span style="color: ${color}; font-weight: bold;">${incident.severity}</span><br>
            ${incident.description.substring(0, 100)}...<br>
            <small>${incident.reported_at}</small><br>
            <button onclick="showIncidentDetails(${incident.id})">View Details</button>
        `);

        markers.push(marker);
    });

    // Fit map to markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ========== UPDATE INCIDENTS LIST ==========
function updateIncidentsList() {
    const list = document.getElementById('incidents-list');
    
    if (incidents.length === 0) {
        list.innerHTML = '<p>No incidents found</p>';
        return;
    }

    list.innerHTML = incidents.map(incident => `
        <div class="incident-card ${incident.severity.toLowerCase()}" 
             onclick="showIncidentDetails(${incident.id})">
            <div class="incident-header">
                <span class="incident-type">${incident.type}</span>
                <span class="severity-badge ${incident.severity.toLowerCase()}">
                    ${incident.severity}
                </span>
            </div>
            <p>${incident.description.substring(0, 150)}${incident.description.length > 150 ? '...' : ''}</p>
            <small style="color: #666;">
                📍 ${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)} | 
                🕒 ${incident.reported_at}
                ${incident.reporter_name ? ` | 👤 ${incident.reporter_name}` : ''}
            </small>
        </div>
    `).join('');
}

// ========== UPDATE STATS ==========
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('total-count').textContent = data.stats.total;
            document.getElementById('critical-count').textContent = data.stats.critical;
            document.getElementById('open-count').textContent = data.stats.open;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== SHOW INCIDENT DETAILS ==========
window.showIncidentDetails = async function(incidentId) {
    try {
        const response = await fetch(`/api/incident/${incidentId}`);
        const data = await response.json();

        if (data.success) {
            const incident = data.incident;
            const color = severityColors[incident.severity];

            document.getElementById('modal-title').textContent = 
                `Incident #${incident.id} - ${incident.type}`;

            document.getElementById('modal-body').innerHTML = `
                <div style="margin-bottom: 20px;">
                    <span class="severity-badge ${incident.severity.toLowerCase()}">
                        ${incident.severity}
                    </span>
                    <span style="margin-left: 10px; color: #666;">
                        Status: ${incident.status}
                    </span>
                </div>

                <h3>Description</h3>
                <p style="margin-bottom: 20px;">${incident.description}</p>

                <h3>Location</h3>
                <p>📍 ${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}</p>

                ${incident.photo ? `
                    <h3>Photo Evidence</h3>
                    <img src="/static/uploads/${incident.photo}" 
                         style="max-width: 100%; border-radius: 10px; margin: 10px 0;">
                ` : ''}

                ${incident.reporter_name ? `
                    <h3>Reporter Info</h3>
                    <p>👤 ${incident.reporter_name}</p>
                    ${incident.reporter_unit ? `<p>🏢 ${incident.reporter_unit}</p>` : ''}
                    ${incident.reporter_contact ? `<p>📞 ${incident.reporter_contact}</p>` : ''}
                ` : ''}

                <p style="margin-top: 20px; color: #666;">
                    <small>Reported at: ${incident.reported_at}</small>
                </p>

                <div style="margin-top: 20px;">
                    <h3>Update Status</h3>
                    <select id="status-select" style="padding: 10px; border-radius: 5px; width: 100%; margin: 10px 0;">
                        <option value="Open" ${incident.status === 'Open' ? 'selected' : ''}>Open</option>
                        <option value="Investigating" ${incident.status === 'Investigating' ? 'selected' : ''}>Investigating</option>
                        <option value="Resolved" ${incident.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                    <button onclick="updateIncidentStatus(${incident.id})" 
                            style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Update Status
                    </button>
                </div>
            `;

            document.getElementById('incident-modal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading incident details:', error);
        alert('Error loading incident details');
    }
};

// ========== UPDATE INCIDENT STATUS ==========
window.updateIncidentStatus = async function(incidentId) {
    const newStatus = document.getElementById('status-select').value;

    try {
        const response = await fetch(`/api/incident/${incidentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            alert('Status updated successfully');
            closeModal();
            loadIncidents();
        } else {
            alert('Error updating status: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Network error');
    }
};

// ========== CLOSE MODAL ==========
function closeModal() {
    document.getElementById('incident-modal').classList.add('hidden');
}

document.querySelector('.close-modal').addEventListener('click', closeModal);

// Close modal when clicking outside
document.getElementById('incident-modal').addEventListener('click', (e) => {
    if (e.target.id === 'incident-modal') {
        closeModal();
    }
});

// ========== FILTERS & REFRESH ==========
document.getElementById('filter-severity').addEventListener('change', loadIncidents);
document.getElementById('filter-type').addEventListener('change', loadIncidents);
document.getElementById('filter-status').addEventListener('change', loadIncidents);
document.getElementById('refresh-btn').addEventListener('click', loadIncidents);

// ========== INITIAL LOAD ==========
loadIncidents();
