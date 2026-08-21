// ==================== TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
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

const provinceEl = document.getElementById("province");
const cityEl = document.getElementById("city");
const barangayEl = document.getElementById("barangay");
const zipCodeEl = document.getElementById("zipCode");
const table = document.getElementById("areaTable");
const filterCity = document.getElementById("filterCity");
const searchInput = document.getElementById("searchArea");
const paginationContainer = document.getElementById("paginationControls");
const areaCountSpan = document.getElementById("areaCount");
const noDataDiv = document.getElementById("noData");
const addAreaBtn = document.getElementById("addAreaBtn");

let allAreas = [];
let currentPage = 1;
const rowsPerPage = 10;
let filteredAreas = [];

// =========================
// RESTRICTED CITIES LIST - UPPERCASE (para sa database)
// =========================
const restrictedCitiesList = [
    'SANTA CRUZ', 'PAGSANJAN', 'PILA', 'MAGDALENA'
];

// =========================
// ZIP CODE DATABASE FOR RESTRICTED CITIES (UPPERCASE keys)
// =========================
const zipCodeDatabase = {
    'SANTA CRUZ': 4009,
    'PAGSANJAN': 4008,
    'PILA': 4010,
    'MAGDALENA': 4007
};

// =========================
// FUNCTION TO GET ZIP CODE BY CITY NAME
// =========================
function getZipCodeByCity(cityName) {
    if (!cityName) return '';
    const upperCityName = cityName.trim().toUpperCase();
    
    if (zipCodeDatabase[upperCityName]) {
        return zipCodeDatabase[upperCityName].toString();
    }
    
    return '';
}

// =========================
// FUNCTION TO CONVERT TO PROPER CASE (para lang sa display)
// =========================
function toProperCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// =========================
// SESSION CACHE MANAGEMENT
// =========================
const CACHE_KEY = 'superadmin_areas_cache';
const CACHE_TIMESTAMP_KEY = 'superadmin_areas_timestamp';
const CACHE_DURATION = 5 * 60 * 1000;

function isCacheValid() {
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);
    return cacheAge < CACHE_DURATION;
}

function saveAreasToCache(areas) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(areas));
        sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
        console.log("Areas cached successfully");
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
}

function loadAreasFromCache() {
    try {
        const cachedAreas = sessionStorage.getItem(CACHE_KEY);
        if (cachedAreas) {
            const areas = JSON.parse(cachedAreas);
            console.log("Areas loaded from cache");
            return areas;
        }
    } catch (error) {
        console.error("Error loading from cache:", error);
    }
    return null;
}

function clearAreasCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Areas cache cleared");
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
        profileBtn.classList.toggle("active");
    });
    window.addEventListener("click", function(e) {
        if (!profileBtn.contains(e.target)) {
            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");
        }
    });
}

async function loadProfile() {
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "";
    } catch (err) { 
        console.error(err); 
    }
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

// ==================== HAMBURGER MENU ====================
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    
    if (!hamburgerBtn || !sidebar) return;
    
    hamburgerBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        if (overlay) overlay.classList.toggle("active");
    });
    
    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }
}
setupHamburgerMenu();

// =========================
// LOAD PROVINCES - SHOW ONLY LAGUNA (HARDCODED)
// =========================
async function loadProvinces() {
    provinceEl.innerHTML = '<option value="LAGUNA">LAGUNA</option>';
    console.log("Province set to Laguna only (hardcoded)");
    loadRestrictedCities();
}

// =========================
// LOAD RESTRICTED CITIES - ONLY 4 SELECTED CITIES
// =========================
function loadRestrictedCities() {
    cityEl.innerHTML = "<option value='' disabled selected>Select City/Municipality</option>";
    cityEl.disabled = false;
    
    const sortedCities = [...restrictedCitiesList].sort();
    sortedCities.forEach(city => {
        const zipCode = getZipCodeByCity(city);
        const displayCity = toProperCase(city);
        cityEl.innerHTML += `<option value="${city}" data-zip="${zipCode}">${displayCity}</option>`;
    });
    
    console.log(`Loaded ${restrictedCitiesList.length} restricted cities: ${restrictedCitiesList.join(', ')}`);
}

