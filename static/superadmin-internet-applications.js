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

const paginationContainer = document.getElementById("paginationControls");
const rejectedPaginationContainer = document.getElementById("rejectedPaginationControls");

// ==================== PAGINATION VARIABLES ====================
let currentPage = 1;
let currentRejectedPage = 1;
const rowsPerPage = 10;
const rejectedRowsPerPage = 10;

// ==================== CACHE SYSTEM ====================
function setCache(key, data, ttlMinutes = 5) {
    const now = new Date();
    const item = { data, expiry: now.getTime() + ttlMinutes * 60 * 1000 };
    sessionStorage.setItem(key, JSON.stringify(item));
}

function getCache(key) {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
    }

    return item.data;
}

function clearCache() {
    sessionStorage.removeItem(CACHE_KEY_APPS);
    sessionStorage.removeItem(CACHE_KEY_REQ);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("All caches cleared");
}

// ==================== CACHE KEYS ====================
const CACHE_KEY_APPS = "superadmin_applications_cache";
const CACHE_KEY_REQ = "superadmin_requests_cache";
const CACHE_TIMESTAMP_KEY = "superadmin_applications_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ==================== SORTING FUNCTIONS ====================
let activeDateSort = "oldest";
let rejectedDateSort = "oldest";

function sortActiveApplications(applications) {
    const statusOrder = {
        'Request Sent': 1,
        'Pending': 2,
        'Approved': 3,
        'Rejected': 4
    };
    
    return [...applications].sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        const dateA = a.date_submitted ? new Date(a.date_submitted) : new Date(0);
        const dateB = b.date_submitted ? new Date(b.date_submitted) : new Date(0);
        
        if (activeDateSort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
}

function sortRejectedApplications(applications) {
    return [...applications].sort((a, b) => {
        const dateA = a.date_submitted ? new Date(a.date_submitted) : new Date(0);
        const dateB = b.date_submitted ? new Date(b.date_submitted) : new Date(0);
        
        if (rejectedDateSort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
}

// ==================== MANUAL REFRESH DETECTION ====================
let isManualRefresh = false;

function detectPageRefresh() {
    if (performance && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
            if (navEntry.type === 'reload') {
                console.log("Page was manually reloaded (Ctrl+R or F5)");
                isManualRefresh = true;
                clearCache();
            }
        }
    }
    
    if (performance && performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            console.log("Page was reloaded via legacy API");
            isManualRefresh = true;
            clearCache();
        }
    }
}

function trackPageLoads() {
    const lastLoadTime = sessionStorage.getItem('superadmin_last_load_time');
    const now = new Date().getTime();
    
    if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
        console.log("Quick successive load detected - likely a refresh");
        isManualRefresh = true;
        clearCache();
    }
    
    sessionStorage.setItem('superadmin_last_load_time', now.toString());
}

function isCacheValid() {
    if (isManualRefresh) {
        console.log("Manual refresh detected - skipping cache");
        return false;
    }
    
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    
    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);
    
    return cacheAge < CACHE_DURATION;
}

function updateCacheTimestamp() {
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
}

// ==================== CHECK FOR ADMIN REQUEST FLAG ====================
function checkForAdminRequestFlag() {
    const shouldRefresh = sessionStorage.getItem('refresh_superadmin_applications');
    if (shouldRefresh === 'true') {
        console.log("Admin request flag detected - admin sent a request");
        sessionStorage.removeItem('refresh_superadmin_applications');
        clearCache();
        isManualRefresh = true;
        return true;
    }
    return false;
}

// ==================== GLOBAL DATA ====================
let applicationsData = [];
let filteredActiveData = [];
let filteredRejectedData = [];
let isFetching = false;
let autoRefreshInterval = null;

// ==================== UI CONTROL ====================
function showLoading() {
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#applicationsTable");
    const rejectedNoData = document.getElementById("noRejectedData");
    
    if (loadingRow) loadingRow.style.display = "table-row";
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "none";
    if (rejectedNoData) rejectedNoData.style.display = "none";
    if (paginationContainer) paginationContainer.style.display = "none";
    if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
}

