// admin-napbox.js - ADMIN NAP BOX MONITORING (WITH TAB ID SUPPORT)

// ==================== 🆕 GET TAB ID HELPER (BAGO) ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== 🆕 GET ADMIN USERNAME FROM FLASK SESSION (BAGO) ====================
async function getAdminUsername() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.username) {
                localStorage.setItem('adminUsername', data.username);
                sessionStorage.setItem('adminUsername', data.username);
                return data.username;
            }
        }
    } catch (error) {
        console.error('Error getting admin username from session:', error);
    }
    return localStorage.getItem('adminUsername') || null;
}

// ==================== 🆕 GET ADMIN AREA FROM FLASK SESSION (BAGO) ====================
async function getAdminArea() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.area) {
                localStorage.setItem('adminArea', data.area);
                sessionStorage.setItem('adminArea', data.area);
                return data.area;
            }
        }
    } catch (error) {
        console.error('Error getting admin area from session:', error);
    }
    return localStorage.getItem('adminArea') || null;
}

// ==================== 🆕 REFRESH ADMIN INFO FROM SESSION (BAGO) ====================
async function refreshAdminInfo() {
    const adminUsername = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found in session");
        return false;
    }
    
    try {
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (response.ok) {
            const profile = await response.json();
            if (profile.id) {
                localStorage.setItem("adminId", profile.id);
                sessionStorage.setItem("adminId", profile.id);
            }
            if (profile.area) {
                localStorage.setItem("adminArea", profile.area);
                sessionStorage.setItem("adminArea", profile.area);
            }
            if (profile.city) {
                localStorage.setItem("adminCity", profile.city);
                sessionStorage.setItem("adminCity", profile.city);
            }
            console.log("Admin info refreshed:", { adminUsername, area: profile.area });
            return true;
        }
    } catch (error) {
        console.error("Error refreshing admin info:", error);
    }
    return false;
}

// ==================== SESSION MANAGEMENT - PER TAB ====================
(function() {
    const isLoggedIn = sessionStorage.getItem('adminUsername') && sessionStorage.getItem('sessionActive') === 'true';
    if (!isLoggedIn) {
        window.location.replace('/');
        throw new Error('No session');
    }
})();

async function checkSession() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/verify-session?tab_id=${tabId}`);
        const data = await response.json();
        if (!data.valid) {
            sessionStorage.clear();
            window.location.replace('/');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

// ==================== GLOBAL VARIABLES ====================
let adminMap = null;
let adminMarkers = [];
let adminCircles = [];
let adminAllSlots = [];
let adminAllNapboxes = [];
let adminAllBarangays = [];
let adminCurrentFilter = 'all';
let adminCurrentBarangay = '';
let adminCityBoundaryLayer = null;
let adminIsSatelliteView = false;
let adminCurrentTileLayer = null;
let adminAssignedArea = '';
let adminRawAssignedArea = '';
let currentEditSlot = null;

// Add NAP Box variables
let adminIsAddingNapbox = false;
let adminValidatedCoordinates = null;
let adminValidatedBarangay = null;
let adminCurrentNapboxPrefix = '';
let adminCurrentNapboxNumber = '';
let adminTempMarker = null;

let adminSelectedContractPrefix = null; // "GIF-" or "POB-" — ginagamit lang kapag Pila

// GeoJSON URLs
const ADMIN_LAGUNA_GEOJSON_URLS = {
    "Santa Cruz": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434280000.0.001.json",
    "Pagsanjan": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434240000.0.001.json",
    "Pila": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434260000.0.001.json",
    "Magdalena": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434160000.0.001.json"
};

// ==================== NORMALIZE AREA NAME ====================
function normalizeAdminAreaName(areaName) {
    if (!areaName) return null;
    const lowerName = areaName.toLowerCase().trim();
    if (lowerName === "santa cruz" || lowerName === "sta. cruz" || lowerName === "sta cruz" || lowerName === "santa") {
        return "Santa Cruz";
    }
    if (lowerName === "pagsanjan") return "Pagsanjan";
    if (lowerName === "pila") return "Pila";
    if (lowerName === "magdalena") return "Magdalena";
    return areaName;
}


// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'info') {
    const LABELS = {
        success: 'Success',
        error:   'Error',
        info:    'Notice',
        loading: 'Please wait'
    };

    const ICONS = {
        success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        loading: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation: toastSpin 1s linear infinite; display:block;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
    };

    let toast = document.querySelector('.custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'custom-toast';
        document.body.appendChild(toast);

        if (!document.getElementById('toast-keyframes')) {
            const s = document.createElement('style');
            s.id = 'toast-keyframes';
            s.textContent = `
                @keyframes toastSpin     { to { transform: rotate(360deg); } }
                @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
                @keyframes toastLoading  { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            `;
            document.head.appendChild(s);
        }
    }

    toast.innerHTML = `
        <div class="custom-toast-body">
            <span class="custom-toast-icon">${ICONS[type] || ICONS.info}</span>
            <div class="custom-toast-text">
                <span class="custom-toast-title">${LABELS[type] || 'Notice'}</span>
                <span class="custom-toast-message">${message}</span>
            </div>
        </div>
        <div class="custom-toast-progress">
            <div class="custom-toast-progress-bar"></div>
        </div>
    `;

    toast.className = `custom-toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toast._hideTimer);

    if (type === 'loading') {
        // Loading stays visible
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ==================== 🆕 LOAD ADMIN PROFILE (UPDATED WITH TAB ID) ====================
async function loadAdminProfile() {
    // 👇 KUHAIN ANG USERNAME MULA SA FLASK SESSION
    const adminUsername = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found");
        return '';
    }
    
    try {
        // 👇 ISAMA ANG TAB ID SA REQUEST
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (!response.ok) throw new Error("Failed to fetch profile");
        const profile = await response.json();
        
        adminRawAssignedArea = profile.area || profile.city || '';
        adminAssignedArea = normalizeAdminAreaName(adminRawAssignedArea);
        
        const profileNameSpan = document.getElementById('profileName');
        if (profileNameSpan) profileNameSpan.textContent = '';
        
        console.log(`=========================================`);
        console.log(`👤 Admin raw assigned area: "${adminRawAssignedArea}"`);
        console.log(`👤 Admin normalized area: "${adminAssignedArea}"`);
        console.log(`=========================================`);
        
        const dashboardHeader = document.querySelector('.dashboard-header-left p');
        if (dashboardHeader && adminAssignedArea) {
            dashboardHeader.innerHTML = `Viewing NAP boxes in: <strong>${adminAssignedArea}</strong>`;
        }
        
        return adminAssignedArea;
    } catch (err) {
        console.error('Error loading admin profile:', err);
        return '';
    }
}

// ==================== LOAD BARANGAYS FOR ADMIN ====================
async function loadAdminBarangays() {
    try {
        if (!adminAssignedArea) {
            console.log('No admin area assigned, cannot load barangays');
            return;
        }
        
        const response = await fetch(`/api/areas/by-city/${encodeURIComponent(adminAssignedArea)}`);
        if (response.ok) {
            const areas = await response.json();
            adminAllBarangays = [...new Set(areas.map(a => a.barangay))];
            console.log(`✅ Loaded ${adminAllBarangays.length} barangays for admin area: ${adminAssignedArea}`);
        } else {
            console.warn('Failed to load barangays from API');
        }
    } catch (error) {
        console.error('Error loading admin barangays:', error);
    }
}

