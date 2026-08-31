// ==================== TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== SESSION MANAGEMENT - PER TAB ====================
(function() {
    const isLoggedIn = sessionStorage.getItem('technicianId') && sessionStorage.getItem('sessionActive') === 'true';
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

// ================= PROFILE DROPDOWN =================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });
    
    window.addEventListener("click", e => {
        if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.classList.remove("show");
        }
    });
}

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    // Open
    logoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });
    
    // Close - X button
    const closeBtnLogout = document.getElementById("closeLogoutModal");
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Close - Cancel button
    const cancelLogout = document.getElementById("cancelLogout");
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Confirm logout
    const confirmLogout = document.getElementById("confirmLogout");
    if (confirmLogout) {
        confirmLogout.addEventListener("click", function() {
            const tabId = getTabId();
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: tabId })
            }).catch(() => {});

            sessionStorage.clear();
            window.location.replace("/");
        });
    }
    
    // Close on outside click
    window.addEventListener("click", function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    });
}

// ================= PROFILE LINK =================
const profileLink = document.getElementById("profileLink");
if (profileLink) {
    profileLink.addEventListener("click", e => {
        e.preventDefault();
        const technicianId = sessionStorage.getItem("technicianId");
        if (!technicianId) {
            alert("Technician not logged in");
            return;
        }
        window.location.href = `/technician/profile?technician_id=${technicianId}`;
    });
}

// ================= LOAD TECHNICIAN PROFILE =================
async function loadTechnicianProfile() {
    const technicianId = sessionStorage.getItem("technicianId");
    if (!technicianId) {
        console.error("No technician ID found");
        return;
    }
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/profile?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        // Store technician info for other uses
        if (profile.technician_id) {
            sessionStorage.setItem("technicianId", profile.technician_id);
        }
        if (profile.area) {
            sessionStorage.setItem("technicianArea", profile.area);
        }
        
        console.log("Technician profile loaded:", profile.name);
    } catch (err) {
        console.error("Error loading technician profile:", err);
    }
}

// ================= DATE & TIME =================
function updateDateTime() {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = days[now.getDay()];
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = now.toLocaleDateString('en-US', dateOptions);
    const time = now.toLocaleTimeString();
    
    const currentDayEl = document.getElementById("currentDay");
    const currentDateEl = document.getElementById("currentDate");
    const liveTimeEl = document.getElementById("liveTime");
    
    if (currentDayEl) currentDayEl.textContent = day;
    if (currentDateEl) currentDateEl.textContent = date;
    if (liveTimeEl) liveTimeEl.textContent = time;
}

setInterval(updateDateTime, 1000);
updateDateTime();

// ================= HAMBURGER MENU TOGGLE =================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!sidebar || !hamburger) return;
    sidebar.classList.toggle('active');
    hamburger.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

if (hamburger) {
    hamburger.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ================= INITIALIZE DASHBOARD =================
async function initializeDashboard() {
    const technicianId = sessionStorage.getItem("technicianId");
    
    if (!technicianId) {
        console.error("No technician ID found, redirecting to login...");
        window.location.replace("/");
        return;
    }
    
    console.log("Initializing dashboard for technician:", technicianId);
    
    try {
        await loadTechnicianProfile();
        console.log("Dashboard initialization complete");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Start the dashboard
initializeDashboard();

// Initialize notification system if available
document.addEventListener("DOMContentLoaded", () => {
    if (window.TechnicianNotificationSystem) {
        window.TechnicianNotificationSystem.init();
    }
});

// ================= NAP BOX SLOTS JAVASCRIPT =================

// Global variables
let map = null;
let currentNapboxMarkers = [];
let currentCircles = [];
let currentSlots = [];
let currentNapboxes = [];
let currentFilter = 'all';
let currentBarangayFilter = '';
let technicianArea = null;
let technicianCoordinates = null;
let cityBoundaryLayer = null;
let currentCity = null;
let isSatelliteView = false;
let currentTileLayer = null;

// NAP Box pinning
let isAddingNapbox = false;
let tempMarker = null;
let pendingLocation = null;
let allBarangays = [];

let technicianSelectedContractPrefix = null; // "GIF-" or "POB-" — ginagamit lang kapag Pila

const LAGUNA_GEOJSON_URLS = {
    "Santa Cruz": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434280000.0.001.json",
    "Pagsanjan":  "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434240000.0.001.json",
    "Pila":       "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434260000.0.001.json",
    "Magdalena":  "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434160000.0.001.json"
};

const LAGUNA_MUNICIPALITIES = {
    "Santa Cruz": {
        name: "Santa Cruz",
        province: "Laguna",
        psgc: "043428000"
    },
    "Pagsanjan": {
        name: "Pagsanjan", 
        province: "Laguna",
        psgc: "043424000"
    },
    "Pila": {
        name: "Pila",
        province: "Laguna", 
        psgc: "043426000"
    },
    "Magdalena": {
        name: "Magdalena",
        province: "Laguna",
        psgc: "043416000"
    }
};
// Initialize when page loads
// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    initializeNapboxPage();
});

// Fallback if DOMContentLoaded already fired
if (document.readyState === 'complete') {
    (async function() {
        const isValid = await checkSession();
        if (!isValid) return;
        initializeNapboxPage();
    })();
}

async function initializeNapboxPage() {
    console.log('Initializing NAP Box Slots page...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const customerLatitude = urlParams.get('customer_latitude');
    const customerLongitude = urlParams.get('customer_longitude');
    const fromAssignModal = urlParams.get('from_assign_modal') === '1';

    if (fromAssignModal && customerLatitude && customerLongitude) {
        sessionStorage.setItem('customerTargetLatitude', customerLatitude);
        sessionStorage.setItem('customerTargetLongitude', customerLongitude);
        // ✅ I-SET ANG FLAG PARA MAIPAKITA ANG CUSTOMER MARKER
        sessionStorage.setItem('showCustomerLocationMarker', 'true');
        console.log('✅ Customer location marker will be shown (from assign modal)');
    } else {
        // ✅ KUNG NORMAL VISIT LANG, TANGGALIN ANG FLAG
        sessionStorage.removeItem('showCustomerLocationMarker');
        console.log('ℹ️ Normal visit - no customer marker');
    }
    
    // ✅ SIGURADUHIN NA MAY TECHNICIAN ID
    let technicianId = sessionStorage.getItem('technicianId');
    
    // Kung wala, subukan kunin mula sa URL
    if (!technicianId) {
        const urlParams = new URLSearchParams(window.location.search);
        technicianId = urlParams.get('technician_id');
        if (technicianId) {
            sessionStorage.setItem('technicianId', technicianId);
            console.log('✅ Technician ID from URL:', technicianId);
        }
    }
    
    if (!technicianId) {
        console.error('No technician ID found');
        showError('Please login again');
        setTimeout(() => {
            window.location.replace('/');
        }, 2000);
        return;
    }
    
    console.log('✅ Technician ID:', technicianId);

    // ✅ I-HIDE ANG CUSTOMER LEGEND SA SIMULA (default)
    const legendItem = document.getElementById('customerLegendItem');
    if (legendItem) {
        legendItem.style.display = 'none';
    }
    
    await loadTechnicianArea(technicianId);
    await loadBarangaysFromDatabase();
    await loadNapboxSlots();
    setupEventListeners();
    setupEditSlotModalListenersTech();
    setupCoordinatePasteAutoFill();

    // ✅ I-HIDE ANG CUSTOMER PIN BUTTON SA SIMULA (default)
    const customerPinBtn = document.getElementById('customerPinBtn');
    if (customerPinBtn) {
        customerPinBtn.style.display = 'none';
        customerPinBtn.style.visibility = 'hidden';
        customerPinBtn.dataset.lat = '';
        customerPinBtn.dataset.lng = '';
        console.log('✅ Customer Pin button hidden by default');
    }

    // ✅ MAGDAGDAG NG FORCED DISPLAY KUNG MAY CUSTOMER LOCATION
    // Siguraduhin na lalabas ang customer pin button kung may marker
    setTimeout(() => {
        const showMarker = sessionStorage.getItem('showCustomerLocationMarker') === 'true';
        if (showMarker) {
            const btn = document.getElementById('customerPinBtn');
            if (btn) {
                btn.style.display = 'inline-flex';
                btn.style.visibility = 'visible';
                btn.style.opacity = '1';
                const lat = sessionStorage.getItem('customerTargetLatitude');
                const lng = sessionStorage.getItem('customerTargetLongitude');
                if (lat && lng) {
                    btn.dataset.lat = parseFloat(lat);
                    btn.dataset.lng = parseFloat(lng);
                }
                console.log('✅ Customer Pin button forced to show');
            } else {
                console.warn('⚠️ Customer Pin button not found for forced display');
            }
        }
    }, 1000);
}

async function loadTechnicianArea(technicianId) {
    try {
        const tabId = getTabId();
        const response = await fetch(`/api/technician/area?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load technician area');
        }
        
        const data = await response.json();
        technicianArea = data.area;
        
        console.log("=========================================");
        console.log("📌 TECHNICIAN AREA FROM API:", technicianArea);
        console.log("📌 RAW DATA:", data);
        console.log("=========================================");
        
        // ✅ I-save ang raw area sa sessionStorage
        sessionStorage.setItem("technicianAreaRaw", technicianArea);
        
        // ✅ IDAGDAG ITO - Area mappings para sa NAP box naming
        const areaMappings = {
            "santa cruz": "Santa Cruz",
            "sta. cruz": "Santa Cruz",
            "sta cruz": "Santa Cruz",
            "santa": "Santa Cruz",
            "pagsanjan": "Pagsanjan",
            "pila": "Pila",
            "magdalena": "Magdalena"
        };
        
        let mappedArea = technicianArea;
        const lowerArea = (technicianArea || "").toLowerCase().trim();
        
        // I-check kung may mapping
        if (areaMappings[lowerArea]) {
            mappedArea = areaMappings[lowerArea];
            console.log(`📍 Mapped area: "${technicianArea}" → "${mappedArea}"`);
            technicianArea = mappedArea;
        }
        // Kung hindi exact match, subukan ang partial match
        else if (lowerArea.includes('santa')) {
            technicianArea = "Santa Cruz";
            console.log(`📍 Partial match: "${data.area}" → Santa Cruz`);
        }
        else if (lowerArea.includes('pagsanjan')) {
            technicianArea = "Pagsanjan";
            console.log(`📍 Partial match: "${data.area}" → Pagsanjan`);
        }
        else if (lowerArea.includes('pila')) {
            technicianArea = "Pila";
            console.log(`📍 Partial match: "${data.area}" → Pila`);
        }
        else if (lowerArea.includes('magdalena')) {
            technicianArea = "Magdalena";
            console.log(`📍 Partial match: "${data.area}" → Magdalena`);
        }
        
        // ✅ I-save ang normalized area sa sessionStorage
        sessionStorage.setItem("technicianArea", technicianArea);
        
        console.log("✅ Final technicianArea for NAP naming:", technicianArea);
        
        // Make sure it's exactly "Santa Cruz" with proper spacing
        if (technicianArea === "Sta. Cruz") {
            technicianArea = "Santa Cruz";
            console.log("✅ Converted Sta. Cruz to Santa Cruz");
        }
        
        technicianCoordinates = {
            lat: data.latitude || 14.5995,
            lng: data.longitude || 120.9842
        };
        
        displayAreaInfo(data);
        
        // Initialize map
        initializeMap();

        map.whenReady(() => {
            setTimeout(() => {
                map.invalidateSize();
            }, 300);

            if (!focusCustomerTargetLocation()) {
                showCurrentLocation(false);
            }
        });

        // Show municipal boundary AUTOMATICALLY for assigned area
        if (technicianArea) {
            console.log("🎯 Calling showCityBoundary with:", technicianArea);
            setTimeout(() => {
                showCityBoundary(technicianArea);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error loading technician area:', error);
        showAreaError();
    }
}

// ================= LOAD BARANGAYS FROM DATABASE =================
async function loadBarangaysFromDatabase() {
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        
        const tabId = getTabId();
        const areaResponse = await fetch(`/api/technician/area?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
        const areaData = await areaResponse.json();
        const technicianCity = areaData.area;
        
        if (!technicianCity) {
            console.error('No city found for technician');
            return;
        }
        
        console.log(`Loading barangays for city: ${technicianCity}`);
        
        const response = await fetch(`/api/areas/by-city/${encodeURIComponent(technicianCity)}?tab_id=${tabId}`);
        
        if (response.ok) {
            const areas = await response.json();
            // Keep original case from database
            allBarangays = [...new Set(areas.map(a => a.barangay))];
            
            console.log(`Loaded ${allBarangays.length} barangays:`, allBarangays);
            
            const barangayFilter = document.getElementById('barangayFilter');
            const slotBarangayFilter = document.getElementById('slotBarangayFilter');
            
            if (barangayFilter) {
                barangayFilter.innerHTML = '<option value="">All Barangays</option>';
                allBarangays.forEach(barangay => {
                    // Keep original case for display
                    barangayFilter.innerHTML += `<option value="${barangay}">${barangay}</option>`;
                });
            }
            
            if (slotBarangayFilter) {
                slotBarangayFilter.innerHTML = '<option value="">All Barangays</option>';
                allBarangays.forEach(barangay => {
                    slotBarangayFilter.innerHTML += `<option value="${barangay}">${barangay}</option>`;
                });
            }
            
            window.allBarangays = allBarangays;
        }
    } catch (error) {
        console.error('Error loading barangays:', error);
    }
}

// ================= SIMPLE ZOOM TO BARANGAY (FIXED - WITH POBLACION HANDLING) =================
async function zoomToBarangay(barangayName) {
    if (!barangayName || !technicianArea) {
        console.error("❌ Missing barangayName or technicianArea", { barangayName, technicianArea });
        showToast(`Error: Missing location data`, 'error');
        return;
    }

    // ================= HARDCODED COORDINATES FOR PAGSANJAN BARANGAY I AND II =================
    // I-declare muna ang normalized variables
    const normalizedBarangay = barangayName.toLowerCase().trim();
    const normalizedCity = technicianArea.toLowerCase().trim();
    
    // Check kung Pagsanjan ang city
    if (normalizedCity === 'pagsanjan') {
        // Barangay I (Poblacion)
        if (normalizedBarangay === 'barangay i (poblacion)' || 
            normalizedBarangay === 'barangay i' || 
            normalizedBarangay === 'i' || 
            normalizedBarangay === '1' ||
            normalizedBarangay === 'uno') {
            console.log(`📍 Using hardcoded coordinates for Pagsanjan Barangay I (Poblacion)`);
            map.setView([14.274037, 121.455957], 16);
            showToast(`Zoomed to ${barangayName}`, 'success');
            return;
        } 
        // Barangay II (Poblacion)
        else if (normalizedBarangay === 'barangay ii (poblacion)' || 
                 normalizedBarangay === 'barangay ii' || 
                 normalizedBarangay === 'ii' || 
                 normalizedBarangay === '2' ||
                 normalizedBarangay === 'dos') {
            console.log(`📍 Using hardcoded coordinates for Pagsanjan Barangay II (Poblacion)`);
            map.setView([14.273942, 121.451841], 18);
            showToast(`✓ Zoomed to ${barangayName}`, 'success');
            return;
        }
    }
    
    console.log(`🔍 Zooming to: ${barangayName}, ${technicianArea}`);
    console.log(`📍 Map object exists:`, map !== null);
    showToast(`Loading ${barangayName}...`, 'loading');
    
    const mapDiv = document.getElementById('napboxMap');
    if (mapDiv) mapDiv.style.opacity = '0.6';
    
    try {
        // Clean the barangay name for search - remove (Poblacion) and extra spaces
        let cleanBarangayName = barangayName
            .replace(/\s*\(Poblacion\)\s*/gi, '')
            .replace(/\s*\(POBLACION\)\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Special handling for Bulilan and Santa Clara in Pila
        if (technicianArea === "Pila") {
            if (cleanBarangayName.toLowerCase().includes('bulilan norte')) {
                cleanBarangayName = 'Bulilan Norte';
            } else if (cleanBarangayName.toLowerCase().includes('bulilan sur')) {
                cleanBarangayName = 'Bulilan Sur';
            } else if (cleanBarangayName.toLowerCase().includes('santa clara norte')) {
                cleanBarangayName = 'Santa Clara Norte';
            } else if (cleanBarangayName.toLowerCase().includes('santa clara sur')) {
                cleanBarangayName = 'Santa Clara Sur';
            }
        }
        
        // Special handling for Pagsanjan (other than I and II)
        if (technicianArea === "Pagsanjan") {
            if (cleanBarangayName.toLowerCase().includes('barangay i')) {
                cleanBarangayName = 'Barangay I';
            } else if (cleanBarangayName.toLowerCase().includes('barangay ii')) {
                cleanBarangayName = 'Barangay II';
            }
        }
        
        // Special handling for Santa Cruz Poblacion
        if (technicianArea === "Santa Cruz") {
            if (cleanBarangayName.toLowerCase().includes('poblacion')) {
                // Keep as is but ensure proper format
                cleanBarangayName = cleanBarangayName.replace(/Poblacion/i, 'Poblacion');
            }
        }
        
        const searchQuery = `${cleanBarangayName}, ${technicianArea}, Laguna`;
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`;
        
        console.log(`🌐 Nominatim Query:`, searchQuery);
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'CableVision-Technician/1.0' }
        });
        const data = await response.json();
        
        console.log(`📡 Nominatim Response:`, data);
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            const displayName = data[0].display_name;
            
            console.log(`✅ Found location - Lat: ${lat}, Lng: ${lng}`);
            console.log(`📌 Display Name: ${displayName}`);
            
            if (!map) {
                console.error("❌ Map object is null or undefined!");
                showTemporaryMessage("Map not initialized yet", "error");
                return;
            }
            
            map.setView([lat, lng], 16);
            showToast(`Zoomed to ${barangayName}`, 'success');
            console.log(`✅ Zoomed to: ${barangayName} at zoom level 16`);
        } else {
            console.warn(`⚠️ No results found for: ${searchQuery}`);
            
            // Try alternative search without the city
            const altQuery = `${cleanBarangayName}, Laguna`;
            const altEncodedQuery = encodeURIComponent(altQuery);
            const altUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${altEncodedQuery}&limit=1`;
            
            console.log(`🌐 Alternative Nominatim Query:`, altQuery);
            
            const altResponse = await fetch(altUrl, {
                headers: { 'User-Agent': 'CableVision-Technician/1.0' }
            });
            const altData = await altResponse.json();
            
            if (altData && altData.length > 0) {
                const lat = parseFloat(altData[0].lat);
                const lng = parseFloat(altData[0].lon);
                
                map.setView([lat, lng], 16);
                showTemporaryMessage(`✓ Zoomed to ${barangayName}`, "success");
                console.log(`✅ Zoomed to: ${barangayName} using alternative search`);
            } else {
               showToast(`Location "${barangayName}" not found`, 'error');
            }
        }
    } catch (error) {
        console.error('❌ Error zooming to barangay:', error);
        console.error('Error details:', error.message, error.stack);
       showToast('Error finding location: ' + error.message, 'error');
    } finally {
        if (mapDiv) mapDiv.style.opacity = '1';
    }
}

// ================= MAP INITIALIZATION =================
function focusCustomerTargetLocation() {
    const urlParams = new URLSearchParams(window.location.search);
    const customerLatitude = urlParams.get('customer_latitude');
    const customerLongitude = urlParams.get('customer_longitude');
    const fromAssignModal = urlParams.get('from_assign_modal') === '1';

    if (!map || !fromAssignModal || !customerLatitude || !customerLongitude) {
        return false;
    }

    const targetLat = parseFloat(customerLatitude);
    const targetLng = parseFloat(customerLongitude);

    if (isNaN(targetLat) || isNaN(targetLng)) {
        return false;
    }

    if (window.customerTargetCircle && map.hasLayer(window.customerTargetCircle)) {
        map.removeLayer(window.customerTargetCircle);
    }

    map.flyTo([targetLat, targetLng], 18);
    // window.customerTargetCircle = L.circle([targetLat, targetLng], {
    //     color: '#2563eb',
    //     fillColor: '#60a5fa',
    //     fillOpacity: 0.25,
    //     radius: 150
    // }).addTo(map);

    showToast('Customer pin location loaded. Add the NAP box near this point.', 'info');
    return true;
}

function initializeMap() {
    const mapContainer = document.getElementById('napboxMap');
    if (!mapContainer) return;
    
    const allowedBounds = L.latLngBounds([14.18, 121.34], [14.33, 121.48]);
    map = L.map('napboxMap').fitBounds(allowedBounds);
    
    const streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    });
    streetMapLayer.addTo(map);
    currentTileLayer = streetMapLayer;
    
    // Satellite Control
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
            container.style.fontSize = '16px';
            container.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.9 2.307a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0l-1.086-1.086a.5.5 0 0 1 0-.707z"/>
                <path d="M2.307 19.9a.5.5 0 0 1 0-.707l1.086-1.086a.5.5 0 0 1 .707 0l1.086 1.086a.5.5 0 0 1 0 .707l-1.086 1.086a.5.5 0 0 1-.707 0z"/>
                <circle cx="12" cy="12" r="9"/>
            </svg>`;
            container.title = 'Satellite View';
            container.onclick = function(e) {
                L.DomEvent.stopPropagation(e);
                toggleSatelliteView();
            };
            return container;
        }
    });
    const satelliteControl = new SatelliteControl();
    satelliteControl.addTo(map);
    
    // ✅ I-CHECK KUNG MAY CUSTOMER LOCATION NA DAPAT IPAKITA
    const showCustomerMarker = sessionStorage.getItem('showCustomerLocationMarker') === 'true';
    
    map.whenReady(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
        
        // ✅ I-DELAY NG KONTI PARA SURE NA NA-LOAD NA ANG LAHAT
        setTimeout(() => {
            if (showCustomerMarker) {
                // ✅ MAY CUSTOMER LOCATION - IPAKITA ANG MARKER
                console.log('✅ Showing customer location marker...');
                showCustomerLocationMarkerOnMap();
            } else {
                // ✅ WALANG CUSTOMER LOCATION - NORMAL BEHAVIOR
                console.log('ℹ️ No customer marker to show');
                if (!focusCustomerTargetLocation()) {
                    showCurrentLocation(false);
                }
            }
        }, 500);
    });
}



function toggleSatelliteView() {
    const btn = document.querySelector('.leaflet-control-custom');
    const satelliteLayers = [
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
        L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt1', 'mt2', 'mt3'] })
    ];
    const streetMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    
    if (!isSatelliteView) {
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        satelliteLayers[0].addTo(map);
        currentTileLayer = satelliteLayers[0];
        isSatelliteView = true;
        if (cityBoundaryLayer && map.hasLayer(cityBoundaryLayer)) {
            cityBoundaryLayer.setStyle({ color: "#FFFFFF", weight: 4 });
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
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        streetMapLayer.addTo(map);
        currentTileLayer = streetMapLayer;
        isSatelliteView = false;
        if (cityBoundaryLayer && map.hasLayer(cityBoundaryLayer)) {
            cityBoundaryLayer.setStyle({ color: "#000000", weight: 3 });
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

// ================= CITY BOUNDARY FUNCTION =================

// Helper function to normalize city name (para kahit anong case, mag-match)
function normalizeCityName(cityName) {
    if (!cityName) return null;
    
    const lowerName = cityName.toLowerCase().trim();
    
    if (lowerName === "santa cruz" || lowerName === "sta. cruz" || lowerName === "sta cruz") {
        return "Santa Cruz";
    }
    if (lowerName === "pagsanjan") {
        return "Pagsanjan";
    }
    if (lowerName === "pila") {
        return "Pila";
    }
    if (lowerName === "magdalena") {
        return "Magdalena";
    }
    
    // Fallback: convert to proper case
    return cityName.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}



// NEW
async function showCityBoundary(cityName) {
    console.log("=========================================");
    console.log(`🔍 Looking for boundary of "${cityName}"...`);
    console.log("=========================================");
    clearBoundary();

    const properCityName = normalizeCityName(cityName);

    if (!properCityName) {
        console.log(`❌ Could not normalize city name: ${cityName}`);
        showBoundaryToast(cityName, 'error');
        return;
    }

    console.log(`📝 Original: "${cityName}" → Normalized: "${properCityName}"`);
    console.log(`📝 Available keys: ${Object.keys(LAGUNA_GEOJSON_URLS).join(', ')}`);

    const url = LAGUNA_GEOJSON_URLS[properCityName];

    console.log(`📡 Looking for key: "${properCityName}"`);
    console.log(`📡 URL: ${url || 'NOT FOUND!'}`);

    if (!url) {
        console.log(`❌ No URL configured for "${properCityName}"`);
        showBoundaryToast(properCityName, 'error');
        return;
    }

    try {
        console.log(`📡 Fetching GeoJSON from: ${url}`);
        const response = await fetch(url);
        console.log(`📡 Response status: ${response.status}`);

        if (response.ok) {
            const geojsonData = await response.json();
            console.log(`✅ GeoJSON loaded successfully`);
            console.log(`✅ Features count: ${geojsonData.features?.length || 0}`);

            if (geojsonData?.features?.length > 0) {
                displayBoundaryOnly(geojsonData, properCityName);
            } else {
                console.log(`❌ No features found in GeoJSON`);
                showBoundaryToast(properCityName, 'loading');
            }
        } else {
            // GitHub failed — fall back to Nominatim polygon
            console.warn(`⚠️ GitHub fetch failed (HTTP ${response.status}), falling back to Nominatim...`);
            await showBoundaryFromNominatim(properCityName);
        }
    } catch (error) {
        console.error("❌ Error showing boundary:", error);
        console.warn("⚠️ Falling back to Nominatim...");
        await showBoundaryFromNominatim(properCityName);
    }
}

// Fallback: draw boundary polygon from Nominatim
async function showBoundaryFromNominatim(cityName) {
    try {
        showBoundaryToast(cityName, 'loading');
        const query = encodeURIComponent(`${cityName}, Laguna, Philippines`);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&polygon_geojson=1`,
            { headers: { 'User-Agent': 'CableVision-Technician/1.0' } }
        );
        const data = await res.json();

        if (data?.length > 0 && data[0].geojson) {
            console.log(`✅ Nominatim polygon found for ${cityName}`);
            displayBoundaryOnly({
                type: "FeatureCollection",
                features: [{ type: "Feature", geometry: data[0].geojson, properties: {} }]
            }, cityName);
        } else if (data?.length > 0 && data[0].boundingbox) {
            // Last resort: draw a rectangle from the bounding box
            const bb = data[0].boundingbox; // [minLat, maxLat, minLng, maxLng]
            const bounds = [
                [parseFloat(bb[0]), parseFloat(bb[2])],
                [parseFloat(bb[1]), parseFloat(bb[3])]
            ];
            if (cityBoundaryLayer) map.removeLayer(cityBoundaryLayer);
            cityBoundaryLayer = L.rectangle(bounds, {
                color: isSatelliteView ? "#ffffff" : "#0047ab",
                weight: isSatelliteView ? 5 : 4,
                fillColor: isSatelliteView ? "#00bfff" : "#4da3ff",
                fillOpacity: 0.15,
                dashArray: "8,6"
            }).addTo(map);
            cityBoundaryLayer.bringToFront();
            map.fitBounds(bounds, { padding: [40, 40] });
            currentCity = cityName;
            const clearBtn = document.getElementById('clearBoundaryBtn');
            if (clearBtn) clearBtn.style.display = 'flex';
            showBoundaryToast(cityName, 'success');
        } else {
            showBoundaryToast(cityName, 'error');
        }
    } catch (err) {
        console.error("❌ Nominatim fallback failed:", err);
       showBoundaryToast(cityName, 'error');
    }
}