// ==================== PAGINATION FUNCTIONS FOR ACTIVE TABLE ====================
function renderPaginationControls(totalPages, totalItems) {
    if (!paginationContainer) return;
    
    if (totalItems === 0) {
        paginationContainer.style.display = "none";
        return;
    }
    
    paginationContainer.style.display = "flex";
    
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
    paginationHtml += `<div class="pagination-info"><i class="fas fa-database"></i> Showing ${((currentPage - 1) * rowsPerPage) + 1} - ${Math.min(currentPage * rowsPerPage, totalItems)} of ${totalItems} entries</div>`;

    paginationContainer.innerHTML = paginationHtml;

    const firstPageBtn = document.getElementById("firstPageBtn");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const lastPageBtn = document.getElementById("lastPageBtn");
    
    if (firstPageBtn) firstPageBtn.addEventListener("click", () => { if (currentPage !== 1) { currentPage = 1; renderCurrentPage(); } });
    if (prevPageBtn) prevPageBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderCurrentPage(); } });
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderCurrentPage(); } });
    if (lastPageBtn) lastPageBtn.addEventListener("click", () => { if (currentPage !== totalPages) { currentPage = totalPages; renderCurrentPage(); } });

    document.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.dataset.page);
            renderCurrentPage();
        });
    });
}

// ==================== PAGINATION FUNCTIONS FOR REJECTED TABLE ====================
function renderRejectedPaginationControls(totalPages, totalItems) {
    if (!rejectedPaginationContainer) return;
    
    if (totalItems === 0) {
        rejectedPaginationContainer.style.display = "none";
        return;
    }
    
    rejectedPaginationContainer.style.display = "flex";
    
    let paginationHtml = `<button class="pagination-btn" id="rejectedFirstPageBtn" ${currentRejectedPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="rejectedPrevPageBtn" ${currentRejectedPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Prev</button>`;

    let startPage = Math.max(1, currentRejectedPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-rejected-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-btn ${i === currentRejectedPage ? 'active' : ''}" data-rejected-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-rejected-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" id="rejectedNextPageBtn" ${currentRejectedPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="rejectedLastPageBtn" ${currentRejectedPage === totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
    paginationHtml += `<div class="pagination-info"><i class="fas fa-database"></i> Showing ${((currentRejectedPage - 1) * rejectedRowsPerPage) + 1} - ${Math.min(currentRejectedPage * rejectedRowsPerPage, totalItems)} of ${totalItems} entries</div>`;

    rejectedPaginationContainer.innerHTML = paginationHtml;

    const firstPageBtn = document.getElementById("rejectedFirstPageBtn");
    const prevPageBtn = document.getElementById("rejectedPrevPageBtn");
    const nextPageBtn = document.getElementById("rejectedNextPageBtn");
    const lastPageBtn = document.getElementById("rejectedLastPageBtn");
    
    if (firstPageBtn) firstPageBtn.addEventListener("click", () => { if (currentRejectedPage !== 1) { currentRejectedPage = 1; renderRejectedPage(); } });
    if (prevPageBtn) prevPageBtn.addEventListener("click", () => { if (currentRejectedPage > 1) { currentRejectedPage--; renderRejectedPage(); } });
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => { if (currentRejectedPage < totalPages) { currentRejectedPage++; renderRejectedPage(); } });
    if (lastPageBtn) lastPageBtn.addEventListener("click", () => { if (currentRejectedPage !== totalPages) { currentRejectedPage = totalPages; renderRejectedPage(); } });

    document.querySelectorAll(".pagination-btn[data-rejected-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRejectedPage = parseInt(btn.dataset.rejectedPage);
            renderRejectedPage();
        });
    });
}

function renderCurrentPage() {
    const totalItems = filteredActiveData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (totalItems === 0) {
        renderApplications([]);
        if (paginationContainer) paginationContainer.style.display = "none";
        return;
    }
    
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredActiveData.slice(startIndex, endIndex);
    
    renderApplications(pageData);
    renderPaginationControls(totalPages, totalItems);
}

function renderRejectedPage() {
    const totalItems = filteredRejectedData.length;
    const totalPages = Math.ceil(totalItems / rejectedRowsPerPage);
    
    if (totalItems === 0) {
        renderRejectedApplications([]);
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        return;
    }
    
    if (currentRejectedPage > totalPages) {
        currentRejectedPage = totalPages;
    }
    
    const startIndex = (currentRejectedPage - 1) * rejectedRowsPerPage;
    const endIndex = startIndex + rejectedRowsPerPage;
    const pageData = filteredRejectedData.slice(startIndex, endIndex);
    
    renderRejectedApplications(pageData);
    renderRejectedPaginationControls(totalPages, totalItems);
}