// ==================== 🆕 LOAD NAPBOX DATA (UPDATED WITH TAB ID) ====================
async function loadAdminNapboxData() {
    console.log('🔄 Loading admin NAP box data...');
    
    try {
        // 👇 I-REFRESH MUNA ANG ADMIN INFO
        await refreshAdminInfo();
        
        const adminUsername = await getAdminUsername();
        const tabId = getTabId();
        
        if (!adminUsername) {
            console.error("No admin username found");
            return;
        }
        
        // 👇 ISAMA ANG TAB ID SA REQUEST
        const techResponse = await fetch(`/api/superadmin/technicians?tab_id=${tabId}`);
        const technicians = await techResponse.json();
        
        console.log(`📋 Found ${technicians.length} technicians total`);
        
        let filteredTechnicians = technicians;
        
        if (adminAssignedArea && adminAssignedArea !== '') {
            filteredTechnicians = technicians.filter(tech => {
                const techArea = normalizeAdminAreaName(tech.area);
                const isMatch = techArea === adminAssignedArea;
                return isMatch;
            });
            console.log(`📋 Filtered to ${filteredTechnicians.length} technicians in area: ${adminAssignedArea}`);
        } else {
            console.log(`📋 No admin assigned area, showing ALL technicians`);
        }
        
        if (filteredTechnicians.length === 0) {
            console.warn(`⚠️ No technicians found in area: ${adminAssignedArea}`);
            const grid = document.getElementById('adminSlotsGrid');
            if (grid) {
                grid.innerHTML = `<div class="no-data-message" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ccc;"></i>
                    <p>No technicians found in ${adminAssignedArea || 'your area'}</p>
                </div>`;
            }
            return;
        }
        
        const allNapboxes = [];
        const allSlots = [];
        const napboxIds = new Set();
        
        for (const tech of filteredTechnicians) {
            try {
                console.log(`📡 Fetching napboxes for technician: ${tech.technician_id} (${tech.area})`);
                // 👇 ISAMA ANG TAB ID SA REQUEST
                const response = await fetch(`/api/technician/technician-napbox?technician_id=${encodeURIComponent(tech.technician_id)}&tab_id=${tabId}`);
                if (response.ok) {
                    const data = await response.json();
                    const napboxes = data.napboxes || [];
                    const slots = data.slots || [];
                    
                    console.log(`   📦 Found ${napboxes.length} napboxes, ${slots.length} slots`);
                    
                    napboxes.forEach(napbox => {
                        if (!napboxIds.has(napbox.id)) {
                            napboxIds.add(napbox.id);
                            if (napbox.area) {
                                napbox.areaNormalized = normalizeAdminAreaName(napbox.area);
                            }
                            allNapboxes.push(napbox);
                        }
                    });
                    
                    slots.forEach(slot => {
                        if (!allSlots.find(s => s.id === slot.id)) {
                            allSlots.push(slot);
                        }
                    });
                } else {
                    console.warn(`   ⚠️ Failed to fetch for ${tech.technician_id}: ${response.status}`);
                }
            } catch (err) {
                console.warn(`Error loading napboxes for technician ${tech.technician_id}:`, err);
            }
        }
        
        adminAllNapboxes = allNapboxes;
        adminAllSlots = allSlots;
        
        console.log(`=========================================`);
        console.log(`✅ Loaded ${adminAllNapboxes.length} napboxes and ${adminAllSlots.length} slots`);
        console.log(`=========================================`);
        
        const stats = {
            total: adminAllSlots.length,
            available: adminAllSlots.filter(s => s.status === 'available').length,
            occupied: adminAllSlots.filter(s => s.status === 'occupied').length
        };
        updateAdminStats(stats);
        
        await loadAdminBarangays();
        await loadAdminBarangayFilter(adminAssignedArea);
        renderAdminSlotsGrid();
        
        if (!adminMap) {
            initAdminMap();
        } else {
            clearAdminMarkers();
            addAdminNapboxMarkers();
            if (adminAssignedArea) {
                await showAdminCityBoundary(adminAssignedArea);
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading NAP box data:', error);
        const grid = document.getElementById('adminSlotsGrid');
        if (grid) {
            grid.innerHTML = `<div class="loading-spinner"><p style="color: #ef4444;">Failed to load data: ${error.message}</p></div>`;
        }
        showToast('Failed to load NAP box data', 'error');
    }
}

// ==================== CLEAR MARKERS FUNCTION ====================
function clearAdminMarkers() {
    if (adminMap) {
        adminMarkers.forEach(marker => {
            if (adminMap.hasLayer(marker)) adminMap.removeLayer(marker);
        });
        adminCircles.forEach(circle => {
            if (adminMap.hasLayer(circle)) adminMap.removeLayer(circle);
        });
    }
    adminMarkers = [];
    adminCircles = [];
    console.log('🗑️ Cleared all markers and circles');
}

function updateAdminStats(stats) {
    const totalEl = document.getElementById('adminTotalSlots');
    const availableEl = document.getElementById('adminAvailableSlots');
    const occupiedEl = document.getElementById('adminOccupiedSlots');
    const napboxCountDisplay = document.getElementById('adminNapboxCountDisplay');
    
    if (totalEl) totalEl.textContent = stats?.total || 0;
    if (availableEl) availableEl.textContent = stats?.available || 0;
    if (occupiedEl) occupiedEl.textContent = stats?.occupied || 0;
    if (napboxCountDisplay) napboxCountDisplay.textContent = adminAllNapboxes.length || 0;
}

// ==================== LOAD BARANGAY FILTER ====================
async function loadAdminBarangayFilter(selectedArea) {
    const barangaySelect = document.getElementById('adminBarangayFilter');
    if (!barangaySelect) return;
    
    let barangays = [];
    
    if (selectedArea && selectedArea !== '') {
        const napboxesInArea = adminAllNapboxes.filter(n => normalizeAdminAreaName(n.area) === selectedArea);
        barangays = [...new Set(napboxesInArea.map(n => n.barangay).filter(b => b && b !== 'Unknown'))];
        
        if (barangays.length === 0) {
            try {
                const response = await fetch(`/api/areas/by-city/${encodeURIComponent(selectedArea)}`);
                if (response.ok) {
                    const areas = await response.json();
                    barangays = [...new Set(areas.map(a => a.barangay))];
                }
            } catch (error) {
                console.error('Error fetching barangays:', error);
            }
        }
    } else {
        barangays = [...new Set(adminAllNapboxes.map(n => n.barangay).filter(b => b && b !== 'Unknown'))];
    }
    
    barangays.sort();
    barangaySelect.innerHTML = '<option value="">All Barangays</option>';
    barangays.forEach(barangay => {
        barangaySelect.innerHTML += `<option value="${escapeHtml(barangay)}">${escapeHtml(barangay)}</option>`;
    });
    
    barangaySelect.disabled = false;
    console.log(`📋 Loaded ${barangays.length} barangays for filter`);
}

// ==================== GET FILTERED SLOTS ====================
function getAdminFilteredSlots() {
    let filtered = [...adminAllSlots];
    
    if (adminCurrentBarangay && adminCurrentBarangay !== '') {
        filtered = filtered.filter(s => s.barangay === adminCurrentBarangay);
    }
    
    if (adminCurrentFilter !== 'all') {
        filtered = filtered.filter(s => s.status === adminCurrentFilter);
    }
    
    return filtered;
}

// ==================== RENDER SLOTS GRID ====================
function renderAdminSlotsGrid() {
    const grid = document.getElementById('adminSlotsGrid');
    if (!grid) return;
    
    const filteredSlots = getAdminFilteredSlots();
    
    if (filteredSlots.length === 0) {
        grid.innerHTML = `
            <div class="no-data-message" style="text-align: center; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                <p>No slots found in ${adminAssignedArea || 'your area'}</p>
                <p style="font-size: 12px; margin-top: 8px;">No NAP boxes have been assigned yet</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredSlots.map(slot => {
        // ✅ KUNIN ANG NAPBOX NAME
        const napbox = adminAllNapboxes.find(n => n.id === slot.napbox_id);
        const napboxName = napbox ? napbox.name : slot.napbox_name || 'N/A';
        // I-shorten ang napbox name kung masyadong mahaba
        const shortNapboxName = napboxName.length > 14 ? napboxName.substring(0, 12) + '...' : napboxName;
        
        // ✅ AVAILABLE / OCCUPIED LABEL
        const isAvailable = slot.status === 'available';
        const statusClass = isAvailable ? 'available' : 'occupied';
        const statusText = isAvailable ? 'AVAILABLE' : 'OCCUPIED';
        
        // ✅ ACTIVE / INACTIVE LABEL
        // ACTIVE: kapag OCCUPIED (may customer na naka-assign)
        // INACTIVE: kapag AVAILABLE (walang customer) - kahit may previous customer name
        const isActive = slot.status === 'occupied' && slot.customer_name && slot.customer_name !== '';
        const activeLabel = isActive ? 'ACTIVE' : 'INACTIVE';
        const activeClass = isActive ? 'active' : 'inactive';
        
        const slotData = JSON.stringify(slot).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
        
        // ✅ CUSTOMER NAME - one line, walang ellipsis
        let customerDisplay = '';
        if (slot.customer_name) {
            const customerName = slot.customer_name;
            const isLongName = customerName.length > 15;
            const longNameClass = isLongName ? 'long-name' : '';
            customerDisplay = `<span class="slot-customer ${longNameClass}">${escapeHtml(customerName)}</span>`;
        }
        
        const contractDisplay = slot.contract_number ? `<span class="slot-contract">Contract: ${escapeHtml(slot.contract_number)}</span>` : '';
        
        return `
            <div class="slot-card ${statusClass}" onclick='showAdminSlotDetails(${slotData})'>
                <span class="slot-status-label ${statusClass}">${statusText}</span>
                <span class="slot-active-label ${activeClass}">${activeLabel}</span>
                <span class="slot-number">Slot ${slot.slot_number}</span>
                ${customerDisplay}
                ${contractDisplay}
                ${slot.barangay ? `<span class="slot-barangay">${escapeHtml(slot.barangay)}</span>` : ''}
                <span class="slot-napbox-name" title="${escapeHtml(napboxName)}">
                    <i class="fas fa-network-wired"></i> ${escapeHtml(shortNapboxName)}
                </span>
            </div>
        `;
    }).join('');
}

// ==================== INIT MAP ====================
function initAdminMap() {
    const mapContainer = document.getElementById('adminNapboxMap');
    if (!mapContainer) {
        console.error('Map container not found!');
        return;
    }
    
    if (adminMap) {
        adminMap.remove();
        adminMap = null;
    }
    
    console.log('🗺️ Initializing admin map...');
    
    const allowedBounds = L.latLngBounds([14.18, 121.34], [14.33, 121.48]);
    adminMap = L.map('adminNapboxMap').fitBounds(allowedBounds);
    
    const streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    streetMapLayer.addTo(adminMap);
    adminCurrentTileLayer = streetMapLayer;
    
    const SatelliteControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.borderRadius = '4px';
            container.style.cursor = 'pointer';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.9 2.307a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0l-1.086-1.086a.5.5 0 0 1 0-.707z"/>
                <path d="M2.307 19.9a.5.5 0 0 1 0-.707l1.086-1.086a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0z"/>
                <circle cx="12" cy="12" r="9"/>
            </svg>`;
            container.title = 'Satellite View';
            container.onclick = function(e) {
                L.DomEvent.stopPropagation(e);
                adminToggleSatelliteView();
            };
            return container;
        }
    });
    const satelliteControl = new SatelliteControl();
    satelliteControl.addTo(adminMap);
    
    adminMap.on('load', () => {
        console.log('✅ Admin map loaded');
        addAdminNapboxMarkers();
        if (adminAssignedArea) {
            showAdminCityBoundary(adminAssignedArea);
        }
    });
    
    setTimeout(() => {
        if (adminMap) {
            console.log('⏰ Timeout: Adding markers to admin map');
            addAdminNapboxMarkers();
            if (adminAssignedArea) {
                showAdminCityBoundary(adminAssignedArea);
            }
        }
    }, 1000);
}

function adminToggleSatelliteView() {
    const btn = document.querySelector('#adminNapboxMap .leaflet-control-custom');
    const satelliteLayers = [
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
        L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20 })
    ];
    const streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    
    if (!adminIsSatelliteView) {
        if (adminCurrentTileLayer) adminMap.removeLayer(adminCurrentTileLayer);
        satelliteLayers[0].addTo(adminMap);
        adminCurrentTileLayer = satelliteLayers[0];
        adminIsSatelliteView = true;
        if (adminCityBoundaryLayer && adminMap.hasLayer(adminCityBoundaryLayer)) {
            adminCityBoundaryLayer.setStyle({ color: "#FFFFFF", weight: 4 });
        }
        if (btn) {
            btn.style.backgroundColor = '#28a745';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 3a6 6 0 0 0-6 6c0 4 6 9 6 9s6-5 6-9a6 6 0 0 0-6-6z"/>
                <circle cx="12" cy="9" r="2.5"/>
            </svg>`;
            btn.title = 'Street View';
        }
    } else {
        if (adminCurrentTileLayer) adminMap.removeLayer(adminCurrentTileLayer);
        streetMapLayer.addTo(adminMap);
        adminCurrentTileLayer = streetMapLayer;
        adminIsSatelliteView = false;
        if (adminCityBoundaryLayer && adminMap.hasLayer(adminCityBoundaryLayer)) {
            adminCityBoundaryLayer.setStyle({ color: "#000000", weight: 3 });
        }
        if (btn) {
            btn.style.backgroundColor = 'white';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.9 2.307a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0l-1.086-1.086a.5.5 0 0 1 0-.707z"/>
                <path d="M2.307 19.9a.5.5 0 0 1 0-.707l1.086-1.086a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0z"/>
                <circle cx="12" cy="12" r="9"/>
            </svg>`;
            btn.title = 'Satellite View';
        }
    }
}

// ==================== ADD NAPBOX MARKERS ====================
function addAdminNapboxMarkers() {
    if (!adminMap) {
        console.error('❌ adminMap is null, cannot add markers');
        return;
    }
    
    clearAdminMarkers();
    
    let napboxesToShow = [...adminAllNapboxes];
    
    console.log(`📍 Total napboxes in adminAllNapboxes: ${adminAllNapboxes.length}`);
    
    if (adminAssignedArea && adminAssignedArea !== '') {
        const beforeFilterCount = napboxesToShow.length;
        napboxesToShow = napboxesToShow.filter(n => {
            const napboxAreaNorm = normalizeAdminAreaName(n.area);
            const isMatch = napboxAreaNorm === adminAssignedArea;
            return isMatch;
        });
        console.log(`📍 Filtered napboxes: ${beforeFilterCount} → ${napboxesToShow.length} (area: ${adminAssignedArea})`);
    } else {
        console.log(`📍 No area filter applied, showing all ${napboxesToShow.length} napboxes`);
    }
    
    if (napboxesToShow.length === 0) {
        console.log('⚠️ No napboxes to show after filtering');
        return;
    }
    
    let validMarkersAdded = 0;
    
    napboxesToShow.forEach((napbox) => {
        const lat = napbox.latitude;
        const lng = napbox.longitude;
        
        const hasValidCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) && 
                               parseFloat(lat) !== 0 && parseFloat(lng) !== 0;
        
        if (hasValidCoords) {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            
            const marker = L.marker([latNum, lngNum], {
                icon: L.divIcon({
                    className: 'napbox-marker',
                    html: '<div style="background: #dc2626; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
                    iconSize: [16, 16],
                    popupAnchor: [0, -8]
                })
            }).addTo(adminMap);
            
            const circle = L.circle([latNum, lngNum], {
                radius: napbox.coverage_radius || 500,
                color: '#c52222',
                fillColor: '#c52222',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(adminMap);
            
            const napboxSlots = adminAllSlots.filter(slot => slot.napbox_id === napbox.id);
            const availableCount = napboxSlots.filter(s => s.status === 'available').length;
            const occupiedCount = napboxSlots.filter(s => s.status === 'occupied').length;
            const safeNapboxName = (napbox.name || 'NAP Box').replace(/'/g, "\\'").replace(/\"/g, '&quot;');
            
           marker.bindPopup(`
    <div style="min-width: 200px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <b>${escapeHtml(napbox.name || 'NAP Box')}</b><br>
        <small>${escapeHtml(napbox.barangay || 'No barangay')}</small>
        <hr>
        <b>Area:</b> ${escapeHtml(napbox.area || 'N/A')}<br>
        <b>Coverage:</b> ${napbox.coverage_radius || 500}m<br>
        <span style="color:#22c55e">● Available: ${availableCount}</span><br>
        <span style="color:#ef4444">● Occupied: ${occupiedCount}</span>
        <hr style="margin:6px 0;">
        <button onclick="adminShowDeleteNapboxModal(${napbox.id}, '${safeNapboxName}')" style="width:100%; padding:8px; background:#dc2626; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; transition: all 0.2s ease; pointer-events: auto !important; font-family: 'Inter', sans-serif;">
            Delete NAP Box
        </button>
    </div>
`);
            
            adminMarkers.push(marker);
            adminCircles.push(circle);
            validMarkersAdded++;
        }
    });
    
    console.log(`✅ Added ${validMarkersAdded} markers to admin map (out of ${napboxesToShow.length} napboxes)`);
    
    if (validMarkersAdded > 0 && adminMarkers.length > 0) {
        try {
            const group = L.featureGroup(adminMarkers);
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                adminMap.fitBounds(bounds, { padding: [50, 50] });
                console.log('🔍 Zoomed to fit all markers');
            }
        } catch (e) {
            console.warn('Could not auto-zoom:', e);
        }
    }
}

// ==================== SHOW CITY BOUNDARY ====================
async function showAdminCityBoundary(cityName) {
    clearAdminBoundary();
    
    const properCityName = normalizeAdminAreaName(cityName);
    if (!properCityName) return;
    
    const url = ADMIN_LAGUNA_GEOJSON_URLS[properCityName];
    if (!url) {
        console.log(`No GeoJSON URL for ${properCityName}`);
        return;
    }
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const geojsonData = await response.json();
            if (geojsonData?.features?.length > 0) {
                displayAdminBoundaryOnly(geojsonData, properCityName);
            } else {
                await showAdminBoundaryFromNominatim(properCityName);
            }
        } else {
            await showAdminBoundaryFromNominatim(properCityName);
        }
    } catch (error) {
        console.error('Error loading boundary:', error);
        await showAdminBoundaryFromNominatim(properCityName);
    }
}