// =========================
// PAG PINILI ANG CITY, LOAD ANG MGA BARANGAY NA HINDI PA NAIAADD
// =========================
cityEl.addEventListener("change", async () => {
    const selectedCity = cityEl.value;
    const zipCode = getZipCodeByCity(selectedCity);
    
    if (!selectedCity) {
        barangayEl.innerHTML = '<option value="">Select City first</option>';
        barangayEl.disabled = true;
        zipCodeEl.value = '';
        return;
    }
    
    if (zipCode) {
        zipCodeEl.value = zipCode;
    } else {
        zipCodeEl.value = '';
    }
    
    barangayEl.innerHTML = '<option value="">Loading barangays...</option>';
    barangayEl.disabled = true;
    
    try {
        const response = await fetch(`/api/superadmin/missing-barangays/${selectedCity}`);
        const result = await response.json();
        
        if (response.ok && result.missing_barangays) {
            const missingBarangays = result.missing_barangays;
            
            if (missingBarangays.length === 0) {
                barangayEl.innerHTML = '<option value="">All barangays have been added</option>';
                barangayEl.disabled = true;
                showToast(`✓ Complete! All ${result.total_barangays} barangays have been added.`, "success");
            } else {
                barangayEl.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
                missingBarangays.forEach(barangay => {
                    const displayBarangay = toProperCase(barangay);
                    barangayEl.innerHTML += `<option value="${barangay}">${displayBarangay}</option>`;
                });
                barangayEl.disabled = false;
            }
        } else {
            barangayEl.innerHTML = '<option value="">Error loading barangays</option>';
            barangayEl.disabled = true;
            showToast(result.error || "Failed to load barangays", "error");
        }
    } catch (error) {
        console.error("Error loading missing barangays:", error);
        barangayEl.innerHTML = '<option value="">Error loading barangays</option>';
        barangayEl.disabled = true;
        showToast("Failed to load barangays", "error");
    }
});

// =========================
// SHOW/HIDE LOADING SPINNER ON BUTTON
// =========================
function showButtonLoading(button, isLoading, originalText = null) {
    if (isLoading) {
        if (!button.getAttribute('data-original-text')) {
            button.setAttribute('data-original-text', button.innerHTML);
        }
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
    }
}

// =========================
// SHOW TABLE LOADING STATE
// =========================
function showTableLoading() {
    if (!table) return;
    table.innerHTML = `
        <tr class="loading-row">
            <td colspan="4">
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Loading areas...</p>
                </div>
                </td>
            </tr>
    `;
    if (noDataDiv) noDataDiv.style.display = "none";
    if (paginationContainer) paginationContainer.innerHTML = "";
}

// =========================
// CHECK IF AREA EXISTS (Frontend validation)
// =========================
function isAreaDuplicate(province, city, barangay) {
    return allAreas.some(area => 
        area.province.toUpperCase() === province.toUpperCase() && 
        area.city.toUpperCase() === city.toUpperCase() && 
        area.barangay.toUpperCase() === barangay.toUpperCase()
    );
}