function displayBoundaryOnly(geojsonData, cityName) {
    console.log(`🎨 Displaying boundary for: ${cityName}`);

    if (cityBoundaryLayer) {
        map.removeLayer(cityBoundaryLayer);
    }

    let bounds = L.latLngBounds();

    cityBoundaryLayer = L.geoJSON(geojsonData, {
        style: function () {
            return {
                color: isSatelliteView ? "#ffffff" : "#000000",
                weight: isSatelliteView ? 5 : 4,
                opacity: 1,
                fillColor: isSatelliteView ? "#00bfff" : "#4da3ff",
                fillOpacity: 0.15,
                dashArray: "8,6",
                smoothFactor: 1,
                // Disable pointer events on the boundary so it never steals the cursor
                interactive: !isAddingNapbox
            };
        },

        onEachFeature: function (feature, layer) {
            if (layer.getBounds) {
                bounds.extend(layer.getBounds());
            }

            layer.on({
                mouseover: function (e) {
                    if (isAddingNapbox) return; // don't react during pin mode
                    e.target.setStyle({ weight: 6, fillOpacity: 0.25 });
                },
                mouseout: function (e) {
                    if (isAddingNapbox) return;
                    cityBoundaryLayer.resetStyle(e.target);
                }
            });

            layer.bindPopup(`
                <div style="font-size:14px;">
                    <b>${cityName}, Laguna</b><br>
                    Municipal Boundary
                </div>
            `);
        }
    }).addTo(map);

    // Force all SVG paths in the boundary to have no pointer events
    cityBoundaryLayer.eachLayer(layer => {
        if (layer._path) {
            layer._path.style.pointerEvents = isAddingNapbox ? 'none' : 'auto';
        }
    });

    cityBoundaryLayer.bringToFront();

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
        console.log(`✅ Boundary visible for ${cityName}`);
    }

    currentCity = cityName;

    const clearBtn = document.getElementById('clearBoundaryBtn');
    if (clearBtn) clearBtn.style.display = 'flex';

    showBoundaryToast(cityName, 'success');
}

function clearBoundary() {
    if (cityBoundaryLayer) {
        map.removeLayer(cityBoundaryLayer);
        cityBoundaryLayer = null;
        console.log("🗑️ Boundary cleared from map");
    }
    currentCity = null;
    const clearBtn = document.getElementById('clearBoundaryBtn');
    if (clearBtn) clearBtn.style.display = 'none';
}

// ================= AREA INFORMATION DISPLAY =================
function displayAreaInfo(areaData) {
    const areaInfoContent = document.getElementById('areaInfoContent');
    if (!areaInfoContent) return;
    
    areaInfoContent.innerHTML = `
        <div class="area-detail">
            <div class="area-detail-label"><i class="fas fa-map-marker-alt"></i> Assigned Area</div>
            <div class="area-detail-value">${areaData.area || 'N/A'}</div>
        </div>
        <div class="area-detail">
            <div class="area-detail-label"><i class="fas fa-building"></i> Municipality</div>
            <div class="area-detail-value">${areaData.district || 'N/A'}</div>
        </div>
        <div class="area-detail">
            <div class="area-detail-label"><i class="fas fa-boxes"></i> NAP Boxes</div>
            <div class="area-detail-value">${areaData.napbox_count || 0}</div>
        </div>
    `;
}

function showAreaError() {
    const areaInfoContent = document.getElementById('areaInfoContent');
    if (areaInfoContent) {
        areaInfoContent.innerHTML = `<div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Unable to load area information</p></div>`;
    }
}