// ==================== DELETE MODAL ====================
const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");

let deleteId = null;

function openDeleteModal(id) {
    deleteId = id;
    if (deleteModal) {
        deleteModal.style.display = "block";
    }
}

function closeDeleteModalFunc() {
    if (deleteModal) {
        deleteModal.style.display = "none";
    }
    deleteId = null;
}

if (closeDeleteModal) closeDeleteModal.onclick = closeDeleteModalFunc;
if (cancelDeleteBtn) cancelDeleteBtn.onclick = closeDeleteModalFunc;
window.onclick = e => { if (e.target === deleteModal) closeDeleteModalFunc(); };

if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        if (!deleteId) return;
        
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting...";
        
        try {
            const response = await fetch(`/api/superadmin/application/${deleteId}`, {
                method: "DELETE"
            });
            
            if (!response.ok) {
                throw new Error("Delete failed");
            }
            
            closeDeleteModalFunc();
            clearCache();
            await fetchApplications(true);
            showToast("Application deleted successfully", "success");
            
        } catch (err) {
            console.error("Delete error:", err);
            showToast("Error deleting application", "error");
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Delete";
        }
    };
}

// ==================== RENDER ACTIVE APPLICATIONS ====================
function renderApplications(data) {
    const tbody = document.getElementById("applicationsBody");
    const mainTable = document.getElementById("applicationsTable");
    const noData = document.getElementById("noData");

    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        if (mainTable) mainTable.style.display = "none";
        if (noData) noData.style.display = "block";
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
        return;
    }

    let activeCount = 0;

    data.forEach(app => {
        const status = app.status || "Pending";
        
        let statusBadgeClass = "";
        if (status === "Pending") statusBadgeClass = "status-pending";
        else if (status === "Approved") statusBadgeClass = "status-approved";
        else if (status === "Request Sent") statusBadgeClass = "status-request-sent";
        else if (status === "Rejected") statusBadgeClass = "status-rejected";

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}">View</button>
        </div>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${app.first_name || ""} ${app.last_name || ""}</td>
            <td>${app.email || ""}</td>
            <td>${app.date_submitted || "N/A"}</td>
            <td>${app.barangay || "N/A"}</td>
            <td>${app.city || "N/A"}</td>
            <td>${app.birthdate || "N/A"}</td>
            <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
        activeCount++;
    });

    const appCountSpan = document.getElementById("applicationCount");
    if (appCountSpan) appCountSpan.textContent = activeCount;

    if (mainTable) {
        if (activeCount === 0) {
            mainTable.style.display = "none";
        } else {
            mainTable.style.display = "table";
        }
    }

    if (activeCount === 0) {
        if (noData) noData.style.display = "block";
    } else {
        if (noData) noData.style.display = "none";
    }
    
    attachEvents();
}

// ==================== RENDER REJECTED APPLICATIONS ====================
function renderRejectedApplications(data) {
    const rejectedBody = document.getElementById("rejectedApplicationsBody");
    const rejectedCard = document.getElementById("rejectedCard");
    const rejectedCountSpan = document.getElementById("rejectedCount");

    if (!rejectedBody) return;
    
    rejectedBody.innerHTML = "";

    if (!data || data.length === 0) {
        if (rejectedCard) rejectedCard.style.display = "none";
        if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
        return;
    }
    
    if (rejectedCard) rejectedCard.style.display = "block";
    if (rejectedCountSpan) rejectedCountSpan.textContent = data.length;
    const rejectedTable = document.getElementById("rejectedApplicationsTable");
    if (rejectedTable) rejectedTable.style.display = "table";

    data.forEach(app => {
        const status = app.status || "Rejected";
        let statusBadgeClass = "status-rejected";

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}">View</button>
            <button class="btn-delete" data-id="${app.id}">Delete</button>
        </div>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${app.first_name || ""} ${app.last_name || ""}</td>
            <td>${app.email || ""}</td>
            <td>${app.date_submitted || "N/A"}</td>
            <td>${app.barangay || "N/A"}</td>
            <td>${app.city || "N/A"}</td>
            <td>${app.birthdate || "N/A"}</td>
            <td>${app.rejection_reason || "N/A"}</td>
            <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        rejectedBody.appendChild(row);
    });
    
    attachEvents();
}

