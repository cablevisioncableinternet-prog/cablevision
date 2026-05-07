// ===============================
// ADMIN INTERNET APPLICATIONS JS
// ===============================

const appsTableBody = document.getElementById("applicationsBody");
const rejectedTableBody = document.getElementById("rejectedApplicationsBody");
const rejectedCard = document.getElementById("rejectedCard");
const noData = document.getElementById("noData");
const noRejectedData = document.getElementById("noRejectedData");

// Active card elements
const activeSearchInput = document.getElementById("activeSearchInput");
const activeStatusFilter = document.getElementById("activeStatusFilter");
const activeDateSortFilter = document.getElementById("activeDateSortFilter");
const paginationContainer = document.getElementById("paginationControls");

// Rejected card elements
const rejectedSearchInput = document.getElementById("rejectedSearchInput");
const rejectedDateSortFilter = document.getElementById("rejectedDateSortFilter");
const rejectedPaginationContainer = document.getElementById("rejectedPaginationControls");

let applicationsData = [];
let filteredActiveData = [];
let filteredRejectedData = [];
let currentPage = 1;
let currentRejectedPage = 1;
const rowsPerPage = 10;
const rejectedRowsPerPage = 10;

// Sort variables
let activeDateSort = "oldest";
let rejectedDateSort = "oldest";

// ==================== SORTING FUNCTIONS ====================
function sortActiveApplications(applications) {
    const statusOrder = {
        'Request Sent': 1,
        'Pending': 2,
        'Approved': 3
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

// Fetch admin info
let adminUsername = localStorage.getItem("adminUsername");
let adminId = localStorage.getItem("adminId");
let adminArea = localStorage.getItem("adminArea");
let adminCity = localStorage.getItem("adminCity");

if (!adminUsername) {
    adminUsername = sessionStorage.getItem("adminUsername");
}
if (!adminId) {
    adminId = sessionStorage.getItem("adminId");
}
if (!adminArea) {
    adminArea = sessionStorage.getItem("adminArea");
}
if (!adminCity) {
    adminCity = sessionStorage.getItem("adminCity");
}

// ===============================
// MANUAL REFRESH DETECTION
// ===============================
let isManualRefresh = false;

function detectPageRefresh() {
    if (performance && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
            if (navEntry.type === 'reload') {
                console.log("Page was manually reloaded");
                isManualRefresh = true;
                clearApplicationsCache();
            }
        }
    }
    
    if (performance && performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            console.log("Page was reloaded via legacy API");
            isManualRefresh = true;
            clearApplicationsCache();
        }
    }
}

function trackPageLoads() {
    const lastLoadTime = sessionStorage.getItem('admin_last_load_time');
    const now = new Date().getTime();
    
    if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
        console.log("Quick successive load detected - likely a refresh");
        isManualRefresh = true;
        clearApplicationsCache();
    }
    
    sessionStorage.setItem('admin_last_load_time', now.toString());
}