async function loadNapboxSlots() {
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        const tabId = getTabId();
        const response = await fetch(`/api/technician/technician-napbox?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
                
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // 🔥 SIGURADUHIN NA NA-U-UPDATE ANG GLOBAL VARIABLES
        currentSlots = data.slots || [];
        currentNapboxes = data.napboxes || [];
        
        console.log(`✅ Loaded ${currentSlots.length} slots and ${currentNapboxes.length} napboxes`);
        console.log(`📋 Sample slots:`, currentSlots.slice(0, 3));
        console.log(`📋 Sample napboxes:`, currentNapboxes.slice(0, 3));
        
        // I-update ang stats
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        
        // ✅ I-REBUILD ANG SLOTS GRID
        renderSlotsGrid();
        
        // ✅ I-REBUILD ANG MARKERS SA MAP
        // I-clear muna ang existing markers
        if (currentNapboxMarkers.length) {
            currentNapboxMarkers.forEach(m => {
                if (map && map.hasLayer(m)) map.removeLayer(m);
            });
            currentNapboxMarkers = [];
        }
        if (currentCircles.length) {
            currentCircles.forEach(c => {
                if (map && map.hasLayer(c)) map.removeLayer(c);
            });
            currentCircles = [];
        }
        
        // I-rebuild ang markers gamit ang bagong data
        addNapboxMarkers(currentNapboxes);
        
        return data;
        
    } catch (error) {
        console.error('Error loading NAP box slots:', error);
        showToast('Failed to load NAP box slots: ' + error.message, 'error');
        showSlotsError();
    }
}

// ================= MANUAL NAP BOX NAME ENTRY =================
function getFullNapboxName() {
    const napboxNameInput = document.getElementById('napboxName');
    return napboxNameInput ? napboxNameInput.value.trim() : '';
}

function setNapboxNameField() {
    const napboxNameInput = document.getElementById('napboxName');
    if (napboxNameInput) {
        napboxNameInput.value = '';
        napboxNameInput.style.borderColor = '#e2e8f0';
        napboxNameInput.focus();
    }
}

// I-keep ang lumang function name para hindi masira ang ibang calls
function updateNapboxNameField() {
    setNapboxNameField();
}

function updateStatsSummary(stats) {
    const totalEl = document.getElementById('totalSlots');
    const availableEl = document.getElementById('availableSlots');
    const occupiedEl = document.getElementById('occupiedSlots');
    
    if (totalEl) totalEl.textContent = stats?.total || 0;
    if (availableEl) availableEl.textContent = stats?.available || 0;
    if (occupiedEl) occupiedEl.textContent = stats?.occupied || 0;
}

function renderSlotsGrid() {
    const slotsGrid = document.getElementById('slotsGrid');
    if (!slotsGrid) return;
    
    let filteredSlots = [...currentSlots];
    
    // Filter by status
    if (currentFilter !== 'all') {
        filteredSlots = filteredSlots.filter(slot => slot.status === currentFilter);
    }
    
    // Filter by barangay
    if (currentBarangayFilter && currentBarangayFilter !== '') {
        console.log(`🔍 Filtering slots for barangay: "${currentBarangayFilter}"`);
        console.log(`Total slots before filter: ${filteredSlots.length}`);
        
        const uniqueBarangays = [...new Set(currentSlots.map(s => s.barangay))];
        console.log("📋 Barangays in database:", uniqueBarangays);
        
       const normalizeBarangayName = (name) => {
    if (!name) return '';
    
    let normalized = name.toLowerCase().trim();
    
    if (normalized.includes('poblacion')) {
        let number = '';
        let match = normalized.match(/poblacion\s*(\d+)/);
        if (match) number = match[1];
        if (!number) {
            const romanMap = {'i':'1','ii':'2','iii':'3','iv':'4','v':'5'};
            match = normalized.match(/poblacion\s*(i|ii|iii|iv|v)/);
            if (match) number = romanMap[match[1]];
        }
        if (!number) {
            const wordMap = {'one':'1','two':'2','three':'3','four':'4','five':'5','uno':'1','dos':'2','tres':'3','kuwatro':'4','sinko':'5'};
            for (const [word, num] of Object.entries(wordMap)) {
                if (normalized.includes(word)) {
                    number = num;
                    break;
                }
            }
        }
        
        // ✅ I-CONVERT SA ROMAN NUMERALS
        const numToRoman = {
            '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v'
        };
        if (number && numToRoman[number]) {
            return `poblacion ${numToRoman[number]}`;
        }
        return 'poblacion';
    }
            
            normalized = normalized
                .replace(/\s*\(poblacion\)\s*/gi, '')
                .replace(/\s*\(pob\.?\)\s*/gi, '')
                .replace(/\s+poblacion\s*/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (normalized === 'barangay i' || normalized === 'i' || normalized === '1' || normalized === 'uno') return 'uno';
            if (normalized === 'barangay ii' || normalized === 'ii' || normalized === '2' || normalized === 'dos') return 'dos';
            
            return normalized;
        };
        
        const normalizedFilter = normalizeBarangayName(currentBarangayFilter);
        console.log(`📌 Normalized filter: "${normalizedFilter}"`);
        
        filteredSlots = filteredSlots.filter(slot => {
            const slotBarangay = slot.barangay || '';
            const normalizedSlot = normalizeBarangayName(slotBarangay);
            const isMatch = normalizedSlot === normalizedFilter;
            
            if (isMatch) {
                console.log(`✅ MATCH: "${slotBarangay}" == "${currentBarangayFilter}"`);
            } else {
                console.log(`❌ NO MATCH: "${slotBarangay}" (norm: "${normalizedSlot}") vs "${currentBarangayFilter}" (norm: "${normalizedFilter}")`);
            }
            
            return isMatch;
        });
        
        console.log(`📊 Slots after filter: ${filteredSlots.length}`);
    }
    
    // Display result
    if (filteredSlots.length === 0) {
        slotsGrid.style.display = 'flex';
        slotsGrid.style.gridTemplateColumns = '';
        slotsGrid.style.gap = '';
        
        const barangayMessage = currentBarangayFilter ? ` for <strong>"${currentBarangayFilter}"</strong>` : '';
        
        slotsGrid.innerHTML = `
            <div class="no-data-message" style="width: 100%; text-align: center; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                <p style="margin-top: 10px;">No slots found${barangayMessage}</p>
            </div>
        `;
        return;
    }
    
    slotsGrid.style.display = 'grid';
    slotsGrid.style.gap = '12px';
    
    slotsGrid.innerHTML = filteredSlots.map(slot => {
        // ✅ KUNIN ANG NAPBOX NAME
        const napbox = currentNapboxes.find(n => n.id === slot.napbox_id);
        const napboxName = napbox ? napbox.name : slot.napbox_name || 'N/A';
        // I-shorten ang napbox name kung masyadong mahaba
        const shortNapboxName = napboxName.length > 14 ? napboxName.substring(0, 12) + '...' : napboxName;
        
        // ✅ AVAILABLE / OCCUPIED LABEL
        const isAvailable = slot.status === 'available';
        const statusLabel = isAvailable ? 'AVAILABLE' : 'OCCUPIED';
        const statusClass = isAvailable ? 'available' : 'occupied';
        
        // ✅ ACTIVE / INACTIVE LABEL
        // ACTIVE: kapag OCCUPIED (may customer na naka-assign)
        // INACTIVE: kapag AVAILABLE (walang customer)
        const isActive = slot.status === 'occupied' && slot.customer_name && slot.customer_name !== '';
        const activeLabel = isActive ? 'ACTIVE' : 'INACTIVE';
        const activeClass = isActive ? 'active' : 'inactive';
        
        // ✅ AVAILABLE PERO MAY PREVIOUS CUSTOMER (last owner) - INACTIVE pa rin
        // Dahil ang activeLabel ay INACTIVE kapag available (isActive = false)
        
        return `
            <div class="slot-card ${statusClass}" onclick="showSlotDetails(${JSON.stringify(slot).replace(/"/g, '&quot;')})">
                <span class="slot-status-label ${statusClass}">${statusLabel}</span>
                <span class="slot-active-label ${activeClass}">${activeLabel}</span>
                <span class="slot-number">Slot ${slot.slot_number}</span>
                ${slot.customer_name ? `<span class="slot-customer ${slot.customer_name.length > 30 ? 'very-long-name' : slot.customer_name.length > 15 ? 'long-name' : ''}">${escapeHtml(slot.customer_name)}</span>` : ''}
                ${slot.contract_number ? `<span class="slot-contract">Contract: ${escapeHtml(slot.contract_number)}</span>` : ''}
                ${slot.barangay ? `<span class="slot-barangay">${escapeHtml(slot.barangay)}</span>` : ''}
                <span class="slot-napbox-name" title="${escapeHtml(napboxName)}">
                    <i class="fas fa-network-wired"></i> ${escapeHtml(shortNapboxName)}
                </span>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================= NAP BOX MARKERS WITH 500M CIRCLE =================