// ==================== ATTACH BUTTON EVENTS ====================
function attachEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.onclick = () => window.location.href = `/superadmin/view-application/${btn.dataset.id}`;
    });
    
    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.onclick = () => openDeleteModal(btn.dataset.id);
    });
}

// ==================== SEARCH & FILTER FUNCTIONS ====================
let activeSearchInput, activeStatusFilter, activeDateSortFilter;
let rejectedSearchInput, rejectedDateSortFilter;

function setupSearchAndFilter() {
    // Active card elements
    activeSearchInput = document.getElementById("activeSearchInput");
    activeStatusFilter = document.getElementById("activeStatusFilter");
    activeDateSortFilter = document.getElementById("activeDateSortFilter");
    
    // Rejected card elements
    rejectedSearchInput = document.getElementById("rejectedSearchInput");
    rejectedDateSortFilter = document.getElementById("rejectedDateSortFilter");
    
    // Set initial sort values
    if (activeDateSortFilter) {
        activeDateSort = activeDateSortFilter.value;
        activeDateSortFilter.addEventListener("change", () => {
            activeDateSort = activeDateSortFilter.value;
            applyActiveFilters();
        });
    }
    
    if (rejectedDateSortFilter) {
        rejectedDateSort = rejectedDateSortFilter.value;
        rejectedDateSortFilter.addEventListener("change", () => {
            rejectedDateSort = rejectedDateSortFilter.value;
            applyRejectedFilters();
        });
    }
    
    function applyActiveFilters() {
        const searchTerm = activeSearchInput ? activeSearchInput.value.toLowerCase().trim() : "";
        const statusValue = activeStatusFilter ? activeStatusFilter.value : "all";
        
        let filtered = applicationsData.filter(app => app.status !== "Rejected");
        
        if (searchTerm) {
            filtered = filtered.filter(app => 
                (app.application_number && String(app.application_number).toLowerCase().includes(searchTerm)) ||
                (app.first_name && app.first_name.toLowerCase().includes(searchTerm)) ||
                (app.last_name && app.last_name.toLowerCase().includes(searchTerm)) ||
                (`${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm)) ||
                (app.email && app.email.toLowerCase().includes(searchTerm))
            );
        }
        
        if (statusValue !== "all") {
            filtered = filtered.filter(app => 
                app.status && app.status.toLowerCase() === statusValue.toLowerCase()
            );
        }
        
        filteredActiveData = sortActiveApplications(filtered);
        
        currentPage = 1;
        
        const totalItems = filteredActiveData.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        
        if (totalItems === 0) {
            renderApplications([]);
            if (paginationContainer) paginationContainer.style.display = "none";
        } else {
            const startIndex = 0;
            const endIndex = Math.min(rowsPerPage, totalItems);
            const pageData = filteredActiveData.slice(startIndex, endIndex);
            renderApplications(pageData);
            renderPaginationControls(totalPages, totalItems);
        }
    }
    
    function applyRejectedFilters() {
        const searchTerm = rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "";
        
        let filtered = applicationsData.filter(app => app.status === "Rejected");
        
        if (searchTerm) {
            filtered = filtered.filter(app => 
                (app.application_number && String(app.application_number).toLowerCase().includes(searchTerm)) ||
                (app.first_name && app.first_name.toLowerCase().includes(searchTerm)) ||
                (app.last_name && app.last_name.toLowerCase().includes(searchTerm)) ||
                (`${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm)) ||
                (app.email && app.email.toLowerCase().includes(searchTerm))
            );
        }
        
        filteredRejectedData = sortRejectedApplications(filtered);
        
        currentRejectedPage = 1;
        
        const totalItems = filteredRejectedData.length;
        const totalPages = Math.ceil(totalItems / rejectedRowsPerPage);
        
        if (totalItems === 0) {
            renderRejectedApplications([]);
            if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        } else {
            const startIndex = 0;
            const endIndex = Math.min(rejectedRowsPerPage, totalItems);
            const pageData = filteredRejectedData.slice(startIndex, endIndex);
            renderRejectedApplications(pageData);
            renderRejectedPaginationControls(totalPages, totalItems);
        }
    }
    
    // Active card event listeners
    if (activeSearchInput) activeSearchInput.addEventListener("input", applyActiveFilters);
    if (activeStatusFilter) activeStatusFilter.addEventListener("change", applyActiveFilters);
    
    // Rejected card event listeners
    if (rejectedSearchInput) rejectedSearchInput.addEventListener("input", applyRejectedFilters);
    
    // Clear buttons
    const activeClearBtn = document.getElementById("activeClearSearch");
    if (activeClearBtn && activeSearchInput) {
        activeClearBtn.addEventListener("click", () => {
            activeSearchInput.value = "";
            applyActiveFilters();
            activeClearBtn.style.display = "none";
        });
        
        activeSearchInput.addEventListener("input", () => {
            activeClearBtn.style.display = activeSearchInput.value ? "flex" : "none";
        });
    }
    
    const rejectedClearBtn = document.getElementById("rejectedClearSearch");
    if (rejectedClearBtn && rejectedSearchInput) {
        rejectedClearBtn.addEventListener("click", () => {
            rejectedSearchInput.value = "";
            applyRejectedFilters();
            rejectedClearBtn.style.display = "none";
        });
        
        rejectedSearchInput.addEventListener("input", () => {
            rejectedClearBtn.style.display = rejectedSearchInput.value ? "flex" : "none";
        });
    }
    
    // Initial loads
    applyActiveFilters();
    applyRejectedFilters();
}