// ===============================
// UI CONTROL FUNCTIONS
// ===============================
function showLoading() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (noData) noData.style.display = "none";
    if (rejectedCard) rejectedCard.style.display = "none";
    
    if (appsTableBody) {
        if (!loadingRow) {
            appsTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="9">
                        <div class="loading-container">
                            <div class="spinner"></div>
                            <p>Loading applications...</p>
                        </div>
                     </span>
                   </span>
            `;
        } else {
            loadingRow.style.display = "table-row";
        }
    }
    
    if (appTable) appTable.style.display = "table";
    if (paginationContainer) paginationContainer.style.display = "none";
    if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
}

function showTable() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (appTable) appTable.style.display = "table";
    if (noData) noData.style.display = "none";
}

function showNoData() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (appTable) appTable.style.display = "none";
    if (noData) noData.style.display = "block";
    if (paginationContainer) paginationContainer.style.display = "none";
}

// ===============================
// SESSION CACHE MANAGEMENT
// ===============================
const CACHE_KEY = 'admin_applications_cache';
const CACHE_TIMESTAMP_KEY = 'admin_applications_timestamp';
const CACHE_DURATION = 5 * 60 * 1000;

function isCacheValid() {
    if (isManualRefresh) {
        console.log("Manual refresh detected - cache skipped");
        return false;
    }
    
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    
    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);
    
    return cacheAge < CACHE_DURATION;
}

function saveApplicationsToCache(applications) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(applications));
        sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
        console.log("Applications cached successfully");
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
}

function loadApplicationsFromCache() {
    try {
        const cachedApplications = sessionStorage.getItem(CACHE_KEY);
        if (cachedApplications) {
            const applications = JSON.parse(cachedApplications);
            console.log("Applications loaded from cache");
            return applications;
        }
    } catch (error) {
        console.error("Error loading from cache:", error);
    }
    return null;
}

function clearApplicationsCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Applications cache cleared");
}

// ===============================
// CHECK FOR ADMIN REFRESH FLAG
// ===============================
function checkForAdminRefreshFlag() {
    const shouldRefresh = sessionStorage.getItem('refresh_admin_applications');
    if (shouldRefresh === 'true') {
        console.log("Admin refresh flag detected - superadmin approved/rejected an application");
        sessionStorage.removeItem('refresh_admin_applications');
        clearApplicationsCache();
        isManualRefresh = true;
        return true;
    }
    return false;
}

// ===============================
// STORE ADMIN INFO
// ===============================
function storeAdminInfo(profile) {
    if (profile.id) {
        adminId = profile.id;
        localStorage.setItem("adminId", profile.id);
        sessionStorage.setItem("adminId", profile.id);
    }
    if (profile.area) {
        adminArea = profile.area;
        localStorage.setItem("adminArea", profile.area);
        sessionStorage.setItem("adminArea", profile.area);
    }
    if (profile.city) {
        adminCity = profile.city;
        localStorage.setItem("adminCity", profile.city);
        sessionStorage.setItem("adminCity", profile.city);
    }
    if (profile.username) {
        adminUsername = profile.username;
        localStorage.setItem("adminUsername", profile.username);
        sessionStorage.setItem("adminUsername", profile.username);
    }
}

// ===============================
// PAGINATION FUNCTIONS FOR ACTIVE TABLE
// ===============================
function renderPaginationControls(totalPages, totalItems) {
    if (!paginationContainer) return;
    
    if (totalItems === 0 || totalPages === 0) {
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

// ===============================
// PAGINATION FUNCTIONS FOR REJECTED TABLE
// ===============================
function renderRejectedPaginationControls(totalPages, totalItems) {
    if (!rejectedPaginationContainer) return;
    
    if (totalItems === 0 || totalPages === 0) {
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
        showNoData();
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

// ===============================
// RENDER ACTIVE APPLICATIONS
// ===============================
function renderApplications(data) {
    if (!appsTableBody) return;
    
    appsTableBody.innerHTML = "";

    if (!data || data.length === 0) {
        showNoData();
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
        return;
    }

    let activeCount = 0;
    const sortedData = sortActiveApplications(data);

    sortedData.forEach(app => {
        const status = app.status || "Pending";
        const statusLower = status.toLowerCase();

        let statusClass = "";
        if (statusLower === "pending") statusClass = "status-pending";
        else if (statusLower === "approved") statusClass = "status-approved";
        else if (statusLower === "request sent") statusClass = "status-request-sent";

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}">
                 View
                </button>
            </div>
        `;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${app.first_name || ""} ${app.last_name || ""}</td>
            <td>${app.email || ""}</td>
            <td>${app.date_submitted || "N/A"}</td>
            <td>${app.barangay || "N/A"}</td>
            <td>${app.city || "N/A"}</td>
            <td>${app.birthdate || "N/A"}</td>
            <td><span class="${statusClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        appsTableBody.appendChild(row);
        activeCount++;
    });

    const appCountSpan = document.getElementById("applicationCount");
    if (appCountSpan) appCountSpan.textContent = activeCount;

    showTable();
    attachButtonEvents();
}