function addNapboxMarkers(napboxes) {
    if (!map) return;
    
    // 🔥 SIGURADUHIN NA MALINIS ANG MGA LUMANG MARKERS
    if (currentNapboxMarkers.length) {
        currentNapboxMarkers.forEach(m => {
            if (map.hasLayer(m)) map.removeLayer(m);
        });
        currentNapboxMarkers = [];
    }
    if (currentCircles.length) {
        currentCircles.forEach(c => {
            if (map.hasLayer(c)) map.removeLayer(c);
        });
        currentCircles = [];
    }
    
    // 🔥 KUNG WALANG NAPBOXES, MAG-RETURN LANG
    if (!napboxes || napboxes.length === 0) {
        console.log('No napboxes to display');
        return;
    }
    
    console.log(`🔄 Adding ${napboxes.length} napbox markers...`);
    
    napboxes.forEach(napbox => {
        if (napbox.latitude && napbox.longitude) {
            const marker = L.marker([napbox.latitude, napbox.longitude], {
                draggable: false,
                icon: L.divIcon({
                    className: 'napbox-marker',
                    html: '<div style="background: #dc2626; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
                    iconSize: [16, 16],
                    popupAnchor: [0, -8]
                })
            }).addTo(map);

            const circle = L.circle([napbox.latitude, napbox.longitude], {
                radius: napbox.coverage_radius || 500,
                color: '#c52222',
                fillColor: '#c52222',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);

            const napboxSlots = currentSlots.filter(slot => slot.napbox_id === napbox.id);
            const availableCount = napboxSlots.filter(s => s.status === 'available').length;
            const occupiedCount = napboxSlots.filter(s => s.status === 'occupied').length;

            // 🔥 I-SECURE ANG NAPBOX NAME PARA MAI-SAVE SA BUTTON
            const safeNapboxName = napbox.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            marker.bindPopup(`
                <div style="min-width: 180px;">
                    <b style="font-size:14px;">${napbox.name}</b><br>
                    <small style="color:#666;">${napbox.barangay || napbox.location || 'Pinned Location'}</small>
                    <hr style="margin:6px 0;">
                    <b>Coverage:</b> ${napbox.coverage_radius || 500}m<br>
                    <span style="color:#22c55e">● Available: ${availableCount}</span><br>
                    <span style="color:#ef4444">● Occupied: ${occupiedCount}</span>
                    <hr style="margin:6px 0;">
                    <button onclick="showDeleteNapboxModal(${napbox.id}, '${safeNapboxName}')"
                        style="width:100%; padding:8px; background:#dc2626; color:white; border:none;
                               border-radius:6px; cursor:pointer; font-size:13px; font-weight:600;
                               transition: all 0.2s ease; pointer-events: auto !important;">
                        Delete NAP Box
                    </button>
                </div>
            `);

            marker.on('click', () => {
                currentFilter = 'all';
                currentBarangayFilter = '';
                document.querySelectorAll('.slot-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector('.slot-filters .filter-btn[data-filter="all"]')?.classList.add('active');
                const slotBarangayFilter = document.getElementById('slotBarangayFilter');
                if (slotBarangayFilter) slotBarangayFilter.value = '';
                renderSlotsGrid();
                marker.openPopup();
                showToast(`Showing slots for ${napbox.name}`, 'info');
            });

            currentNapboxMarkers.push(marker);
            currentCircles.push(circle);
            
            console.log(`✅ Added marker for ${napbox.name} (ID: ${napbox.id})`);
        }
    });
}

async function updateNapboxLocation(napboxId, latitude, longitude) {
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        const technicianAreaLocal = sessionStorage.getItem('technicianArea');
        
        const tabId = getTabId();
        await fetch(`/api/technician/napbox?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: napboxId,
                napbox_name: `NAP-${napboxId}`,
                latitude: latitude,
                longitude: longitude,
                area: technicianAreaLocal,
                coverage_radius: 500,
                tab_id: tabId
            })
        });
        
    } catch (error) {
        console.error('Error updating NAP box location:', error);
        showToast('Failed to update location', 'error');
    }
}

// ================= DELETE NAP BOX =================
let pendingDeleteNapbox = null;

function showDeleteNapboxModal(napboxId, napboxName) {
    if (map) map.closePopup();

    pendingDeleteNapbox = { napboxId, napboxName };
    const modal = document.getElementById('deleteNapboxModal');
    const nameLabel = document.getElementById('deleteNapboxName');

    if (nameLabel) {
        nameLabel.textContent = napboxName;
    }
    if (!modal) return;

    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeDeleteNapboxModal() {
    const modal = document.getElementById('deleteNapboxModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    document.body.style.overflow = '';
    pendingDeleteNapbox = null;
}

async function executeDeleteNapbox() {
    if (!pendingDeleteNapbox) return;

    const { napboxId, napboxName } = pendingDeleteNapbox;
    closeDeleteNapboxModal();
    await deleteNapbox(napboxId, napboxName);
}

async function deleteNapbox(napboxId, napboxName) {
    showToast('Deleting NAP Box...', 'loading');

    try {
        const technicianId = sessionStorage.getItem('technicianId');
        
        const tabId = getTabId();
        const response = await fetch(`/api/technician/napbox/${napboxId}?tab_id=${tabId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ technician_id: technicianId, tab_id: tabId })
        });
        
        // Kung 404 ang response, subukan ang POST method
        if (response.status === 404) {
            const altResponse = await fetch(`/api/technician/napbox/delete?tab_id=${tabId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ napbox_id: napboxId, technician_id: technicianId, tab_id: tabId })
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
        
        // 🔥 IMPORTANTE: I-RELOAD ANG DATA AGAD
        await loadNapboxSlots();
        
        // 🔥 SIGURADUHIN NA NAG-REBUILD ANG MARKERS
        // I-clear muna ang existing markers
        if (currentNapboxMarkers.length) {
            currentNapboxMarkers.forEach(m => {
                if (map.hasLayer(m)) map.removeLayer(m);
            });
            currentNapboxMarkers = [];
        }
        if (currentCircles.length) {
            currentCircles.forEach(c => {
                if (map.hasLayer(c)) map.removeLayer(c);
            });
            currentCircles = [];
        }
        
        // I-rebuild ang markers gamit ang natitirang data
        addNapboxMarkers(currentNapboxes);
        
        // I-update ang stats
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        
    } catch (error) {
        console.error('Error deleting NAP box:', error);
        showToast(`Failed to delete: ${error.message}`, 'error');
    }
}

window.showDeleteNapboxModal = showDeleteNapboxModal;
window.closeDeleteNapboxModal = closeDeleteNapboxModal;
window.executeDeleteNapbox = executeDeleteNapbox;
window.deleteNapbox = deleteNapbox;

// ================= POINT-IN-BOUNDARY CHECK =================
function isPointInsideBoundary(lat, lng) {
    if (!cityBoundaryLayer) return true; // if no boundary loaded, allow anywhere
    
    const point = L.latLng(lat, lng);
    let isInside = false;
    
    cityBoundaryLayer.eachLayer(function(layer) {
        if (isInside) return; // already found
        
        // For L.rectangle fallback
        if (layer.getBounds && layer instanceof L.Rectangle) {
            if (layer.getBounds().contains(point)) isInside = true;
            return;
        }
        
        // For GeoJSON polygon layers
        if (layer.feature?.geometry) {
            const geo = layer.feature.geometry;
            const coords = geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates;
            
            coords.forEach(polygon => {
                polygon.forEach(ring => {
                    if (pointInPolygon([lng, lat], ring)) isInside = true;
                });
            });
        }
    });
    
    return isInside;
}

// Ray-casting algorithm for point-in-polygon
function pointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
    }
    
    return inside;
}



// ================= RESET CURSOR / POINTER-EVENTS AFTER ADD MODE =================
function resetAddNapboxCursorState() {
    const mapDiv = document.getElementById('napboxMap');
    if (!mapDiv) return;

    mapDiv.style.cursor = '';

    mapDiv.querySelectorAll('path, svg, canvas, .leaflet-overlay-pane, .leaflet-pane').forEach(el => {
        el.style.cursor = '';
        el.style.pointerEvents = '';
    });

    document.querySelectorAll('#napboxMap .leaflet-overlay-pane path').forEach(path => {
        path.style.pointerEvents = '';
        path.style.cursor = '';
    });

    if (cityBoundaryLayer) {
        cityBoundaryLayer.eachLayer(layer => {
            if (layer._path) {
                layer._path.style.pointerEvents = 'auto';
            }
        });
    }
}

function startAddNapbox() {
    if (map) {
        map.off('click', onMapClickForAdd);
    }

    isAddingNapbox = true;
    pendingLocation = null;
    window.tempBarangayName = null; // ✅ I-clear ang temp variable
    showToast('Click on the map to place the NAP box', 'info');

    

    const mapDiv = document.getElementById('napboxMap');
    if (mapDiv) {
        mapDiv.style.cursor = 'crosshair';
        mapDiv.querySelectorAll('path, svg, canvas, .leaflet-overlay-pane, .leaflet-pane').forEach(el => {
            el.style.cursor = 'crosshair';
            el.style.pointerEvents = 'none';
        });
    }

    document.querySelectorAll('#napboxMap .leaflet-overlay-pane path').forEach(path => {
        path.style.pointerEvents = 'none';
        path.style.cursor = 'crosshair';
    });

    map.on('click', onMapClickForAdd);
}

async function getBarangayFromGeoRisk(lat, lng) {
    try {
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
        return null;
    } catch (error) {
        console.error('GeoRisk API error:', error);
        return null;
    }
}

// Convert Pagsanjan barangay names (Uno/Dos to I/II format)
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

async function getBarangayFromNominatim(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'CableVision-Technician/1.0' } }
        );
        const data = await response.json();
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
}

// ===== GET BARANGAY WITH FALLBACK (GeoRisk first, then Nominatim) =====
async function getAccurateBarangay(lat, lng) {
    // Try GeoRisk first (more accurate)
    let result = await getBarangayFromGeoRisk(lat, lng);
    
    if (result && result.barangay) {
        console.log(`✅ GeoRisk success: ${result.barangay}`);
        return result;
    }
    
    // Fallback to Nominatim
    console.log('⚠️ GeoRisk failed, trying Nominatim...');
    result = await getBarangayFromNominatim(lat, lng);
    
    if (result && result.barangay) {
        console.log(`✅ Nominatim success: ${result.barangay}`);
        return result;
    }
    
    console.log('❌ Both GeoRisk and Nominatim failed');
    return null;
}


async function onMapClickForAdd(e) {
    if (!isAddingNapbox) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // ===== CHECK 1: INSIDE MUNICIPAL BOUNDARY =====
    if (!isPointInsideBoundary(lat, lng)) {
        L.popup({ closeButton: true, autoClose: true, className: 'out-of-bounds-popup' })
            .setLatLng([lat, lng])
            .setContent(`
                <div style="text-align:center; padding: 6px 4px;">
                    <div style="font-size: 28px; margin-bottom: 6px;">🚫</div>
                    <div style="font-weight: bold; font-size: 14px; color: #dc2626; margin-bottom: 4px;">
                        Outside Municipal Area
                    </div>
                    <div style="font-size: 12px; color: #555; line-height: 1.5;">
                        This location is not part of<br>
                        <b>${technicianArea || 'your assigned area'}</b>.<br>
                        Please click inside the boundary.
                    </div>
                </div>
            `)
            .openOn(map);
        showToast(`Outside ${technicianArea || 'assigned area'} boundary`, 'error');
        return;
    }

    // ===== GET BARANGAY NAME USING GEORISK (MORE ACCURATE) =====
    showToast('Detecting barangay...', 'info');
    
    const geoData = await getAccurateBarangay(lat, lng);
    let barangayName = geoData?.barangay || '';
    let detectedCity = geoData?.city || '';
    let barangayValid = false;
    
    console.log(`📍 Detected barangay: "${barangayName}", City: "${detectedCity}"`);
    
    // ===== CHECK 2: BARANGAY MUST BE IN DATABASE =====
    if (barangayName && allBarangays && allBarangays.length > 0) {
        // Normalize both for comparison
const normalize = (str) => {
    if (!str) return '';
    let normalized = str.toLowerCase()
        .replace(/\s*\(poblacion\)\s*/gi, '')
        .replace(/\s*\(pob\.?\)\s*/gi, '')
        .replace(/\s+poblacion\s*/gi, '')
        .trim();
    
    // Special handling para sa Santa Cruz: i-extract ang numero
    if (detectedCity === "Santa Cruz") {
        // Kunin ang Roman numeral
        const romanMatch = normalized.match(/\b(i|ii|iii|iv|v)\b/);
        if (romanMatch) {
            return `poblacion ${romanMatch[1]}`;
        }
        const numberMatch = normalized.match(/\b(1|2|3|4|5)\b/);
        if (numberMatch) {
            const numMap = {'1':'i','2':'ii','3':'iii','4':'iv','5':'v'};
            return `poblacion ${numMap[numberMatch[1]]}`;
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
        const barangayExists = allBarangays.some(b => normalize(b) === normalizedDetected);
        
        // Check if city matches technician's assigned area
        const cityMatch = detectedCity && technicianArea && 
            detectedCity.toLowerCase() === technicianArea.toLowerCase();
        
        if (barangayExists && cityMatch) {
            barangayValid = true;
            console.log(`✅ Barangay "${barangayName}" is valid (exists in database and city matches)`);
        } else if (barangayExists && !cityMatch) {
            console.log(`⚠️ Barangay exists but city mismatch: ${detectedCity} vs ${technicianArea}`);
            barangayValid = false;
        } else {
            console.log(`❌ Barangay "${barangayName}" NOT found in database`);
            barangayValid = false;
        }
    } else {
        console.log(`⚠️ No barangay detected or allBarangays not loaded`);
        barangayValid = false;
    }
    
    // If barangay is not valid, show error and return
    if (!barangayValid) {
        const validBarangaysList = allBarangays ? allBarangays.slice(0, 10).join(', ') + (allBarangays.length > 10 ? '...' : '') : 'No barangays loaded';
        L.popup({ closeButton: true, autoClose: true })
            .setLatLng([lat, lng])
            .setContent(`
                <div style="text-align:center; padding: 8px 6px; max-width: 300px;">
                    <div style="font-size: 28px; margin-bottom: 6px;"></div>
                    <div style="font-weight: bold; font-size: 14px; color: #dc2626; margin-bottom: 6px;">
                        Barangay Not in Included Area
                    </div>
                    <div style="font-size: 12px; color: #555; line-height: 1.5; margin-bottom: 8px;">
                        Detected: <strong>${barangayName || 'Unknown'}</strong><br>
                        Assigned Area: <strong>${technicianArea || 'Unknown'}</strong>
                    </div>
                </div>
            `)
            .openOn(map);
        showToast(`Barangay "${barangayName}" not in included area`, 'error');
        return;
    }

    // ===== CHECK 3: MUST BE ON OR NEAR A ROAD (via Overpass API) =====
    showToast('Checking road location...', 'info');

    let snappedLat = lat;
    let snappedLng = lng;
    let roadCheckPassed = false;
    let nearestRoadName = '';
    let nearestDistance = 999;

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
            L.popup({ closeButton: true, autoClose: true })
                .setLatLng([lat, lng])
                .setContent(`
                    <div style="text-align:center; padding: 6px 4px;">
                        <div style="font-size: 26px; margin-bottom: 6px;">🛣️</div>
                        <div style="font-weight: bold; font-size: 14px; color: #d97706; margin-bottom: 4px;">
                            Not On a Road
                        </div>
                        <div style="font-size: 12px; color: #555; line-height: 1.5;">
                            NAP boxes must be placed on a road.<br>
                            No road found within <b>${radius}m</b>.<br>
                            Please click directly on a road.
                        </div>
                    </div>
                `)
                .openOn(map);
            showToast('No road found here. Click directly on a road.', 'error');
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

        if (nearestDistance > 2) {
            showToast(`Snapped to ${nearestRoadName} (${nearestDistance}m)`, 'info');
        }

    } catch (err) {
        console.warn('Overpass road check failed, allowing placement:', err);
        roadCheckPassed = true;
    }

    if (!roadCheckPassed) return;

    // ===== PLACE MARKER AT SNAPPED ROAD LOCATION =====
if (tempMarker) map.removeLayer(tempMarker);
tempMarker = L.marker([snappedLat, snappedLng], {
    icon: L.divIcon({
        className: 'pending-marker',
        html: '<div style="background: #f59e0b; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; animation: pulse 1.5s infinite;"></div>',
        iconSize: [14, 14]
    })
}).addTo(map);

pendingLocation = { lat: snappedLat, lng: snappedLng };

// ✅ GAMITIN ANG DETECTED BARANGAY NAME MULA SA GEORISK (hindi na mag-extract)
let finalDisplayBarangay = barangayName; // Ito na ang tamang barangay name mula sa GeoRisk

// I-ensure na proper case at may tamang format
if (finalDisplayBarangay) {
    // I-convert sa proper case
    finalDisplayBarangay = finalDisplayBarangay.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
  // Para sa Santa Cruz Poblacion, i-format ng tama (gamit ang ROMAN NUMERALS)
if (detectedCity === "Santa Cruz") {
    let number = '';
    
    // I-extract ang numero (1-5)
    let match = finalDisplayBarangay.match(/\b(1|2|3|4|5)\b/);
    if (match) {
        number = match[1];
    }
    
    if (!number) {
        match = finalDisplayBarangay.match(/\b(I|II|III|IV|V)\b/i);
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
        finalDisplayBarangay = `Poblacion ${numToRoman[number]}`;
        console.log(`🎯 Santa Cruz display barangay (Roman): "${finalDisplayBarangay}"`);
    } else if (finalDisplayBarangay.toLowerCase().includes('poblacion')) {
        finalDisplayBarangay = 'Poblacion I';
    }
}

        // Para sa Pagsanjan
    else if (detectedCity === "Pagsanjan") {
        // I-convert ang barangay name (Uno/Dos to I/II)
        finalDisplayBarangay = convertPagsanjanBarangay(finalDisplayBarangay);
        console.log(`✅ Pagsanjan conversion result: ${finalDisplayBarangay}`);
    }
    
    // Para sa Pila
    else if (detectedCity === "Pila") {
        const lower = finalDisplayBarangay.toLowerCase();
        if (lower.includes('bulilan norte')) {
            finalDisplayBarangay = 'Bulilan Norte (Poblacion)';
        } else if (lower.includes('bulilan sur')) {
            finalDisplayBarangay = 'Bulilan Sur (Poblacion)';
        } else if (lower.includes('santa clara norte')) {
            finalDisplayBarangay = 'Santa Clara Norte (Poblacion)';
        } else if (lower.includes('santa clara sur')) {
            finalDisplayBarangay = 'Santa Clara Sur (Poblacion)';
        } else {
            finalDisplayBarangay = finalDisplayBarangay.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }
    }
}

console.log(`✅ Final barangay for display: "${finalDisplayBarangay}"`);

document.getElementById('selectedLocation').innerHTML = `
    Latitude: ${snappedLat.toFixed(6)}<br>
    Longitude: ${snappedLng.toFixed(6)}<br>
    Barangay: ${finalDisplayBarangay} (Valid)<br>
`;

// ✅ I-save ang tamang barangay name para magamit sa confirmAddNapbox
window.tempBarangayName = finalDisplayBarangay;

// ✅ AUTO-GENERATE NAP BOX NAME
setNapboxNameField();

document.getElementById('addNapboxModal').style.display = 'block';
document.getElementById('addNapboxModal').classList.add('show');

map.off('click', onMapClickForAdd);
document.getElementById('napboxMap').style.cursor = '';
isAddingNapbox = false;
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

async function confirmAddNapbox() {
    // ✅ GET FULL NAME FROM PREFIX + NUMBER
    const napboxName = getFullNapboxName();
    const numSlots = parseInt(document.getElementById('napboxSlots').value);
    
    console.log("🔍 confirmAddNapbox called");
    console.log("📍 pendingLocation:", pendingLocation);
    console.log("📍 napboxName:", napboxName);
    console.log("📍 numSlots:", numSlots);
    console.log("📍 tempBarangayName:", window.tempBarangayName);
    
    if (!napboxName) {
        showToast('Please enter a valid NAP box name', 'error');
        const nameInput = document.getElementById('napboxName');
        if (nameInput) {
            nameInput.focus();
            nameInput.style.borderColor = '#dc2626';
            setTimeout(() => {
                nameInput.style.borderColor = '#e2e8f0';
            }, 3000);
        }
        return;
    }
    
    if (!pendingLocation) {
        showToast('Please select location on map or enter coordinates', 'error');
        return;
    }
    
    let barangayName = window.tempBarangayName || '';
    console.log("📍 Initial barangayName:", barangayName);
    
    if (!barangayName) {
        const selectedLocationText = document.getElementById('selectedLocation').innerHTML;
        console.log("📍 selectedLocationText:", selectedLocationText);
        const barangayMatch = selectedLocationText.match(/Barangay:\s*([^<]+)/i);
        if (barangayMatch && barangayMatch[1]) {
            barangayName = barangayMatch[1].trim().replace(/\s*\(Valid\)\s*/i, '');
            console.log("📍 Barangay from selectedLocation:", barangayName);
        }
    }
    
    if (!barangayName) {
        console.log("📍 Trying to get barangay from GeoRisk...");
        const geoData = await getAccurateBarangay(pendingLocation.lat, pendingLocation.lng);
        if (geoData && geoData.barangay) {
            barangayName = geoData.barangay;
            console.log("📍 Barangay from GeoRisk:", barangayName);
        }
    }
    
    if (!barangayName) {
        barangayName = 'Unknown';
        console.log("📍 Barangay set to default: Unknown");
    }
    
    const finalBarangay = barangayName;
    console.log(`✅ Final barangay for database: "${finalBarangay}"`);
    console.log(`✅ Full NAP box name: "${napboxName}"`);
    console.log(`✅ Pending location:`, pendingLocation);
    
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        const technicianAreaLocal = sessionStorage.getItem('technicianArea');
        
        console.log("📤 Sending to server:", {
            napbox_name: napboxName,
            latitude: pendingLocation.lat,
            longitude: pendingLocation.lng,
            area: technicianAreaLocal,
            coverage_radius: 500,
            num_slots: numSlots,
            barangay: finalBarangay
        });
        
        const tabId = getTabId();
        const response = await fetch(`/api/technician/napbox?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                napbox_name: napboxName,
                latitude: pendingLocation.lat,
                longitude: pendingLocation.lng,
                area: technicianAreaLocal,
                coverage_radius: 500,
                num_slots: numSlots,
                barangay: finalBarangay,
                tab_id: tabId 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to add NAP box');
        }
        
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = null;
        pendingLocation = null;
        isAddingNapbox = false;
        isCoordinatesMode = false;
        
        closeAddNapboxModal();
        
        const addBtn = document.getElementById('addNapboxBtn');
        const cancelBtn = document.getElementById('cancelAddNapboxBtn');
        const coordsBtn = document.getElementById('addByCoordsBtn');
        
        if (addBtn) addBtn.style.display = 'inline-flex';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (coordsBtn) coordsBtn.style.display = 'inline-flex';
        
        const mapDiv = document.getElementById('napboxMap');
        if (mapDiv) mapDiv.style.cursor = '';
        
        window.tempBarangayName = null;

        const pendingAssignmentContext = sessionStorage.getItem('pendingAssignmentContext');
        if (pendingAssignmentContext) {
            const pendingData = JSON.parse(pendingAssignmentContext);
            const nextContext = {
                ...pendingData,
                newNapboxId: result.id,
                newNapboxName: result.napbox_name || napboxName,
                newNapboxBarangay: finalBarangay
            };
            sessionStorage.setItem('pendingAssignmentContext', JSON.stringify(nextContext));
            window.location.replace('/technician/slot-assignments');
            return;
        }
        
        showToast(`NAP Box "${napboxName}" added with ${numSlots} slots for ${finalBarangay}`, 'success');
        
        console.log('🔄 Reloading NAP box data...');
        await loadNapboxSlots();
        
        console.log(`📊 After reload: ${currentSlots.length} slots, ${currentNapboxes.length} napboxes`);
        
        renderSlotsGrid();
        
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        
        if (currentNapboxMarkers.length) {
            currentNapboxMarkers.forEach(m => {
                if (map && map.hasLayer(m)) map.removeLayer(m);
            });
            currentNapboxMarkers = [];
        }
        if (currentCircles.length) {
            currentCircles.forEach(c => {
                if (map && map.hasLayer(c)) map.removeLayer(c);
            });
            currentCircles = [];
        }
        addNapboxMarkers(currentNapboxes);
        
        console.log('✅ UI refresh complete');
        
    } catch (error) {
        console.error('Error adding NAP box:', error);
        showToast(error.message || 'Failed to add NAP box', 'error');
    }
}