// ==================== FETCH WITH CACHE & AUTO-UPDATE ====================
async function fetchApplications(forceRefresh = false) {
    if (isFetching && !forceRefresh) return;
    isFetching = true;

    if (forceRefresh) showLoading();

    const cachedApps = getCache(CACHE_KEY_APPS);
    
    if (!forceRefresh && !isManualRefresh && cachedApps) {
        applicationsData = cachedApps;
        setupSearchAndFilter();
        console.log("Applications loaded from cache");
        isFetching = false;
        return;
    }

    try {
        const appsRes = await fetch(`/api/superadmin/applications?limit=100`);
        let appsData = await appsRes.json();
        
        applicationsData = appsData;
        setCache(CACHE_KEY_APPS, appsData, 5);
        updateCacheTimestamp();
        setupSearchAndFilter();
        
        console.log("Applications loaded from API");
        isManualRefresh = false;
        
    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        isFetching = false;
    }
}

// ==================== CHECK FOR CACHE-BUSTING PARAMETER ====================
function checkForCacheBusting() {
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get('t');
    
    if (timestamp) {
        console.log("Cache-busting parameter detected, forcing refresh");
        clearCache();
        isManualRefresh = true;
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        return true;
    }
    return false;
}

// ==================== KEYBOARD SHORTCUT DETECTION ====================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearCache();
    }
});

// ==================== OPTIMIZED PAGE VISIBILITY & FOCUS HANDLERS ====================
let lastVisibilityCheck = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastVisibilityCheck > 30000 && !isCacheValid()) {
            console.log("Page became visible and cache expired, fetching fresh data");
            clearCache();
            fetchApplications(true);
            lastVisibilityCheck = now;
        }
    }
});

window.addEventListener('focus', function() {
    console.log("Window focused");
    if (!isCacheValid()) {
        console.log("Cache expired, fetching fresh data");
        clearCache();
        fetchApplications(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log("Page loaded from bfcache");
        if (!isCacheValid()) {
            console.log("Cache expired, refreshing data");
            clearCache();
            isManualRefresh = true;
            fetchApplications(true);
        }
    }
});

// ==================== PROFILE & LOGOUT ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => { 
        e.stopPropagation(); 
        profileMenu.classList.toggle("show"); 
    });
    window.addEventListener("click", e => { 
        if (!profileBtn.contains(e.target)) profileMenu.classList.remove("show"); 
    });
}

async function loadProfile() {
    try {
        const session = window.SessionManager ? window.SessionManager.getSession() : null;
        const username = (session && session.username) || localStorage.getItem('adminUsername') || 'super admin';
        
        const res = await fetch(`/api/superadmin/profile?username=${encodeURIComponent(username)}`);
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "Profile";
    } catch (err) { 
        console.error(err); 
    }
}
loadProfile();

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    logoutBtn.onclick = e => { 
        e.preventDefault(); 
        logoutModal.style.display = "block"; 
    };
    const closeBtnLogout = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");
    
    if (closeBtnLogout) closeBtnLogout.onclick = () => logoutModal.style.display = "none";
    if (cancelLogout) cancelLogout.onclick = () => logoutModal.style.display = "none";
    
    if (confirmLogout) {
        confirmLogout.onclick = () => {
            if (window.SessionManager) {
                window.SessionManager.logout('You have been logged out successfully.');
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/");
            }
        };
    }
    
    window.onclick = e => { 
        if (e.target === logoutModal) logoutModal.style.display = "none"; 
    };
}