// ===============================
// RENDER REJECTED APPLICATIONS
// ===============================
function renderRejectedApplications(data) {
    if (!rejectedTableBody) return;
    
    rejectedTableBody.innerHTML = "";

    if (!data || data.length === 0) {
        if (rejectedCard) rejectedCard.style.display = "none";
        if (noRejectedData) noRejectedData.style.display = "none";
        const rejectedCountSpan = document.getElementById("rejectedCount");
        if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
        return;
    }

    if (rejectedCard) rejectedCard.style.display = "block";
    if (noRejectedData) noRejectedData.style.display = "none";
    
    const rejectedCountSpan = document.getElementById("rejectedCount");
    if (rejectedCountSpan) rejectedCountSpan.textContent = data.length;
    
    const rejectedTable = document.getElementById("rejectedApplicationsTable");
    if (rejectedTable) rejectedTable.style.display = "table";

    data.forEach(app => {
        const status = app.status || "Rejected";
        let statusClass = "status-rejected";
        
        let rejectionReason = app.rejection_reason || "No reason provided";

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        `;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${app.first_name || ""} ${app.last_name || ""}</td>
            <td>${app.email || ""}</td>
            <td>${app.date_submitted || "N/A"}</td>
            <td>${app.barangay || "N/A"}</td>
            <td>${app.city || "N/A"}</td>
            <td>${app.birthdate || "N/A"}</td>
            <td>${escapeHtml(rejectionReason)}</span></td>
            <td><span class="${statusClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        rejectedTableBody.appendChild(row);
    });
    
    attachButtonEvents();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===============================
// ATTACH BUTTON EVENTS
// ===============================
function attachButtonEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = `/admin/view-application/${btn.dataset.id}`;
        });
    });
}

// ===============================
// FETCH APPLICATIONS
// ===============================
async function fetchApplications(forceRefresh = false) {
    if (!adminUsername) {
        console.error("No admin username found");
        if (appsTableBody) {
            appsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Please login again. Admin username not found. <\/td><\/tr>`;
        }
        return;
    }
    
    if (forceRefresh || applicationsData.length === 0) {
        showLoading();
    }
    
    if (!forceRefresh && !isManualRefresh && isCacheValid()) {
        const cachedApplications = loadApplicationsFromCache();
        if (cachedApplications && cachedApplications.length > 0) {
            applicationsData = cachedApplications;
            applyFilters();
            console.log("Applications loaded from cache");
            return;
        }
    }
    
    try {
        console.log(`Fetching applications for admin: ${adminUsername}`);
        const res = await fetch(`/api/admin/internet-applications?username=${encodeURIComponent(adminUsername)}`);
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        let data = await res.json();
        console.log("Received data:", data);
        
        applicationsData = data;
        
        if (!isManualRefresh) {
            saveApplicationsToCache(applicationsData);
        }
        
        applyFilters();
        console.log(`Loaded ${applicationsData.length} applications`);

    } catch (err) {
        console.error("Fetch error:", err);
        if (appsTableBody) {
            appsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Error: ${err.message}<\/td><\/tr>`;
        }
    } finally {
        isManualRefresh = false;
    }
}

// ===============================
// SEARCH & FILTER LOGIC
// ===============================
function applyFilters() {
    if (activeDateSortFilter) {
        activeDateSort = activeDateSortFilter.value;
    }
    if (rejectedDateSortFilter) {
        rejectedDateSort = rejectedDateSortFilter.value;
    }
    
    const activeSearchTerm = activeSearchInput ? activeSearchInput.value.toLowerCase().trim() : "";
    const activeStatusValue = activeStatusFilter ? activeStatusFilter.value : "all";
    
    let activeFiltered = applicationsData.filter(app => app.status !== "Rejected");
    
    if (activeSearchTerm) {
        activeFiltered = activeFiltered.filter(app => 
            (app.application_number && String(app.application_number).toLowerCase().includes(activeSearchTerm)) ||
            (app.first_name && app.first_name.toLowerCase().includes(activeSearchTerm)) ||
            (app.last_name && app.last_name.toLowerCase().includes(activeSearchTerm)) ||
            (`${app.first_name} ${app.last_name}`.toLowerCase().includes(activeSearchTerm)) ||
            (app.email && app.email.toLowerCase().includes(activeSearchTerm))
        );
    }
    
    if (activeStatusValue !== "all") {
        activeFiltered = activeFiltered.filter(app => 
            app.status && app.status.toLowerCase() === activeStatusValue.toLowerCase()
        );
    }
    
    filteredActiveData = sortActiveApplications(activeFiltered);
    
    const rejectedSearchTerm = rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "";
    
    let rejectedFiltered = applicationsData.filter(app => app.status === "Rejected");
    
    if (rejectedSearchTerm) {
        rejectedFiltered = rejectedFiltered.filter(app => 
            (app.application_number && String(app.application_number).toLowerCase().includes(rejectedSearchTerm)) ||
            (app.first_name && app.first_name.toLowerCase().includes(rejectedSearchTerm)) ||
            (app.last_name && app.last_name.toLowerCase().includes(rejectedSearchTerm)) ||
            (`${app.first_name} ${app.last_name}`.toLowerCase().includes(rejectedSearchTerm)) ||
            (app.email && app.email.toLowerCase().includes(rejectedSearchTerm))
        );
    }
    
    filteredRejectedData = sortRejectedApplications(rejectedFiltered);
    
    currentPage = 1;
    currentRejectedPage = 1;
    
    const activeTotalItems = filteredActiveData.length;
    
    if (activeTotalItems === 0) {
        showNoData();
        if (paginationContainer) paginationContainer.style.display = "none";
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
    } else {
        const activeTotalPages = Math.ceil(activeTotalItems / rowsPerPage);
        const startIndex = 0;
        const endIndex = Math.min(rowsPerPage, activeTotalItems);
        const pageData = filteredActiveData.slice(startIndex, endIndex);
        renderApplications(pageData);
        renderPaginationControls(activeTotalPages, activeTotalItems);
    }
    
    const rejectedTotalItems = filteredRejectedData.length;
    
    if (rejectedTotalItems === 0) {
        renderRejectedApplications([]);
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
    } else {
        const rejectedTotalPages = Math.ceil(rejectedTotalItems / rejectedRowsPerPage);
        const startIndex = 0;
        const endIndex = Math.min(rejectedRowsPerPage, rejectedTotalItems);
        const pageData = filteredRejectedData.slice(startIndex, endIndex);
        renderRejectedApplications(pageData);
        renderRejectedPaginationControls(rejectedTotalPages, rejectedTotalItems);
    }
}

function setupSearchAndFilter() {
    if (activeSearchInput) activeSearchInput.addEventListener("input", applyFilters);
    if (activeStatusFilter) activeStatusFilter.addEventListener("change", applyFilters);
    if (activeDateSortFilter) {
        activeDateSortFilter.addEventListener("change", () => {
            activeDateSort = activeDateSortFilter.value;
            applyFilters();
        });
    }
    
    if (rejectedSearchInput) rejectedSearchInput.addEventListener("input", applyFilters);
    if (rejectedDateSortFilter) {
        rejectedDateSortFilter.addEventListener("change", () => {
            rejectedDateSort = rejectedDateSortFilter.value;
            applyFilters();
        });
    }
    
    const activeClearBtn = document.getElementById("activeClearSearch");
    if (activeClearBtn && activeSearchInput) {
        activeClearBtn.addEventListener("click", () => {
            activeSearchInput.value = "";
            applyFilters();
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
            applyFilters();
            rejectedClearBtn.style.display = "none";
        });
        
        rejectedSearchInput.addEventListener("input", () => {
            rejectedClearBtn.style.display = rejectedSearchInput.value ? "flex" : "none";
        });
    }
}

// ===============================
// LOGOUT MODAL
// ===============================
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

    if (logoutCloseBtn) logoutCloseBtn.addEventListener("click", () => { logoutModal.style.display = "none"; });
    if (cancelLogout) cancelLogout.addEventListener("click", () => { logoutModal.style.display = "none"; });
    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/";
        });
    }

    window.addEventListener("click", (e) => { if (e.target === logoutModal) logoutModal.style.display = "none"; });
}

// ===============================
// PROFILE DROPDOWN
// ===============================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });

    window.addEventListener("click", e => {
        if (!profileBtn.contains(e.target)) {
            profileMenu.classList.remove("show");
        }
    });
}

async function loadProfile() {
    try {
        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.username || profile.name || "Profile";
        storeAdminInfo(profile);
    } catch (err) {
        console.error("Error loading profile:", err);
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

if (adminUsername) loadProfile();

// ===============================
// CHECK FOR CACHE-BUSTING
// ===============================
function checkForCacheBusting() {
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get('t');
    
    if (timestamp) {
        console.log("Cache-busting parameter detected, forcing refresh");
        clearApplicationsCache();
        isManualRefresh = true;
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        return true;
    }
    return false;
}

// ===============================
// KEYBOARD SHORTCUT DETECTION
// ===============================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearApplicationsCache();
    }
});

// ===============================
// PAGE VISIBILITY & FOCUS HANDLERS
// ===============================
let lastRefreshTime = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastRefreshTime > 30000 && !isCacheValid()) {
            console.log("Page became visible and cache expired, fetching fresh data");
            clearApplicationsCache();
            fetchApplications(true);
            lastRefreshTime = now;
        }
    }
});

window.addEventListener('focus', function() {
    if (!isCacheValid()) {
        console.log("Cache expired, fetching fresh data");
        clearApplicationsCache();
        fetchApplications(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log("Page loaded from bfcache");
        if (!isCacheValid()) {
            clearApplicationsCache();
            isManualRefresh = true;
            fetchApplications(true);
        }
    }
});

// ===============================
// HAMBURGER MENU TOGGLE
// ===============================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!sidebar) return;
    sidebar.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

if (hamburger) hamburger.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===============================
// MANUAL REFRESH FUNCTION
// ===============================
window.refreshApplications = function() {
    isManualRefresh = true;
    clearApplicationsCache();
    fetchApplications(true);
};

// ===============================
// INITIALIZE
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    detectPageRefresh();
    trackPageLoads();
    
    const hasCacheBuster = checkForCacheBusting();
    const hasRefreshFlag = checkForAdminRefreshFlag();
    
    if (hasCacheBuster || hasRefreshFlag) {
        console.log("Change detected, fetching fresh data");
        fetchApplications(true);
    } else {
        fetchApplications(isManualRefresh);
    }
    
    setupSearchAndFilter();
    lastRefreshTime = new Date().getTime();
});