function closeAddNapboxModal() {
    const modal = document.getElementById('addNapboxModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    
    const nameInput = document.getElementById('napboxName');
    if (nameInput) {
        nameInput.value = '';
        nameInput.style.borderColor = '#e2e8f0';
    }
    
    document.getElementById('napboxSlots').value = '8';
    document.getElementById('selectedLocation').innerHTML = 'Click on the map to select location';
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = null;
    isAddingNapbox = false;
    document.getElementById('napboxMap').style.cursor = '';
}

// ================= SLOT DETAILS MODAL (ENHANCED with Clear Button) =================
function showSlotDetails(slot) {
    const modal = document.getElementById('slotDetailsModal');
    const modalTitle = document.getElementById('slotModalTitle');
    const slotDetailsContent = document.getElementById('slotDetailsContent');
    
    if (!modal || !slotDetailsContent) return;
    
    const statusClass = slot.status === 'available' ? 'status-available' : 'status-occupied';
    const statusDisplay = slot.status === 'available' ? 'Available' : 'Occupied';
    const statusIcon = slot.status === 'available' ? 'fa-check-circle' : 'fa-circle';
    const statusColor = slot.status === 'available' ? '#22c55e' : '#ef4444';
    
    // ✅ Check if slot is available but has previous customer data
    const hasCustomerData = slot.customer_name || slot.customer_phone || slot.application_number;
    const showClearButton = slot.status === 'available' && hasCustomerData;
    
    // Format date
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
        } catch {
            lastUpdated = slot.updated_at;
        }
    }
    
    modalTitle.textContent = `Slot ${slot.slot_number}`;
    
    slotDetailsContent.innerHTML = `
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
                    <span class="slot-detail-value">${slot.napbox_name || slot.napbox_id || 'N/A'}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-map-pin"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Barangay</span>
                    <span class="slot-detail-value">${slot.barangay || 'N/A'}</span>
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
        
        <!-- Customer Information -->
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
                    <span class="customer-value">${slot.customer_phone}</span>
                </div>` : ''}
                ${slot.application_number ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-file-alt"></i> Application</span>
                    <span class="customer-value">${slot.application_number}</span>
                </div>` : ''}
                ${slot.contract_number ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-file-contract"></i> Contract</span>
                    <span class="customer-value">${slot.contract_number}</span>
                </div>` : ''}
                ${slot.installation_date ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-calendar-check"></i> Installation</span>
                    <span class="customer-value">${new Date(slot.installation_date).toLocaleDateString()}</span>
                </div>` : ''}
            </div>
            ` : `
            <div class="no-customer-data">
                <i class="fas fa-user-slash"></i>
                <span>This slot is available and has no customer assigned.</span>
            </div>
            `}
        </div>
        
        <!-- Actions -->
        <div class="slot-actions">
            <div class="slot-action-buttons">
                ${showClearButton ? `
                <button class="btn-clear-slot" onclick="clearSlotData(${slot.id}, '${slot.slot_number}')" 
                        title="Clear all customer data from this slot">
                    <i class="fas fa-eraser"></i> Clear Slot
                </button>
                ` : ''}
                <button class="btn-edit-slot-modal" onclick='openEditFromDetailsTech(${JSON.stringify(slot).replace(/'/g, "&#39;")})'>
                    <i class="fas fa-edit"></i> Edit Slot
                </button>
                <button class="close-modal-btn" onclick="closeSlotModal()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSlotModal() {
    const modal = document.getElementById('slotDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Close modal on outside click
window.addEventListener('click', function(e) {
    const modal = document.getElementById('slotDetailsModal');
    if (e.target === modal) {
        closeSlotModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSlotModal();
    }
});

// ================= UPDATE SLOT STATUS (WITH CONFIRM MODAL) =================
let pendingStatusUpdate = null;

function showConfirmAvailableModal(slotId, slotNumber, currentSlot) {
    // Populate modal with slot details
    document.getElementById('confirmAvailableSlotNumber').textContent = `#${slotNumber}`;
    document.getElementById('confirmAvailableNapboxName').textContent = currentSlot.napbox_name || 'N/A';
    document.getElementById('confirmAvailableCustomerName').textContent = currentSlot.customer_name || 'N/A';
    document.getElementById('confirmAvailableCustomerPhone').textContent = currentSlot.customer_phone || 'N/A';
    document.getElementById('confirmAvailableContractNumber').textContent = currentSlot.contract_number || 'N/A';
    
    // Update title and text
    document.getElementById('confirmAvailableTitle').textContent = 'Set Slot to Available';
    document.getElementById('confirmAvailableText').innerHTML = 
        `You are about to set Slot <strong>#${slotNumber}</strong> to <strong>AVAILABLE</strong>, making it ready for a new customer assignment.`;
    
    // Save pending data
    pendingStatusUpdate = {
        slotId: slotId,
        slotNumber: slotNumber,
        newStatus: 'available'
    };
    
    // Show modal
    const modal = document.getElementById('confirmAvailableModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeConfirmAvailableModal() {
    const modal = document.getElementById('confirmAvailableModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    pendingStatusUpdate = null;
}

async function executeConfirmAvailable() {
    if (!pendingStatusUpdate) return;
    
    const { slotId, slotNumber, newStatus } = pendingStatusUpdate;
    
    // Close modal
    closeConfirmAvailableModal();
    
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        
        const requestBody = {
            slot_id: slotId,
            status: newStatus,
            technician_id: technicianId,
            reset_customer_data: true
        };
        
        const tabId = getTabId();
        const response = await fetch(`/api/technician/update-slot-status?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...requestBody, 
                tab_id: tabId 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update slot status');
        }
        
        // I-update ang local data
        const slotIndex = currentSlots.findIndex(s => s.id === slotId);
        if (slotIndex !== -1) {
            currentSlots[slotIndex].status = newStatus;
            currentSlots[slotIndex].customer_name = null;
            currentSlots[slotIndex].customer_phone = null;
            currentSlots[slotIndex].application_number = null;
            currentSlots[slotIndex].installation_date = null;
        }
        
        renderSlotsGrid();
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        
        // ✅ SIGURADUHIN NA SARADO ANG SLOT DETAILS MODAL
        closeSlotModal();
        
        showToast(`Slot #${slotNumber} is now AVAILABLE and ready for a new customer assignment.`, 'success');
        
        await loadNapboxSlots();
        
    } catch (error) {
        console.error('Error updating slot status:', error);
        showToast(error.message || 'Failed to update slot status', 'error');
    }
}

// ================= ORIGINAL UPDATE SLOT STATUS (PALITAN) =================
async function updateSlotStatus(slotId, slotNumber) {
    const statusSelect = document.getElementById('statusUpdateSelect');
    if (!statusSelect) return;
    const newStatus = statusSelect.value;
    
    // Kunin ang kasalukuyang status ng slot
    const currentSlot = currentSlots.find(s => s.id === slotId);
    const currentStatus = currentSlot ? currentSlot.status : null;
    
    // 🔥 KUNG MAGIGING AVAILABLE AT OCCUPIED ANG KASALUKUYAN, MAG-MODAL
    if (newStatus === 'available' && currentStatus === 'occupied') {
        // ✅ UNA, ISARA ANG SLOT DETAILS MODAL
        closeSlotModal();
        
        // ✅ PAGKATAPOS, I-OPEN ANG CONFIRMATION MODAL
        showConfirmAvailableModal(slotId, slotNumber, currentSlot);
        return;
    }
    
    // Kung hindi naman occupied to available, diretso na
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        
        const requestBody = {
            slot_id: slotId,
            status: newStatus,
            technician_id: technicianId
        };
        
        if (newStatus === 'available') {
            requestBody.reset_customer_data = true;
        }
        
        const tabId = getTabId();
        const response = await fetch(`/api/technician/update-slot-status?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...requestBody, 
                tab_id: tabId 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update slot status');
        }
        
        // I-update ang local data
        const slotIndex = currentSlots.findIndex(s => s.id === slotId);
        if (slotIndex !== -1) {
            currentSlots[slotIndex].status = newStatus;
            
            if (newStatus === 'available') {
                currentSlots[slotIndex].customer_name = null;
                currentSlots[slotIndex].customer_phone = null;
                currentSlots[slotIndex].application_number = null;
                currentSlots[slotIndex].installation_date = null;
            }
        }
        
        renderSlotsGrid();
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        closeSlotModal();
        
        if (newStatus === 'available') {
            showToast(`Slot #${slotNumber} set to AVAILABLE. Customer data has been cleared.`, 'success');
        } else {
            showToast(`Slot #${slotNumber} updated to ${newStatus.toUpperCase()}`, 'success');
        }
        
        await loadNapboxSlots();
        
    } catch (error) {
        console.error('Error updating slot status:', error);
        showToast(error.message || 'Failed to update slot status', 'error');
    }
}

function closeSlotModal() {
    const modal = document.getElementById('slotDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        // ✅ I-RESTORE ANG SCROLL
        document.body.style.overflow = '';
    }
}

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

        // Inject keyframes + spin once
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

    // Build inner HTML
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

    // Reset class, force reflow, then show
    toast.className = `custom-toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    // Clear any existing hide timer
    clearTimeout(toast._hideTimer);

    if (type === 'loading') {
        // Loading stays visible until next showToast call — no auto-hide
        // Progress bar uses the infinite sweep animation (set in CSS)
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function showBoundaryToast(cityName, state = 'loading') {
    const messages = {
        loading: `Loading boundary for ${cityName}...`,
        success: `${cityName} boundary loaded successfully`,
        error:   `Failed to load boundary for ${cityName}`
    };

    const types = {
        loading: 'loading',
        success: 'success',
        error:   'error'
    };

    showToast(messages[state] || messages.loading, types[state] || 'info');
}

function showSlotsError() {
    const slotsGrid = document.getElementById('slotsGrid');
    if (slotsGrid) {
        slotsGrid.innerHTML = `<div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Unable to load slots data</p></div>`;
    }
}

// ================= SETUP EVENT LISTENERS (WALANG DELAY) =================
function setupEventListeners() {

    // Filter buttons
    document.querySelectorAll('.slot-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.slot-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderSlotsGrid();
        });
    });

    // Barangay filter for slots
    const slotBarangayFilter = document.getElementById('slotBarangayFilter');
    if (slotBarangayFilter) {
        slotBarangayFilter.addEventListener('change', (e) => {
            currentBarangayFilter = e.target.value;
            renderSlotsGrid();
        });
    }

    // ========== BARANGAY FILTER FOR MAP ZOOM ==========
    const barangayFilter = document.getElementById('barangayFilter');

    if (barangayFilter) {

        // Remove existing listener by cloning to avoid duplicates
        const newFilter = barangayFilter.cloneNode(true);
        barangayFilter.parentNode.replaceChild(newFilter, barangayFilter);

        newFilter.addEventListener('change', function (e) {

            const selectedBarangay = e.target.value;

            console.log("📌 Barangay selected:", selectedBarangay);

            if (selectedBarangay && technicianArea) {

                // Zoom agad
                zoomToBarangay(selectedBarangay);

                // Filter slots
                currentBarangayFilter = selectedBarangay;

                // Sync dropdown
                const slotBarangayFilterEl = document.getElementById('slotBarangayFilter');

                if (slotBarangayFilterEl) {
                    slotBarangayFilterEl.value = selectedBarangay;
                }

                renderSlotsGrid();

                console.log("✅ Slots filtered for barangay:", selectedBarangay);

            } else if (selectedBarangay && !technicianArea) {

                console.log("Waiting for technician area to load...");
                showTemporaryMessage("Loading area info...", "info");

            } else if (!selectedBarangay) {

                currentBarangayFilter = '';

                const slotBarangayFilterEl = document.getElementById('slotBarangayFilter');

                if (slotBarangayFilterEl) {
                    slotBarangayFilterEl.value = '';
                }

                renderSlotsGrid();

                console.log("✅ All barangays selected - showing all slots");
            }
        });

        console.log("✅ Barangay filter event listener attached");
    }

    // ================= REFRESH MAP BUTTON =================
    const refreshMapBtn = document.getElementById('refreshMapBtn');

    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', async () => {

            showToast('Refreshing map...', 'info');

            await loadNapboxSlots();

            if (technicianArea) {
                await showCityBoundary(technicianArea);
            }

            showToast('Map refreshed successfully', 'success');
        });
    }

    // ================= ADD / CANCEL NAP BOX BUTTONS =================

    const addNapboxBtn = document.getElementById('addNapboxBtn');
    const cancelAddNapboxMapBtn = document.getElementById('cancelAddNapboxBtn');

    // ADD BUTTON
    if (addNapboxBtn) {

        addNapboxBtn.addEventListener('click', (e) => {

            e.stopPropagation();

            console.log("Add button clicked");

            startAddNapbox();

            // Hide add button
            addNapboxBtn.style.display = 'none';

            // Show cancel button
            if (cancelAddNapboxMapBtn) {
                cancelAddNapboxMapBtn.style.display = 'inline-flex';
            }
        });
    }

    // CANCEL BUTTON SA MAP
    if (cancelAddNapboxMapBtn) {

        cancelAddNapboxMapBtn.addEventListener('click', function (e) {

            e.stopPropagation();
            e.preventDefault();

            console.log("Cancel button clicked");

            cancelAddNapbox();
        });
    }

    // ================= MODAL BUTTONS =================

    const confirmAddNapboxBtn = document.getElementById('confirmAddNapbox');

    if (confirmAddNapboxBtn) {
        confirmAddNapboxBtn.addEventListener('click', confirmAddNapbox);
    }

    // IMPORTANT:
    // IBA ANG VARIABLE NAME PARA HINDI MAG-CONFLICT SA FUNCTION
    const cancelAddNapboxModalBtn = document.getElementById('cancelAddNapbox');

    if (cancelAddNapboxModalBtn) {

        cancelAddNapboxModalBtn.addEventListener('click', () => {

            closeAddNapboxModal();

            cancelAddNapbox();
        });
    }

    const closeAddNapboxModalBtn = document.getElementById('closeAddNapboxModal');

    if (closeAddNapboxModalBtn) {

        closeAddNapboxModalBtn.addEventListener('click', () => {

            closeAddNapboxModal();

            cancelAddNapbox();
        });
    }

    const clearBoundaryBtn = document.getElementById('clearBoundaryBtn');

    if (clearBoundaryBtn) {
        clearBoundaryBtn.addEventListener('click', clearBoundary);
    }

    // ================= CLOSE MODALS OUTSIDE CLICK =================

    window.addEventListener('click', (e) => {

        const addModal = document.getElementById('addNapboxModal');
        const slotModal = document.getElementById('slotDetailsModal');

        if (e.target === addModal) {

            closeAddNapboxModal();

            cancelAddNapbox();
        }

        if (e.target === slotModal) {
            closeSlotModal();
        }
    });

    // ================= SHOW BOUNDARY BUTTON =================
const showBoundaryBtn = document.getElementById('showBoundaryBtn');

if (showBoundaryBtn) {
    showBoundaryBtn.addEventListener('click', async () => {
        if (technicianArea) {
            showToast('Loading boundary...', 'info');
            await showCityBoundary(technicianArea);
        } else {
            showToast('No assigned area found', 'error');
        }
    });
}

// ================= CURRENT LOCATION BUTTON =================
const currentLocationBtn = document.getElementById('currentLocationBtn');

if (currentLocationBtn) {
    currentLocationBtn.addEventListener('click', () => {
        showCurrentLocation(true);
    });
}


    // ================= CUSTOMER PIN BUTTON =================
    const customerPinBtn = document.getElementById('customerPinBtn');
    if (customerPinBtn) {
        // ✅ REMOVE OLD EVENT LISTENERS BY CLONING
        const newCustomerPinBtn = customerPinBtn.cloneNode(true);
        customerPinBtn.parentNode.replaceChild(newCustomerPinBtn, customerPinBtn);
        
        newCustomerPinBtn.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            
            console.log('📍 Customer Pin button clicked:', { lat, lng });
            
            if (isNaN(lat) || isNaN(lng)) {
                showToast('No customer pin location available', 'warning');
                return;
            }
            
            // ✅ FLY TO CUSTOMER LOCATION
            map.flyTo([lat, lng], 18, {
                animate: true,
                duration: 1.5
            });
            
            // ✅ RE-OPEN POPUP IF MARKER EXISTS
            if (customerLocationMarker) {
                customerLocationMarker.openPopup();
            }
            
            showToast('📍 Zooming to customer pin location', 'info');
        });
        
        console.log('✅ Customer Pin button event listener attached');
    } else {
        console.warn('⚠️ Customer Pin button not found in DOM');
    }


    const nameInput = document.getElementById('napboxName');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            if (this.value.trim().length > 0) {
                this.style.borderColor = '#22c55e';
            } else {
                this.style.borderColor = '#dc2626';
            }
        });
        nameInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
                this.style.borderColor = '#dc2626';
            }
        });
    }


    // ================= CLEAR SLOT MODAL EVENTS =================
    const clearModal = document.getElementById('clearSlotModal');
    const closeClearBtn = document.getElementById('closeClearSlotModal');
    const cancelClearBtn = document.getElementById('cancelClearSlot');
    const confirmClearBtn = document.getElementById('confirmClearSlot');
    
    if (closeClearBtn) {
        closeClearBtn.addEventListener('click', closeClearSlotModal);
    }
    
    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', closeClearSlotModal);
    }
    
    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', executeClearSlot);
    }
    
    if (clearModal) {
        clearModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeClearSlotModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (clearModal && clearModal.classList.contains('show')) {
                closeClearSlotModal();
            }
        }
    });


    // ================= CONFIRM AVAILABLE MODAL EVENTS =================
    const confirmAvailableModal = document.getElementById('confirmAvailableModal');
    const closeConfirmBtn = document.getElementById('closeConfirmAvailableModal');
    const cancelConfirmBtn = document.getElementById('cancelConfirmAvailable');
    const confirmActionBtn = document.getElementById('confirmAvailableAction');
    
    if (closeConfirmBtn) {
        closeConfirmBtn.addEventListener('click', closeConfirmAvailableModal);
    }
    
    if (cancelConfirmBtn) {
        cancelConfirmBtn.addEventListener('click', closeConfirmAvailableModal);
    }
    
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', executeConfirmAvailable);
    }
    
    if (confirmAvailableModal) {
        confirmAvailableModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeConfirmAvailableModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (confirmAvailableModal && confirmAvailableModal.classList.contains('show')) {
                closeConfirmAvailableModal();
            }
            const deleteModal = document.getElementById('deleteNapboxModal');
            if (deleteModal && deleteModal.classList.contains('show')) {
                closeDeleteNapboxModal();
            }
        }
    });

    // ================= DELETE NAP BOX MODAL EVENTS =================
    const deleteNapboxModal = document.getElementById('deleteNapboxModal');
    const closeDeleteBtn = document.getElementById('closeDeleteNapboxModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteNapbox');
    const confirmDeleteBtn = document.getElementById('confirmDeleteNapbox');

    if (closeDeleteBtn) {
        closeDeleteBtn.addEventListener('click', closeDeleteNapboxModal);
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteNapboxModal);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDeleteNapbox);
    }
    if (deleteNapboxModal) {
        deleteNapboxModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeDeleteNapboxModal();
            }
        });
    }

}


function cancelAddNapbox() {
    console.log("cancelAddNapbox() function called");

    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }

    pendingLocation = null;
    isAddingNapbox = false;
    isCoordinatesMode = false;
    validatedCoordinates = null;
    validatedBarangay = null;

    resetAddNapboxCursorState();
    
    if (map) {
        map.off('click', onMapClickForAdd);
        console.log("Map click event removed");
    }

    const selectedLocation = document.getElementById('selectedLocation');
    if (selectedLocation) {
        selectedLocation.innerHTML = 'Click on the map to select location';
    }

    const napboxNameInput = document.getElementById('napboxName');
    if (napboxNameInput) {
        napboxNameInput.value = '';
        napboxNameInput.placeholder = 'Enter NAP box name (e.g. NAP-STC-0001)';
        napboxNameInput.style.borderColor = '#e2e8f0';
    }

    const modal = document.getElementById('addNapboxModal');
    if (modal && modal.style.display === 'block') {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }

    const coordsModal = document.getElementById('coordinatesModal');
    if (coordsModal && coordsModal.style.display === 'block') {
        coordsModal.style.display = 'none';
        coordsModal.classList.remove('show');
    }

    const addBtn = document.getElementById('addNapboxBtn');
    const cancelBtn = document.getElementById('cancelAddNapboxBtn');
    const coordsBtn = document.getElementById('addByCoordsBtn');

    if (addBtn) addBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (coordsBtn) coordsBtn.style.display = 'inline-flex';

    window.tempBarangayName = null;

    showToast('Adding NAP box cancelled', 'info');
}

// ================= CURRENT LOCATION =================
let currentLocationMarker = null;
let initialLocationShown = false; // Flag para maiwasan ang auto-zoom sa page load

// Function to get and show current location (NO AUTO ZOOM on page load)
function showCurrentLocation(shouldZoom = true) {
    console.log(" showCurrentLocation called, shouldZoom:", shouldZoom);
    
    if (!map) {
        console.log(" Map not initialized");
        showToast('Map not ready yet', 'error');
        return;
    }
    
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported', 'error');
        return;
    }
    
    showToast('Getting your location...', 'info');
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log(`✅ Current location: ${lat}, ${lng}`);
            
            // Remove existing marker if any
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
                console.log("Removed old marker");
            }
            
            // Create a simple marker (no accuracy circle)
            const currentLocationIcon = L.divIcon({
                className: 'current-location-marker',
                html: `
                    <div style="
                        width:16px;
                        height:16px;
                        background:#22c55e;
                        border-radius:50%;
                        border:3px solid white;
                        box-shadow:0 0 0 4px rgba(34,197,94,0.25);
                    "></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                popupAnchor: [0, -10]
            });
            
            // Add marker at correct coordinates
            currentLocationMarker = L.marker([lat, lng], {
                icon: currentLocationIcon,
                zIndexOffset: 1000
            }).addTo(map);
            
            // Add simple popup
            currentLocationMarker.bindPopup(`
                <div style="text-align:center; font-size:12px;">
                    <strong>Your Location</strong>
                </div>
            `);
            
            // Only zoom to location if shouldZoom is true (button click)
            if (shouldZoom) {
                map.flyTo([lat, lng], 18, {
                    animate: true,
                    duration: 1.5
                });
                showToast('Location found!', 'success');
            } else {
                // Just show the marker without zooming
                showToast('Location marker added', 'success');
                // Open popup briefly to show where the marker is
                currentLocationMarker.openPopup();
                setTimeout(() => {
                    if (currentLocationMarker && currentLocationMarker.isPopupOpen()) {
                        currentLocationMarker.closePopup();
                    }
                }, 2000);
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'Unknown error occurred.';
                    break;
            }
            showToast(errorMessage, 'error');
        },
        options
    );
}