// =========================
// ADD AREA (WITH ZIP CODE)
// =========================
if (addAreaBtn) {
    addAreaBtn.addEventListener("click", async () => {
        const province = "LAGUNA";
        const city = cityEl.value;
        const barangay = barangayEl.value.trim();
        const zipCode = zipCodeEl.value.trim();

        if (!province) {
            showToast("Please select a province!", "error");
            return;
        }
        
        if (!city || city === "") {
            showToast("Please select a city/municipality!", "error");
            return;
        }
        
        if (!restrictedCitiesList.includes(city)) {
            showToast(`Invalid city selection. Only ${restrictedCitiesList.map(c => toProperCase(c)).join(', ')} are allowed.`, "error");
            return;
        }
        
        if (!barangay) {
            showToast("Please select a barangay!", "error");
            return;
        }

        if (!zipCode) {
            showToast("Please enter a ZIP code!", "error");
            return;
        }

        if (!/^\d{4}$/.test(zipCode)) {
            showToast("Please enter a valid 4-digit ZIP code!", "error");
            return;
        }

        const barangayUpper = barangay.toUpperCase();

        if (isAreaDuplicate(province, city, barangayUpper)) {
            showToast(`"${toProperCase(barangay)}" already exists in ${toProperCase(city)}!`, "warning");
            return;
        }

        showButtonLoading(addAreaBtn, true);

        try {
            const response = await fetch("/api/superadmin/area", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    province, 
                    city, 
                    barangay: barangayUpper,
                    zip_code: zipCode
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                showToast(`✓ "${toProperCase(barangay)}" added successfully to ${toProperCase(city)}!`, "success");
                
                clearAreasCache();
                barangayEl.value = "";
                await loadAreas();
                currentPage = 1;
                applyFilters();
                cityEl.dispatchEvent(new Event("change"));
            } else if (result.duplicate) {
                showToast(`"${toProperCase(barangay)}" already exists in ${toProperCase(city)}!`, "warning");
            } else {
                showToast(result.error || "Failed to add area", "error");
            }
        } catch (error) {
            console.error("Error adding area:", error);
            showToast("Error adding area. Please try again.", "error");
        } finally {
            showButtonLoading(addAreaBtn, false);
        }
    });
}

// =========================
// LOAD AREAS (WITH CACHE) - FROM MYSQL
// =========================
async function loadAreas(forceRefresh = false) {
    if (!forceRefresh && isCacheValid()) {
        const cachedAreas = loadAreasFromCache();
        if (cachedAreas && cachedAreas.length > 0) {
            allAreas = cachedAreas;
            
            allAreas.sort((a, b) => {
                if (a.province !== b.province) {
                    return a.province.localeCompare(b.province);
                }
                if (a.city !== b.city) {
                    return a.city.localeCompare(b.city);
                }
                return a.barangay.localeCompare(b.barangay);
            });
            
            updateAreaCount();
            populateFilter();
            applyFilters();
            console.log("Areas loaded from cache, no API call needed");
            return;
        }
    }
    
    try {
        showTableLoading();
        
        const res = await fetch("/api/superadmin/areas");
        let areas = await res.json();

        const restrictedCitiesUpper = restrictedCitiesList.map(c => c.toUpperCase());
        
        allAreas = areas
            .filter(area => {
                const cityUpper = (area.city || '').toUpperCase();
                return restrictedCitiesUpper.includes(cityUpper);
            })
            .map(area => ({
                id: area.id,
                province: area.province || '',
                city: area.city || '',
                barangay: area.barangay || '',
                zip: area.zip
            }));

        allAreas.sort((a, b) => {
            if (a.province !== b.province) {
                return a.province.localeCompare(b.province);
            }
            if (a.city !== b.city) {
                return a.city.localeCompare(b.city);
            }
            return a.barangay.localeCompare(b.barangay);
        });

        saveAreasToCache(allAreas);
        
        updateAreaCount();
        populateFilter();
        applyFilters();
        console.log("Areas loaded from MySQL API and cached");
    } catch (error) {
        console.error("Error loading areas:", error);
        showToast("Error loading areas", "error");
        if (table) {
            table.innerHTML = `
                <tr class="loading-row">
                    <td colspan="4">
                        <div class="loading-container">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626;"></i>
                            <p>Failed to load areas. Please refresh the page.</p>
                        </div>
                        </td>
                    </tr>
            `;
        }
    }
}

// =========================
// APPLY FILTERS AND UPDATE DISPLAY
// =========================
function applyFilters() {
    if (!filterCity) return;
    
    const cityFilter = filterCity.value;
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    filteredAreas = allAreas.filter(area => {
        if (cityFilter !== "all" && area.city.toUpperCase() !== cityFilter.toUpperCase()) {
            return false;
        }
        if (searchTerm && !area.province.toLowerCase().includes(searchTerm) &&
            !area.city.toLowerCase().includes(searchTerm) &&
            !area.barangay.toLowerCase().includes(searchTerm)) {
            return false;
        }
        return true;
    });

    currentPage = 1;
    renderTableWithPagination();
}