// ==================== REJECT MODAL ====================
const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");
const rejectCustomReason = document.getElementById("rejectCustomReason");

let rejectId = null;

function openRejectModal(id) {
    rejectId = id;
    if (rejectModal) rejectModal.style.display = "block";
}

if (document.getElementById("closeRejectModal")) {
    document.getElementById("closeRejectModal").onclick = () => rejectModal.style.display = "none";
}
if (document.getElementById("cancelRejectBtn")) {
    document.getElementById("cancelRejectBtn").onclick = () => rejectModal.style.display = "none";
}

window.addEventListener("click", e => {
    if (e.target === rejectModal) rejectModal.style.display = "none";
});

if (rejectReason) {
    rejectReason.addEventListener("change", () => {
        if (rejectReason.value === "Other") {
            rejectCustomReason.style.display = "block";
        } else {
            rejectCustomReason.style.display = "none";
        }
    });
}

if (document.getElementById("confirmRejectBtn")) {
    document.getElementById("confirmRejectBtn").onclick = async () => {
        let reason = rejectReason.value;

        if (!reason) {
            alert("Please select a reason!");
            return;
        }

        if (reason === "Other") {
            reason = rejectCustomReason.value.trim();
            if (!reason) {
                alert("Please enter custom reason!");
                return;
            }
        }

        try {
            const res = await fetch(`/api/superadmin/application/${rejectId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "Rejected",
                    reason: reason
                })
            });

            if (!res.ok) throw new Error("Reject failed");

            rejectModal.style.display = "none";
            clearCache();
            await fetchApplications(true);
            showToast("Application rejected successfully", "success");

        } catch (err) {
            console.error(err);
            alert("Error rejecting application");
        }
    };
}

// ==================== MANUAL REFRESH FUNCTION ====================
window.refreshApplications = function() {
    clearCache();
    isManualRefresh = true;
    fetchApplications(true);
    showToast("Refreshing applications...", "success");
};

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = "success") {
    let toast = document.getElementById("customToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "customToast";
        toast.className = "custom-toast";
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-check-circle"></i>
                <span id="toastMessage">Success!</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        if (!document.querySelector("#toastStyles")) {
            const style = document.createElement("style");
            style.id = "toastStyles";
            style.textContent = `
                .custom-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
                    color: white;
                    padding: 0;
                    border-radius: 12px;
                    z-index: 10000;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
                    animation: slideInRight 0.3s ease;
                    display: none;
                    min-width: 300px;
                    overflow: hidden;
                }
                .custom-toast.error {
                    background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%);
                }
                .custom-toast.warning {
                    background: linear-gradient(135deg, #e69600 0%, #ffb74d 100%);
                }
                .custom-toast .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                }
                .custom-toast .toast-content i {
                    font-size: 20px;
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    const toastMessage = toast.querySelector("#toastMessage");
    toastMessage.textContent = message;
    
    toast.classList.remove("error", "warning");
    if (type === "error") toast.classList.add("error");
    else if (type === "warning") toast.classList.add("warning");
    
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
}

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (hamburger && sidebar) {
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    hamburger.addEventListener('click', toggleSidebar);
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
    detectPageRefresh();
    trackPageLoads();
    
    const hasCacheBuster = checkForCacheBusting();
    const hasAdminRequestFlag = checkForAdminRequestFlag();
    
    if (hasCacheBuster || hasAdminRequestFlag) {
        console.log("Change detected, fetching fresh data");
        await fetchApplications(true);
    } else {
        await fetchApplications(false);
    }
    
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.hidden) {
            console.log("Auto-refresh - fetching updates");
            clearCache();
            fetchApplications(true);
        }
    }, 300000);
    
    lastVisibilityCheck = new Date().getTime();
    
    if (window.NotificationSystem && typeof window.NotificationSystem.init === 'function') {
        window.NotificationSystem.init();
    } else {
        console.log("Notification system not found, make sure notification-system.js is loaded");
    }
});