async function showAdminBoundaryFromNominatim(cityName) {
    try {
        const query = encodeURIComponent(`${cityName}, Laguna, Philippines`);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&polygon_geojson=1`,
            { headers: { 'User-Agent': 'CableVision-Admin/1.0' } }
        );
        const data = await res.json();
        
        if (data?.length > 0 && data[0].geojson) {
            displayAdminBoundaryOnly(data[0].geojson, cityName);
        } else if (data?.length > 0 && data[0].boundingbox) {
            const bb = data[0].boundingbox;
            const bounds = [
                [parseFloat(bb[0]), parseFloat(bb[2])],
                [parseFloat(bb[1]), parseFloat(bb[3])]
            ];
            if (adminCityBoundaryLayer) adminMap.removeLayer(adminCityBoundaryLayer);
            adminCityBoundaryLayer = L.rectangle(bounds, {
                color: adminIsSatelliteView ? "#ffffff" : "#0047ab",
                weight: adminIsSatelliteView ? 5 : 4,
                fillColor: adminIsSatelliteView ? "#00bfff" : "#4da3ff",
                fillOpacity: 0.15,
                dashArray: "8,6"
            }).addTo(adminMap);
            adminCityBoundaryLayer.bringToFront();
            adminMap.fitBounds(bounds, { padding: [40, 40] });
            showToast(`${cityName} boundary loaded`, 'success');
        }
    } catch (err) {
        console.error("Error loading boundary from Nominatim:", err);
    }
}

function displayAdminBoundaryOnly(geojsonData, cityName) {
    if (adminCityBoundaryLayer) adminMap.removeLayer(adminCityBoundaryLayer);
    
    let bounds = L.latLngBounds();
    
    adminCityBoundaryLayer = L.geoJSON(geojsonData, {
        style: {
            color: adminIsSatelliteView ? "#ffffff" : "#000000",
            weight: adminIsSatelliteView ? 5 : 4,
            opacity: 1,
            fillColor: adminIsSatelliteView ? "#00bfff" : "#4da3ff",
            fillOpacity: 0.15,
            dashArray: "8,6"
        },
        onEachFeature: function(feature, layer) {
            if (layer.getBounds) bounds.extend(layer.getBounds());
            layer.bindPopup(`<b>${cityName}, Laguna</b>`);
        }
    }).addTo(adminMap);
    
    adminCityBoundaryLayer.bringToFront();
    
    if (bounds.isValid()) adminMap.fitBounds(bounds, { padding: [40, 40] });
    showToast(`${cityName} boundary loaded`, 'success');
}

function clearAdminBoundary() {
    if (adminCityBoundaryLayer) {
        adminMap.removeLayer(adminCityBoundaryLayer);
        adminCityBoundaryLayer = null;
    }
}

// ==================== SHOW SLOT DETAILS (ENHANCED) ====================
function showAdminSlotDetails(slot) {
    const modal = document.getElementById('adminSlotDetailsModal');
    const modalTitle = document.getElementById('adminSlotModalTitle');
    const modalContent = document.getElementById('adminSlotDetailsContent');
    
    if (!modal || !modalContent) return;
    
    const statusDisplay = slot.status === 'available' ? 'Available' : 'Occupied';
    const statusIcon = slot.status === 'available' ? 'fa-check-circle' : 'fa-circle';
    
    const napbox = adminAllNapboxes.find(n => n.id === slot.napbox_id);
    const napboxName = napbox ? (napbox.name || 'N/A') : (slot.napbox_name || 'N/A');
    
    // ✅ Check kung may previous data pero available na ang slot
    const hasCustomerData = slot.customer_name || slot.customer_phone || slot.application_number;
    const showClearButton = slot.status === 'available' && hasCustomerData;
    
    let lastUpdated = 'N/A';
    if (slot.updated_at) {
        try {
            const date = new Date(slot.updated_at);
            lastUpdated = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            lastUpdated = slot.updated_at;
        }
    }
    
    const slotDataEncoded = JSON.stringify(slot).replace(/"/g, '&quot;').replace(/'/g, "&#39;");
    
    modalTitle.textContent = `Slot ${slot.slot_number}`;
    
    modalContent.innerHTML = `
        <!-- Status Badge -->
        <div class="slot-status-badge ${slot.status}">
            <i class="fas ${statusIcon}"></i>
            <span>${statusDisplay}</span>
            ${showClearButton ? `<span class="has-data-badge"><i class="fas fa-history"></i> Has Previous Data</span>` : ''}
        </div>
        
        <!-- Details Grid -->
        <div class="slot-details-grid">
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-hashtag"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Slot Number</span>
                    <span class="slot-detail-value">${slot.slot_number}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-network-wired"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">NAP Box</span>
                    <span class="slot-detail-value">${escapeHtml(napboxName)}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-map-pin"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Barangay</span>
                    <span class="slot-detail-value">${escapeHtml(slot.barangay || 'N/A')}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Last Updated</span>
                    <span class="slot-detail-value">${lastUpdated}</span>
                </div>
            </div>
        </div>
        
        <!-- Customer Information (unified, kagaya ng technician) -->
        <div class="slot-customer-section">
            <div class="slot-section-title">
                <i class="fas fa-user"></i>
                <span>${slot.customer_name ? 'Customer Information' : 'No Customer Data'}</span>
                ${slot.customer_name ? `<span class="customer-status ${slot.status}">${slot.status.toUpperCase()}</span>` : ''}
            </div>
            ${slot.customer_name ? `
            <div class="slot-customer-grid">
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-user-circle"></i> Name</span>
                    <span class="customer-value">${escapeHtml(slot.customer_name)}</span>
                </div>
                ${slot.customer_phone ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-phone"></i> Phone</span>
                    <span class="customer-value">${escapeHtml(slot.customer_phone)}</span>
                </div>` : ''}
                ${slot.contract_number ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-id-card"></i> Contract</span>
                    <span class="customer-value">${escapeHtml(slot.contract_number)}</span>
                </div>` : ''}
                ${napbox && napbox.area ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-building"></i> Area</span>
                    <span class="customer-value">${escapeHtml(napbox.area)}</span>
                </div>` : ''}
            </div>
            ` : `
            <div class="no-customer-data">
                <i class="fas fa-user-slash"></i>
                <span>This slot is available and has no customer assigned.</span>
            </div>
            `}
        </div>
        
        <!-- Actions (order: Clear, Edit, Close — kagaya ng technician) -->
        <div class="slot-actions">
            <div class="slot-action-buttons">
                ${showClearButton ? `
                <button onclick='adminShowClearSlotModal(${slotDataEncoded})' class="btn-clear-slot">
                    <i class="fas fa-eraser"></i> Clear Slot
                </button>
                ` : ''}
                <button onclick='openEditFromDetails(${slotDataEncoded})' class="btn-edit-slot-modal">
                    <i class="fas fa-edit"></i> Edit Slot
                </button>
                <button onclick="closeAdminSlotModal()" class="btn-close-details-modal">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAdminSlotModal() {
    const modal = document.getElementById('adminSlotDetailsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}


// ==================== ADMIN CLEAR SLOT ====================
let adminPendingClearSlot = null;

function adminShowClearSlotModal(slot) {
    // ✅ UNA, ISARA ANG SLOT DETAILS MODAL
    closeAdminSlotModal();
    
    // I-set ang pending data
    adminPendingClearSlot = {
        slotId: slot.id,
        slotNumber: slot.slot_number,
        customerName: slot.customer_name || 'N/A',
        napboxName: slot.napbox_name || 'N/A'
    };
    
    // I-populate ang modal
    document.getElementById('clearSlotNumber').textContent = `#${slot.slot_number}`;
    document.getElementById('clearNapboxName').textContent = adminPendingClearSlot.napboxName;
    document.getElementById('clearCustomerName').textContent = adminPendingClearSlot.customerName;
    document.getElementById('clearSlotModalText').textContent = 
        `This will permanently remove all customer data from Slot #${slot.slot_number}.`;
    
    // Ipakita ang modal
    const modal = document.getElementById('clearSlotModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function adminCloseClearSlotModal() {
    const modal = document.getElementById('clearSlotModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    adminPendingClearSlot = null;
}

async function adminExecuteClearSlot() {
    if (!adminPendingClearSlot) return;
    
    const { slotId, slotNumber } = adminPendingClearSlot;
    
    // Close modal
    adminCloseClearSlotModal();
    
    try {
        // Kunin ang technician_id mula sa session o gumamit ng admin
        const technicianId = sessionStorage.getItem('technicianId') || localStorage.getItem('technicianId') || 'admin';
        const tabId = getTabId();
        
        showToast('Clearing slot data...', 'loading');
        
        const requestBody = {
            slot_id: slotId,
            technician_id: technicianId,
            tab_id: tabId
        };
        
        console.log("📤 Sending request to server:", requestBody);
        
        const response = await fetch(`/api/technician/clear-slot`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log("📥 Response status:", response.status);
        
        let result;
        try {
            result = await response.json();
            console.log("📥 Response data:", result);
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            showToast('Server error: Invalid response', 'error');
            return;
        }
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || 'Failed to clear slot');
        }
        
        showToast(`Slot #${slotNumber} cleared successfully!`, 'success');
        
        // ✅ SIGURADUHIN NA SARADO ANG SLOT DETAILS MODAL
        closeAdminSlotModal();
        
        // I-RELOAD ANG SLOTS DATA
        await loadAdminNapboxData();
        
        // I-REBUILD ANG MARKERS
        clearAdminMarkers();
        addAdminNapboxMarkers();
        
    } catch (error) {
        console.error('Error clearing slot:', error);
        showToast(error.message || 'Failed to clear slot data', 'error');
    }
}


// ==================== OPEN EDIT FROM DETAILS MODAL ====================
function openEditFromDetails(slot) {
    closeAdminSlotModal();
    showEditSlotModal(slot);
}

// ==================== EDIT SLOT FUNCTIONS ====================
function showEditSlotModal(slot) {
    currentEditSlot = slot;
    
    // Set values
    document.getElementById('editSlotNumber').value = `Slot ${slot.slot_number}`;
    document.getElementById('editCustomerName').value = slot.customer_name || '';
    document.getElementById('editCustomerPhone').value = slot.customer_phone || '';
    
    // ✅ CHECK KUNG PILA ANG AREA - SHOW PREFIX CHOICES
    const normalizedAreaForPrefix = normalizeAdminAreaName(adminAssignedArea || '');
    const prefixWrapper = document.getElementById('prefixChoiceWrapper');
    const prefixGIFBtn = document.getElementById('prefixChoiceGIF');
    const prefixPOBBtn = document.getElementById('prefixChoicePOB');
    
    if (normalizedAreaForPrefix === "Pila") {
        if (prefixWrapper) prefixWrapper.style.display = 'flex';
        
        // I-detect kung anong prefix ang existing sa contract number
        const existingContract = slot.contract_number || '';
        let detectedPrefix = 'GIF-';
        if (existingContract.toUpperCase().startsWith('POB-')) {
            detectedPrefix = 'POB-';
        } else if (existingContract.toUpperCase().startsWith('GIF-')) {
            detectedPrefix = 'GIF-';
        }
        adminSelectedContractPrefix = detectedPrefix;
        
        [prefixGIFBtn, prefixPOBBtn].forEach(btn => btn && btn.classList.remove('active'));
        const activeBtn = detectedPrefix === 'GIF-' ? prefixGIFBtn : prefixPOBBtn;
        if (activeBtn) activeBtn.classList.add('active');
    } else {
        if (prefixWrapper) prefixWrapper.style.display = 'none';
        adminSelectedContractPrefix = null;
    }
    
    // ✅ I-FORMAT ANG CONTRACT NUMBER NA MAY PREFIX
    const contractPrefix = getAdminContractPrefix();
    let contractValue = slot.contract_number || '';
    
    // Kung walang prefix ang contract number, idagdag ito
    if (contractValue && !contractValue.match(/^[A-Z]+-/i)) {
        contractValue = contractPrefix + contractValue;
    } else if (!contractValue) {
        contractValue = contractPrefix;
    } else {
        // I-strip ang lumang prefix at ipalit ng tamang prefix (GIF- o POB-)
        const numberPartOnly = contractValue.replace(/^[A-Z]+-/i, '');
        contractValue = contractPrefix + numberPartOnly;
    }
    
    document.getElementById('editContractNumber').value = contractValue;
    
    // Reset error states
    const nameInput = document.getElementById('editCustomerName');
    const contractInput = document.getElementById('editContractNumber');
    const nameError = document.getElementById('editNameError');
    const contractError = document.getElementById('editContractError');
    
    nameInput.className = 'form-input';
    contractInput.className = 'form-input';
    if (nameError) nameError.style.display = 'none';
    if (contractError) contractError.style.display = 'none';
    
    // Set status toggle
    const status = slot.status || 'available';
    const occupiedBtn = document.getElementById('editStatusOccupied');
    const availableBtn = document.getElementById('editStatusAvailable');
    
    // Reset all status options
    [occupiedBtn, availableBtn].forEach(btn => {
        btn.classList.remove('active', 'active-occupied', 'active-available');
    });
    
    if (status === 'occupied') {
        occupiedBtn.classList.add('active', 'active-occupied');
    } else {
        availableBtn.classList.add('active', 'active-available');
    }
    
    const modal = document.getElementById('editSlotModal');
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // ✅ I-FOCUS SA NAME FIELD AT SELECT ALL TEXT
    setTimeout(() => {
        const nameField = document.getElementById('editCustomerName');
        if (nameField) {
            nameField.focus();
            nameField.select();
        }
    }, 300);
}

function closeEditSlotModal() {
    const modal = document.getElementById('editSlotModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    currentEditSlot = null;
    
    // Reset error states
    const nameInput = document.getElementById('editCustomerName');
    const contractInput = document.getElementById('editContractNumber');
    const nameError = document.getElementById('editNameError');
    const contractError = document.getElementById('editContractError');
    
    if (nameInput) nameInput.className = 'form-input';
    if (contractInput) contractInput.className = 'form-input';
    if (nameError) nameError.style.display = 'none';
    if (contractError) contractError.style.display = 'none';
}

async function saveEditSlot() {
    if (!currentEditSlot) return;
    
    let customerName = document.getElementById('editCustomerName').value.trim();
    let contractNumber = document.getElementById('editContractNumber').value.trim();
    const customerPhone = document.getElementById('editCustomerPhone').value.trim();
    
    customerName = customerName.replace(/\b\w/g, function(letter) {
        return letter.toUpperCase();
    });
    
    const prefix = getAdminContractPrefix();
    let numberPartOnly = contractNumber.replace(new RegExp(`^${prefix}`, 'i'), '').trim();
    let cleanContractNumber = numberPartOnly ? (prefix + numberPartOnly) : '';
    
    let selectedStatus = 'available';
    const occupiedBtn = document.getElementById('editStatusOccupied');
    if (occupiedBtn.classList.contains('active')) {
        selectedStatus = 'occupied';
    }
    
    const nameInput = document.getElementById('editCustomerName');
    const contractInput = document.getElementById('editContractNumber');
    const nameError = document.getElementById('editNameError');
    const contractError = document.getElementById('editContractError');
    
    // ✅ I-RESET ANG MGA ERROR MESSAGES
    nameInput.className = 'form-input';
    contractInput.className = 'form-input';
    if (nameError) {
        nameError.style.display = 'none';
        nameError.textContent = '';
    }
    if (contractError) {
        contractError.style.display = 'none';
        contractError.textContent = '';
    }
    
    let hasError = false;
    let errorMessages = [];
    
    if (selectedStatus === 'occupied') {
        if (!customerName) {
            nameInput.className = 'form-input input-error';
            if (nameError) {
                nameError.textContent = '⚠️ Customer name is required when slot is OCCUPIED';
                nameError.style.display = 'flex';
            }
            hasError = true;
            errorMessages.push('Customer Name');
        }
        
        // ✅ VALIDATE: CHECK IF CONTRACT NUMBER IS EXACTLY 4 DIGITS
        if (cleanContractNumber) {
            const numberPart = cleanContractNumber.replace(/^[A-Z]+-/i, '');
            if (numberPart.length !== 4) {
                contractInput.className = 'form-input input-error';
                if (contractError) {
                    contractError.textContent = 'Contract number must be exactly 4 digits (e.g., 0001, 0123, 1234)';
                    contractError.style.display = 'flex';
                }
                showToast('Contract number must be exactly 4 digits', 'error');
                contractInput.focus();
                return;
            }
        } else {
            contractInput.className = 'form-input input-error';
            if (contractError) {
                contractError.textContent = 'Contract number is required when slot is OCCUPIED';
                contractError.style.display = 'flex';
            }
            hasError = true;
            errorMessages.push('Contract Number');
        }
    }
    
    // ✅ VALIDATE: CHECK IF CONTRACT NUMBER ALREADY EXISTS (EXCLUDING CURRENT SLOT)
    if (cleanContractNumber && selectedStatus === 'occupied') {
        try {
            const response = await fetch('/api/check-contract-number-exists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contract_number: cleanContractNumber,
                    exclude_slot_id: currentEditSlot.id
                })
            });
            
            const data = await response.json();
            
            if (data.exists) {
                contractInput.className = 'form-input input-error';
                if (contractError) {
                    contractError.textContent = `Contract number "${cleanContractNumber}" is already used in Slot #${data.slot_number}!`;
                    contractError.style.display = 'flex';
                }
                showToast(`Contract number "${cleanContractNumber}" already exists in Slot #${data.slot_number}!`, 'error');
                contractInput.focus();
                return;
            }
        } catch (error) {
            console.error('Error checking contract number:', error);
            showToast('Error validating contract number', 'error');
            return;
        }
    }
    
    if (hasError) {
        const missingFields = errorMessages.join(' and ');
        showToast(`Please fill in: ${missingFields} for OCCUPIED status`, 'error');
        if (!customerName) {
            nameInput.focus();
        } else if (!cleanContractNumber) {
            contractInput.focus();
        }
        return;
    }
    
    let finalStatus = selectedStatus;
    if (selectedStatus === 'occupied' && !customerName && !cleanContractNumber) {
        finalStatus = 'available';
        const occupiedBtn = document.getElementById('editStatusOccupied');
        const availableBtn = document.getElementById('editStatusAvailable');
        [occupiedBtn, availableBtn].forEach(btn => {
            btn.classList.remove('active', 'active-occupied', 'active-available');
        });
        availableBtn.classList.add('active', 'active-available');
        showToast('Status changed to AVAILABLE because fields are empty', 'info');
    }
    
    const saveBtn = document.getElementById('saveEditBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch('/api/admin/update-slot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slot_id: currentEditSlot.id,
                customer_name: customerName,
                contract_number: cleanContractNumber,
                customer_phone: customerPhone,
                status: finalStatus
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 && data.error && data.error.includes('already used')) {
                contractInput.className = 'form-input input-error';
                if (contractError) {
                    contractError.textContent = `⚠️ ${data.error}`;
                    contractError.style.display = 'flex';
                }
                showToast(data.error, 'error');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
            throw new Error(data.error || 'Failed to update slot');
        }
        
        if (data.success) {
            if (finalStatus === 'available' && customerName) {
                showToast(`Slot is now AVAILABLE (last owner: ${customerName})`, 'success');
            } else {
                showToast(data.message || 'Slot updated successfully!', 'success');
            }
            closeEditSlotModal();
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            showToast(data.error || 'Failed to update slot', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error updating slot:', error);
        showToast('Network error. Please try again.', 'error');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ===== SETUP STATUS TOGGLE BUTTONS =====
function setupEditStatusToggle() {
    const occupiedBtn = document.getElementById('editStatusOccupied');
    const availableBtn = document.getElementById('editStatusAvailable');
    
    function setStatus(status) {
        [occupiedBtn, availableBtn].forEach(btn => {
            btn.classList.remove('active', 'active-occupied', 'active-available');
        });
        
        if (status === 'occupied') {
            occupiedBtn.classList.add('active', 'active-occupied');
        } else {
            availableBtn.classList.add('active', 'active-available');
        }
    }
    
    if (occupiedBtn) {
        occupiedBtn.addEventListener('click', function() {
            setStatus('occupied');
        });
    }
    
    if (availableBtn) {
        availableBtn.addEventListener('click', function() {
            setStatus('available');
        });
    }
}

// ============================================================
// ==================== ADD NAP BOX BY COORDINATES ====================
// ============================================================

// ===== GET FULL NAP BOX NAME =====
function adminGetFullNapboxName() {
    const napboxNameInput = document.getElementById('adminNapboxName');
    return napboxNameInput ? napboxNameInput.value.trim() : '';
}

// ===== DELETE ADMIN NAP BOX MODAL STATE =====
let adminPendingDeleteNapbox = null;

function adminShowDeleteNapboxModal(napboxId, napboxName) {
    adminPendingDeleteNapbox = { napboxId, napboxName };

    const modalText = document.getElementById('deleteNapboxModalText');
    const napboxNameEl = document.getElementById('deleteNapboxName');
    if (modalText) {
        modalText.textContent = `Are you sure you want to delete "${napboxName}"? This will also delete all its slots and cannot be undone.`;
    }
    if (napboxNameEl) {
        napboxNameEl.textContent = napboxName;
    }

    const modal = document.getElementById('deleteNapboxModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function adminCloseDeleteNapboxModal() {
    const modal = document.getElementById('deleteNapboxModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    adminPendingDeleteNapbox = null;
}

async function adminExecuteDeleteNapbox() {
    if (!adminPendingDeleteNapbox) return;

    const { napboxId, napboxName } = adminPendingDeleteNapbox;
    adminCloseDeleteNapboxModal();
    await adminDeleteNapbox(napboxId, napboxName);
}

async function adminDeleteNapbox(napboxId, napboxName) {
    showToast('Deleting NAP Box...', 'loading');

    try {
        const tabId = getTabId();
        const response = await fetch(`/api/technician/napbox/${napboxId}?tab_id=${tabId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tab_id: tabId })
        });

        if (response.status === 404) {
            const altResponse = await fetch(`/api/technician/napbox/delete?tab_id=${tabId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ napbox_id: napboxId, tab_id: tabId })
            });

            if (!altResponse.ok) {
                const errData = await altResponse.json();
                throw new Error(errData.message || errData.error || `HTTP ${altResponse.status}`);
            }
        } else if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || errData.error || `HTTP ${response.status}`);
        }

        showToast(`"${napboxName}" deleted successfully`, 'success');
        await loadAdminNapboxData();
    } catch (error) {
        console.error('Error deleting admin NAP box:', error);
        showToast('Failed to delete NAP Box. Please try again.', 'error');
    }
}

