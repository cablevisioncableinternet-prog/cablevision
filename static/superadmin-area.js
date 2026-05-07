// ==================== SESSION MANAGEMENT ====================
// Initialize session manager FIRST
if (window.SessionManager) {
    window.SessionManager.init();
} else {
    console.error("SessionManager not loaded!");
    // Fallback: redirect to login if no session
    if (!localStorage.getItem('userType') || !sessionStorage.getItem('sessionToken')) {
        window.location.replace('/');
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

// =========================
// PROFILE DROPDOWN & LOGOUT
// =========================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });

    window.addEventListener("click", (e) => {
        if (!profileBtn.contains(e.target)) {
            profileMenu.classList.remove("show");
        }
    });
}

async function loadProfile() {
    try {
        const res = await fetch("/api/superadmin/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
    } catch (err) {
        console.error(err);
    }
}
loadProfile();

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    const logoutCloseBtn = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logoutModal.style.display = "block";
    });

    if (logoutCloseBtn) {
        logoutCloseBtn.addEventListener("click", () => {
            logoutModal.style.display = "none";
        });
    }

    if (cancelLogout) {
        cancelLogout.addEventListener("click", () => {
            logoutModal.style.display = "none";
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            if (window.SessionManager) {
                window.SessionManager.logout('You have been logged out successfully.');
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/");
            }
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
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
    cityEl.innerHTML = "<option value=''>Select City/Municipality</option>";
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
                barangayEl.innerHTML = '<option value="">Select Barangay</option>';
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

// =========================
// TOAST NOTIFICATION
// =========================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.classList.remove("error", "warning");
    
    if (type === "error") {
        toast.classList.add("error");
    } else if (type === "warning") {
        toast.classList.add("warning");
    }
    
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
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
document.addEventListener("DOMContentLoaded", () => {
    loadProvinces();
    loadAreas();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