// Make functions global
window.showSlotDetails = showSlotDetails;
window.updateSlotStatus = updateSlotStatus;
window.closeSlotModal = closeSlotModal;
window.showCurrentLocation = showCurrentLocation;
window.clearSlotData = clearSlotData;
window.closeClearSlotModal = closeClearSlotModal;
window.executeClearSlot = executeClearSlot;
window.closeConfirmAvailableModal = closeConfirmAvailableModal;
window.executeConfirmAvailable = executeConfirmAvailable;

// Optional: Function to continuously track location (if needed)
function startTrackingLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported', 'error');
        return;
    }
    
    if (currentLocationWatchId) {
        navigator.geolocation.clearWatch(currentLocationWatchId);
    }
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
    };
    
    currentLocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (currentLocationMarker) {
                currentLocationMarker.setLatLng([lat, lng]);
            } else {
                const currentLocationIcon = L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="background: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3);"></div>',
                    iconSize: [14, 14],
                    popupAnchor: [0, -8]
                });
                currentLocationMarker = L.marker([lat, lng], {
                    icon: currentLocationIcon,
                    zIndexOffset: 1000
                }).addTo(map);
            }
        },
        (error) => {
            console.error('Watch position error:', error);
        },
        options
    );
}

function stopTrackingLocation() {
    if (currentLocationWatchId) {
        navigator.geolocation.clearWatch(currentLocationWatchId);
        currentLocationWatchId = null;
    }
}

// Remove current location marker
function removeCurrentLocationMarker() {
    if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
        currentLocationMarker = null;
    }
}

// ==================== PROFILE DROPDOWN CHEVRON ====================
(function() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileBtn.classList.toggle('active');
        });
    }
})();

// ================= ADD BY COORDINATES =================
let isCoordinatesMode = false;
let validatedCoordinates = null;
let validatedBarangay = null;

// Event listener para sa Add by Coordinates button
const addByCoordsBtn = document.getElementById('addByCoordsBtn');
if (addByCoordsBtn) {
    addByCoordsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openCoordinatesModal();
    });
}

function openCoordinatesModal() {
    const modal = document.getElementById('coordinatesModal');
    if (!modal) return;
    
    // Center the modal properly
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Clear and reset all fields
    const latInput = document.getElementById('coordLatitude');
    const lngInput = document.getElementById('coordLongitude');
    const resultDiv = document.getElementById('coordValidationResult');
    const validateBtn = document.getElementById('validateCoordsBtn');
    const proceedBtn = document.getElementById('proceedFromCoordsBtn');
    
    if (latInput) {
        latInput.value = '';
        latInput.className = 'form-control';
        setTimeout(() => latInput.focus(), 350);
    }
    if (lngInput) {
        lngInput.value = '';
        lngInput.className = 'form-control';
    }
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.className = '';
        resultDiv.innerHTML = '';
    }
    if (validateBtn) {
        validateBtn.style.display = 'inline-flex';
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
    }
    if (proceedBtn) proceedBtn.style.display = 'none';
    
    // Reset validated data
    validatedCoordinates = null;
    validatedBarangay = null;
    isCoordinatesMode = true;
    
    // Remove temporary marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
    
    // ✅ AUTO-GENERATE NAP BOX NAME
    setNapboxNameField();
}

function closeCoordinatesModal() {
    const modal = document.getElementById('coordinatesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    validatedCoordinates = null;
    validatedBarangay = null;
    isCoordinatesMode = false;
    
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
}

// Validate Coordinates button
document.getElementById('validateCoordsBtn')?.addEventListener('click', validateCoordinates);

// Enter key support
document.getElementById('coordLatitude')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('coordLongitude').focus();
    }
});

document.getElementById('coordLongitude')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        validateCoordinates();
    }
});

// Cancel button
document.getElementById('cancelCoordsBtn')?.addEventListener('click', function() {
    closeCoordinatesModal();
    if (isAddingNapbox) {
        cancelAddNapbox();
    }
});

// Close modal on outside click
window.addEventListener('click', function(e) {
    const modal = document.getElementById('coordinatesModal');
    if (e.target === modal) {
        closeCoordinatesModal();
        if (isAddingNapbox) {
            cancelAddNapbox();
        }
    }
});

// ===== ENHANCED VALIDATE COORDINATES =====
async function validateCoordinates() {
    const latInput = document.getElementById('coordLatitude');
    const lngInput = document.getElementById('coordLongitude');
    const resultDiv = document.getElementById('coordValidationResult');
    const validateBtn = document.getElementById('validateCoordsBtn');
    const proceedBtn = document.getElementById('proceedFromCoordsBtn');
    
    // Clean input - remove extra characters
    const latValue = latInput.value.trim().replace(/[^0-9.\-]/g, '');
    const lngValue = lngInput.value.trim().replace(/[^0-9.\-]/g, '');
    const lat = parseFloat(latValue);
    const lng = parseFloat(lngValue);
    
    // Reset styling
    latInput.className = 'form-control';
    lngInput.className = 'form-control';
    
    // ===== INPUT VALIDATION =====
    if (isNaN(lat) || isNaN(lng)) {
        if (isNaN(lat)) latInput.className = 'form-control input-error';
        if (isNaN(lng)) lngInput.className = 'form-control input-error';
        
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
        latInput.className = 'form-control input-error';
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
        lngInput.className = 'form-control input-error';
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
        const boundaryCheck = isPointInsideBoundary(lat, lng);
        
        if (!boundaryCheck) {
            resultDiv.className = 'coord-invalid';
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span class="result-icon"><i class="fas fa-circle-xmark"></i></span>
                    <div>
                        <div class="result-title">Outside Municipal Boundary</div>
                        <div class="result-message">This location is outside <strong>${technicianArea || 'your assigned area'}</strong>. Please enter coordinates within the municipality.</div>
                    </div>
                </div>
            `;
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
            return;
        }
        
        // ===== STEP 2: GET BARANGAY =====
    const geoData = await getAccurateBarangay(lat, lng);
    let barangayName = geoData?.barangay || '';
    let detectedCity = geoData?.city || '';
    
    console.log(`📍 Detected barangay: "${barangayName}", City: "${detectedCity}"`);
    
    // ===== CHECK 2: BARANGAY MUST BE IN DATABASE (SAME AS onMapClickForAdd) =====
    let barangayValid = false;
    if (barangayName && allBarangays && allBarangays.length > 0) {
        // ✅ GAMITIN ANG PAREHONG NORMALIZATION LOGIC
        const normalize = (str) => {
            if (!str) return '';
            let normalized = str.toLowerCase()
                .replace(/\s*\(poblacion\)\s*/gi, '')
                .replace(/\s*\(pob\.?\)\s*/gi, '')
                .replace(/\s+poblacion\s*/gi, '')
                .trim();
            
            // Special handling para sa Santa Cruz: i-extract ang numero
            if (detectedCity === "Santa Cruz") {
                // Kunin ang Roman numeral
                const romanMatch = normalized.match(/\b(i|ii|iii|iv|v)\b/);
                if (romanMatch) {
                    return `poblacion ${romanMatch[1]}`;
                }
                const numberMatch = normalized.match(/\b(1|2|3|4|5)\b/);
                if (numberMatch) {
                    const numMap = {'1':'i','2':'ii','3':'iii','4':'iv','5':'v'};
                    return `poblacion ${numMap[numberMatch[1]]}`;
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
        const barangayExists = allBarangays.some(b => normalize(b) === normalizedDetected);
        
        // Check if city matches technician's assigned area
        const cityMatch = detectedCity && technicianArea && 
            detectedCity.toLowerCase() === technicianArea.toLowerCase();
        
        if (barangayExists && cityMatch) {
            barangayValid = true;
            console.log(`✅ Barangay "${barangayName}" is valid (exists in database and city matches)`);
        } else if (barangayExists && !cityMatch) {
            console.log(`⚠️ Barangay exists but city mismatch: ${detectedCity} vs ${technicianArea}`);
            barangayValid = false;
        } else {
            console.log(`❌ Barangay "${barangayName}" NOT found in database`);
            barangayValid = false;
        }
    } else {
        console.log(`⚠️ No barangay detected or allBarangays not loaded`);
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
                        Assigned Area: <strong>${technicianArea || 'Unknown'}</strong>
                    </div>
                </div>
            </div>
        `;
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
        return;
    }
        
        // ===== STEP 3: ROAD CHECK =====
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
            
            if (validRoads.length > 0) {
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
            }
        } catch (err) {
            console.warn('Road check fallback:', err);
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
        
        // ============================================================
        // ===== ALL CHECKS PASSED! =====
        // ============================================================
        
// Format barangay name
let finalBarangay = barangayName;
if (detectedCity === "Santa Cruz") {
    let number = '';
    let match = finalBarangay.match(/\b(1|2|3|4|5)\b/);
    if (match) {
        number = match[1];
    }
    
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
        console.log(`🎯 Santa Cruz barangay (Roman): "${finalBarangay}"`);
    } else if (finalBarangay.toLowerCase().includes('poblacion')) {
        finalBarangay = 'Poblacion I';
    }

        } else if (detectedCity === "Pagsanjan") {
            finalBarangay = convertPagsanjanBarangay(finalBarangay);
        }
        
        // Save validated data
        validatedCoordinates = {
            lat: snappedLat,
            lng: snappedLng,
            original_lat: lat,
            original_lng: lng
        };
        validatedBarangay = finalBarangay;
        
        // Road distance display
        const roadDistanceText = nearestDistance === 0 ? 'On road' : nearestDistance + 'm away';
        
        // Show success with detailed breakdown
        resultDiv.className = 'coord-valid';
        resultDiv.innerHTML = `

                    <div class="result-title">Location Validated</div>
                    <div class="result-message">All checks passed. You can now proceed to setup.</div>
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
                    <span class="value pass">Inside ${technicianArea}</span>
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
        
        // ===== SHOW PROCEED BUTTON =====
        validateBtn.style.display = 'none';
        proceedBtn.style.display = 'inline-flex';
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
        
        // Mark inputs as success
        latInput.className = 'form-control input-success';
        lngInput.className = 'form-control input-success';
        
        // ===== ADD MARKER ON MAP =====
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker([snappedLat, snappedLng], {
            icon: L.divIcon({
                className: 'pending-marker',
                html: '<div style="background: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 5px rgba(34,197,94,0.25);"></div>',
                iconSize: [18, 18]
            })
        }).addTo(map);
        map.flyTo([snappedLat, snappedLng], 18);
        
        showToast('Location validated successfully!', 'success');
        
    } catch (error) {
        console.error('Validation error:', error);
        resultDiv.className = 'coord-invalid';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="result-icon"><i class="fas fa-circle-exclamation"></i></span>
                <div>
                    <div class="result-title">Validation Error</div>
                    <div class="result-message">${error.message || 'An unexpected error occurred. Please try again.'}</div>
                </div>
            </div>
        `;
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
    }
}