window.adminShowDeleteNapboxModal = adminShowDeleteNapboxModal;
window.adminCloseDeleteNapboxModal = adminCloseDeleteNapboxModal;
window.adminExecuteDeleteNapbox = adminExecuteDeleteNapbox;
window.adminDeleteNapbox = adminDeleteNapbox;

// ===== GET BARANGAY FOR ADMIN (EXACT COPY FROM TECH SIDE) =====
async function getAdminAccurateBarangay(lat, lng) {
    try {
        // Try GeoRisk first
        const georiskUrl = "https://portal.georisk.gov.ph/arcgis/rest/services/PSA/Barangay/MapServer/4/query";
        
        const queryParams = new URLSearchParams({
            geometry: `${lng},${lat}`,
            geometryType: 'esriGeometryPoint',
            inSR: '4326',
            outFields: 'brgy_name,city_name,prov_name,psgc_10d',
            returnGeometry: 'false',
            f: 'geojson'
        });
        
        const response = await fetch(`${georiskUrl}?${queryParams.toString()}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                let detectedCity = props.city_name || "";
                let detectedBarangay = props.brgy_name || "";
                
                console.log(`📍 GeoRisk raw: City="${detectedCity}", Barangay="${detectedBarangay}"`);
                
                if (detectedBarangay) {
                    // I-convert sa Proper Case para tumugma sa database
                    detectedBarangay = detectedBarangay.toLowerCase().split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    // Handle (POB.) -> (Poblacion)
                    detectedBarangay = detectedBarangay
                        .replace(/\(Pob\.?\)/gi, '(Poblacion)')
                        .replace(/ Pob\.?/gi, ' (Poblacion)')
                        .replace(/\(Poblacion\)/gi, '(Poblacion)');
                    
// SPECIAL HANDLING para sa Santa Cruz Poblacion - GAMIT ANG ROMAN NUMERALS
if (detectedCity === "Santa Cruz") {
    console.log(`🔍 Raw detected barangay from GeoRisk: "${detectedBarangay}"`);
    
    let number = '';
    let rawName = detectedBarangay;
    
    // Pattern 1: "Poblacion 1", "Poblacion 2", etc.
    let match = rawName.match(/Poblacion\s*(\d+)/i);
    if (match) {
        number = match[1];
        console.log(`✅ Pattern 1 (Poblacion X): ${number}`);
    }
    
    // Pattern 2: "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", etc.
    if (!number) {
        match = rawName.match(/Barangay\s*(\d+)\s*\(Poblacion\)/i);
        if (match) {
            number = match[1];
            console.log(`✅ Pattern 2 (Barangay X (Poblacion)): ${number}`);
        }
    }
    
    // Pattern 3: "Barangay 1", "Barangay 2", etc.
    if (!number) {
        match = rawName.match(/Barangay\s*(\d+)/i);
        if (match) {
            number = match[1];
            console.log(`✅ Pattern 3 (Barangay X): ${number}`);
        }
    }
    
    // Pattern 4: Roman numerals converted to numbers
    if (!number) {
        const romanMap = {
            'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5'
        };
        match = rawName.match(/\b(I|II|III|IV|V)\b/i);
        if (match) {
            number = romanMap[match[1].toUpperCase()];
            console.log(`✅ Pattern 4 (Roman numeral ${match[1]} → ${number})`);
        }
    }
    
    // Pattern 5: Spanish words
    if (!number) {
        const spanishMap = {
            'uno': '1', 'dos': '2', 'tres': '3', 
            'kuwatro': '4', 'sinko': '5'
        };
        for (const [spanish, num] of Object.entries(spanishMap)) {
            if (rawName.toLowerCase().includes(spanish)) {
                number = num;
                console.log(`✅ Pattern 5 (Spanish ${spanish} → ${number})`);
                break;
            }
        }
    }
    
    // ✅ I-CONVERT ANG NUMBERS TO ROMAN NUMERALS
    const numToRoman = {
        '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V'
    };
    
    if (number && numToRoman[number]) {
        detectedBarangay = `Poblacion ${numToRoman[number]}`;
        console.log(`🎯 FINAL Santa Cruz barangay (Roman): "${detectedBarangay}"`);
    } else if (rawName.toLowerCase().includes('poblacion')) {
        detectedBarangay = 'Poblacion I';
        console.log(`⚠️ Fallback to Poblacion I`);
    } else {
        // I-capitalize lang ang normal na barangay
        detectedBarangay = rawName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }
}
                    
                    // SPECIAL HANDLING para sa Pila (Bulilan Norte/Sur, Santa Clara Norte/Sur)
                    if (detectedCity === "Pila") {
                        const lower = detectedBarangay.toLowerCase();
                        if (lower.includes('bulilan norte')) {
                            detectedBarangay = 'Bulilan Norte (Poblacion)';
                        } else if (lower.includes('bulilan sur')) {
                            detectedBarangay = 'Bulilan Sur (Poblacion)';
                        } else if (lower.includes('santa clara norte')) {
                            detectedBarangay = 'Santa Clara Norte (Poblacion)';
                        } else if (lower.includes('santa clara sur')) {
                            detectedBarangay = 'Santa Clara Sur (Poblacion)';
                        } else {
                            detectedBarangay = detectedBarangay.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ');
                        }
                    }
                    
                    // Para sa ibang lungsod, i-capitalize lang
                    if (detectedCity !== "Santa Cruz" && detectedCity !== "Pagsanjan" && detectedCity !== "Pila") {
                        detectedBarangay = detectedBarangay.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                    }
                    
                    // I-capitalize ang city name
                    detectedCity = detectedCity.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    
                    console.log(` GeoRisk converted: City="${detectedCity}", Barangay="${detectedBarangay}"`);
                    
                    // I-convert ang Pagsanjan barangay (Uno/Dos to I/II)
                    if (detectedCity === "Pagsanjan") {
                        const originalBarangay = detectedBarangay;
                        detectedBarangay = convertPagsanjanBarangay(detectedBarangay);
                        console.log(`🔄 Pagsanjan conversion: "${originalBarangay}" → "${detectedBarangay}"`);
                    }
                }
                
                return {
                    barangay: detectedBarangay,
                    city: detectedCity,
                    province: props.prov_name,
                    psgc: props.psgc_10d,
                    source: 'GeoRisk'
                };
            }
        }
        
        // ================================================================
        // FALLBACK TO NOMINATIM
        // ================================================================
        console.log('⚠️ GeoRisk failed or no data, trying Nominatim...');
        
        try {
            const nomResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'CableVision-Technician/1.0' } }
            );
            const data = await nomResponse.json();
            const addr = data.address || {};
            
            let barangay = addr.village || addr.suburb || addr.neighbourhood || addr.quarter || '';
            let city = addr.town || addr.city || addr.municipality || '';
            
            // I-convert sa Proper Case
            if (barangay) {
                barangay = barangay.toLowerCase().split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            }
            
            if (city) {
                city = city.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
            }
            
            // Handle Poblacion para sa Santa Cruz
            if (city === "Santa Cruz" && barangay.toLowerCase().includes('poblacion')) {
                const match = barangay.match(/Poblacion\s*(I|II|III|IV|V)/i);
                if (match) {
                    barangay = `Poblacion ${match[1].toUpperCase()}`;
                } else {
                    barangay = 'Poblacion I';
                }
            }
            
            // Handle Pagsanjan
            if (city === "Pagsanjan") {
                if (barangay.toLowerCase() === 'barangay i' || barangay.toLowerCase() === 'i' || barangay.toLowerCase() === 'uno') {
                    barangay = 'Barangay I (Poblacion)';
                } else if (barangay.toLowerCase() === 'barangay ii' || barangay.toLowerCase() === 'ii' || barangay.toLowerCase() === 'dos') {
                    barangay = 'Barangay II (Poblacion)';
                }
            }
            
            // Handle Pila
            if (city === "Pila") {
                const lower = barangay.toLowerCase();
                if (lower.includes('bulilan norte')) {
                    barangay = 'Bulilan Norte (Poblacion)';
                } else if (lower.includes('bulilan sur')) {
                    barangay = 'Bulilan Sur (Poblacion)';
                } else if (lower.includes('santa clara norte')) {
                    barangay = 'Santa Clara Norte (Poblacion)';
                } else if (lower.includes('santa clara sur')) {
                    barangay = 'Santa Clara Sur (Poblacion)';
                }
            }
            
            return {
                barangay: barangay,
                city: city,
                province: addr.state || '',
                source: 'Nominatim'
            };
        } catch (error) {
            console.error('Nominatim error:', error);
            return null;
        }
        // ================================================================
        // END OF NOMINATIM FALLBACK
        // ================================================================
        
    } catch (error) {
        console.error('GeoRisk API error:', error);
        return null;
    }
}

// ===== CONVERT PAGSANJAN BARANGAY =====
function convertPagsanjanBarangay(barangayName) {
    if (!barangayName) return barangayName;
    
    const lower = barangayName.toLowerCase().trim();
    
    // Map ng mga possible inputs sa tamang output
    const barangayMap = {
        // Barangay I mappings
        'barangay uno': 'Barangay I (Poblacion)',
        'uno': 'Barangay I (Poblacion)',
        'barangay i': 'Barangay I (Poblacion)',
        'barangay i (poblacion)': 'Barangay I (Poblacion)',
        'i': 'Barangay I (Poblacion)',
        '1': 'Barangay I (Poblacion)',
        
        // Barangay II mappings
        'barangay dos': 'Barangay II (Poblacion)',
        'dos': 'Barangay II (Poblacion)',
        'barangay ii': 'Barangay II (Poblacion)',
        'barangay ii (poblacion)': 'Barangay II (Poblacion)',
        'ii': 'Barangay II (Poblacion)',
        '2': 'Barangay II (Poblacion)'
    };
    
    // I-check kung may mapping
    if (barangayMap[lower]) {
        return barangayMap[lower];
    }
    
    // Kung hindi match, ibalik ang original
    return barangayName;
}

// ===== VALIDATE COORDINATES =====
async function adminValidateCoordinates() {
    const latInput = document.getElementById('adminCoordLatitude');
    const lngInput = document.getElementById('adminCoordLongitude');
    const resultDiv = document.getElementById('adminCoordValidationResult');
    const validateBtn = document.getElementById('adminValidateCoordsBtn');
    
    const latValue = latInput.value.trim().replace(/[^0-9.\-]/g, '');
    const lngValue = lngInput.value.trim().replace(/[^0-9.\-]/g, '');
    const lat = parseFloat(latValue);
    const lng = parseFloat(lngValue);
    
    latInput.className = 'admin-form-control';
    lngInput.className = 'admin-form-control';
    
    // ===== INPUT VALIDATION =====
    if (isNaN(lat) || isNaN(lng)) {
        if (isNaN(lat)) latInput.className = 'admin-form-control input-error';
        if (isNaN(lng)) lngInput.className = 'admin-form-control input-error';
        resultDiv.style.display = 'block';
        resultDiv.className = 'coord-invalid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-circle-exclamation"></i></span>
                <div>
                    <div class="result-title">Invalid Coordinates</div>
                    <div class="result-message">Please enter valid latitude and longitude values in decimal format.</div>
                </div>
            </div>
        `;
        return;
    }
    
    if (lat < -90 || lat > 90) {
        latInput.className = 'admin-form-control input-error';
        resultDiv.style.display = 'block';
        resultDiv.className = 'coord-invalid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-circle-exclamation"></i></span>
                <div>
                    <div class="result-title">Invalid Latitude</div>
                    <div class="result-message">Latitude must be between -90 and 90 degrees.</div>
                </div>
            </div>
        `;
        return;
    }
    
    if (lng < -180 || lng > 180) {
        lngInput.className = 'admin-form-control input-error';
        resultDiv.style.display = 'block';
        resultDiv.className = 'coord-invalid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-circle-exclamation"></i></span>
                <div>
                    <div class="result-title">Invalid Longitude</div>
                    <div class="result-message">Longitude must be between -180 and 180 degrees.</div>
                </div>
            </div>
        `;
        return;
    }
    
    // ===== SHOW CHECKING STATUS =====
    resultDiv.style.display = 'block';
    resultDiv.className = 'coord-checking';
    resultDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span class="result-icon"><i class="fas fa-spinner fa-spin"></i></span>
            <div>
                <div class="result-title">Validating Location...</div>
                <div class="result-message">Checking boundary, barangay, and road access.</div>
            </div>
        </div>
    `;
    validateBtn.disabled = true;
    validateBtn.innerHTML = '<span class="spinner-small"></span> Validating...';
    
    try {
        // ===== STEP 1: BOUNDARY CHECK =====
        // Check if within Philippines (basic bounds)
        if (lat < 4 || lat > 22 || lng < 116 || lng > 128) {
            resultDiv.className = 'coord-invalid';
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span class="result-icon"><i class="fas fa-circle-xmark"></i></span>
                    <div>
                        <div class="result-title">Outside Philippines</div>
                        <div class="result-message">Coordinates must be within the Philippines.</div>
                    </div>
                </div>
            `;
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
            return;
        }
        
        // ===== STEP 2: GET BARANGAY FROM COORDINATES =====
        const geoData = await getAdminAccurateBarangay(lat, lng);
        let barangayName = geoData?.barangay || '';
        let detectedCity = geoData?.city || '';
        
        console.log(`📍 Detected: ${barangayName}, ${detectedCity}`);
        
        // ===== VALIDATE BARANGAY - SAME AS TECH SIDE =====
        let barangayValid = false;
        if (barangayName && adminAllBarangays && adminAllBarangays.length > 0) {
            const normalize = (str) => {
                if (!str) return '';
                let normalized = str.toLowerCase()
                    .replace(/\s*\(poblacion\)\s*/gi, '')
                    .replace(/\s*\(pob\.?\)\s*/gi, '')
                    .replace(/\s+poblacion\s*/gi, '')
                    .trim();
                
// Special handling para sa Santa Cruz: i-extract ang numero (CONVERT TO ROMAN)
if (detectedCity === "Santa Cruz") {
    let romanNumber = '';
    const romanMatch = normalized.match(/\b(i|ii|iii|iv|v)\b/);
    if (romanMatch) {
        romanNumber = romanMatch[1];
        return `poblacion ${romanNumber}`;
    }
    const numberMatch = normalized.match(/\b(1|2|3|4|5)\b/);
    if (numberMatch) {
        const numToRomanMap = {'1':'i','2':'ii','3':'iii','4':'iv','5':'v'};
        romanNumber = numToRomanMap[numberMatch[1]];
        return `poblacion ${romanNumber}`;
    }
    if (normalized === 'barangay i' || normalized === 'i') return 'poblacion i';
    if (normalized === 'barangay ii' || normalized === 'ii') return 'poblacion ii';
    if (normalized === 'barangay iii' || normalized === 'iii') return 'poblacion iii';
    if (normalized === 'barangay iv' || normalized === 'iv') return 'poblacion iv';
    if (normalized === 'barangay v' || normalized === 'v') return 'poblacion v';
}
                
                return normalized;
            };
            
            const normalizedDetected = normalize(barangayName);
            const barangayExists = adminAllBarangays.some(b => normalize(b) === normalizedDetected);
            
            const cityMatch = detectedCity && adminAssignedArea && 
                detectedCity.toLowerCase() === adminAssignedArea.toLowerCase();
            
            if (barangayExists && cityMatch) {
                barangayValid = true;
                console.log(`✅ Barangay "${barangayName}" is valid (exists in database and city matches)`);
            } else if (barangayExists && !cityMatch) {
                console.log(`⚠️ Barangay exists but city mismatch: ${detectedCity} vs ${adminAssignedArea}`);
                barangayValid = false;
            } else {
                console.log(`❌ Barangay "${barangayName}" NOT found in database`);
                barangayValid = false;
            }
        } else {
            console.log(`⚠️ No barangay detected or adminAllBarangays not loaded`);
            barangayValid = false;
        }
        
        if (!barangayValid) {
            resultDiv.className = 'coord-invalid';
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span class="result-icon"><i class="fas fa-circle-xmark"></i></span>
                    <div>
                        <div class="result-title">Barangay Not in Included Area</div>
                        <div class="result-message">
                            Detected: <strong>${barangayName || 'Unknown'}</strong><br>
                            Assigned Area: <strong>${adminAssignedArea || 'Unknown'}</strong>
                        </div>
                    </div>
                </div>
            `;
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
            return;
        }
        
        // ===== STEP 3: ROAD CHECK (via Overpass API) =====
        console.log('🛣️ Checking road location...');
        
        let roadCheckPassed = false;
        let nearestRoadName = '';
        let nearestDistance = 999;
        let snappedLat = lat;
        let snappedLng = lng;
        
        try {
            const radius = 300;
            const overpassQuery = `
                [out:json][timeout:10];
                way(around:${radius},${lat},${lng})[highway];
                out geom;
            `;
            const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: overpassQuery
            });
            const overpassData = await overpassRes.json();
            const roads = overpassData.elements || [];
            
            const validRoadTypes = [
                'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
                'unclassified', 'residential', 'service', 'living_street',
                'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
                'tertiary_link'
            ];
            
            const validRoads = roads.filter(r =>
                r.tags && validRoadTypes.includes(r.tags.highway)
            );
            
            if (validRoads.length === 0) {
                resultDiv.className = 'coord-invalid';
                resultDiv.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <span class="result-icon"><i class="fas fa-circle-xmark"></i></span>
                        <div>
                            <div class="result-title">Not on a Road</div>
                            <div class="result-message">NAP boxes must be placed on or within 300 meters of a road. No road found nearby.</div>
                        </div>
                    </div>
                `;
                validateBtn.disabled = false;
                validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
                return;
            }
            
            roadCheckPassed = true;
            nearestRoadName = validRoads[0].tags?.name || validRoads[0].tags?.highway || 'road';
            
            let closestPoint = { lat, lng };
            let minDist = Infinity;
            
            validRoads.forEach(road => {
                if (!road.geometry) return;
                for (let i = 0; i < road.geometry.length - 1; i++) {
                    const p1 = road.geometry[i];
                    const p2 = road.geometry[i + 1];
                    const snapped = snapToSegment(lat, lng, p1.lat, p1.lon, p2.lat, p2.lon);
                    const d = haversineDistance(lat, lng, snapped.lat, snapped.lng);
                    if (d < minDist) {
                        minDist = d;
                        closestPoint = snapped;
                    }
                }
            });
            
            snappedLat = closestPoint.lat;
            snappedLng = closestPoint.lng;
            nearestDistance = Math.round(minDist);
            
            console.log(`🛣️ Nearest road: "${nearestRoadName}" (${nearestDistance}m away)`);
            
        } catch (err) {
            console.warn('Overpass road check fallback:', err);
            roadCheckPassed = true;
        }
        
        if (!roadCheckPassed) {
            resultDiv.className = 'coord-invalid';
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span class="result-icon"><i class="fas fa-circle-xmark"></i></span>
                    <div>
                        <div class="result-title">Not on a Road</div>
                        <div class="result-message">NAP boxes must be placed on or within 300 meters of a road. No road found nearby.</div>
                    </div>
                </div>
            `;
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
            return;
        }
        
        // ================================================================
        // ALL CHECKS PASSED!
        // ================================================================
        
        // Format barangay name
        let finalBarangay = barangayName;
        if (detectedCity === "Santa Cruz") {
    let number = '';
    let match = finalBarangay.match(/\b(1|2|3|4|5)\b/);
    if (match) number = match[1];
    if (!number) {
        match = finalBarangay.match(/\b(I|II|III|IV|V)\b/i);
        if (match) {
            const romanToNum = {'I':'1','II':'2','III':'3','IV':'4','V':'5'};
            number = romanToNum[match[1].toUpperCase()];
        }
    }
    
    // ✅ I-CONVERT ANG NUMBERS TO ROMAN NUMERALS
    const numToRoman = {
        '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V'
    };
    
    if (number && numToRoman[number]) {
        finalBarangay = `Poblacion ${numToRoman[number]}`;
    } else if (finalBarangay.toLowerCase().includes('poblacion')) {
        finalBarangay = 'Poblacion I';
    }
        } else if (detectedCity === "Pagsanjan") {
            finalBarangay = convertPagsanjanBarangay(finalBarangay);
        }
        
        adminValidatedCoordinates = { lat: snappedLat, lng: snappedLng };
        adminValidatedBarangay = finalBarangay;
        
        // Road distance display
        const roadDistanceText = nearestDistance === 0 ? 'On road' : nearestDistance + 'm away';
        
        // Show success with detailed breakdown
        resultDiv.className = 'coord-valid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-check-circle"></i></span>
                <div>
                    <div class="result-title">Location Validated</div>
                </div>
            </div>
            <div class="coord-details-grid">
                <div class="coord-detail-row">
                    <span class="label"><i class="fas fa-tag"></i> Barangay</span>
                    <span class="value pass">${finalBarangay}</span>
                </div>
                <div class="coord-detail-row">
                    <span class="label"><i class="fas fa-road"></i> Road</span>
                    <span class="value pass">${nearestRoadName} (${roadDistanceText})</span>
                </div>
                <div class="coord-detail-row">
                    <span class="label"><i class="fas fa-border-all"></i> Boundary</span>
                    <span class="value pass">Inside ${adminAssignedArea}</span>
                </div>
                <div class="coord-detail-row">
                    <span class="label"><i class="fas fa-crosshairs"></i> Snapped</span>
                    <span class="value">${snappedLat.toFixed(6)}, ${snappedLng.toFixed(6)}</span>
                </div>
                ${nearestDistance > 2 ? `
                <div class="coord-detail-row" style="border-top: 1px dashed #d1fae5; padding-top: 8px; margin-top: 4px;">
                    <span class="label" style="font-size: 11px; color: #059669;"><i class="fas fa-info-circle"></i> Note</span>
                    <span class="value" style="font-size: 12px; color: #059669;">Location snapped to nearest road (${nearestDistance}m)</span>
                </div>` : ''}
            </div>
        `;
        
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
        
        latInput.className = 'admin-form-control input-success';
        lngInput.className = 'admin-form-control input-success';
        
        // Add marker on map at snapped location
        addAdminTempMarker(snappedLat, snappedLng);
        
        // ✅ AUTO-GO TO STEP 2
        adminGoToStep2();
        
        showToast('Location validated successfully!', 'success');
        
    } catch (error) {
        console.error('Validation error:', error);
        resultDiv.className = 'coord-invalid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-circle-exclamation"></i></span>
                <div>
                    <div class="result-title">Validation Error</div>
                    <div class="result-message">${error.message || 'An unexpected error occurred.'}</div>
                </div>
            </div>
        `;
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
    }
}

// ===== OPEN ADD NAPBOX MODAL =====
function adminOpenAddNapboxModal() {
    const modal = document.getElementById('adminAddNapboxModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Show Step 1, hide Step 2
    const step1 = document.getElementById('adminStep1');
    const step2 = document.getElementById('adminStep2');
    if (step1) step1.style.display = 'flex';
    if (step2) step2.style.display = 'none';
    
    // Reset fields
    const latInput = document.getElementById('adminCoordLatitude');
    const lngInput = document.getElementById('adminCoordLongitude');
    if (latInput) {
        latInput.value = '';
        latInput.className = 'admin-form-control';
    }
    if (lngInput) {
        lngInput.value = '';
        lngInput.className = 'admin-form-control';
    }
    
    const resultDiv = document.getElementById('adminCoordValidationResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.className = '';
        resultDiv.innerHTML = '';
    }
    
    const validateBtn = document.getElementById('adminValidateCoordsBtn');
    const proceedBtn = document.getElementById('adminProceedAddBtn');
    if (validateBtn) validateBtn.style.display = 'inline-flex';
    if (proceedBtn) proceedBtn.style.display = 'inline-flex';
    
    adminValidatedCoordinates = null;
    adminValidatedBarangay = null;
    adminIsAddingNapbox = true;
    
    // Reset preview
    const previewCoords = document.getElementById('adminPreviewCoords');
    const previewBarangay = document.getElementById('adminPreviewBarangay');
    const previewArea = document.getElementById('adminPreviewArea');
    if (previewCoords) previewCoords.textContent = '-';
    if (previewBarangay) previewBarangay.textContent = '-';
    if (previewArea) previewArea.textContent = '-';
    
    setTimeout(() => {
        if (latInput) latInput.focus();
    }, 350);
}

// ===== GO TO STEP 2 =====
function adminGoToStep2() {
    if (!adminValidatedCoordinates || !adminValidatedBarangay) {
        showToast('Please validate the location first', 'error');
        return;
    }
    
    // Update preview
    const previewCoords = document.getElementById('adminPreviewCoords');
    const previewBarangay = document.getElementById('adminPreviewBarangay');
    const previewArea = document.getElementById('adminPreviewArea');
    
    if (previewCoords) {
        previewCoords.textContent = `${adminValidatedCoordinates.lat.toFixed(6)}, ${adminValidatedCoordinates.lng.toFixed(6)}`;
    }
    if (previewBarangay) previewBarangay.textContent = adminValidatedBarangay;
    if (previewArea) previewArea.textContent = adminAssignedArea || 'N/A';
    
    // Show Step 2, hide Step 1
    const step1 = document.getElementById('adminStep1');
    const step2 = document.getElementById('adminStep2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'flex';
    
    setTimeout(() => {
        const nameInput = document.getElementById('adminNapboxName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }, 300);
}

// ===== BACK TO STEP 1 =====
function adminBackToStep1() {
    const step1 = document.getElementById('adminStep1');
    const step2 = document.getElementById('adminStep2');
    if (step1) step1.style.display = 'flex';
    if (step2) step2.style.display = 'none';
}

// ===== CLOSE ADD NAPBOX MODAL =====
function adminCloseAddNapboxModal() {
    const modal = document.getElementById('adminAddNapboxModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    adminValidatedCoordinates = null;
    adminValidatedBarangay = null;
    adminIsAddingNapbox = false;
    
    if (adminTempMarker) {
        adminMap.removeLayer(adminTempMarker);
        adminTempMarker = null;
    }
}

// ===== ADD TEMPORARY MARKER =====
function addAdminTempMarker(lat, lng) {
    if (!adminMap) return;
    if (adminTempMarker) adminMap.removeLayer(adminTempMarker);
    
    adminTempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'pending-marker',
            html: '<div style="background: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 5px rgba(34,197,94,0.25);"></div>',
            iconSize: [18, 18]
        })
    }).addTo(adminMap);
    adminMap.flyTo([lat, lng], 18);
}

// ===== PROCEED ADD NAP BOX =====
async function adminProceedAddNapbox() {
    if (!adminValidatedCoordinates || !adminValidatedBarangay) {
        showToast('Please validate the location first', 'error');
        return;
    }
    
    const napboxName = adminGetFullNapboxName();
    const numSlots = parseInt(document.getElementById('adminNapboxSlots').value);
    const napboxNameInput = document.getElementById('adminNapboxName');
    
    if (!napboxName) {
        showToast('Please enter a valid NAP box name', 'error');
        if (napboxNameInput) {
            napboxNameInput.focus();
            napboxNameInput.style.borderColor = '#dc2626';
        }
        return;
    }
    
    const proceedBtn = document.getElementById('adminProceedAddBtn');
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="spinner-small"></span> Adding...';
    
    try {
        const response = await fetch('/api/technician/napbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                napbox_name: napboxName,
                latitude: adminValidatedCoordinates.lat,
                longitude: adminValidatedCoordinates.lng,
                area: adminAssignedArea,
                coverage_radius: 500,
                num_slots: numSlots,
                barangay: adminValidatedBarangay
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to add NAP box');
        }
        
        showToast(`NAP Box "${napboxName}" added with ${numSlots} slots`, 'success');
        
        adminCloseAddNapboxModal();
        
        // Refresh data
        await loadAdminNapboxData();
        
        // Rebuild markers
        clearAdminMarkers();
        addAdminNapboxMarkers();
        
        if (adminTempMarker) {
            adminMap.removeLayer(adminTempMarker);
            adminTempMarker = null;
        }
        
        // Show boundary again
        if (adminAssignedArea) {
            await showAdminCityBoundary(adminAssignedArea);
        }
        
    } catch (error) {
        console.error('Error adding NAP box:', error);
        showToast(error.message || 'Failed to add NAP box', 'error');
    } finally {
        proceedBtn.disabled = false;
        proceedBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add NAP Box';
    }
}

// ============================================================
// ==================== SETUP EVENT LISTENERS ====================
// ============================================================

function setupAdminEventListeners() {
    // Barangay filter
    const barangayFilter = document.getElementById('adminBarangayFilter');
    if (barangayFilter) {
        barangayFilter.addEventListener('change', async (e) => {
            const selectedBarangay = e.target.value;
            adminCurrentBarangay = selectedBarangay;
            renderAdminSlotsGrid();
            
            if (adminMap) {
                clearAdminMarkers();
                let napboxesToShow = [...adminAllNapboxes];
                if (adminAssignedArea && adminAssignedArea !== '') {
                    napboxesToShow = napboxesToShow.filter(n => normalizeAdminAreaName(n.area) === adminAssignedArea);
                }
                if (selectedBarangay && selectedBarangay !== '') {
                    napboxesToShow = napboxesToShow.filter(n => n.barangay === selectedBarangay);
                }
                addAdminNapboxMarkersFiltered(napboxesToShow);
                
                if (selectedBarangay && selectedBarangay !== '' && adminAssignedArea) {
                    await zoomToAdminBarangay(selectedBarangay, adminAssignedArea);
                }
            }
        });
    }
    
    // Slot filter buttons
    const filterChips = document.querySelectorAll('.filter-chip');
    console.log(`🔍 Found ${filterChips.length} filter chips`);
    
    if (filterChips.length > 0) {
        filterChips.forEach(btn => {
            btn.removeEventListener('click', handleFilterClick);
            btn.addEventListener('click', handleFilterClick);
        });
    } else {
        console.warn('⚠️ No .filter-chip elements found! Check if elements exist in HTML.');
    }
    
    function handleFilterClick(event) {
        const btn = event.currentTarget;
        const filterValue = btn.getAttribute('data-filter');
        
        console.log(`🔘 Filter clicked: ${filterValue}`);
        
        filterChips.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        adminCurrentFilter = filterValue;
        console.log(`📌 Filter changed to: ${adminCurrentFilter}`);
        renderAdminSlotsGrid();
    }
    
    // Refresh button
    const refreshDataBtn = document.getElementById('adminRefreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.removeEventListener('click', handleRefreshClick);
        refreshDataBtn.addEventListener('click', handleRefreshClick);
    }
    
    async function handleRefreshClick() {
        showToast('Refreshing data...', 'info');
        adminCurrentFilter = 'all';
        adminCurrentBarangay = '';
        
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === 'all') {
                btn.classList.add('active');
            }
        });
        
        const barangayFilter = document.getElementById('adminBarangayFilter');
        if (barangayFilter) barangayFilter.value = '';
        
        await loadAdminNapboxData();
        showToast('Data refreshed successfully', 'success');
    }
    
    // Modal close buttons
    const closeModalBtn = document.getElementById('closeAdminSlotModal');
    if (closeModalBtn) {
        closeModalBtn.removeEventListener('click', closeAdminSlotModal);
        closeModalBtn.addEventListener('click', closeAdminSlotModal);
    }
    
    const closeModalBtnAlt = document.getElementById('closeAdminSlotModalBtn');
    if (closeModalBtnAlt) {
        closeModalBtnAlt.removeEventListener('click', closeAdminSlotModal);
        closeModalBtnAlt.addEventListener('click', closeAdminSlotModal);
    }
    
    // Edit Modal close buttons
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

if (closeEditModalBtn) {
    closeEditModalBtn.removeEventListener('click', closeEditSlotModal);
    closeEditModalBtn.addEventListener('click', closeEditSlotModal);
}
if (cancelEditBtn) {
    cancelEditBtn.removeEventListener('click', closeEditSlotModal);
    cancelEditBtn.addEventListener('click', closeEditSlotModal);
}
if (saveEditBtn) {
    saveEditBtn.removeEventListener('click', saveEditSlot);
    saveEditBtn.addEventListener('click', saveEditSlot);
}

// Setup status toggle
setupEditStatusToggle();


// ================= CONTRACT PREFIX CHOICE (PILA) =================
    const prefixGIFBtnListener = document.getElementById('prefixChoiceGIF');
    const prefixPOBBtnListener = document.getElementById('prefixChoicePOB');
    
    function setSelectedPrefix(prefix) {
        adminSelectedContractPrefix = prefix;
        
        [prefixGIFBtnListener, prefixPOBBtnListener].forEach(btn => btn && btn.classList.remove('active'));
        const activeBtn = prefix === 'GIF-' ? prefixGIFBtnListener : prefixPOBBtnListener;
        if (activeBtn) activeBtn.classList.add('active');
        
        // I-reformat ang kasalukuyang laman ng contract input gamit ang bagong prefix
        const contractInputEl = document.getElementById('editContractNumber');
        if (contractInputEl) {
            const knownPrefixes = ['GIF-', 'POB-'];
            let value = contractInputEl.value;
            let numberPart = value;
            for (const p of knownPrefixes) {
                if (value.toUpperCase().startsWith(p)) {
                    numberPart = value.substring(p.length);
                    break;
                }
            }
            numberPart = numberPart.replace(/[^0-9-]/g, '');
            contractInputEl.value = prefix + numberPart;
        }
    }
    
    if (prefixGIFBtnListener) {
        prefixGIFBtnListener.addEventListener('click', () => setSelectedPrefix('GIF-'));
    }
    if (prefixPOBBtnListener) {
        prefixPOBBtnListener.addEventListener('click', () => setSelectedPrefix('POB-'));
    }

// Close on outside click
window.addEventListener('click', (e) => {
    const modal = document.getElementById('adminSlotDetailsModal');
    const editModal = document.getElementById('editSlotModal');
    if (e.target === modal) closeAdminSlotModal();
    if (e.target === editModal) closeEditSlotModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdminSlotModal();
        closeEditSlotModal();
    }
});


    // ===== CONTRACT NUMBER AUTO-FORMAT WITH 4-DIGIT LIMIT =====
    const contractInput = document.getElementById('editContractNumber');
    if (contractInput) {
        // ✅ REMOVE OLD EVENT LISTENERS BY CLONING
        const newContractInput = contractInput.cloneNode(true);
        contractInput.parentNode.replaceChild(newContractInput, contractInput);
        
        newContractInput.addEventListener('focus', function() {
            const prefix = getAdminContractPrefix();
            const currentValue = this.value.trim();
            
            if (!currentValue || !currentValue.match(/^[A-Z]+-/i)) {
                this.value = prefix;
                setTimeout(() => {
                    this.setSelectionRange(this.value.length, this.value.length);
                }, 10);
            }
        });
        
        // ✅ INPUT EVENT - LIMIT TO 4 DIGITS (SILENT, NO TOAST)
        newContractInput.addEventListener('input', function() {
            const prefix = getAdminContractPrefix();
            let value = this.value;
            let numberPart = value;
            
            if (value.startsWith(prefix)) {
                numberPart = value.substring(prefix.length);
            } else {
                const prefixes = [...Object.values(ADMIN_CONTRACT_PREFIXES), 'POB-'];
                for (const p of prefixes) {
                    if (value.startsWith(p)) {
                        numberPart = value.substring(p.length);
                        break;
                    }
                }
            }
            
            // ✅ REMOVE NON-NUMERIC CHARACTERS
            numberPart = numberPart.replace(/[^0-9]/g, '');
            
            // ✅ LIMIT TO 4 DIGITS ONLY (SILENT)
            if (numberPart.length > 4) {
                numberPart = numberPart.substring(0, 4);
            }
            
            this.value = prefix + numberPart;
            this.setSelectionRange(this.value.length, this.value.length);
        });
        
        // ✅ BLUR EVENT - ENSURE PROPER FORMAT
        newContractInput.addEventListener('blur', function() {
            const prefix = getAdminContractPrefix();
            let value = this.value.trim();
            
            if (!value || value === prefix) {
                this.value = prefix;
                return;
            }
            
            if (!value.startsWith(prefix)) {
                const numberPart = value.replace(/^[A-Z]+-/i, '');
                const cleanNumber = numberPart.replace(/[^0-9]/g, '').substring(0, 4);
                this.value = cleanNumber ? prefix + cleanNumber : prefix;
            }
        });
        
        // ✅ KEYDOWN EVENT - PREVENT TYPING BEYOND 4 DIGITS (SILENT)
        newContractInput.addEventListener('keydown', function(e) {
            const prefix = getAdminContractPrefix();
            const currentValue = this.value;
            const numberPart = currentValue.replace(new RegExp(`^${prefix}`, 'i'), '');
            
            // ✅ IF ALREADY 4 DIGITS, PREVENT ADDING MORE (SILENTLY - NO TOAST)
            if (numberPart.length >= 4) {
                const allowedKeys = [8, 9, 27, 13, 35, 36, 37, 38, 39, 40];
                if (!allowedKeys.includes(e.keyCode) && 
                    !(e.keyCode === 65 && e.ctrlKey) && // Ctrl+A
                    !(e.keyCode === 67 && e.ctrlKey) && // Ctrl+C
                    !(e.keyCode === 86 && e.ctrlKey) && // Ctrl+V
                    !(e.keyCode === 88 && e.ctrlKey)) { // Ctrl+X
                    e.preventDefault();
                    // ❌ WALANG TOAST DITO
                }
            }
        });
        
        // ✅ PASTE EVENT - LIMIT TO 4 DIGITS
        newContractInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numbersOnly = pastedText.replace(/\D/g, '');
            
            const prefix = getAdminContractPrefix();
            const currentValue = this.value;
            const currentNumberPart = currentValue.replace(new RegExp(`^${prefix}`, 'i'), '');
            
            const availableSpace = 4 - currentNumberPart.length;
            if (availableSpace <= 0) {
                // ❌ WALANG TOAST DITO
                return;
            }
            
            const newNumbers = numbersOnly.substring(0, availableSpace);
            if (newNumbers) {
                const newValue = prefix + (currentNumberPart + newNumbers);
                this.value = newValue;
                this.setSelectionRange(this.value.length, this.value.length);
            }
        });
    }

    // ===== CUSTOMER NAME AUTO-UPPERCASE =====
    const nameInput = document.getElementById('editCustomerName');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            // I-convert ang unang letter ng bawat word sa uppercase
            const cursorPos = this.selectionStart;
            const words = this.value.split(' ');
            const formattedWords = words.map(word => {
                if (word.length > 0) {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }
                return word;
            });
            const newValue = formattedWords.join(' ');
            
            // I-update lang kung nagbago
            if (newValue !== this.value) {
                this.value = newValue;
                // I-restore ang cursor position
                const newPos = cursorPos + (newValue.length - this.value.length);
                this.setSelectionRange(newPos, newPos);
            }
        });
    }


    // ================= CLEAR SLOT MODAL EVENTS =================
    const clearModal = document.getElementById('clearSlotModal');
    const closeClearBtn = document.getElementById('closeClearSlotModal');
    const cancelClearBtn = document.getElementById('cancelClearSlot');
    const confirmClearBtn = document.getElementById('confirmClearSlot');
    
    if (closeClearBtn) {
        closeClearBtn.removeEventListener('click', adminCloseClearSlotModal);
        closeClearBtn.addEventListener('click', adminCloseClearSlotModal);
    }
    
    if (cancelClearBtn) {
        cancelClearBtn.removeEventListener('click', adminCloseClearSlotModal);
        cancelClearBtn.addEventListener('click', adminCloseClearSlotModal);
    }
    
    if (confirmClearBtn) {
        confirmClearBtn.removeEventListener('click', adminExecuteClearSlot);
        confirmClearBtn.addEventListener('click', adminExecuteClearSlot);
    }
    
    if (clearModal) {
        clearModal.removeEventListener('click', adminCloseClearSlotModal);
        clearModal.addEventListener('click', function(e) {
            if (e.target === this) {
                adminCloseClearSlotModal();
            }
        });
    }

    const deleteNapboxModal = document.getElementById('deleteNapboxModal');
    const closeDeleteNapboxBtn = document.getElementById('closeDeleteNapboxModal');
    const cancelDeleteNapboxBtn = document.getElementById('cancelDeleteNapbox');
    const confirmDeleteNapboxBtn = document.getElementById('confirmDeleteNapbox');

    if (closeDeleteNapboxBtn) {
        closeDeleteNapboxBtn.addEventListener('click', adminCloseDeleteNapboxModal);
    }

    if (cancelDeleteNapboxBtn) {
        cancelDeleteNapboxBtn.addEventListener('click', adminCloseDeleteNapboxModal);
    }

    if (confirmDeleteNapboxBtn) {
        confirmDeleteNapboxBtn.addEventListener('click', adminExecuteDeleteNapbox);
    }

    if (deleteNapboxModal) {
        deleteNapboxModal.addEventListener('click', function(e) {
            if (e.target === this) {
                adminCloseDeleteNapboxModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (clearModal && clearModal.classList.contains('show')) {
                adminCloseClearSlotModal();
            }
            if (deleteNapboxModal && deleteNapboxModal.classList.contains('show')) {
                adminCloseDeleteNapboxModal();
            }
        }
    });


}

// ===== SETUP ADD NAPBOX LISTENERS =====
function setupAdminAddNapboxListeners() {
    // Add NAP Box button
    const addBtn = document.getElementById('adminAddNapboxBtn');
    if (addBtn) {
        addBtn.addEventListener('click', adminOpenAddNapboxModal);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('adminCancelAddBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', adminCloseAddNapboxModal);
    }
    
    // Validate button
    const validateBtn = document.getElementById('adminValidateCoordsBtn');
    if (validateBtn) {
        validateBtn.addEventListener('click', adminValidateCoordinates);
    }
    
    // Back button (Step 2 -> Step 1)
    const backBtn = document.getElementById('adminBackToCoordsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', adminBackToStep1);
    }
    
    // Proceed button (Step 2 -> Add)
    const proceedBtn = document.getElementById('adminProceedAddBtn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', adminProceedAddNapbox);
    }
    
    // NAP box name input validation
    const nameInput = document.getElementById('adminNapboxName');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            const trimmed = this.value.trim();
            this.style.borderColor = trimmed.length > 0 ? '#22c55e' : '#dc2626';
        });
        nameInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.style.borderColor = '#dc2626';
            }
        });
    }
    
    // Enter key support
    document.getElementById('adminCoordLatitude')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('adminCoordLongitude').focus();
        }
    });
    document.getElementById('adminCoordLongitude')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            adminValidateCoordinates();
        }
    });
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('adminAddNapboxModal');
        if (e.target === modal) {
            adminCloseAddNapboxModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            adminCloseAddNapboxModal();
        }
    });
    
    // Refresh map button
    const refreshMapBtn = document.getElementById('adminRefreshMapBtn');
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', async function() {
            showToast('Refreshing map...', 'info');
            await loadAdminNapboxData();
            clearAdminMarkers();
            addAdminNapboxMarkers();
            if (adminAssignedArea) {
                await showAdminCityBoundary(adminAssignedArea);
            }
            showToast('Map refreshed', 'success');
        });
    }
}

// ===== ZOOM FUNCTIONS =====
async function zoomToAdminBarangay(barangayName, cityName) {
    if (!barangayName || !cityName) {
        showToast('Missing location data', 'error');
        return;
    }
    
    const normalizedBarangay = barangayName.toLowerCase().trim();
    const normalizedCity = cityName.toLowerCase().trim();
    
    if (normalizedCity === 'pagsanjan') {
        if (normalizedBarangay === 'barangay i (poblacion)' || normalizedBarangay === 'barangay i' || 
            normalizedBarangay === 'i' || normalizedBarangay === '1' || normalizedBarangay === 'uno') {
            adminMap.setView([14.274037, 121.455957], 16);
            showToast(`Zoomed to ${barangayName}`, 'success');
            return;
        } else if (normalizedBarangay === 'barangay ii (poblacion)' || normalizedBarangay === 'barangay ii' || 
                   normalizedBarangay === 'ii' || normalizedBarangay === '2' || normalizedBarangay === 'dos') {
            adminMap.setView([14.273942, 121.451841], 16);
            showToast(`Zoomed to ${barangayName}`, 'success');
            return;
        }
    }
    
    try {
        let cleanBarangayName = barangayName.replace(/\s*\(Poblacion\)\s*/gi, '').trim();
        const searchQuery = `${cleanBarangayName}, ${cityName}, Laguna`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            adminMap.setView([lat, lng], 16);
            showToast(`Zoomed to ${barangayName}`, 'success');
        } else {
            showToast(`Location "${barangayName}" not found`, 'error');
        }
    } catch (error) {
        console.error('Error zooming to barangay:', error);
        showToast('Error finding location', 'error');
    }
}

// ===== FILTERED MARKERS =====
function addAdminNapboxMarkersFiltered(napboxesToShow) {
    if (!adminMap) return;
    
    let validMarkersAdded = 0;
    
    napboxesToShow.forEach(napbox => {
        const lat = parseFloat(napbox.latitude);
        const lng = parseFloat(napbox.longitude);
        
        const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        
        if (hasValidCoords) {
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'napbox-marker',
                    html: '<div style="background: #dc2626; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
                    iconSize: [16, 16],
                    popupAnchor: [0, -8]
                })
            }).addTo(adminMap);
            
            const circle = L.circle([lat, lng], {
                radius: napbox.coverage_radius || 500,
                color: '#c52222',
                fillColor: '#c52222',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(adminMap);
            
            const napboxSlots = adminAllSlots.filter(slot => slot.napbox_id === napbox.id);
            const availableCount = napboxSlots.filter(s => s.status === 'available').length;
            const occupiedCount = napboxSlots.filter(s => s.status === 'occupied').length;
            const safeNapboxName = (napbox.name || 'NAP Box').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <b>${escapeHtml(napbox.name || 'NAP Box')}</b><br>
                    <small>${escapeHtml(napbox.barangay || 'No barangay')}</small>
                    <hr>
                    <b>Area:</b> ${escapeHtml(napbox.area || 'N/A')}<br>
                    <b>Coverage:</b> ${napbox.coverage_radius || 500}m<br>
                    <span style="color:#22c55e">● Available: ${availableCount}</span><br>
                    <span style="color:#ef4444">● Occupied: ${occupiedCount}</span>
                    <hr style="margin:6px 0;">
                    <button onclick="adminShowDeleteNapboxModal(${napbox.id}, '${safeNapboxName}')" style="width:100%; padding:8px; background:#dc2626; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; transition: all 0.2s ease; pointer-events: auto !important;">
                        Delete NAP Box
                    </button>
                </div>
            `);
            
            adminMarkers.push(marker);
            adminCircles.push(circle);
            validMarkersAdded++;
        }
    });
    
    console.log(`✅ Added ${validMarkersAdded} filtered markers`);
    
    if (validMarkersAdded > 0 && adminMarkers.length > 0) {
        const group = L.featureGroup(adminMarkers);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
            adminMap.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// ==================== HELPER FUNCTIONS ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== HELPER: Snap point to nearest point on a line segment =====
function snapToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { lat: ax, lng: ay };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { lat: ax + t * dx, lng: ay + t * dy };
}