// =========================
// RENDER TABLE WITH PAGINATION
// =========================
function renderTableWithPagination() {
    if (!table) return;
    
    const totalItems = filteredAreas.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (totalItems === 0) {
        table.innerHTML = "";
        if (noDataDiv) noDataDiv.style.display = "block";
        if (paginationContainer) paginationContainer.innerHTML = "";
        return;
    }

    if (noDataDiv) noDataDiv.style.display = "none";

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedAreas = filteredAreas.slice(startIndex, endIndex);

    table.innerHTML = "";
    paginatedAreas.forEach(area => {
        const properProvince = toProperCase(area.province);
        const properCity = toProperCase(area.city);
        const properBarangay = toProperCase(area.barangay);
        
        table.innerHTML += `
            <tr>
                <td>${escapeHtml(properProvince)}</td>
                <td>${escapeHtml(properCity)}</td>
                <td>${escapeHtml(properBarangay)}</td>
                <td>
                    <button onclick="deleteArea('${area.id}')" class="btn-delete" id="deleteBtn-${area.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    renderPaginationControls(totalPages, totalItems);
}

// =========================
// RENDER PAGINATION CONTROLS
// =========================
function renderPaginationControls(totalPages, totalItems) {
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = `<div class="pagination-info">Total: ${totalItems} entries</div>`;
        return;
    }

    let paginationHtml = `<button class="pagination-btn" id="firstPageBtn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Prev</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="lastPageBtn" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
    paginationHtml += `<div class="pagination-info">${totalItems} entries</div>`;

    paginationContainer.innerHTML = paginationHtml;

    const firstPageBtn = document.getElementById("firstPageBtn");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const lastPageBtn = document.getElementById("lastPageBtn");
    
    if (firstPageBtn) {
        firstPageBtn.addEventListener("click", () => {
            currentPage = 1;
            renderTableWithPagination();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderTableWithPagination();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTableWithPagination();
            }
        });
    }

    if (lastPageBtn) {
        lastPageBtn.addEventListener("click", () => {
            currentPage = totalPages;
            renderTableWithPagination();
        });
    }

    document.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            currentPage = parseInt(btn.dataset.page);
            renderTableWithPagination();
        });
    });
}

// =========================
// DELETE AREA
// =========================
window.deleteArea = async function(id) {
    const deleteBtn = document.getElementById(`deleteBtn-${id}`);
    if (!deleteBtn) return;
    
    if (!confirm("Delete this area?")) return;

    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`/api/superadmin/area/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Area deleted successfully");
            clearAreasCache();
            await loadAreas();
            currentPage = 1;
            applyFilters();
        } else {
            const result = await response.json();
            showToast(result.error || "Failed to delete area", "error");
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error("Error deleting area:", error);
        showToast("Error deleting area", "error");
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    }
};

// =========================
// POPULATE FILTER DROPDOWN
// =========================
function populateFilter() {
    if (!filterCity) return;
    
    const cities = [...new Set(allAreas.map(a => a.city))];
    
    filterCity.innerHTML = `<option value="all">All Cities/Municipalities</option>`;
    cities.sort().forEach(c => {
        const displayCity = toProperCase(c);
        filterCity.innerHTML += `<option value="${c}">${displayCity}</option>`;
    });
}

// =========================
// FILTER EVENT LISTENERS
// =========================
if (filterCity) {
    filterCity.addEventListener("change", () => {
        applyFilters();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        applyFilters();
    });
}

// =========================
// UPDATE AREA COUNT
// =========================
function updateAreaCount() {
    if (areaCountSpan) {
        areaCountSpan.textContent = allAreas.length;
    }
}

// =========================
// UTILITY: ESCAPE HTML
// =========================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

// =========================
// PAGE VISIBILITY API
// =========================
let isPageVisible = true;

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isPageVisible) {
        console.log("Page became visible, using cached data");
    }
    isPageVisible = !document.hidden;
});

// =========================
// INITIALIZATION
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    const isValid = await checkSession();
    if (!isValid) return;

    loadProfile();
    loadProvinces();
    loadAreas();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

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