// ===== PROCEED FROM COORDINATES TO SETUP =====
document.getElementById('proceedFromCoordsBtn')?.addEventListener('click', function() {
    if (!validatedCoordinates || !validatedBarangay) {
        showToast('Please validate the location first', 'error');
        return;
    }
    
    // Set the pending location
    pendingLocation = {
        lat: validatedCoordinates.lat,
        lng: validatedCoordinates.lng
    };
    
    // Set the barangay name
    window.tempBarangayName = validatedBarangay;
    
    // ✅ I-SET ANG isAddingNapbox PARA MAG-OPEN ANG MODAL
    isAddingNapbox = true;
    
    // Close coordinates modal (pero huwag i-reset ang isAddingNapbox)
    const modal = document.getElementById('coordinatesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    validatedCoordinates = null;
    validatedBarangay = null;
    isCoordinatesMode = false;
    
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
    
    // ✅ AUTO-GENERATE NAP BOX NAME
    setNapboxNameField();
    
    // ✅ I-UPDATE ANG LOCATION PREVIEW NA MAY TAMANG FORMAT
    const locationPreview = document.getElementById('selectedLocation');
    if (locationPreview) {
        locationPreview.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-check-circle" style="color: #22c55e; font-size: 16px;"></i>
                    <span style="font-weight: 600; color: #166534;">Location Validated</span>
                    <span style="margin-left: auto; font-size: 11px; background: #dcfce7; color: #166534; padding: 2px 12px; border-radius: 20px;">Ready</span>
                </div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; color: #475569; margin-top: 4px;">
                    <span style="color: #94a3b8;"><i class="fas fa-map-pin" style="width: 14px;"></i></span>
                    <span>${pendingLocation.lat.toFixed(6)}, ${pendingLocation.lng.toFixed(6)}</span>
                    <span style="color: #94a3b8;"><i class="fas fa-tag" style="width: 14px;"></i></span>
                    <span>${window.tempBarangayName}</span>
                    <span style="color: #94a3b8;"><i class="fas fa-road" style="width: 14px;"></i></span>
                    <span style="color: #22c55e;">On road <i class="fas fa-check-circle" style="font-size: 11px;"></i></span>
                </div>
            </div>
        `;
        locationPreview.className = 'location-preview has-location';
    }
    
    // ✅ I-SHOW ANG ADD NAP BOX MODAL
    const addModal = document.getElementById('addNapboxModal');
    if (addModal) {
        addModal.style.display = 'block';
        addModal.classList.add('show');
    }
    
    // ✅ MAG-ADD NG MARKER SA MAP
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker([pendingLocation.lat, pendingLocation.lng], {
        icon: L.divIcon({
            className: 'pending-marker',
            html: '<div style="background: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(34,197,94,0.3);"></div>',
            iconSize: [16, 16]
        })
    }).addTo(map);
    
    showToast('Location set! Ready to add NAP box.', 'success');
});

// ===== REAL-TIME INPUT VALIDATION =====
document.getElementById('coordLatitude')?.addEventListener('input', function() {
    this.className = 'form-control';
    const resultDiv = document.getElementById('coordValidationResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.className = '';
    }
    document.getElementById('proceedFromCoordsBtn').style.display = 'none';
    document.getElementById('validateCoordsBtn').style.display = 'inline-flex';
});

document.getElementById('coordLongitude')?.addEventListener('input', function() {
    this.className = 'form-control';
    const resultDiv = document.getElementById('coordValidationResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.className = '';
    }
    document.getElementById('proceedFromCoordsBtn').style.display = 'none';
    document.getElementById('validateCoordsBtn').style.display = 'inline-flex';
});

// ===== ENHANCED CANCEL ADD NAPBOX =====
const originalCancel = cancelAddNapbox;
cancelAddNapbox = function() {
    console.log("cancelAddNapbox() called (enhanced)");
    
    // Remove temporary marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
    
    // Reset variables
    pendingLocation = null;
    isAddingNapbox = false;
    isCoordinatesMode = false;
    validatedCoordinates = null;
    validatedBarangay = null;
    
    // Reset cursor / pointer-events (mapDiv + markerPane/popupPane/atbp.)
    resetAddNapboxCursorState();
    
    // Remove map click event
    if (map) {
        map.off('click', onMapClickForAdd);
        console.log("Map click event removed");
    }
    
    // Reset selected location text
    const selectedLocation = document.getElementById('selectedLocation');
    if (selectedLocation) {
        selectedLocation.innerHTML = 'Click on the map to select location';
        selectedLocation.className = 'location-preview';
    }
    
    // Clear NAP box name input
    const napboxNameInput = document.getElementById('napboxName');
    if (napboxNameInput) {
        napboxNameInput.value = '';
        napboxNameInput.placeholder = 'Enter NAP box name (e.g. NAP-STC-0001)';
    }
    
    // Close add NAP box modal if open
    const addModal = document.getElementById('addNapboxModal');
    if (addModal && addModal.style.display === 'block') {
        addModal.style.display = 'none';
        addModal.classList.remove('show');
    }
    
    // Close coordinates modal if open
    const coordsModal = document.getElementById('coordinatesModal');
    if (coordsModal && coordsModal.style.display === 'block') {
        coordsModal.style.display = 'none';
        coordsModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // Reset buttons
    const addBtn = document.getElementById('addNapboxBtn');
    const cancelBtn = document.getElementById('cancelAddNapboxBtn');
    const coordsBtn = document.getElementById('addByCoordsBtn');
    
    if (addBtn) addBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (coordsBtn) coordsBtn.style.display = 'inline-flex';
    
    // Reset validate button
    const validateBtn = document.getElementById('validateCoordsBtn');
    const proceedBtn = document.getElementById('proceedFromCoordsBtn');
    if (validateBtn) {
        validateBtn.style.display = 'inline-flex';
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<i class="fas fa-check-circle"></i> Validate Location';
    }
    if (proceedBtn) proceedBtn.style.display = 'none';
    
    // Clear temp variable
    window.tempBarangayName = null;
    
    showToast('Adding NAP box cancelled', 'info');
};


// ================= CLEAR SLOT DATA (WITH MODAL - AUTO CLOSE SLOT MODAL) =================
let pendingClearSlot = null;

function showClearSlotModal(slotId, slotNumber) {
    // ✅ UNA, ISARA ANG SLOT DETAILS MODAL
    closeSlotModal();
    
    // Hanapin ang slot data mula sa currentSlots
    const slot = currentSlots.find(s => s.id === slotId);
    if (!slot) {
        showToast('Slot not found', 'error');
        return;
    }
    
    // I-set ang pending data
    pendingClearSlot = {
        slotId: slotId,
        slotNumber: slotNumber,
        customerName: slot.customer_name || 'N/A',
        napboxName: slot.napbox_name || 'N/A'
    };
    
    // I-populate ang modal
    document.getElementById('clearSlotNumber').textContent = `#${slotNumber}`;
    document.getElementById('clearNapboxName').textContent = pendingClearSlot.napboxName;
    document.getElementById('clearCustomerName').textContent = pendingClearSlot.customerName;
    document.getElementById('clearSlotModalText').textContent = 
        `This will permanently remove all customer data from Slot #${slotNumber}.`;
    
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

function closeClearSlotModal() {
    const modal = document.getElementById('clearSlotModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    pendingClearSlot = null;
}

async function executeClearSlot() {
    if (!pendingClearSlot) return;
    
    const { slotId, slotNumber } = pendingClearSlot;
    
    // Close modal
    closeClearSlotModal();
    
    try {
        const technicianId = sessionStorage.getItem('technicianId');
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
        closeSlotModal();
        
        // I-RELOAD ANG SLOTS DATA
        await loadNapboxSlots();
        
        // I-UPDATE ANG STATS
        const stats = {
            total: currentSlots.length,
            available: currentSlots.filter(s => s.status === 'available').length,
            occupied: currentSlots.filter(s => s.status === 'occupied').length
        };
        updateStatsSummary(stats);
        
        // I-REBUILD ANG SLOTS GRID
        renderSlotsGrid();
        
        // I-REBUILD ANG MARKERS SA MAP
        if (currentNapboxMarkers.length) {
            currentNapboxMarkers.forEach(m => {
                if (map && map.hasLayer(m)) map.removeLayer(m);
            });
            currentNapboxMarkers = [];
        }
        if (currentCircles.length) {
            currentCircles.forEach(c => {
                if (map && map.hasLayer(c)) map.removeLayer(c);
            });
            currentCircles = [];
        }
        addNapboxMarkers(currentNapboxes);
        
    } catch (error) {
        console.error('Error clearing slot:', error);
        showToast(error.message || 'Failed to clear slot data', 'error');
    }
}

// ================= CLEAR SLOT DATA =================
async function clearSlotData(slotId, slotNumber) {
    // ✅ GAMITIN ANG MODAL IMBES NA confirm()
    // ✅ AUTO-CLOSE ANG SLOT DETAILS MODAL
    showClearSlotModal(slotId, slotNumber);
}

// Make functions global
window.clearSlotData = clearSlotData;
window.closeClearSlotModal = closeClearSlotModal;
window.executeClearSlot = executeClearSlot;



// ================= EDIT SLOT MODAL (TECHNICIAN) =================
const TECH_CONTRACT_PREFIXES = {
    "Santa Cruz": "FS-",
    "Pagsanjan": "FP-",
    "Pila": "GIF-",
    "Magdalena": "CVM-"
};

function getTechnicianContractPrefix() {
    const area = technicianArea || sessionStorage.getItem('technicianArea') || '';
    
    // ✅ SPECIAL CASE: Pila may choice ng prefix (GIF- or POB-)
    if (area === "Pila") {
        return technicianSelectedContractPrefix || "GIF-";
    }
    
    let prefix = TECH_CONTRACT_PREFIXES[area];
    if (!prefix) {
        const lowerArea = area.toLowerCase();
        if (lowerArea.includes('santa') || lowerArea.includes('sta')) prefix = "FS-";
        else if (lowerArea.includes('pagsanjan')) prefix = "FP-";
        else if (lowerArea.includes('pila')) prefix = technicianSelectedContractPrefix || "GIF-";
        else if (lowerArea.includes('magdalena')) prefix = "CVM-";
        else prefix = "CV-";
    }
    return prefix;
}

let currentEditSlotTech = null;

function openEditFromDetailsTech(slot) {
    closeSlotModal();
    showEditSlotModalTech(slot);
}

function showEditSlotModalTech(slot) {
    currentEditSlotTech = slot;

    document.getElementById('editSlotNumberTech').value = `Slot ${slot.slot_number}`;
    document.getElementById('editCustomerNameTech').value = slot.customer_name || '';
    document.getElementById('editCustomerPhoneTech').value = slot.customer_phone || '';

    // ✅ CHECK KUNG PILA ANG AREA - SHOW PREFIX CHOICES
    const normalizedAreaForPrefix = technicianArea || sessionStorage.getItem('technicianArea') || '';
    const prefixWrapperTech = document.getElementById('prefixChoiceWrapperTech');
    const prefixGIFBtnTech = document.getElementById('prefixChoiceGIFTech');
    const prefixPOBBtnTech = document.getElementById('prefixChoicePOBTech');
    
    if (normalizedAreaForPrefix === "Pila") {
        if (prefixWrapperTech) prefixWrapperTech.style.display = 'flex';
        
        // I-detect kung anong prefix ang existing sa contract number
        const existingContract = slot.contract_number || '';
        let detectedPrefix = 'GIF-';
        if (existingContract.toUpperCase().startsWith('POB-')) {
            detectedPrefix = 'POB-';
        } else if (existingContract.toUpperCase().startsWith('GIF-')) {
            detectedPrefix = 'GIF-';
        }
        technicianSelectedContractPrefix = detectedPrefix;
        
        [prefixGIFBtnTech, prefixPOBBtnTech].forEach(btn => btn && btn.classList.remove('active'));
        const activeBtnTech = detectedPrefix === 'GIF-' ? prefixGIFBtnTech : prefixPOBBtnTech;
        if (activeBtnTech) activeBtnTech.classList.add('active');
    } else {
        if (prefixWrapperTech) prefixWrapperTech.style.display = 'none';
        technicianSelectedContractPrefix = null;
    }

    const prefix = getTechnicianContractPrefix();
    let contractValue = slot.contract_number || '';
    if (contractValue && !contractValue.match(/^[A-Z]+-/i)) {
        contractValue = prefix + contractValue;
    } else if (!contractValue) {
        contractValue = prefix;
    } else {
        // I-strip ang lumang prefix at ipalit ng tamang prefix (GIF- o POB-)
        const numberPartOnly = contractValue.replace(/^[A-Z]+-/i, '');
        contractValue = prefix + numberPartOnly;
    }
    document.getElementById('editContractNumberTech').value = contractValue;

    const nameInput = document.getElementById('editCustomerNameTech');
    const contractInput = document.getElementById('editContractNumberTech');
    const nameError = document.getElementById('editNameErrorTech');
    const contractError = document.getElementById('editContractErrorTech');
    nameInput.className = 'form-input';
    contractInput.className = 'form-input';
    if (nameError) nameError.style.display = 'none';
    if (contractError) contractError.style.display = 'none';

    // ✅ I-RESET ANG SAVE BUTTON TUWING MAGBUBUKAS ANG MODAL
    const saveBtnReset = document.getElementById('saveEditBtnTech');
    if (saveBtnReset) {
        saveBtnReset.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        saveBtnReset.disabled = false;
    }

    const status = slot.status || 'available';
    const occupiedBtn = document.getElementById('editStatusOccupiedTech');
    const availableBtn = document.getElementById('editStatusAvailableTech');
    [occupiedBtn, availableBtn].forEach(btn => {
        btn.classList.remove('active', 'active-occupied', 'active-available');
    });
    if (status === 'occupied') {
        occupiedBtn.classList.add('active', 'active-occupied');
    } else {
        availableBtn.classList.add('active', 'active-available');
    }

    const modal = document.getElementById('editSlotModalTech');
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const nf = document.getElementById('editCustomerNameTech');
        if (nf) { nf.focus(); nf.select(); }
    }, 300);
}

function closeEditSlotModalTech() {
    const modal = document.getElementById('editSlotModalTech');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    currentEditSlotTech = null;

    const nameInput = document.getElementById('editCustomerNameTech');
    const contractInput = document.getElementById('editContractNumberTech');
    const nameError = document.getElementById('editNameErrorTech');
    const contractError = document.getElementById('editContractErrorTech');
    if (nameInput) nameInput.className = 'form-input';
    if (contractInput) contractInput.className = 'form-input';
    if (nameError) nameError.style.display = 'none';
    if (contractError) contractError.style.display = 'none';

    // ✅ I-RESET ANG SAVE BUTTON PABALIK SA ORIGINAL STATE
    const saveBtn = document.getElementById('saveEditBtnTech');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        saveBtn.disabled = false;
    }
}

async function saveEditSlotTech() {
    if (!currentEditSlotTech) return;

    let customerName = document.getElementById('editCustomerNameTech').value.trim();
    let contractNumber = document.getElementById('editContractNumberTech').value.trim();
    const customerPhone = document.getElementById('editCustomerPhoneTech').value.trim();

    customerName = customerName.replace(/\b\w/g, letter => letter.toUpperCase());

    const prefix = getTechnicianContractPrefix();
    let numberPartOnly = contractNumber.replace(new RegExp(`^${prefix}`, 'i'), '').trim();
    let cleanContractNumber = numberPartOnly ? (prefix + numberPartOnly) : '';

    let selectedStatus = 'available';
    const occupiedBtn = document.getElementById('editStatusOccupiedTech');
    if (occupiedBtn.classList.contains('active')) {
        selectedStatus = 'occupied';
    }

    const nameInput = document.getElementById('editCustomerNameTech');
    const contractInput = document.getElementById('editContractNumberTech');
    const nameError = document.getElementById('editNameErrorTech');
    const contractError = document.getElementById('editContractErrorTech');

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
                nameError.textContent = 'Customer name is required when slot is OCCUPIED';
                nameError.style.display = 'flex';
            }
            hasError = true;
            errorMessages.push('Customer Name');
        }
        if (!cleanContractNumber) {
            contractInput.className = 'form-input input-error';
            if (contractError) {
                contractError.textContent = 'Contract number is required when slot is OCCUPIED';
                contractError.style.display = 'flex';
            }
            hasError = true;
            errorMessages.push('Contract Number');
        }
    }

    if (hasError) {
        showToast(`Please fill in: ${errorMessages.join(' and ')} for OCCUPIED status`, 'error');
        if (!customerName) nameInput.focus();
        else if (!cleanContractNumber) contractInput.focus();
        return;
    }

    let finalStatus = selectedStatus;
    if (selectedStatus === 'occupied' && !customerName && !cleanContractNumber) {
        finalStatus = 'available';
        const occ = document.getElementById('editStatusOccupiedTech');
        const avail = document.getElementById('editStatusAvailableTech');
        [occ, avail].forEach(btn => btn.classList.remove('active', 'active-occupied', 'active-available'));
        avail.classList.add('active', 'active-available');
        showToast('Status changed to AVAILABLE because fields are empty', 'info');
    }

    // ✅ VALIDATE: CONTRACT NUMBER LENGTH (4 DIGITS ONLY)
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
        
        // ✅ VALIDATE: CHECK IF CONTRACT NUMBER ALREADY EXISTS (EXCLUDING CURRENT SLOT)
        try {
            const tabId = getTabId();
            const technicianId = sessionStorage.getItem('technicianId');
            
            const response = await fetch(`/api/check-contract-number-exists?tab_id=${tabId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contract_number: cleanContractNumber,
                    technician_id: technicianId,
                    exclude_slot_id: currentEditSlotTech.id,
                    tab_id: tabId
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

    const saveBtn = document.getElementById('saveEditBtnTech');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const tabId = getTabId();
        const technicianId = sessionStorage.getItem('technicianId');

        const response = await fetch(`/api/technician/update-slot?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slot_id: currentEditSlotTech.id,
                customer_name: customerName,
                contract_number: cleanContractNumber,
                customer_phone: customerPhone,
                status: finalStatus,
                technician_id: technicianId,
                tab_id: tabId
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
            closeEditSlotModalTech();
            await loadNapboxSlots();

            if (map) {
                setTimeout(() => {
                    map.invalidateSize();
                    if (technicianArea) {
                        showCityBoundary(technicianArea);
                    }
                }, 200);
            }
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

function setupEditStatusToggleTech() {
    const occupiedBtn = document.getElementById('editStatusOccupiedTech');
    const availableBtn = document.getElementById('editStatusAvailableTech');

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

    if (occupiedBtn) occupiedBtn.addEventListener('click', () => setStatus('occupied'));
    if (availableBtn) availableBtn.addEventListener('click', () => setStatus('available'));
}

// ===== EDIT MODAL EVENT LISTENERS (TECHNICIAN) =====
function setupEditSlotModalListenersTech() {
    const closeBtn = document.getElementById('closeEditModalBtnTech');
    const cancelBtn = document.getElementById('cancelEditBtnTech');
    const saveBtn = document.getElementById('saveEditBtnTech');

    if (closeBtn) closeBtn.addEventListener('click', closeEditSlotModalTech);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditSlotModalTech);
    if (saveBtn) saveBtn.addEventListener('click', saveEditSlotTech);

    setupEditStatusToggleTech();

    // ================= CONTRACT PREFIX CHOICE (PILA) =================
    const prefixGIFBtnListenerTech = document.getElementById('prefixChoiceGIFTech');
    const prefixPOBBtnListenerTech = document.getElementById('prefixChoicePOBTech');
    
    function setSelectedPrefixTech(prefix) {
        technicianSelectedContractPrefix = prefix;
        
        [prefixGIFBtnListenerTech, prefixPOBBtnListenerTech].forEach(btn => btn && btn.classList.remove('active'));
        const activeBtn = prefix === 'GIF-' ? prefixGIFBtnListenerTech : prefixPOBBtnListenerTech;
        if (activeBtn) activeBtn.classList.add('active');
        
        const contractInputEl = document.getElementById('editContractNumberTech');
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
            // ✅ LIMIT TO 4 DIGITS
            if (numberPart.length > 4) {
                numberPart = numberPart.substring(0, 4);
            }
            contractInputEl.value = prefix + numberPart;
        }
    }
    
    if (prefixGIFBtnListenerTech) {
        prefixGIFBtnListenerTech.addEventListener('click', () => setSelectedPrefixTech('GIF-'));
    }
    if (prefixPOBBtnListenerTech) {
        prefixPOBBtnListenerTech.addEventListener('click', () => setSelectedPrefixTech('POB-'));
    }

    // ✅ CONTRACT INPUT - WITH 4 DIGIT LIMIT
    const contractInput = document.getElementById('editContractNumberTech');
    if (contractInput) {
        // ✅ REMOVE OLD EVENT LISTENERS BY CLONING
        const newContractInput = contractInput.cloneNode(true);
        contractInput.parentNode.replaceChild(newContractInput, contractInput);
        
        newContractInput.addEventListener('focus', function() {
            const prefix = getTechnicianContractPrefix();
            const currentValue = this.value.trim();
            if (!currentValue || !currentValue.match(/^[A-Z]+-/i)) {
                this.value = prefix;
                setTimeout(() => this.setSelectionRange(this.value.length, this.value.length), 10);
            }
        });

        // ✅ INPUT EVENT - LIMIT TO 4 DIGITS
        newContractInput.addEventListener('input', function() {
            const prefix = getTechnicianContractPrefix();
            let value = this.value;
            let numberPart = value;
            
            // I-extract ang number part
            if (value.startsWith(prefix)) {
                numberPart = value.substring(prefix.length);
            } else {
                const prefixes = [...Object.values(TECH_CONTRACT_PREFIXES), 'POB-'];
                for (const p of prefixes) {
                    if (value.startsWith(p)) {
                        numberPart = value.substring(p.length);
                        break;
                    }
                }
            }
            
            // ✅ REMOVE NON-NUMERIC CHARACTERS
            numberPart = numberPart.replace(/[^0-9]/g, '');
            
            // ✅ LIMIT TO 4 DIGITS ONLY
            if (numberPart.length > 4) {
                numberPart = numberPart.substring(0, 4);
                showToast('Contract number limited to 4 digits', 'warning');
            }
            
            // ✅ UPDATE VALUE
            this.value = prefix + numberPart;
            
            // ✅ I-SET ANG CURSOR SA DULO
            this.setSelectionRange(this.value.length, this.value.length);
        });

        // ✅ BLUR EVENT
        newContractInput.addEventListener('blur', function() {
            const prefix = getTechnicianContractPrefix();
            let value = this.value.trim();
            if (!value || value === prefix) {
                this.value = prefix;
                return;
            }
            if (!value.startsWith(prefix)) {
                const numberPart = value.replace(/^[A-Z]+-/i, '');
                // ✅ LIMIT TO 4 DIGITS
                const cleanNumber = numberPart.replace(/[^0-9]/g, '').substring(0, 4);
                this.value = cleanNumber ? prefix + cleanNumber : prefix;
            }
        });

        // ✅ KEYDOWN EVENT - PREVENT TYPING BEYOND 4 DIGITS
        newContractInput.addEventListener('keydown', function(e) {
            const prefix = getTechnicianContractPrefix();
            const currentValue = this.value;
            const numberPart = currentValue.replace(new RegExp(`^${prefix}`, 'i'), '');
            
            // ✅ IF ALREADY 4 DIGITS, PREVENT ADDING MORE
            if (numberPart.length >= 4) {
                // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
                const allowedKeys = [8, 9, 27, 13, 35, 36, 37, 38, 39, 40];
                if (!allowedKeys.includes(e.keyCode) && 
                    !(e.keyCode === 65 && e.ctrlKey) && // Ctrl+A
                    !(e.keyCode === 67 && e.ctrlKey) && // Ctrl+C
                    !(e.keyCode === 86 && e.ctrlKey) && // Ctrl+V
                    !(e.keyCode === 88 && e.ctrlKey)) { // Ctrl+X
                    e.preventDefault();
                    // showToast('Contract number already has 4 digits', 'warning');
                }
            }
        });

        // ✅ PASTE EVENT - LIMIT TO 4 DIGITS
        newContractInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numbersOnly = pastedText.replace(/\D/g, '');
            
            const prefix = getTechnicianContractPrefix();
            const currentValue = this.value;
            const currentNumberPart = currentValue.replace(new RegExp(`^${prefix}`, 'i'), '');
            
            // ✅ GET AVAILABLE SPACE (4 - current length)
            const availableSpace = 4 - currentNumberPart.length;
            if (availableSpace <= 0) {
                showToast('Contract number already has 4 digits', 'warning');
                return;
            }
            
            // ✅ TAKE ONLY WHAT FITS
            const newNumbers = numbersOnly.substring(0, availableSpace);
            if (newNumbers) {
                const newValue = prefix + (currentNumberPart + newNumbers);
                this.value = newValue;
                this.setSelectionRange(this.value.length, this.value.length);
            }
        });
    }

    const nameInput = document.getElementById('editCustomerNameTech');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            const words = this.value.split(' ');
            const formatted = words.map(w => w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);
            const newValue = formatted.join(' ');
            if (newValue !== this.value) {
                const pos = this.selectionStart;
                this.value = newValue;
                this.setSelectionRange(pos, pos);
            }
        });
    }

    const modal = document.getElementById('editSlotModalTech');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeEditSlotModalTech();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const m = document.getElementById('editSlotModalTech');
            if (m && m.classList.contains('show')) closeEditSlotModalTech();
        }
    });
}