// ===== HELPER: Haversine distance in meters =====
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==================== PROFILE & LOGOUT ====================
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => profileMenu.classList.remove('show'));
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    
    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', () => {
            logoutModal.classList.add('show');
            logoutModal.style.display = 'flex';
        });
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => {
                logoutModal.classList.remove('show');
                logoutModal.style.display = 'none';
            });
        }
        
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => {
                const tabId = getTabId();
                fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tab_id: tabId })
                }).catch(() => {});

                sessionStorage.clear();
                window.location.replace('/');
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.classList.remove('show');
                logoutModal.style.display = 'none';
            }
        });
    }
}

function setupHamburgerMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }
}

// ==================== 🆕 VISIBILITY CHANGE - REFRESH ON TAB SWITCH (BAGO) ====================
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('👁️ Tab became visible, refreshing NAP box data...');
        await refreshAdminInfo();
        await loadAdminNapboxData();
    }
});

// ==================== 🆕 INITIALIZATION (UPDATED) ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin NAP Box page initializing...');
    setupHamburgerMenu();
    setupProfileDropdown();
    setupLogout();
    
    const isValid = await checkSession();
    if (!isValid) return;
    
    // 👇 I-REFRESH MUNA ANG ADMIN INFO BAGO MAG-LOAD NG DATA
    await refreshAdminInfo();
    
    await loadAdminProfile();
    await loadAdminNapboxData();
    setupAdminEventListeners();
    setupAdminAddNapboxListeners();
    
    if (window.NotificationSystem) window.NotificationSystem.init();
});



// ==================== CONTRACT PREFIX MAPPING ====================
const ADMIN_CONTRACT_PREFIXES = {
    "Santa Cruz": "FS-",
    "Pagsanjan": "FP-",
    "Pila": "GIF-",
    "Magdalena": "CVM-"
};

function getAdminContractPrefix() {
    const area = adminAssignedArea || sessionStorage.getItem('adminArea') || '';
    const normalizedArea = normalizeAdminAreaName(area);
    
    // ✅ SPECIAL CASE: Pila may choice ng prefix (GIF- or POB-)
    if (normalizedArea === "Pila") {
        return adminSelectedContractPrefix || "GIF-";
    }
    
    let prefix = ADMIN_CONTRACT_PREFIXES[normalizedArea];
    
    if (!prefix) {
        const lowerArea = area.toLowerCase();
        if (lowerArea.includes('santa') || lowerArea.includes('sta')) {
            prefix = "FS-";
        } else if (lowerArea.includes('pagsanjan')) {
            prefix = "FP-";
        } else if (lowerArea.includes('pila')) {
            prefix = adminSelectedContractPrefix || "GIF-";
        } else if (lowerArea.includes('magdalena')) {
            prefix = "CVM-";
        } else {
            prefix = "CV-";
        }
    }
    
    return prefix;
}

// ===== FORMAT CONTRACT NUMBER WITH PREFIX =====
function formatContractNumber(input) {
    // Kunin ang prefix base sa area
    const prefix = getAdminContractPrefix();
    
    // Alisin ang anumang existing prefix
    let cleanNumber = input.replace(/^[A-Z]+-/i, '').trim();
    
    // Kung walang laman, ibalik ang prefix lang
    if (!cleanNumber) {
        return prefix;
    }
    
    // Ibalik ang prefix + number
    return prefix + cleanNumber;
}

// ===== GET JUST THE NUMBER PART (without prefix) =====
function getContractNumberOnly(input) {
    // Alisin ang prefix
    const prefix = getAdminContractPrefix();
    let cleanNumber = input.replace(new RegExp(`^${prefix}`, 'i'), '').trim();
    // Kung walang laman, ibalik ang empty
    return cleanNumber;
}