window.openEditFromDetailsTech = openEditFromDetailsTech;
window.closeEditSlotModalTech = closeEditSlotModalTech;
window.saveEditSlotTech = saveEditSlotTech;


// ================= CUSTOMER LOCATION MARKER WITH LABEL =================
let customerLocationMarker = null;
let customerLabelMarker = null;

function showCustomerLocationMarkerOnMap() {
    const lat = sessionStorage.getItem('customerTargetLatitude');
    const lng = sessionStorage.getItem('customerTargetLongitude');
    
    console.log('📍 showCustomerLocationMarkerOnMap called with:', { lat, lng });
    
    if (!lat || !lng || !map) {
        console.log('⚠️ No customer location or map not ready');
        return;
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
        console.log('⚠️ Invalid customer coordinates');
        return;
    }
    
    console.log(`📍 Adding customer location marker at ${latNum}, ${lngNum}`);
    
    // ✅ REMOVE EXISTING MARKER IF ANY
    if (customerLocationMarker) {
        map.removeLayer(customerLocationMarker);
        customerLocationMarker = null;
    }
    if (customerLabelMarker) {
        map.removeLayer(customerLabelMarker);
        customerLabelMarker = null;
    }

    // ✅ SHOW CUSTOMER LEGEND ITEM
    const legendItem = document.getElementById('customerLegendItem');
    if (legendItem) {
        legendItem.style.display = 'flex';
    }

    // ✅ SHOW CUSTOMER PIN BUTTON - ITO ANG PINAKAIMPORTANTE!
    const customerPinBtn = document.getElementById('customerPinBtn');
    if (customerPinBtn) {
        customerPinBtn.style.display = 'inline-flex';
        customerPinBtn.style.visibility = 'visible';
        customerPinBtn.style.opacity = '1';
        customerPinBtn.dataset.lat = latNum;
        customerPinBtn.dataset.lng = lngNum;
        console.log('✅ Customer Pin button shown with coords:', latNum, lngNum);
        console.log('✅ Button display style:', customerPinBtn.style.display);
        console.log('✅ Button classes:', customerPinBtn.className);
    } else {
        console.warn('⚠️ Customer Pin button NOT FOUND in DOM!');
        // ✅ TRY TO FIND IT AGAIN
        setTimeout(() => {
            const btn = document.getElementById('customerPinBtn');
            if (btn) {
                btn.style.display = 'inline-flex';
                btn.style.visibility = 'visible';
                btn.style.opacity = '1';
                btn.dataset.lat = latNum;
                btn.dataset.lng = lngNum;
                console.log('✅ Customer Pin button found and shown (delayed)');
            } else {
                console.error('❌ Customer Pin button still not found!');
            }
        }, 500);
    }
    
    // ✅ CREATE CUSTOM DIV ICON FOR CUSTOMER LOCATION
    const customerIcon = L.divIcon({
        className: 'customer-location-marker',
        html: `
            <div style="
                width: 18px;
                height: 18px;
                background: #2563eb;
                border: 2.5px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3);
                animation: customer-pulse 2s ease-in-out infinite;
            ">
            </div>
            <style>
                @keyframes customer-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3); }
                    50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.1); }
                    100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3); }
                }
            </style>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -9]
    });
    
    // ✅ ADD THE MARKER
    customerLocationMarker = L.marker([latNum, lngNum], {
        icon: customerIcon,
        zIndexOffset: 2000
    }).addTo(map);
    
    // ✅ FLY TO THE LOCATION
    map.flyTo([latNum, lngNum], 16, {
        animate: true,
        duration: 1.5
    });
    
    // ✅ ADD POPUP WITH INFO - MAY COPY BUTTON
    customerLocationMarker.bindPopup(`
        <div style="padding: 4px 0; min-width: 160px;">
            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 4px;">
                <i class="fas fa-map-pin" style="color: #2563eb;"></i> 
                Customer Location
            </div>
            <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; font-family: 'Courier New', monospace;">
                <b>Lat:</b> ${latNum.toFixed(6)}<br>
                <b>Lng:</b> ${lngNum.toFixed(6)}
            </div>
            <button onclick="copyCustomerCoordinates(${latNum}, ${lngNum})" 
                style="width: 100%; padding: 6px 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                       color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
                       transition: all 0.25s ease; display: flex; align-items: center; justify-content: center; gap: 6px;
                       box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 14px rgba(59, 130, 246, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.3)';">
                <i class="fas fa-copy" style="font-size: 12px;"></i> Copy Coordinates
            </button>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; text-align: center;">
                <i class="fas fa-info-circle"></i> Click the button above to copy coordinates
            </div>
        </div>
    `);
    
    // ✅ OPEN POPUP AUTOMATICALLY AFTER DELAY
    setTimeout(() => {
        if (customerLocationMarker) {
            customerLocationMarker.openPopup();
        }
    }, 800);
    
    showToast('📍 Customer location loaded. Add NAP box near this pin.', 'info');
}

// ✅ FUNCTION TO REMOVE CUSTOMER LOCATION MARKER
function removeCustomerLocationMarker() {
    if (customerLocationMarker) {
        map.removeLayer(customerLocationMarker);
        customerLocationMarker = null;
    }
    if (customerLabelMarker) {
        map.removeLayer(customerLabelMarker);
        customerLabelMarker = null;
    }
    
    // ✅ HIDE CUSTOMER LEGEND ITEM
    const legendItem = document.getElementById('customerLegendItem');
    if (legendItem) {
        legendItem.style.display = 'none';
    }

                // ✅ HIDE CUSTOMER PIN BUTTON
    const customerPinBtn = document.getElementById('customerPinBtn');
    if (customerPinBtn) {
        customerPinBtn.style.display = 'none';
        customerPinBtn.style.visibility = 'hidden';
        customerPinBtn.dataset.lat = '';
        customerPinBtn.dataset.lng = '';
        console.log('✅ Customer Pin button hidden');
    }
    
    // I-clear din ang sessionStorage flags
    sessionStorage.removeItem('showCustomerLocationMarker');
    sessionStorage.removeItem('customerTargetLatitude');
    sessionStorage.removeItem('customerTargetLongitude');
    console.log('🗑️ Customer location marker removed');
}



// ================= COPY CUSTOMER COORDINATES =================
function copyCustomerCoordinates(lat, lng) {
    // Format as "latitude, longitude"
    const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(coordsText).then(() => {
        showToast('📍 Coordinates copied to clipboard!', 'success');
        
        // ✅ I-STORE SA SESSIONSTORAGE PARA MAGAMIT SA PASTE
        sessionStorage.setItem('copiedCoordinates', coordsText);
        sessionStorage.setItem('copiedLat', lat.toFixed(6));
        sessionStorage.setItem('copiedLng', lng.toFixed(6));
    }).catch(() => {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = coordsText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('📍 Coordinates copied to clipboard!', 'success');
        
        sessionStorage.setItem('copiedCoordinates', coordsText);
        sessionStorage.setItem('copiedLat', lat.toFixed(6));
        sessionStorage.setItem('copiedLng', lng.toFixed(6));
    });
}

// ================= AUTO-FILL COORDINATES ON PASTE =================
function setupCoordinatePasteAutoFill() {
    const latInput = document.getElementById('coordLatitude');
    const lngInput = document.getElementById('coordLongitude');
    
    if (!latInput || !lngInput) return;
    
    // ✅ LISTEN TO PASTE EVENT ON LATITUDE FIELD
    latInput.addEventListener('paste', function(e) {
        // Give time for the paste to complete
        setTimeout(() => {
            const pastedText = this.value.trim();
            
            // Check if pasted text contains both lat and lng (comma separated)
            const parts = pastedText.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // ✅ AUTO-FILL BOTH FIELDS
                    document.getElementById('coordLatitude').value = lat.toFixed(6);
                    document.getElementById('coordLongitude').value = lng.toFixed(6);
                    
                    // ✅ TRIGGER INPUT EVENT PARA MAG-UPDATE ANG UI
                    const inputEvent = new Event('input', { bubbles: true });
                    document.getElementById('coordLatitude').dispatchEvent(inputEvent);
                    document.getElementById('coordLongitude').dispatchEvent(inputEvent);
                    
                    // ✅ HIGHLIGHT FIELDS
                    document.getElementById('coordLatitude').style.borderColor = '#22c55e';
                    document.getElementById('coordLongitude').style.borderColor = '#22c55e';
                    document.getElementById('coordLatitude').style.background = '#f0fdf4';
                    document.getElementById('coordLongitude').style.background = '#f0fdf4';
                    
                    setTimeout(() => {
                        document.getElementById('coordLatitude').style.borderColor = '';
                        document.getElementById('coordLongitude').style.borderColor = '';
                        document.getElementById('coordLatitude').style.background = '';
                        document.getElementById('coordLongitude').style.background = '';
                    }, 2000);
                    
                    showToast('✅ Both coordinates auto-filled!', 'success');
                    
                    // ✅ AUTO-VALIDATE AFTER FILL
                    setTimeout(() => {
                        if (typeof validateCoordinates === 'function') {
                            validateCoordinates();
                        }
                    }, 300);
                }
            }
        }, 50);
    });
    
    // ✅ LISTEN TO PASTE EVENT ON LONGITUDE FIELD (same logic)
    lngInput.addEventListener('paste', function(e) {
        setTimeout(() => {
            const pastedText = this.value.trim();
            const parts = pastedText.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    document.getElementById('coordLatitude').value = lat.toFixed(6);
                    document.getElementById('coordLongitude').value = lng.toFixed(6);
                    
                    const inputEvent = new Event('input', { bubbles: true });
                    document.getElementById('coordLatitude').dispatchEvent(inputEvent);
                    document.getElementById('coordLongitude').dispatchEvent(inputEvent);
                    
                    document.getElementById('coordLatitude').style.borderColor = '#22c55e';
                    document.getElementById('coordLongitude').style.borderColor = '#22c55e';
                    document.getElementById('coordLatitude').style.background = '#f0fdf4';
                    document.getElementById('coordLongitude').style.background = '#f0fdf4';
                    
                    setTimeout(() => {
                        document.getElementById('coordLatitude').style.borderColor = '';
                        document.getElementById('coordLongitude').style.borderColor = '';
                        document.getElementById('coordLatitude').style.background = '';
                        document.getElementById('coordLongitude').style.background = '';
                    }, 2000);
                    
                    showToast('✅ Both coordinates auto-filled!', 'success');
                    
                    setTimeout(() => {
                        if (typeof validateCoordinates === 'function') {
                            validateCoordinates();
                        }
                    }, 300);
                }
            }
        }, 50);
    });
}


// Make functions global
window.copyCustomerCoordinates = copyCustomerCoordinates;
window.setupCoordinatePasteAutoFill = setupCoordinatePasteAutoFill;